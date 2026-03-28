import { useState, useCallback, useRef } from 'react';
import type { Message, ActiveParticipant, NoteDetailLevel } from '../types';
import { NOTE_DETAIL_LEVELS } from '../constants';

interface UseOpenRouterOptions {
  apiKey: string;
  participants: ActiveParticipant[];
  systemInstructions?: string;
}

// Shared SSE streaming helper — returns the full accumulated text
async function streamSSE(
  url: string,
  body: object,
  headers: Record<string, string>,
  signal: AbortSignal,
  onChunk: (chunk: string) => void
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let message = `API error ${response.status}: ${response.statusText}`;
    try {
      const errData = (await response.json()) as { error?: { message?: string } };
      if (errData?.error?.message) message = errData.error.message;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(message);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body stream');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;
      try {
        const json = JSON.parse(trimmed.slice(6)) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const chunk = json.choices?.[0]?.delta?.content;
        if (chunk) onChunk(chunk);
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}

export function useOpenRouter({ apiKey, participants, systemInstructions }: UseOpenRouterOptions) {
  const [isLoading, setIsLoading] = useState(false);

  // Separate abort controllers for main generation vs note generation
  const mainAbortRef = useRef<AbortController | null>(null);
  const noteAbortRef = useRef<AbortController | null>(null);

  // Keep a ref to the latest apiKey to avoid stale closures in generateNote
  // Sanitize: keep only printable ASCII (0x20–0x7E) — HTTP headers cannot contain
  // any character outside this range without triggering a fetch TypeError.
  const sanitizeHeaderValue = (val: string): string =>
    val.replace(/[^\x20-\x7E]/g, '').trim();

  const apiKeyRef = useRef('');
  apiKeyRef.current = sanitizeHeaderValue(apiKey);

  // Keep a ref to latest participants
  const participantsRef = useRef(participants);
  participantsRef.current = participants;

  // Keep a ref to latest system instructions
  const systemInstructionsRef = useRef(systemInstructions || '');
  systemInstructionsRef.current = systemInstructions || '';

  const stopGeneration = useCallback(() => {
    mainAbortRef.current?.abort();
    mainAbortRef.current = null;
    noteAbortRef.current?.abort();
    noteAbortRef.current = null;
    setIsLoading(false);
  }, []);

  const sharedHeaders = useCallback(
    (title: string): Record<string, string> => {
      // Sanitize all header values to ASCII-safe ISO-8859-1 only
      // Non-latin chars (em-dash, smart quotes, invisible unicode) cause fetch to throw
      const safeKey = apiKeyRef.current.replace(/[^\x20-\x7E]/g, '').trim();
      const safeTitle = title.replace(/[^\x20-\x7E]/g, '').trim();
      return {
        Authorization: `Bearer ${safeKey}`,
        'Content-Type': 'application/json',
        'X-Title': safeTitle,
      };
    },
    []
  );

  const generateMessage = useCallback(
    async (
      instanceId: string,
      conversationHistory: Message[],
      _userContext: string,
      attachmentText: string,
      onChunk: (chunk: string) => void,
      onDone: () => void,
      onError: (err: string) => void
    ) => {
      const currentKey = apiKeyRef.current;
      if (!currentKey) {
        onError('No API key provided. Please enter your OpenRouter API key.');
        return;
      }

      const participant = participantsRef.current.find((p) => p.instanceId === instanceId);
      if (!participant) {
        onError('Participant not found: ' + instanceId);
        return;
      }

      setIsLoading(true);
      const controller = new AbortController();
      mainAbortRef.current = controller;

      // Build system prompt with optional user instructions and attachment context
      let systemContent = participant.systemPrompt;
      if (systemInstructionsRef.current) {
        systemContent = `--- USER SYSTEM INSTRUCTIONS ---\n${systemInstructionsRef.current}\n--- END USER SYSTEM INSTRUCTIONS ---\n\n${systemContent}`;
      }
      if (attachmentText) {
        systemContent += `\n\n--- REFERENCE MATERIAL PROVIDED BY USER ---\n${attachmentText}\n--- END REFERENCE MATERIAL ---`;
      }

      // Build message history — attribute all speakers properly
      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemContent },
      ];

      for (const msg of conversationHistory) {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
          const speaker = participantsRef.current.find((p) => p.instanceId === msg.instanceId);
          const label = speaker ? `[${speaker.emoji} ${speaker.label}]` : '[Panel]';

          if (msg.instanceId === instanceId) {
            // Own previous messages → assistant role
            messages.push({ role: 'assistant', content: msg.content });
          } else {
            // Others' messages → user role with attribution
            messages.push({ role: 'user', content: `${label}: ${msg.content}` });
          }
        }
      }

      // Extract topic & type from the opening brief for the per-turn reminder
      const firstUserMsg = conversationHistory.find((m) => m.role === 'user');
      let topicReminder = '';
      if (firstUserMsg?.content) {
        const topicMatch = firstUserMsg.content.match(/\*\*Topic:\*\*\s*(.+?)(?:\n|$)/);
        const typeMatch = firstUserMsg.content.match(/\*\*Discussion Type:\*\*\s*(.+?)(?:\n|$)/);
        const topicText = topicMatch?.[1]?.trim() ?? '';
        const typeText = typeMatch?.[1]?.trim() ?? '';
        if (topicText) {
          topicReminder =
            `\n\n⚠️ MANDATORY TOPIC FOCUS: Your ENTIRE response must address the specific topic below. ` +
            `Reference it by name. Do NOT speak in generalities.\n` +
            `• TOPIC: "${topicText}"` +
            (typeText ? `\n• DISCUSSION TYPE: ${typeText}` : '');
        }
      }

      // Final "your turn" trigger
      messages.push({
        role: 'user',
        content:
          `It is now your turn to speak, ${participant.emoji} ${participant.label}. ` +
          `Build on what has been said above. Be specific, insightful, and advance the discussion.` +
          topicReminder,
      });

      try {
        await streamSSE(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: participant.selectedModel,
            messages,
            stream: true,
            max_tokens: 400,
            temperature: 0.8,
          },
          sharedHeaders('SlotMind AI Panel'),
          controller.signal,
          onChunk
        );
        onDone();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          onDone();
        } else {
          onError(err instanceof Error ? err.message : 'Unknown error generating message');
        }
      } finally {
        setIsLoading(false);
        if (mainAbortRef.current === controller) {
          mainAbortRef.current = null;
        }
      }
    },
    [sharedHeaders]
  );

  const generateNote = useCallback(
    async (
      speakerLabel: string,
      speakerEmoji: string,
      messageContent: string,
      detailLevel: NoteDetailLevel,
      noteModel: string,
      onChunk: (chunk: string) => void,
      onDone: () => void,
      onError: (err: string) => void
    ) => {
      const currentKey = apiKeyRef.current;
      if (!currentKey) {
        onError('No API key');
        return;
      }

      if (!messageContent.trim()) {
        onError('Empty message — nothing to note');
        return;
      }

      const instruction = NOTE_DETAIL_LEVELS[detailLevel]?.instruction;
      if (!instruction) {
        onError('Invalid detail level: ' + detailLevel);
        return;
      }

      const controller = new AbortController();
      noteAbortRef.current = controller;

      const messages = [
        {
          role: 'system',
          content:
            'You are a precise, neutral note-taker for a casino slot machine design panel. ' +
            'Summarize what the panelist said according to the instruction. ' +
            'Be accurate and concise. Preserve technical terms, numbers, and specific ideas. ' +
            'Never add your own opinions. Output only the summary — no preamble, no "Here is a summary:" prefix.',
        },
        {
          role: 'user',
          content:
            `INSTRUCTION: ${instruction}\n\n` +
            `PANELIST: ${speakerEmoji} ${speakerLabel}\n\n` +
            `MESSAGE:\n"""\n${messageContent}\n"""`,
        },
      ];

      try {
        await streamSSE(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: noteModel,
            messages,
            stream: true,
            max_tokens: 300,
            temperature: 0.2,
          },
          sharedHeaders('SlotMind AI Panel - Notes'),
          controller.signal,
          onChunk
        );
        onDone();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          onDone();
        } else {
          const msg = err instanceof Error ? err.message : 'Unknown error generating note';
          console.error('[NoteTaker]', msg, { speakerLabel, noteModel, detailLevel });
          onError(msg);
        }
      } finally {
        if (noteAbortRef.current === controller) {
          noteAbortRef.current = null;
        }
      }
    },
    [sharedHeaders]
  );

  return { generateMessage, generateNote, isLoading, stopGeneration };
}
