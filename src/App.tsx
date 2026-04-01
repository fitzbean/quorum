import { useState, useCallback, useRef, useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import { APP_NAME, APP_TITLE } from './appConfig';
import { CircleHelp, FileText, GitBranch, LayoutList, Hand, MessagesSquare, Pause, Play, Send, Settings, X } from 'lucide-react';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ChatMessage } from './components/ChatMessage';
import { ContextPanel } from './components/ContextPanel';
import { PanelSidebar } from './components/PanelSidebar';
import { ParticipantRoster } from './components/ParticipantRoster';
import { NoteTaker } from './components/NoteTaker';
import { TutorialModal } from './components/TutorialModal';
import { useOpenRouter } from './hooks/useOpenRouter';
import {
  PARTICIPANT_PRESETS,
  DISCUSSION_PRESETS,
  NOTE_TAKER_DEFAULT_MODEL,
  DEFAULT_PANEL_INSTANCE_IDS,
  ROLE_VISIBILITY_STORAGE_KEY,
  ROLE_LIBRARY_STORAGE_KEY,
  PANEL_PRESETS_STORAGE_KEY,
  TRAITS_STORAGE_KEY,
  MODELS_STORAGE_KEY,
  TRAITS_LIST_STORAGE_KEY,
} from './constants';
import { formatAttachmentsForContext } from './utils/fileParser';
import { buildPresetModelMap, fetchOpenRouterCatalog } from './utils/modelCatalog';
import { PERSONALITY_TRAITS } from './types';
import type {
  Message,
  ActiveParticipant,
  ParticipantPreset,
  PanelPreset,
  Preset,
  Attachment,
  NoteEntry,
  NoteTakerConfig,
  RoleVisibility,
  ModelOption,
  ModelTier,
  PersonalityTrait,
  PanelMember,
} from './types';

const DEFAULT_PERSONALITY_TRAITS: PersonalityTrait[] = ['analytical'];
const RIGHT_PANEL_TOP_SECTION_DEFAULT = 58;
const RIGHT_PANEL_TOP_SECTION_MIN = 28;
const RIGHT_PANEL_TOP_SECTION_MAX = 78;

const STORAGE_KEY = 'slotmind_api_key';
const TUTORIAL_STORAGE_KEY = 'quorum_tutorial_seen';
const NOTE_DETAIL_LEVEL_STORAGE_KEY = 'quorum_note_detail_level';

function buildRoleVisibilityMap(presets: ParticipantPreset[]): RoleVisibility {
  return presets.reduce((acc, preset) => {
    acc[preset.role] = true;
    return acc;
  }, {} as RoleVisibility);
}

function loadSavedTraits(): Record<string, PersonalityTrait[]> {
  try {
    const raw = localStorage.getItem(TRAITS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function loadSavedModels(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MODELS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadParticipantPresets(): ParticipantPreset[] {
  const builtInByRole = new Map(PARTICIPANT_PRESETS.map((preset) => [preset.role, preset]));

  try {
    const raw = localStorage.getItem(ROLE_LIBRARY_STORAGE_KEY);
    if (!raw) return PARTICIPANT_PRESETS;

    const parsed = JSON.parse(raw) as ParticipantPreset[];
    if (!Array.isArray(parsed) || parsed.length === 0) return PARTICIPANT_PRESETS;

    const normalized = parsed
      .filter((preset): preset is ParticipantPreset => Boolean(preset?.role && preset?.label))
      .map((preset) => {
        const builtIn = builtInByRole.get(preset.role);
        return {
          ...builtIn,
          ...preset,
          defaultPersonalityTraits:
            preset.defaultPersonalityTraits && preset.defaultPersonalityTraits.length > 0
              ? preset.defaultPersonalityTraits
              : builtIn?.defaultPersonalityTraits ?? [...DEFAULT_PERSONALITY_TRAITS],
          isBuiltIn: builtIn ? true : preset.isBuiltIn ?? false,
        };
      });

    const merged = [...normalized];
    for (const preset of PARTICIPANT_PRESETS) {
      if (!merged.some((item) => item.role === preset.role)) {
        merged.push(preset);
      }
    }

    return merged;
  } catch {
    return PARTICIPANT_PRESETS;
  }
}

function makeParticipant(preset: ParticipantPreset, instanceId: string, label?: string, savedTraits?: Record<string, PersonalityTrait[]>, savedModels?: Record<string, string>): ActiveParticipant {
  return {
    instanceId,
    role: preset.role,
    label: label || preset.label,
    emoji: preset.emoji,
    color: preset.color,
    bgColor: preset.bgColor,
    borderColor: preset.borderColor,
    selectedModel: savedModels?.[instanceId] ?? preset.defaultModel,
    systemPrompt: preset.systemPrompt,
    isActive: true,
    personalityTraits: savedTraits?.[instanceId] ?? [...(preset.defaultPersonalityTraits ?? DEFAULT_PERSONALITY_TRAITS)],
  };
}

function buildDefaultPanel(presets: ParticipantPreset[]): ActiveParticipant[] {
  const savedTraits = loadSavedTraits();
  const savedModels = loadSavedModels();
  return DEFAULT_PANEL_INSTANCE_IDS.map((instanceId) => {
    const role = instanceId.replace(/_\d+$/, '') as ActiveParticipant['role'];
    const preset = presets.find((p) => p.role === role);
    if (!preset) return null;
    return makeParticipant(preset, instanceId, undefined, savedTraits, savedModels);
  }).filter(Boolean) as ActiveParticipant[];
}

function loadRoleVisibility(presets: ParticipantPreset[]): RoleVisibility {
  const defaults = buildRoleVisibilityMap(presets);

  try {
    const raw = localStorage.getItem(ROLE_VISIBILITY_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<RoleVisibility>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function getFallbackModelId(models: ModelOption[], preferredTier?: ModelTier): string | null {
  if (models.length === 0) return null;

  if (preferredTier) {
    const tierMatch = models.find((model) => model.tier === preferredTier);
    if (tierMatch) return tierMatch.id;
  }

  return models[0]?.id ?? null;
}

function loadSavedNoteDetailLevel(): NoteTakerConfig['detailLevel'] {
  try {
    const raw = localStorage.getItem(NOTE_DETAIL_LEVEL_STORAGE_KEY);
    return raw === 'terse' || raw === 'brief' || raw === 'standard' || raw === 'detailed'
      ? raw
      : 'standard';
  } catch {
    return 'standard';
  }
}

export default function App() {
  const [participantPresets, setParticipantPresets] = useState<ParticipantPreset[]>(() => loadParticipantPresets());
  const [apiKey, setApiKey] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || '';
    return stored.replace(/[^\x20-\x7E]/g, '').trim();
  });
  const [showApiModal, setShowApiModal] = useState(!localStorage.getItem(STORAGE_KEY));
  const [participants, setParticipants] = useState<ActiveParticipant[]>(() => buildDefaultPanel(loadParticipantPresets()));
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset>(DISCUSSION_PRESETS[0]);
  const [topic, setTopic] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(180);
  const [attachmentContext, setAttachmentContext] = useState('');
  const [interjectionQueue, setInterjectionQueue] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [noteTakerConfig, setNoteTakerConfig] = useState<NoteTakerConfig>({
    selectedModel: NOTE_TAKER_DEFAULT_MODEL,
    detailLevel: loadSavedNoteDetailLevel(),
    enabled: true,
  });
  const [responseDelay, setResponseDelay] = useState(1500);
  const [selectedModelPreset, setSelectedModelPreset] = useState<string | null>(null);
  const [selectedPanelPreset, setSelectedPanelPreset] = useState<string | null>(null);
  const [savedPanelPresets, setSavedPanelPresets] = useState<PanelPreset[]>(() => {
    try {
      const stored = localStorage.getItem(PANEL_PRESETS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [systemInstructions, setSystemInstructions] = useState('');
  const [interjectText, setInterjectText] = useState('');
  const [roleVisibility, setRoleVisibility] = useState<RoleVisibility>(() => loadRoleVisibility(loadParticipantPresets()));
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [customTraits, setCustomTraits] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(TRAITS_LIST_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [...PERSONALITY_TRAITS];
    } catch { return [...PERSONALITY_TRAITS]; }
  });
  const [rightPanelTopSectionPercent, setRightPanelTopSectionPercent] = useState(RIGHT_PANEL_TOP_SECTION_DEFAULT);
  const [isPaused, setIsPaused] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showArtifactForm, setShowArtifactForm] = useState(false);
  const [artifactDocType, setArtifactDocType] = useState('');
  const [isGeneratingArtifact, setIsGeneratingArtifact] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem(TUTORIAL_STORAGE_KEY));
  const [totalConversationCost, setTotalConversationCost] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const interjectionRef = useRef<string[]>([]);
  const stopRequestedRef = useRef(false);
  const isPausedRef = useRef(false);
  const discussionStartedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef(0);
  const conversationHistoryRef = useRef<Message[]>([]);
  const noteTakerConfigRef = useRef(noteTakerConfig);
  const participantsRef = useRef(participants);
  const responseDelayRef = useRef(responseDelay);
  const rightSidebarRef = useRef<HTMLDivElement>(null);
  const isResizingRightPanelRef = useRef(false);

  useEffect(() => {
    noteTakerConfigRef.current = noteTakerConfig;
  }, [noteTakerConfig]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    responseDelayRef.current = responseDelay;
  }, [responseDelay]);

  useEffect(() => {
    localStorage.setItem(PANEL_PRESETS_STORAGE_KEY, JSON.stringify(savedPanelPresets));
  }, [savedPanelPresets]);

  useEffect(() => {
    localStorage.setItem(ROLE_LIBRARY_STORAGE_KEY, JSON.stringify(participantPresets));
  }, [participantPresets]);

  useEffect(() => {
    const traits: Record<string, PersonalityTrait[]> = {};
    const models: Record<string, string> = {};
    for (const p of participants) {
      traits[p.instanceId] = p.personalityTraits;
      models[p.instanceId] = p.selectedModel;
    }
    localStorage.setItem(TRAITS_STORAGE_KEY, JSON.stringify(traits));
    localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(models));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem(ROLE_VISIBILITY_STORAGE_KEY, JSON.stringify(roleVisibility));
  }, [roleVisibility]);

  useEffect(() => {
    const presetMap = new Map(participantPresets.map((preset) => [preset.role, preset]));

    setRoleVisibility((prev) => {
      const next = buildRoleVisibilityMap(participantPresets);
      for (const [role, visible] of Object.entries(prev)) {
        if (role in next) next[role] = visible;
      }
      return next;
    });

    setParticipants((prev) => {
      const roleCounts: Record<string, number> = {};

      return prev
        .filter((participant) => presetMap.has(participant.role))
        .map((participant) => {
          const preset = presetMap.get(participant.role);
          if (!preset) return participant;

          roleCounts[participant.role] = (roleCounts[participant.role] || 0) + 1;
          const count = roleCounts[participant.role];

          return {
            ...participant,
            label: count > 1 ? `${preset.label} #${count}` : preset.label,
            emoji: preset.emoji,
            color: preset.color,
            bgColor: preset.bgColor,
            borderColor: preset.borderColor,
            systemPrompt: preset.systemPrompt,
            personalityTraits:
              participant.personalityTraits.length > 0
                ? participant.personalityTraits
                : [...(preset.defaultPersonalityTraits ?? DEFAULT_PERSONALITY_TRAITS)],
          };
        });
    });
  }, [participantPresets]);

  useEffect(() => {
    localStorage.setItem(TRAITS_LIST_STORAGE_KEY, JSON.stringify(customTraits));
  }, [customTraits]);

  useEffect(() => {
    localStorage.setItem(NOTE_DETAIL_LEVEL_STORAGE_KEY, noteTakerConfig.detailLevel);
  }, [noteTakerConfig.detailLevel]);

  useEffect(() => {
    if (showTutorial) return;
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
  }, [showTutorial]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isResizingRightPanelRef.current || !rightSidebarRef.current) return;

      const bounds = rightSidebarRef.current.getBoundingClientRect();
      if (bounds.height === 0) return;

      const rawPercent = ((event.clientY - bounds.top) / bounds.height) * 100;
      const clampedPercent = Math.min(RIGHT_PANEL_TOP_SECTION_MAX, Math.max(RIGHT_PANEL_TOP_SECTION_MIN, rawPercent));
      setRightPanelTopSectionPercent(clampedPercent);
    };

    const handlePointerUp = () => {
      isResizingRightPanelRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchOpenRouterCatalog()
      .then((models) => {
        if (!cancelled) {
          setAvailableModels(models);
        }
      })
      .catch((error) => {
        console.error('Failed to load OpenRouter catalog', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (availableModels.length === 0) return;

    const modelIds = new Set(availableModels.map((model) => model.id));
    const defaultFallback = getFallbackModelId(availableModels, 'balanced') ?? getFallbackModelId(availableModels);
    const noteFallback = getFallbackModelId(availableModels, 'balanced') ?? defaultFallback;

    if (!defaultFallback) return;

    setParticipants((prev) =>
      prev.map((participant) =>
        modelIds.has(participant.selectedModel)
          ? participant
          : { ...participant, selectedModel: defaultFallback }
      )
    );

    if (noteFallback && !modelIds.has(noteTakerConfigRef.current.selectedModel)) {
      setNoteTakerConfig((prev) => ({ ...prev, selectedModel: noteFallback }));
    }
  }, [availableModels]);

  const { generateMessage, generateNote, generateArtifact, generateAnalysis, generateRecap, stopGeneration } = useOpenRouter({
    apiKey,
    participants,
    systemInstructions,
    onUsageCost: (cost) => {
      setTotalConversationCost((prev) => prev + cost);
    },
  });

  useEffect(() => {
    interjectionRef.current = interjectionQueue;
  }, [interjectionQueue]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (!isRunning) return;

    if (isPaused) {
      if (pausedAtRef.current === null) {
        pausedAtRef.current = Date.now();
      }
      return;
    }

    if (pausedAtRef.current !== null) {
      totalPausedMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
  }, [isPaused, isRunning]);

  const getElapsedDiscussionSeconds = useCallback(() => {
    if (discussionStartedAtRef.current === null) return 0;

    const now = pausedAtRef.current ?? Date.now();
    const elapsedMs = now - discussionStartedAtRef.current - totalPausedMsRef.current;

    return Math.max(Math.floor(elapsedMs / 1000), 0);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const syncElapsed = () => {
      setElapsedSeconds(Math.min(getElapsedDiscussionSeconds(), durationSeconds));
    };

    syncElapsed();
    const intervalId = window.setInterval(syncElapsed, 250);

    return () => window.clearInterval(intervalId);
  }, [durationSeconds, getElapsedDiscussionSeconds, isRunning]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSaveApiKey = (key: string) => {
    const safeKey = key.replace(/[^\x20-\x7E]/g, '').trim();
    setApiKey(safeKey);
    localStorage.setItem(STORAGE_KEY, safeKey);
    setShowApiModal(false);
  };

  const handleAddParticipant = useCallback((preset: ParticipantPreset) => {
    if (!roleVisibility[preset.role]) return;
    const savedTraits = loadSavedTraits();
    const savedModels = loadSavedModels();
    setParticipants((prev) => {
      const count = prev.filter((p) => p.role === preset.role).length + 1;
      const instanceId = `${preset.role}_${count}`;
      const label = count > 1 ? `${preset.label} #${count}` : preset.label;
      return [...prev, makeParticipant(preset, instanceId, label, savedTraits, savedModels)];
    });
  }, [roleVisibility]);

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

  useEffect(() => {
    setParticipants((prev) => prev.filter((participant) => roleVisibility[participant.role] !== false));
  }, [roleVisibility]);

  const handleToggleRoleVisibility = useCallback((role: ParticipantPreset['role']) => {
    setRoleVisibility((prev) => ({ ...prev, [role]: !prev[role] }));
  }, []);

  const handleModelChange = useCallback((instanceId: string, modelId: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.instanceId === instanceId ? { ...p, selectedModel: modelId } : p))
    );
  }, []);

  const handlePersonalityTraitsChange = useCallback((instanceId: string, traits: PersonalityTrait[]) => {
    setParticipants((prev) =>
      prev.map((p) => (p.instanceId === instanceId ? { ...p, personalityTraits: traits } : p))
    );
  }, []);

  const handlePresetApply = useCallback((tier: ModelTier, presetKey: string) => {
    const models = buildPresetModelMap(availableModels, tier);
    if (Object.keys(models).length === 0) return;

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
  }, [availableModels]);

  const handleApplyPanelPreset = useCallback((panelPreset: PanelPreset) => {
    const newParticipants: ActiveParticipant[] = [];
    const roleCounters: Record<string, number> = {};
    const savedTraits = loadSavedTraits();
    const savedModels = loadSavedModels();

    for (const { role, count, traits: slotTraits, models: slotModels } of panelPreset.participants) {
      const preset = participantPresets.find((p) => p.role === role);
      if (!preset) continue;
      if (!roleVisibility[role]) continue;

      for (let i = 0; i < count; i++) {
        roleCounters[role] = (roleCounters[role] || 0) + 1;
        const n = roleCounters[role];
        const instanceId = `${role}_${n}`;
        const label = count > 1 ? `${preset.label} #${n}` : preset.label;
        // Prefer traits/models stored in the preset; fall back to global localStorage
        const traitsOverride = slotTraits?.[i] ? { [instanceId]: slotTraits[i] } : savedTraits;
        const modelsOverride = slotModels?.[i] ? { [instanceId]: slotModels[i] } : savedModels;
        newParticipants.push(makeParticipant(preset, instanceId, label, traitsOverride, modelsOverride));
      }
    }

    setParticipants(newParticipants);
    setSelectedPanelPreset(panelPreset.id);

    if (panelPreset.discussionPresetId) {
      const discussionPreset = DISCUSSION_PRESETS.find((d) => d.id === panelPreset.discussionPresetId);
      if (discussionPreset) {
        setSelectedPreset(discussionPreset);
        setDurationSeconds(discussionPreset.durationSeconds);
      }
    }
  }, [participantPresets, roleVisibility]);

  const handleSavePanelPreset = useCallback((label: string) => {
    const roleGroups: Record<string, ActiveParticipant[]> = {};
    for (const p of participants) {
      if (!roleGroups[p.role]) roleGroups[p.role] = [];
      roleGroups[p.role].push(p);
    }
    const preset: PanelPreset = {
      id: `user_${Date.now()}`,
      label,
      emoji: '💾',
      description: `${participants.length} participants`,
      participants: Object.entries(roleGroups).map(([role, ps]) => ({
        role: role as PanelMember,
        count: ps.length,
        traits: ps.map((p) => p.personalityTraits),
        models: ps.map((p) => p.selectedModel),
      })),
    };
    setSavedPanelPresets((prev) => [...prev, preset]);
    setSelectedPanelPreset(preset.id);
  }, [participants]);

  const handleUpdatePanelPreset = useCallback((presetId: string) => {
    const roleGroups: Record<string, ActiveParticipant[]> = {};
    for (const p of participants) {
      if (!roleGroups[p.role]) roleGroups[p.role] = [];
      roleGroups[p.role].push(p);
    }
    setSavedPanelPresets((prev) =>
      prev.map((preset) => {
        if (preset.id !== presetId) return preset;
        return {
          ...preset,
          participants: Object.entries(roleGroups).map(([role, ps]) => ({
            role: role as PanelMember,
            count: ps.length,
            traits: ps.map((p) => p.personalityTraits),
            models: ps.map((p) => p.selectedModel),
          })),
        };
      })
    );
  }, [participants]);

  const handleDeletePanelPreset = useCallback((presetId: string) => {
    setSavedPanelPresets((prev) => prev.filter((p) => p.id !== presetId));
    setSelectedPanelPreset((prev) => prev === presetId ? null : prev);
  }, []);

  const handleAddTrait = useCallback((trait: string) => {
    const normalized = trait.trim().toLowerCase().replace(/\s+/g, '_');
    if (!normalized) return;
    setCustomTraits((prev) => prev.includes(normalized) ? prev : [...prev, normalized]);
  }, []);

  const handleRemoveTrait = useCallback((trait: string) => {
    setCustomTraits((prev) => prev.filter((t) => t !== trait));
  }, []);

  const handleUpsertRolePreset = useCallback((preset: ParticipantPreset) => {
    setParticipantPresets((prev) => {
      const next = [...prev];
      const index = next.findIndex((item) => item.role === preset.role);

      if (index >= 0) {
        next[index] = { ...next[index], ...preset };
        return next;
      }

      return [...next, preset];
    });
  }, []);

  const handleDeleteRolePreset = useCallback((role: string) => {
    setParticipantPresets((prev) => prev.filter((preset) => preset.role !== role));
    setRoleVisibility((prev) => {
      const next = { ...prev };
      delete next[role];
      return next;
    });
    setSavedPanelPresets((prev) =>
      prev.map((preset) => ({
        ...preset,
        participants: preset.participants.filter((participant) => participant.role !== role),
      }))
    );
  }, []);

  const handleSelectDiscussionPreset = useCallback((preset: Preset) => {
    setSelectedPreset(preset);
    setDurationSeconds(preset.durationSeconds);
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
    const highlightedMessage = highlightedMessageId
      ? messages.find((message) => message.id === highlightedMessageId)
      : null;
    const contextPrefix = highlightedMessage
      ? `About ${highlightedMessage.speakerLabel ? `${highlightedMessage.speakerLabel}'s` : 'the selected'} message: "${highlightedMessage.content.trim().slice(0, 240)}"\n\n`
      : '';
    const queueText = `${contextPrefix}${text}`.trim();

    setInterjectionQueue((prev) => {
      const next = [...prev, queueText];
      interjectionRef.current = next;
      return next;
    });

    const msg: Message = {
      id: generateId(),
      role: 'user',
      content: `✋ **[Interjection]** ${text}`,
      timestamp: new Date(),
      highlightedMessageId: highlightedMessageId ?? undefined,
    };

    setMessages((prev) => [...prev, msg]);
    setHighlightedMessageId(null);
    setIsPaused(false);
  }, [highlightedMessageId, messages]);

  const handleSubmitInterjection = useCallback(() => {
    const value = interjectText.trim();
    if (!value || !isRunning) return;
    handleInterject(value);
    setInterjectText('');
  }, [handleInterject, interjectText, isRunning]);

  const handleSolicitResponse = useCallback(async () => {
    const value = interjectText.trim();
    if (!value || conversationHistoryRef.current.length === 0) return;

    // Determine target: the author of the highlighted message, falling back to the moderator
    const highlightedMsg = highlightedMessageId
      ? messages.find((m) => m.id === highlightedMessageId)
      : null;
    const highlightedParticipant = highlightedMsg?.instanceId
      ? participantsRef.current.find((p) => p.instanceId === highlightedMsg.instanceId && p.isActive)
      : null;
    const moderator = participantsRef.current.find((p) => p.role === 'moderator' && p.isActive);
    const target = highlightedParticipant ?? moderator ?? participantsRef.current.find((p) => p.isActive);
    if (!target) return;

    setInterjectText('');
    setHighlightedMessageId(null);

    // Build context prefix mirroring handleInterject
    const highlightedSpeakerLabel = highlightedParticipant?.label ?? null;
    const contextPrefix = highlightedMsg
      ? `About ${highlightedSpeakerLabel ? `${highlightedSpeakerLabel}'s` : 'the selected'} message: "${highlightedMsg.content.trim().slice(0, 240)}"\n\n`
      : '';
    const fullText = `${contextPrefix}${value}`.trim();

    // Add moderator-defer hint when the target is the moderator so they can route
    const isModerator = target.role === 'moderator';
    const solicitHint = isModerator
      ? '\n\n[You may invite a specific panelist to respond directly if that is more appropriate.]'
      : '';

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: `✋ **[Direct prompt → ${target.emoji} ${target.label}]** ${value}`,
      timestamp: new Date(),
      highlightedMessageId: highlightedMessageId ?? undefined,
    };
    setMessages((prev) => [...prev, userMsg]);

    const injectionMsg: Message = { ...userMsg, content: `${fullText}${solicitHint}` };
    const history = [...conversationHistoryRef.current, injectionMsg];

    const msgId = generateId();
    const pendingMsg: Message = {
      id: msgId,
      role: 'assistant',
      panelMember: target.role,
      instanceId: target.instanceId,
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, pendingMsg]);
    setCurrentSpeakerId(target.instanceId);

    let fullContent = '';
    await new Promise<void>((resolve) => {
      generateMessage(
        target.instanceId,
        history,
        topic,
        attachmentContext,
        (chunk) => {
          fullContent += chunk;
          setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: fullContent } : m)));
        },
        () => {
          setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m)));
          conversationHistoryRef.current = [...history, { ...pendingMsg, content: fullContent, isStreaming: false }];
          resolve();
        },
        (err) => {
          const errContent = `⚠️ *Error: ${err}*`;
          setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: errContent, isStreaming: false } : m)));
          conversationHistoryRef.current = [...history, { ...pendingMsg, content: errContent, isStreaming: false }];
          resolve();
        }
      );
    });

    setCurrentSpeakerId(null);
  }, [interjectText, highlightedMessageId, messages, topic, attachmentContext, generateMessage]);

  const handleTogglePause = useCallback(() => {
    if (!isRunning) return;
    setIsPaused((prev) => !prev);
  }, [isRunning]);

  const runDiscussion = useCallback(async () => {
    if (!topic.trim()) return;

    const activeParticipants = participantsRef.current.filter((p) => p.isActive);
    if (activeParticipants.length === 0) return;

    setIsRunning(true);
    stopRequestedRef.current = false;
    setElapsedSeconds(0);
    discussionStartedAtRef.current = Date.now();
    pausedAtRef.current = null;
    totalPausedMsRef.current = 0;

    const preferredRoles = selectedPreset?.preferredRoles || [];
    const rolePriority = new Map(preferredRoles.map((role, index) => [role, index]));
    const finalOrder = [...activeParticipants].sort((a, b) => {
      const aPriority = rolePriority.get(a.role) ?? Number.MAX_SAFE_INTEGER;
      const bPriority = rolePriority.get(b.role) ?? Number.MAX_SAFE_INTEGER;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return a.label.localeCompare(b.label);
    });
    const moderator = finalOrder.find((participant) => participant.role === 'moderator');
    const nonModeratorParticipants = finalOrder.filter((participant) => participant.role !== 'moderator');

    const isContinuation = conversationHistoryRef.current.length > 0;
    let conversationHistory: Message[];
    let startingParticipantIndex = 0;
    let openingParticipants: typeof finalOrder = [];

    if (isContinuation) {
      conversationHistory = [...conversationHistoryRef.current];
      if (moderator) {
        openingParticipants = [moderator];
      }
    } else {
      const openingUserMsg: Message = {
        id: generateId(),
        role: 'user',
        content: `🎯 **PANEL DISCUSSION BRIEF**\n\n**Topic:** ${topic}\n\n**Discussion Type:** ${selectedPreset?.label || 'General'}\n\n**Framing:** ${selectedPreset?.discussionPrompt || ''}\n\n**Scope:** This discussion is planned for approximately ${Math.round(durationSeconds / 60)} minute${Math.round(durationSeconds / 60) !== 1 ? 's' : ''} — use this to calibrate depth and pacing. It's a guide, not a hard limit.\n\n---\n⚠️ Keep every response clearly anchored to this specific topic. Stay concrete and avoid drifting into generic slot design advice.${attachmentContext ? `\n\n**Reference Material Provided:**\n${attachmentContext}` : ''}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, openingUserMsg]);
      conversationHistory = [openingUserMsg];

      if (moderator) {
        openingParticipants = [moderator];
      }
    }

    const orderedParticipants = [
      ...nonModeratorParticipants.slice(startingParticipantIndex),
      ...nonModeratorParticipants.slice(0, startingParticipantIndex),
    ];

    while (!stopRequestedRef.current) {
      const elapsed = getElapsedDiscussionSeconds();
      if (elapsed >= durationSeconds) break;
      setElapsedSeconds(elapsed);

      const participantsThisRound = openingParticipants.length > 0 ? openingParticipants : orderedParticipants;
      openingParticipants = [];

      for (const participant of participantsThisRound) {
        if (stopRequestedRef.current) break;

        while (isPausedRef.current && !stopRequestedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

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

        while (isPausedRef.current && !stopRequestedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

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
      // check time after completing a full pass through participants
      if (getElapsedDiscussionSeconds() >= durationSeconds) break;
    }

    setElapsedSeconds(Math.min(getElapsedDiscussionSeconds(), durationSeconds));
    conversationHistoryRef.current = conversationHistory;
    setCurrentSpeakerId(null);
    setIsRunning(false);
    setIsPaused(false);
    discussionStartedAtRef.current = null;
    pausedAtRef.current = null;
    totalPausedMsRef.current = 0;
  }, [topic, selectedPreset, durationSeconds, attachmentContext, generateMessage, generateNote, getElapsedDiscussionSeconds]);

  const handleStop = useCallback(() => {
    stopRequestedRef.current = true;
    stopGeneration();
    setIsRunning(false);
    setCurrentSpeakerId(null);
    setIsPaused(false);
    discussionStartedAtRef.current = null;
    pausedAtRef.current = null;
    totalPausedMsRef.current = 0;
  }, [stopGeneration]);

  const handleReset = useCallback(() => {
    handleStop();
    setMessages([]);
    setAttachmentContext('');
    setInterjectionQueue([]);
    interjectionRef.current = [];
    conversationHistoryRef.current = [];
    setElapsedSeconds(0);
    discussionStartedAtRef.current = null;
    pausedAtRef.current = null;
    totalPausedMsRef.current = 0;
    setNotes([]);
    setInterjectText('');
    setHighlightedMessageId(null);
    setIsPaused(false);
    setTotalConversationCost(0);
  }, [handleStop]);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  const handleRestartTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  const handleTestNote = useCallback(async () => {
    if (!noteTakerConfig.enabled) return;

    const testParticipant = participantsRef.current.find(p => p.isActive) ?? participantsRef.current[0];
    if (!testParticipant) return;

    const testContent = "This is a test message to verify the note-taking functionality is working correctly. The system should generate a concise summary of this text.";
    const noteId = generateId();

    setNotes((prev) => [
      ...prev,
      {
        id: noteId,
        timestamp: new Date(),
        speakerInstanceId: testParticipant.instanceId,
        speakerLabel: testParticipant.label,
        speakerEmoji: testParticipant.emoji,
        summary: '',
        isStreaming: true,
      } satisfies NoteEntry,
    ]);

    let noteContent = '';

    try {
      await generateNote(
        testParticipant.label,
        testParticipant.emoji,
        testContent,
        noteTakerConfig.detailLevel,
        noteTakerConfig.selectedModel,
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
          console.error('[Test note failed]', err);
          setNotes((prev) =>
            prev.map((note) => (note.id === noteId ? { ...note, summary: `⚠️ ${err}`, isStreaming: false } : note))
          );
        }
      );
    } catch (err) {
      console.error('[Test note error]', err);
      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? { ...note, summary: `⚠️ ${err}`, isStreaming: false } : note))
      );
    }
  }, [noteTakerConfig.enabled, noteTakerConfig.detailLevel, noteTakerConfig.selectedModel, generateNote]);

  const handleRightPanelResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    isResizingRightPanelRef.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleGenerateArtifact = useCallback(async () => {
    const docType = artifactDocType.trim();
    if (!docType || conversationHistoryRef.current.length === 0) return;

    const moderator = participantsRef.current.find((p) => p.role === 'moderator' && p.isActive);
    const model = moderator?.selectedModel ?? participantsRef.current[0]?.selectedModel ?? 'anthropic/claude-3.5-sonnet';
    const moderatorInstanceId = moderator?.instanceId;

    setShowArtifactForm(false);
    setArtifactDocType('');
    setIsGeneratingArtifact(true);

    const msgId = generateId();
    const pendingMsg: Message = {
      id: msgId,
      role: 'assistant',
      panelMember: moderator?.role ?? 'moderator',
      instanceId: moderatorInstanceId,
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      isArtifact: true,
      artifactTitle: docType,
    };

    setMessages((prev) => [...prev, pendingMsg]);

    let fullContent = '';

    await generateArtifact(
      conversationHistoryRef.current,
      topic,
      docType,
      model,
      (chunk) => {
        fullContent += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: fullContent } : m))
        );
      },
      () => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m))
        );
        setIsGeneratingArtifact(false);
      },
      (err) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: `⚠️ *Error: ${err}*`, isStreaming: false } : m))
        );
        setIsGeneratingArtifact(false);
      }
    );
  }, [artifactDocType, topic, generateArtifact]);

  const handleGenerateAnalysis = useCallback(async () => {
    if (conversationHistoryRef.current.length === 0) return;

    const moderator = participantsRef.current.find((p) => p.role === 'moderator' && p.isActive);
    const model = moderator?.selectedModel ?? participantsRef.current[0]?.selectedModel ?? 'anthropic/claude-3.5-sonnet';
    const moderatorInstanceId = moderator?.instanceId;

    setIsGeneratingAnalysis(true);

    const msgId = generateId();
    const pendingMsg: Message = {
      id: msgId,
      role: 'assistant',
      panelMember: moderator?.role ?? 'moderator',
      instanceId: moderatorInstanceId,
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      isArtifact: true,
      artifactTitle: 'Conversation Flow Analysis',
    };

    setMessages((prev) => [...prev, pendingMsg]);

    let fullContent = '';

    await generateAnalysis(
      conversationHistoryRef.current,
      topic,
      durationSeconds,
      model,
      (chunk) => {
        fullContent += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: fullContent } : m))
        );
      },
      () => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m))
        );
        setIsGeneratingAnalysis(false);
      },
      (err) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: `⚠️ *Error: ${err}*`, isStreaming: false } : m))
        );
        setIsGeneratingAnalysis(false);
      }
    );
  }, [topic, durationSeconds, generateAnalysis]);

  const handleGenerateRecap = useCallback(async () => {
    if (conversationHistoryRef.current.length === 0) return;

    const moderator = participantsRef.current.find((p) => p.role === 'moderator' && p.isActive);
    const model = moderator?.selectedModel ?? participantsRef.current[0]?.selectedModel ?? 'anthropic/claude-3.5-sonnet';
    const moderatorInstanceId = moderator?.instanceId;

    setIsGeneratingRecap(true);

    const msgId = generateId();
    const pendingMsg: Message = {
      id: msgId,
      role: 'assistant',
      panelMember: moderator?.role ?? 'moderator',
      instanceId: moderatorInstanceId,
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      isArtifact: true,
      artifactTitle: 'Discussion Recap',
    };

    setMessages((prev) => [...prev, pendingMsg]);
    let fullContent = '';

    await generateRecap(
      conversationHistoryRef.current,
      topic,
      durationSeconds,
      model,
      (chunk) => {
        fullContent += chunk;
        setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: fullContent } : m)));
      },
      () => {
        setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m)));
        setIsGeneratingRecap(false);
      },
      (err) => {
        setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: `⚠️ *Error: ${err}*`, isStreaming: false } : m)));
        setIsGeneratingRecap(false);
      }
    );
  }, [topic, durationSeconds, generateRecap]);

  const activeCount = participants.filter((p) => p.isActive).length;

  const remainingSeconds = Math.max(durationSeconds - elapsedSeconds, 0);

  const formatClock = (totalSeconds: number) =>
    `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;

  const formattedConversationCost =
    totalConversationCost < 0.01
      ? `$${totalConversationCost.toFixed(4)}`
      : `$${totalConversationCost.toFixed(2)}`;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-white">
      <TutorialModal
        isOpen={showTutorial}
        onClose={handleCloseTutorial}
      />

      {showApiModal && (
        <ApiKeyModal
          onSave={handleSaveApiKey}
          existingKey={apiKey}
          apiKey={apiKey}
          participantPresets={participantPresets}
          roleVisibility={roleVisibility}
          onToggleRoleVisibility={handleToggleRoleVisibility}
          onUpsertRolePreset={handleUpsertRolePreset}
          onDeleteRolePreset={handleDeleteRolePreset}
          availableModels={availableModels}
          customTraits={customTraits}
          onAddTrait={handleAddTrait}
          onRemoveTrait={handleRemoveTrait}
        />
      )}

      <div data-tutorial="input-panel" className="flex w-64 flex-shrink-0 flex-col border-r border-gray-700/50 bg-gray-950">
        <div className="flex flex-shrink-0 flex-col" style={{ maxHeight: '40%' }}>
          <div className="border-b border-gray-700/50 bg-gray-900/80 px-3 py-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-xs font-bold text-white">Your Input</h2>
              {isRunning ? (
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] font-medium text-green-400">
                    {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')} / {Math.floor(durationSeconds / 60)}:{String(durationSeconds % 60).padStart(2, '0')}
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
            onTestNote={handleTestNote}
            models={availableModels}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-gray-950">
        <div className="flex items-center gap-3 border-b border-gray-700/50 bg-gray-900/80 px-4 py-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-800 text-gray-400">
            <MessagesSquare size={16} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-gray-200">
              {APP_TITLE} <span className="text-xs font-medium text-emerald-400">· {formattedConversationCost}</span>
            </h2>
            <p className="text-xs text-gray-500">
              {selectedPreset?.label} · {Math.round(durationSeconds / 60)}min · {activeCount} active
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

          <span className="text-[10px] font-medium text-gray-400">Tutorial -&gt;</span>

          <button
            onClick={handleRestartTutorial}
            title="Restart tutorial"
            className="group flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 transition-all hover:border-purple-500/60 hover:bg-gray-700"
          >
            <CircleHelp className="h-3.5 w-3.5 text-gray-400 transition-all group-hover:text-purple-300" />
          </button>

          <div data-tutorial="chat-features" className="flex items-center gap-2">
            <button
              onClick={() => setShowArtifactForm((v) => !v)}
              disabled={messages.length === 0 || isGeneratingArtifact}
              title="Generate a Markdown document from this discussion"
              className={`group flex h-7 items-center gap-1.5 flex-shrink-0 rounded-lg border px-2 transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                showArtifactForm
                  ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-emerald-600/50 hover:bg-gray-700 hover:text-emerald-300'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">Doc</span>
            </button>

            <button
              onClick={handleGenerateAnalysis}
              disabled={messages.length === 0 || isGeneratingAnalysis}
              title="Analyse the conversation flow — turning points, revelations, disagreements, alignments"
              className="group flex h-7 items-center gap-1.5 flex-shrink-0 rounded-lg border border-gray-700 bg-gray-800 px-2 text-gray-400 transition-all hover:border-violet-600/50 hover:bg-gray-700 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">{isGeneratingAnalysis ? 'Analysing…' : 'Analysis'}</span>
            </button>

            <button
              onClick={handleGenerateRecap}
              disabled={messages.length === 0 || isGeneratingRecap}
              title="Macro recap — what was covered, what was decided, what's still open"
              className="group flex h-7 items-center gap-1.5 flex-shrink-0 rounded-lg border border-gray-700 bg-gray-800 px-2 text-gray-400 transition-all hover:border-sky-600/50 hover:bg-gray-700 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">{isGeneratingRecap ? 'Recapping…' : 'Recap'}</span>
            </button>
          </div>

          <button
            data-tutorial="settings-button"
            onClick={() => setShowApiModal(true)}
            title="System settings"
            className="group flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 transition-all hover:border-gray-500 hover:bg-gray-700"
          >
            <Settings className="h-3.5 w-3.5 text-gray-400 transition-all duration-300 group-hover:rotate-45 group-hover:text-gray-200" />
          </button>
        </div>

        {showArtifactForm && (
          <div className="flex items-center gap-2 border-b border-emerald-700/40 bg-emerald-950/30 px-4 py-2.5">
            <FileText className="h-4 w-4 flex-shrink-0 text-emerald-400" />
            <input
              autoFocus
              value={artifactDocType}
              onChange={(e) => setArtifactDocType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGenerateArtifact();
                if (e.key === 'Escape') setShowArtifactForm(false);
              }}
              placeholder="Document type, e.g. Game Design Document, Executive Summary, Feature Spec…"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none"
            />
            <button
              onClick={handleGenerateArtifact}
              disabled={!artifactDocType.trim()}
              className="flex-shrink-0 rounded-lg border border-emerald-600/50 bg-emerald-700/30 px-3 py-1 text-xs font-medium text-emerald-300 transition-all hover:bg-emerald-700/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Generate
            </button>
            <button
              onClick={() => setShowArtifactForm(false)}
              className="flex-shrink-0 text-gray-500 hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div ref={messagesContainerRef} data-tutorial="conversation-feed" className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center select-none">
              <div className="mb-6 text-7xl animate-pulse">🎰</div>
              <h3 className="mb-3 text-2xl font-bold text-white">Welcome to {APP_NAME}</h3>
              <p className="mb-6 max-w-md text-sm leading-relaxed text-gray-400">
                Assemble a custom built panel of industry experts, level of intelligence, supply optional context and documents, set a brief, and let the discussion run. Steer it with interjections, 
                take live notes, and distill the results into analytical breakdowns and document artifacts.
                <br /><br />
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
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  participants={participants}
                  onHighlight={() => setHighlightedMessageId(msg.id)}
                  isHighlighted={msg.id === highlightedMessageId}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div data-tutorial="interjection-bar" className="border-t border-gray-700/50 bg-gray-900/85 px-4 py-3">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
            <div className="hidden shrink-0 text-[11px] text-amber-400 sm:block">
              {interjectionQueue.length > 0
                ? `✋ ${interjectionQueue.length} queued`
                : isRunning
                  ? '✋ Live interjection'
                  : messages.length > 0
                    ? '✋ Solicit response'
                    : '✋ Start a discussion to interject'}
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-amber-500/30 bg-gray-950/90 px-3 py-2 shadow-[0_0_0_1px_rgba(245,158,11,0.05)]">
              <button
                onClick={handleTogglePause}
                disabled={!apiKey || !isRunning}
                title={isPaused ? 'Resume discussion' : 'Pause before the next speaker'}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                  isPaused
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                    : 'border-amber-500/40 bg-gray-900 text-amber-400 hover:bg-gray-800'
                }`}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <input
                value={interjectText}
                onChange={(e) => setInterjectText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    isRunning ? handleSubmitInterjection() : handleSolicitResponse();
                  }
                }}
                placeholder={
                  isRunning
                    ? 'Type an interjection for the next turn...'
                    : messages.length > 0
                      ? highlightedMessageId ? 'Ask the highlighted participant...' : 'Solicit a response from a participant...'
                      : 'Interjections unlock during a live discussion'
                }
                disabled={!apiKey || messages.length === 0}
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none disabled:cursor-not-allowed"
              />
              <button
                onClick={isRunning ? handleSubmitInterjection : handleSolicitResponse}
                disabled={!apiKey || messages.length === 0 || !interjectText.trim()}
                title={isRunning ? 'Send interjection' : 'Solicit response from highlighted participant'}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white transition-all hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="hidden shrink-0 items-end text-right lg:flex lg:flex-col">
              {isRunning ? (
                <>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Time Left</span>
                  <span className="text-xs font-semibold text-green-400">{formatClock(remainingSeconds)}</span>
                </>
              ) : (
                <p className="max-w-[20rem] text-[10px] text-gray-600">
                  {participants.length} participant{participants.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          {highlightedMessageId && (() => {
            const highlighted = messages.find((message) => message.id === highlightedMessageId);
            return highlighted ? (
              <div className="mt-2 mx-auto max-w-3xl rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3 py-2 text-xs text-cyan-100">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 font-medium text-cyan-300">
                    <Hand className="h-3.5 w-3.5" />
                    {isRunning ? 'Interjecting about selected panel response' : 'Soliciting response about selected message'}
                  </span>
                  <button
                    onClick={() => setHighlightedMessageId(null)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-200"
                  >
                    Clear
                  </button>
                </div>
                <p className="line-clamp-2 text-cyan-50/90">{highlighted.content}</p>
              </div>
            ) : null;
          })()}
        </div>
      </div>

      <div ref={rightSidebarRef} className="flex w-72 flex-shrink-0 flex-col border-l border-gray-700/50">
        <div data-tutorial="discussion-controls" className="flex-shrink-0" style={{ height: `${rightPanelTopSectionPercent}%`, overflowY: 'auto' }}>
          <PanelSidebar
            participants={participants}
            onPresetApply={handlePresetApply}
            selectedPreset={selectedPreset}
            onSelectDiscussionPreset={handleSelectDiscussionPreset}
            currentSpeakerId={currentSpeakerId}
            isRunning={isRunning}
            hasHistory={messages.length > 0}
            onStart={runDiscussion}
            onStop={handleStop}
            onReset={handleReset}
            apiKey={apiKey}
            topic={topic}
            onTopicChange={setTopic}
            durationSeconds={durationSeconds}
            onDurationChange={setDurationSeconds}
            responseDelay={responseDelay}
            onResponseDelayChange={setResponseDelay}
            selectedModelPreset={selectedModelPreset}
            roleVisibility={roleVisibility}
            onToggleRoleVisibility={handleToggleRoleVisibility}
            availableModels={availableModels}
          />
        </div>

        <div
          onPointerDown={handleRightPanelResizeStart}
          className="group flex h-2 flex-shrink-0 cursor-row-resize items-center justify-center bg-gray-950/60 transition-colors hover:bg-gray-900"
          title="Drag to resize panel"
        >
          <div className="h-1 w-12 rounded-full bg-gray-700/80 transition-colors group-hover:bg-purple-500/70" />
        </div>

        <div data-tutorial="participant-roster" className="flex min-h-0 flex-1 flex-col border-t border-gray-700/50">
          <ParticipantRoster
            participants={participants}
            currentSpeakerId={currentSpeakerId}
            isRunning={isRunning}
            onAdd={handleAddParticipant}
            onClone={handleCloneParticipant}
            onRemove={handleRemoveParticipant}
            onToggleActive={handleToggleActive}
            onModelChange={handleModelChange}
            onPersonalityTraitsChange={handlePersonalityTraitsChange}
            onApplyPanelPreset={handleApplyPanelPreset}
            selectedPanelPreset={selectedPanelPreset}
            models={availableModels}
            participantPresets={participantPresets}
            roleVisibility={roleVisibility}
            savedPanelPresets={savedPanelPresets}
            onSavePanelPreset={handleSavePanelPreset}
            onUpdatePanelPreset={handleUpdatePanelPreset}
            onDeletePanelPreset={handleDeletePanelPreset}
            customTraits={customTraits}
          />
        </div>
      </div>
    </div>
  );
}
