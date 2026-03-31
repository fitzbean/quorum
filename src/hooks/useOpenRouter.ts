import { useState, useCallback, useRef } from 'react';
import type { Message, ActiveParticipant, NoteDetailLevel } from '../types';
import { APP_NAME } from '../appConfig';
import { NOTE_DETAIL_LEVELS } from '../constants';

interface OpenRouterStreamEvent {
  choices?: Array<{ delta?: { content?: string } }>;
  usage?: { cost?: number | string };
}

interface UseOpenRouterOptions {
  apiKey: string;
  participants: ActiveParticipant[];
  systemInstructions?: string;
  onUsageCost?: (cost: number) => void;
}

// Shared SSE streaming helper — returns the full accumulated text
async function streamSSE(
  url: string,
  body: object,
  headers: Record<string, string>,
  signal: AbortSignal,
  onChunk: (chunk: string) => void,
  onUsageCost?: (cost: number) => void
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
  let reportedCost = false;

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
        const json = JSON.parse(trimmed.slice(6)) as OpenRouterStreamEvent;
        const chunk = json.choices?.[0]?.delta?.content;
        if (chunk) onChunk(chunk);
        if (!reportedCost) {
          const rawCost = json.usage?.cost;
          const parsedCost = typeof rawCost === 'string' ? Number(rawCost) : rawCost;
          if (typeof parsedCost === 'number' && Number.isFinite(parsedCost)) {
            onUsageCost?.(parsedCost);
            reportedCost = true;
          }
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}

export function useOpenRouter({ apiKey, participants, systemInstructions, onUsageCost }: UseOpenRouterOptions) {
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
            `\n\n⚠️ TOPIC FOCUS: Stay tightly on this topic. You do not need to restate the topic name unless it helps clarity. Avoid generic advice.\n` +
            `• TOPIC: "${topicText}"` +
            (typeText ? `\n• DISCUSSION TYPE: ${typeText}` : '');
        }
      }

      const otherParticipants = participantsRef.current.filter((p) => p.instanceId !== instanceId);
      const peerList = otherParticipants.map((p) => `${p.emoji} ${p.label}`).join(', ');

      // Final "your turn" trigger
      messages.push({
        role: 'user',
        content:
          `It is now your turn to speak, ${participant.emoji} ${participant.label}. ` +
          `${participant.personalityTraits.length > 0 ? `Your current personality traits are: ${participant.personalityTraits.join(', ')}. Let them shape your tone and priorities without turning into caricature. ` : ''}` +
          `Keep it short and pointed. Treat this as a real collaborative conversation, not a formal monologue. ` +
          `You may agree, disagree, challenge assumptions, or call out specific participants by name when relevant${peerList ? ` (${peerList})` : ''}. ` +
          `Do not wait for a rigid speaker order; respond to the strongest idea in the thread and move the discussion forward with energy.` +
          topicReminder,
      });

      try {
        await streamSSE(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: participant.selectedModel,
            messages,
            stream: true,
            usage: { include: true },
            max_tokens: 400,
            temperature: 0.8,
          },
          sharedHeaders(APP_NAME),
          controller.signal,
          onChunk,
          onUsageCost
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
            usage: { include: true },
            max_tokens: 300,
            temperature: 0.2,
          },
          sharedHeaders(`${APP_NAME} - Notes`),
          controller.signal,
          onChunk,
          onUsageCost
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

  const generateArtifact = useCallback(
    async (
      conversationHistory: Message[],
      topic: string,
      documentType: string,
      model: string,
      onChunk: (chunk: string) => void,
      onDone: () => void,
      onError: (err: string) => void
    ) => {
      const currentKey = apiKeyRef.current;
      if (!currentKey) {
        onError('No API key provided.');
        return;
      }

      const controller = new AbortController();
      mainAbortRef.current = controller;

      const systemPrompt =
        'You are producing a formal Markdown document that synthesizes a panel discussion.\n\n' +
        'Your task: write a comprehensive, well-structured document based on the discussion transcript.\n\n' +
        'Rules:\n' +
        '- Use proper Markdown: # for title, ## for sections, ### for subsections, bullet lists, tables where useful\n' +
        '- Be thorough and professional — this is a deliverable document, not a chat message\n' +
        '- Capture key insights, debates, decisions, and recommendations from the discussion\n' +
        '- Attribute important ideas to participants where relevant (e.g. "The Artist noted that...")\n' +
        '- Synthesize and organize ideas into a coherent document — do not just transcribe the chat\n' +
        '- The document must be self-contained and readable without the raw discussion context\n' +
        '- Start directly with the document title — no preamble like "Here is your document:"';

      const historyText = conversationHistory
        .filter((m) => m.role !== 'system' && !m.isArtifact)
        .map((m) => {
          if (m.role === 'user') return `[Facilitator]: ${m.content}`;
          const speaker = participantsRef.current.find((p) => p.instanceId === m.instanceId);
          const label = speaker ? `[${speaker.emoji} ${speaker.label}]` : '[Panel]';
          return `${label}: ${m.content}`;
        })
        .join('\n\n');

      const messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            `DISCUSSION TOPIC: ${topic}\n\n` +
            `DOCUMENT TYPE REQUESTED: ${documentType}\n\n` +
            `DISCUSSION TRANSCRIPT:\n\n${historyText}\n\n` +
            `---\n\nNow write the ${documentType}:`,
        },
      ];

      try {
        await streamSSE(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model,
            messages,
            stream: true,
            usage: { include: true },
            max_tokens: 4000,
            temperature: 0.4,
          },
          sharedHeaders(`${APP_NAME} - Artifact`),
          controller.signal,
          onChunk,
          onUsageCost
        );
        onDone();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          onDone();
        } else {
          onError(err instanceof Error ? err.message : 'Unknown error generating artifact');
        }
      } finally {
        if (mainAbortRef.current === controller) {
          mainAbortRef.current = null;
        }
      }
    },
    [sharedHeaders]
  );

  const generateAnalysis = useCallback(
    async (
      conversationHistory: Message[],
      topic: string,
      durationSeconds: number,
      model: string,
      onChunk: (chunk: string) => void,
      onDone: () => void,
      onError: (err: string) => void
    ) => {
      const currentKey = apiKeyRef.current;
      if (!currentKey) {
        onError('No API key provided.');
        return;
      }

      const controller = new AbortController();
      mainAbortRef.current = controller;

      const systemPrompt =
        'You are a conversation analyst. Your task is to produce a structured analysis of how a panel discussion *unfolded* — not what was concluded, but how the conversation moved.\n\n' +
        'Focus on:\n' +
        '- The arc and flow of the conversation (how it progressed, evolved, shifted)\n' +
        '- Turning points: moments where the direction, tone, or framing changed significantly\n' +
        '- Revelations: insights or realisations that emerged mid-discussion and changed things\n' +
        '- Disagreements: where participants clashed, what the nature of the disagreement was, and whether/how it resolved\n' +
        '- Alignments: where participants converged, built on each other, or reached consensus\n' +
        '- Power dynamics and participation patterns: who drove the discussion, who deferred, who challenged\n' +
        '- Unresolved tensions or open threads left hanging\n\n' +
        'Rules:\n' +
        '- Use proper Markdown: # for title, ## for sections\n' +
        '- Be analytical and specific — quote or closely paraphrase moments from the transcript to support observations\n' +
        '- Do NOT just summarise what was said. Analyse *how* the conversation happened\n' +
        '- Attribute dynamics to specific participants by name\n' +
        '- End with a ## Recommendation section: assess whether the discussion reached sufficient depth given the number of rounds completed, or whether further rounds would meaningfully advance it and why\n' +
        '- Start directly with the title — no preamble';

      const historyText = conversationHistory
        .filter((m) => m.role !== 'system' && !m.isArtifact)
        .map((m) => {
          if (m.role === 'user') return `[Facilitator]: ${m.content}`;
          const speaker = participantsRef.current.find((p) => p.instanceId === m.instanceId);
          const label = speaker ? `[${speaker.emoji} ${speaker.label}]` : '[Panel]';
          return `${label}: ${m.content}`;
        })
        .join('\n\n');

      const messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            `DISCUSSION TOPIC: ${topic}\n\n` +
            `DISCUSSION DURATION: ${Math.round(durationSeconds / 60)} minute${Math.round(durationSeconds / 60) !== 1 ? 's' : ''}\n\n` +
            `DISCUSSION TRANSCRIPT:\n\n${historyText}\n\n` +
            `---\n\nNow write the Conversation Flow Analysis:`,
        },
      ];

      try {
        await streamSSE(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model,
            messages,
            stream: true,
            usage: { include: true },
            max_tokens: 4000,
            temperature: 0.4,
          },
          sharedHeaders(`${APP_NAME} - Analysis`),
          controller.signal,
          onChunk,
          onUsageCost
        );
        onDone();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          onDone();
        } else {
          onError(err instanceof Error ? err.message : 'Unknown error generating analysis');
        }
      } finally {
        if (mainAbortRef.current === controller) {
          mainAbortRef.current = null;
        }
      }
    },
    [sharedHeaders]
  );

  const generateRecap = useCallback(
    async (
      conversationHistory: Message[],
      topic: string,
      durationSeconds: number,
      model: string,
      onChunk: (chunk: string) => void,
      onDone: () => void,
      onError: (err: string) => void
    ) => {
      const currentKey = apiKeyRef.current;
      if (!currentKey) { onError('No API key provided.'); return; }

      const controller = new AbortController();
      mainAbortRef.current = controller;

      const systemPrompt =
        'You are producing a macro-level recap of a panel discussion. Focus entirely on substance and outcomes — not on who said what or how the conversation unfolded.\n\n' +
        'Cover:\n' +
        '- What ground was covered: the full scope of topics and sub-topics addressed\n' +
        '- What was established or decided: conclusions, positions, frameworks, or approaches that emerged with reasonable consensus\n' +
        '- What remains open: unresolved questions, deferred decisions, or areas that need more work\n' +
        '- Progress against the original brief: how much of the stated goal was actually addressed, and what is still outstanding\n' +
        '- A clear-eyed overall assessment: how far did the discussion advance the brief?\n\n' +
        'Rules:\n' +
        '- Use proper Markdown: # for title, ## for sections\n' +
        '- Be direct and concise — this is a status report, not an essay\n' +
        '- Do NOT describe participant behaviour, dynamics, or who said what\n' +
        '- Do NOT just restate the transcript — synthesise and assess\n' +
        '- Start directly with the title — no preamble';

      const historyText = conversationHistory
        .filter((m) => m.role !== 'system' && !m.isArtifact)
        .map((m) => {
          if (m.role === 'user') return `[Facilitator]: ${m.content}`;
          const speaker = participantsRef.current.find((p) => p.instanceId === m.instanceId);
          const label = speaker ? `[${speaker.emoji} ${speaker.label}]` : '[Panel]';
          return `${label}: ${m.content}`;
        })
        .join('\n\n');

      const messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            `ORIGINAL BRIEF: ${topic}\n\n` +
            `DISCUSSION DURATION: ${Math.round(durationSeconds / 60)} minute${Math.round(durationSeconds / 60) !== 1 ? 's' : ''}\n\n` +
            `DISCUSSION TRANSCRIPT:\n\n${historyText}\n\n` +
            `---\n\nNow write the Discussion Recap:`,
        },
      ];

      try {
        await streamSSE(
          'https://openrouter.ai/api/v1/chat/completions',
          { model, messages, stream: true, usage: { include: true }, max_tokens: 3000, temperature: 0.3 },
          sharedHeaders(`${APP_NAME} - Recap`),
          controller.signal,
          onChunk,
          onUsageCost
        );
        onDone();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          onDone();
        } else {
          onError(err instanceof Error ? err.message : 'Unknown error generating recap');
        }
      } finally {
        if (mainAbortRef.current === controller) mainAbortRef.current = null;
      }
    },
    [sharedHeaders]
  );

  return { generateMessage, generateNote, generateArtifact, generateAnalysis, generateRecap, isLoading, stopGeneration };
}
