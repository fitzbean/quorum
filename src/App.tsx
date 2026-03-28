import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Settings } from 'lucide-react';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ChatMessage } from './components/ChatMessage';
import { ContextPanel } from './components/ContextPanel';
import { PanelSidebar } from './components/PanelSidebar';
import { ParticipantRoster } from './components/ParticipantRoster';
import { NoteTaker } from './components/NoteTaker';
import { useOpenRouter } from './hooks/useOpenRouter';
import {
  PARTICIPANT_PRESETS,
  DISCUSSION_PRESETS,
  NOTE_TAKER_DEFAULT_MODEL,
  DEFAULT_PANEL_INSTANCE_IDS,
} from './constants';
import { formatAttachmentsForContext } from './utils/fileParser';
import type {
  Message,
  ActiveParticipant,
  ParticipantPreset,
  PanelPreset,
  Preset,
  Attachment,
  NoteEntry,
  NoteTakerConfig,
} from './types';

const STORAGE_KEY = 'slotmind_api_key';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function makeParticipant(preset: ParticipantPreset, instanceId: string, label?: string): ActiveParticipant {
  return {
    instanceId,
    role: preset.role,
    label: label || preset.label,
    emoji: preset.emoji,
    color: preset.color,
    bgColor: preset.bgColor,
    borderColor: preset.borderColor,
    selectedModel: preset.defaultModel,
    systemPrompt: preset.systemPrompt,
    isActive: true,
  };
}

function buildDefaultPanel(): ActiveParticipant[] {
  return DEFAULT_PANEL_INSTANCE_IDS.map((instanceId) => {
    const role = instanceId.replace(/_\d+$/, '') as ActiveParticipant['role'];
    const preset = PARTICIPANT_PRESETS.find((p) => p.role === role);
    if (!preset) return null;
    return makeParticipant(preset, instanceId);
  }).filter(Boolean) as ActiveParticipant[];
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || '';
    return stored.replace(/[^\x20-\x7E]/g, '').trim();
  });
  const [showApiModal, setShowApiModal] = useState(!localStorage.getItem(STORAGE_KEY));
  const [participants, setParticipants] = useState<ActiveParticipant[]>(buildDefaultPanel);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset>(DISCUSSION_PRESETS[0]);
  const [topic, setTopic] = useState('');
  const [roundCount, setRoundCount] = useState(2);
  const [attachmentContext, setAttachmentContext] = useState('');
  const [interjectionQueue, setInterjectionQueue] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [noteTakerConfig, setNoteTakerConfig] = useState<NoteTakerConfig>({
    selectedModel: NOTE_TAKER_DEFAULT_MODEL,
    detailLevel: 'standard',
    enabled: true,
  });
  const [responseDelay, setResponseDelay] = useState(1500);
  const [selectedModelPreset, setSelectedModelPreset] = useState<string | null>(null);
  const [selectedPanelPreset, setSelectedPanelPreset] = useState<string | null>(null);
  const [systemInstructions, setSystemInstructions] = useState('');
  const [interjectText, setInterjectText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const interjectionRef = useRef<string[]>([]);
  const stopRequestedRef = useRef(false);
  const noteTakerConfigRef = useRef(noteTakerConfig);
  const participantsRef = useRef(participants);
  const responseDelayRef = useRef(responseDelay);

  useEffect(() => {
    noteTakerConfigRef.current = noteTakerConfig;
  }, [noteTakerConfig]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    responseDelayRef.current = responseDelay;
  }, [responseDelay]);

  const { generateMessage, generateNote, stopGeneration } = useOpenRouter({
    apiKey,
    participants,
    systemInstructions,
  });

  useEffect(() => {
    interjectionRef.current = interjectionQueue;
  }, [interjectionQueue]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveApiKey = (key: string) => {
    const safeKey = key.replace(/[^\x20-\x7E]/g, '').trim();
    setApiKey(safeKey);
    localStorage.setItem(STORAGE_KEY, safeKey);
    setShowApiModal(false);
  };

  const handleAddParticipant = useCallback((preset: ParticipantPreset) => {
    setParticipants((prev) => {
      const count = prev.filter((p) => p.role === preset.role).length + 1;
      const instanceId = `${preset.role}_${count}`;
      const label = count > 1 ? `${preset.label} #${count}` : preset.label;
      return [...prev, makeParticipant(preset, instanceId, label)];
    });
  }, []);

  const handleCloneParticipant = useCallback((instanceId: string) => {
    setParticipants((prev) => {
      const source = prev.find((participant) => participant.instanceId === instanceId);
      if (!source) return prev;

      const count = prev.filter((participant) => participant.role === source.role).length + 1;
      const clonedParticipant: ActiveParticipant = {
        ...source,
        instanceId: `${source.role}_${count}`,
        label: count > 1 ? `${source.label.replace(/\s+#\d+$/, '')} #${count}` : source.label,
      };

      return [...prev, clonedParticipant];
    });
  }, []);

  const handleRemoveParticipant = useCallback((instanceId: string) => {
    setParticipants((prev) => prev.filter((p) => p.instanceId !== instanceId));
  }, []);

  const handleToggleActive = useCallback((instanceId: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.instanceId === instanceId ? { ...p, isActive: !p.isActive } : p))
    );
  }, []);

  const handleModelChange = useCallback((instanceId: string, modelId: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.instanceId === instanceId ? { ...p, selectedModel: modelId } : p))
    );
  }, []);

  const handlePresetApply = useCallback((models: Record<string, string>, presetKey: string) => {
    setParticipants((prev) =>
      prev.map((p) => ({
        ...p,
        selectedModel: models[p.role] || p.selectedModel,
      }))
    );

    if (models.note_taker) {
      setNoteTakerConfig((prev) => ({ ...prev, selectedModel: models.note_taker }));
    }

    setSelectedModelPreset(presetKey);
  }, []);

  const handleApplyPanelPreset = useCallback((panelPreset: PanelPreset) => {
    const newParticipants: ActiveParticipant[] = [];
    const roleCounters: Record<string, number> = {};

    for (const { role, count } of panelPreset.participants) {
      const preset = PARTICIPANT_PRESETS.find((p) => p.role === role);
      if (!preset) continue;

      for (let i = 0; i < count; i++) {
        roleCounters[role] = (roleCounters[role] || 0) + 1;
        const n = roleCounters[role];
        const instanceId = `${role}_${n}`;
        const label = count > 1 ? `${preset.label} #${n}` : preset.label;
        newParticipants.push(makeParticipant(preset, instanceId, label));
      }
    }

    setParticipants(newParticipants);
    setSelectedPanelPreset(panelPreset.id);

    if (panelPreset.discussionPresetId) {
      const discussionPreset = DISCUSSION_PRESETS.find((d) => d.id === panelPreset.discussionPresetId);
      if (discussionPreset) {
        setSelectedPreset(discussionPreset);
        setRoundCount(discussionPreset.roundCount);
      }
    }
  }, []);

  const handleSelectDiscussionPreset = useCallback((preset: Preset) => {
    setSelectedPreset(preset);
    setRoundCount(preset.roundCount);
  }, []);

  const handleUserMessage = useCallback((text: string, attachments: Attachment[]) => {
    const attachmentText = formatAttachmentsForContext(attachments);
    const combined = [text, attachmentText].filter(Boolean).join('\n\n');

    if (combined) {
      setAttachmentContext((prev) => (prev ? `${prev}\n\n${combined}` : combined).trim());
    }

    const displayContent =
      text || (attachments.length > 0 ? `[Attached: ${attachments.map((attachment) => attachment.name).join(', ')}]` : '');

    if (!displayContent) return;

    const msg: Message = {
      id: generateId(),
      role: 'user',
      content: displayContent,
      timestamp: new Date(),
      attachments,
    };

    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleInterject = useCallback((text: string) => {
    setInterjectionQueue((prev) => {
      const next = [...prev, text];
      interjectionRef.current = next;
      return next;
    });

    const msg: Message = {
      id: generateId(),
      role: 'user',
      content: `✋ **[Interjection]** ${text}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleSubmitInterjection = useCallback(() => {
    const value = interjectText.trim();
    if (!value || !isRunning) return;
    handleInterject(value);
    setInterjectText('');
  }, [handleInterject, interjectText, isRunning]);

  const runDiscussion = useCallback(async () => {
    if (!topic.trim()) return;

    const activeParticipants = participantsRef.current.filter((p) => p.isActive);
    if (activeParticipants.length === 0) return;

    setIsRunning(true);
    stopRequestedRef.current = false;
    setCurrentRound(0);

    const preferredRoles = selectedPreset?.preferredRoles || [];
    const speakingOrder: ActiveParticipant[] = [];
    const usedInstanceIds = new Set<string>();

    for (const role of preferredRoles) {
      const match = activeParticipants.find((p) => p.role === role && !usedInstanceIds.has(p.instanceId));
      if (match) {
        speakingOrder.push(match);
        usedInstanceIds.add(match.instanceId);
      }
    }

    for (const participant of activeParticipants) {
      if (!usedInstanceIds.has(participant.instanceId)) {
        speakingOrder.push(participant);
      }
    }

    const finalOrder = speakingOrder.length > 0 ? speakingOrder : activeParticipants;

    const openingUserMsg: Message = {
      id: generateId(),
      role: 'user',
      content: `🎯 **PANEL DISCUSSION BRIEF**\n\n**Topic:** ${topic}\n\n**Discussion Type:** ${selectedPreset?.label || 'General'}\n\n**Framing:** ${selectedPreset?.discussionPrompt || ''}\n\n---\n⚠️ ALL panelists must keep every response strictly and specifically about: "${topic}". Reference the topic by name in your response. Do not give generic slot design advice; apply your expertise directly to this specific topic.${attachmentContext ? `\n\n**Reference Material Provided:**\n${attachmentContext}` : ''}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, openingUserMsg]);
    let conversationHistory: Message[] = [openingUserMsg];

    for (let round = 0; round < roundCount; round++) {
      if (stopRequestedRef.current) break;
      setCurrentRound(round + 1);

      for (const participant of finalOrder) {
        if (stopRequestedRef.current) break;

        if (interjectionRef.current.length > 0) {
          const injection = interjectionRef.current[0];
          interjectionRef.current = interjectionRef.current.slice(1);
          setInterjectionQueue((prev) => prev.slice(1));
          const injectionMsg: Message = {
            id: generateId(),
            role: 'user',
            content: injection,
            timestamp: new Date(),
          };
          conversationHistory = [...conversationHistory, injectionMsg];
        }

        if (stopRequestedRef.current) break;

        const msgId = generateId();
        const pendingMsg: Message = {
          id: msgId,
          role: 'assistant',
          panelMember: participant.role,
          instanceId: participant.instanceId,
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        };

        setMessages((prev) => [...prev, pendingMsg]);
        setCurrentSpeakerId(participant.instanceId);

        let fullContent = '';

        await new Promise<void>((resolve) => {
          generateMessage(
            participant.instanceId,
            conversationHistory,
            topic,
            attachmentContext,
            (chunk) => {
              fullContent += chunk;
              setMessages((prev) =>
                prev.map((m) => (m.id === msgId ? { ...m, content: fullContent, isStreaming: true } : m))
              );
            },
            () => {
              setMessages((prev) =>
                prev.map((m) => (m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m))
              );
              conversationHistory = [...conversationHistory, { ...pendingMsg, content: fullContent, isStreaming: false }];
              resolve();
            },
            (err) => {
              const errContent = `⚠️ *Error: ${err}*`;
              setMessages((prev) =>
                prev.map((m) => (m.id === msgId ? { ...m, content: errContent, isStreaming: false } : m))
              );
              conversationHistory = [...conversationHistory, { ...pendingMsg, content: errContent, isStreaming: false }];
              resolve();
            }
          );
        });

        const ntConfig = noteTakerConfigRef.current;
        if (ntConfig.enabled && fullContent && !fullContent.startsWith('⚠️')) {
          const noteId = generateId();
          setNotes((prev) => [
            ...prev,
            {
              id: noteId,
              timestamp: new Date(),
              speakerInstanceId: participant.instanceId,
              speakerLabel: participant.label,
              speakerEmoji: participant.emoji,
              summary: '',
              isStreaming: true,
            } satisfies NoteEntry,
          ]);

          let noteContent = '';

          await generateNote(
            participant.label,
            participant.emoji,
            fullContent,
            ntConfig.detailLevel,
            ntConfig.selectedModel,
            (chunk) => {
              noteContent += chunk;
              setNotes((prev) =>
                prev.map((note) => (note.id === noteId ? { ...note, summary: noteContent, isStreaming: true } : note))
              );
            },
            () => {
              setNotes((prev) =>
                prev.map((note) => (note.id === noteId ? { ...note, summary: noteContent, isStreaming: false } : note))
              );
            },
            (err) => {
              console.error('[Note failed]', err);
              setNotes((prev) =>
                prev.map((note) => (note.id === noteId ? { ...note, summary: `⚠️ ${err}`, isStreaming: false } : note))
              );
            }
          );
        }

        if (!stopRequestedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, responseDelayRef.current));
        }
      }
    }

    setCurrentSpeakerId(null);
    setIsRunning(false);
  }, [topic, selectedPreset, roundCount, attachmentContext, generateMessage, generateNote]);

  const handleStop = useCallback(() => {
    stopRequestedRef.current = true;
    stopGeneration();
    setIsRunning(false);
    setCurrentSpeakerId(null);
  }, [stopGeneration]);

  const handleReset = useCallback(() => {
    handleStop();
    setMessages([]);
    setAttachmentContext('');
    setInterjectionQueue([]);
    interjectionRef.current = [];
    setCurrentRound(0);
    setNotes([]);
    setInterjectText('');
  }, [handleStop]);

  const activeCount = participants.filter((p) => p.isActive).length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-white">
      {showApiModal && <ApiKeyModal onSave={handleSaveApiKey} existingKey={apiKey} />}

      <div className="flex w-64 flex-shrink-0 flex-col border-r border-gray-700/50 bg-gray-950">
        <div className="flex flex-shrink-0 flex-col" style={{ maxHeight: '40%' }}>
          <div className="border-b border-gray-700/50 bg-gray-900/80 px-3 py-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-xs font-bold text-white">Your Input</h2>
              {isRunning ? (
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] font-medium text-green-400">
                    R{currentRound}/{roundCount}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-gray-600">
                  {messages.filter((m) => m.role === 'assistant').length} msgs
                </span>
              )}
            </div>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <ContextPanel
              onSendMessage={handleUserMessage}
              onSystemInstructionsChange={setSystemInstructions}
              disabled={!apiKey}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <NoteTaker
            notes={notes}
            config={noteTakerConfig}
            onConfigChange={(partial) => setNoteTakerConfig((prev) => ({ ...prev, ...partial }))}
            onClearNotes={() => setNotes([])}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-gray-950">
        <div className="flex items-center gap-3 border-b border-gray-700/50 bg-gray-900/80 px-4 py-2.5">
          <div className="flex flex-shrink-0 -space-x-1">
            {participants.slice(0, 8).map((participant) => (
              <span
                key={participant.instanceId}
                title={participant.label}
                className={`cursor-default text-lg transition-transform hover:-translate-y-1 hover:scale-125 ${
                  currentSpeakerId === participant.instanceId ? '-translate-y-1 scale-125' : ''
                } ${!participant.isActive ? 'opacity-30 grayscale' : ''}`}
              >
                {participant.emoji}
              </span>
            ))}
            {participants.length > 8 && (
              <span className="self-center pl-2 text-xs text-gray-500">+{participants.length - 8}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-white">
              {topic || 'Casino Slot Design Panel - SlotMind AI'}
            </h2>
            <p className="text-xs text-gray-500">
              {selectedPreset?.label} · {roundCount} round{roundCount !== 1 ? 's' : ''} · {activeCount} active
              {noteTakerConfig.enabled ? ' · Notes on' : ''}
            </p>
          </div>

          {isRunning && currentSpeakerId && (() => {
            const speaker = participantsRef.current.find((p) => p.instanceId === currentSpeakerId);
            return speaker ? (
              <div className="flex flex-shrink-0 items-center gap-1.5 text-xs">
                <span>{speaker.emoji}</span>
                <span className={`${speaker.color} font-medium`}>{speaker.label}</span>
                <span className="text-gray-500">speaking</span>
                <span className="flex items-center gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1 w-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1 w-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            ) : null;
          })()}

          <button
            onClick={() => setShowApiModal(true)}
            title="System settings"
            className="group flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 transition-all hover:border-gray-500 hover:bg-gray-700"
          >
            <Settings className="h-3.5 w-3.5 text-gray-400 transition-all duration-300 group-hover:rotate-45 group-hover:text-gray-200" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center select-none">
              <div className="mb-6 text-7xl animate-pulse">🎰</div>
              <h3 className="mb-3 text-2xl font-bold text-white">Welcome to SlotMind AI</h3>
              <p className="mb-6 max-w-md text-sm leading-relaxed text-gray-400">
                A spawnable panel of AI experts collaborates to design, critique, and innovate casino slot concepts.
                Build your team on the right, set a topic and discussion type, then hit{' '}
                <strong className="text-purple-400">Start Discussion</strong>.
              </p>
              {participants.length > 0 ? (
                <div className="flex max-w-lg flex-wrap justify-center gap-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.instanceId}
                      className={`${participant.bgColor} ${participant.borderColor} rounded-xl border px-3 py-2 text-center ${!participant.isActive ? 'opacity-40' : ''}`}
                    >
                      <div className="mb-1 text-2xl">{participant.emoji}</div>
                      <div className={`text-[10px] font-bold ${participant.color}`}>{participant.label}</div>
                    </div>
                  ))}
                  {noteTakerConfig.enabled && (
                    <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/20 px-3 py-2 text-center">
                      <div className="mb-1 text-2xl">📝</div>
                      <div className="text-[10px] font-bold text-emerald-400">Note Taker</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-700 bg-gray-800/60 px-6 py-4 text-sm text-gray-400">
                  Add participants using the <strong className="text-purple-400">Panel</strong> section on the right.
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  participants={participants}
                  isLatest={idx === messages.length - 1}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="border-t border-gray-700/50 bg-gray-900/85 px-4 py-3">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
            <div className="hidden shrink-0 text-[11px] text-amber-400 sm:block">
              {interjectionQueue.length > 0
                ? `✋ ${interjectionQueue.length} queued`
                : isRunning
                  ? '✋ Live interjection'
                  : '✋ Start a discussion to interject'}
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-amber-500/30 bg-gray-950/90 px-3 py-2 shadow-[0_0_0_1px_rgba(245,158,11,0.05)]">
              <span className="shrink-0 text-sm text-amber-400">✋</span>
              <input
                value={interjectText}
                onChange={(e) => setInterjectText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitInterjection();
                  }
                }}
                placeholder={isRunning ? 'Type an interjection for the next turn...' : 'Interjections unlock during a live discussion'}
                disabled={!apiKey || !isRunning}
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSubmitInterjection}
                disabled={!apiKey || !isRunning || !interjectText.trim()}
                title="Send interjection"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white transition-all hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="hidden max-w-[20rem] shrink-0 text-right text-[10px] text-gray-600 lg:block">
              Powered by OpenRouter · {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-72 flex-shrink-0 flex-col border-l border-gray-700/50">
        <div className="flex-shrink-0" style={{ maxHeight: '58%', overflowY: 'auto' }}>
          <PanelSidebar
            participants={participants}
            onPresetApply={handlePresetApply}
            selectedPreset={selectedPreset}
            onSelectDiscussionPreset={handleSelectDiscussionPreset}
            currentSpeakerId={currentSpeakerId}
            isRunning={isRunning}
            onStart={runDiscussion}
            onStop={handleStop}
            onReset={handleReset}
            apiKey={apiKey}
            topic={topic}
            onTopicChange={setTopic}
            roundCount={roundCount}
            onRoundCountChange={setRoundCount}
            responseDelay={responseDelay}
            onResponseDelayChange={setResponseDelay}
            selectedModelPreset={selectedModelPreset}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-t border-gray-700/50">
          <ParticipantRoster
            participants={participants}
            currentSpeakerId={currentSpeakerId}
            isRunning={isRunning}
            onAdd={handleAddParticipant}
            onClone={handleCloneParticipant}
            onRemove={handleRemoveParticipant}
            onToggleActive={handleToggleActive}
            onModelChange={handleModelChange}
            onApplyPanelPreset={handleApplyPanelPreset}
            selectedPanelPreset={selectedPanelPreset}
          />
        </div>
      </div>
    </div>
  );
}
