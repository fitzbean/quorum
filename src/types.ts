export type MessageRole = 'user' | 'assistant' | 'system';

export type PanelMember = string;

export type RoleVisibility = Record<string, boolean>;

export type NoteDetailLevel = 'terse' | 'brief' | 'standard' | 'detailed';

export interface NoteEntry {
  id: string;
  timestamp: Date;
  speakerInstanceId: string;
  speakerLabel: string;
  speakerEmoji: string;
  summary: string;
  isStreaming?: boolean;
}

export interface NoteTakerConfig {
  selectedModel: string;
  detailLevel: NoteDetailLevel;
  enabled: boolean;
}

export interface GenerationSettings {
  artifactMaxTokens: number;
  analysisMaxTokens: number;
  recapMaxTokens: number;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  panelMember?: PanelMember;
  instanceId?: string; // unique per spawned participant
  timestamp: Date;
  isStreaming?: boolean;
  attachments?: Attachment[];
  highlightedMessageId?: string;
  isArtifact?: boolean;
  artifactTitle?: string;
  outputTokens?: number;
}

export const PERSONALITY_TRAITS: string[] = [
  'analytical',
  'blunt',
  'diplomatic',
  'cynical',
  'naysayer',
  'skeptical',
  'optimistic',
  'provocative',
  'playful',
  'visionary',
];

export type PersonalityTrait = string;

export interface Attachment {
  id: string;
  name: string;
  type: 'text' | 'pdf' | 'image';
  content: string; // base64 for images, text for others
  mimeType: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  pricing: { prompt: number; completion: number };
  tier: ModelTier;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
    instruct_type?: string;
  };
  topProvider?: {
    contextLength?: number;
    maxCompletionTokens?: number;
    isModerated?: boolean;
  };
  createdAt?: string;
}

export type ModelTier = 'free' | 'balanced' | 'last-generation' | 'bleeding-edge';

export interface ModelPresetDefinition {
  label: string;
  emoji: string;
  description: string;
  targetTier: ModelTier;
}

// Template for a type of participant (from the library)
export interface ParticipantPreset {
  role: PanelMember;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  defaultModel: string;
  systemPrompt: string;
  category: 'core' | 'creative' | 'technical' | 'business' | 'specialist';
  description: string;
  defaultPersonalityTraits?: PersonalityTrait[];
  isBuiltIn?: boolean;
}

// A spawned, active participant instance (has a unique instanceId)
export interface ActiveParticipant {
  instanceId: string;       // unique e.g. "game_designer_1"
  role: PanelMember;
  label: string;            // may be customized e.g. "Game Designer #2"
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  selectedModel: string;
  systemPrompt: string;
  isActive: boolean;        // can mute/unmute
  personalityTraits: PersonalityTrait[];
}

// Legacy compat alias
export type PanelMemberConfig = ActiveParticipant;

export type PresetType =
  | 'brainstorm'
  | 'critique'
  | 'mechanics'
  | 'compliance'
  | 'monetization'
  | 'accessibility'
  | 'pitch'
  | 'theme'
  | 'feature_sprint'
  | 'postmortem'
  | 'gdd'
  | 'sharktank';

export interface Preset {
  id: PresetType | string;
  label: string;
  emoji: string;
  description: string;
  discussionPrompt: string;
  preferredRoles: PanelMember[]; // suggested speaking order roles
  durationSeconds: number;
}

// A named discussion panel configuration (preset lineup of participants)
export interface PanelPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  participants: Array<{ role: PanelMember; count: number; traits?: PersonalityTrait[][]; models?: string[] }>;
  discussionPresetId?: string;
}

export interface ConversationState {
  messages: Message[];
  isRunning: boolean;
  currentRound: number;
  totalRounds: number;
  currentSpeaker: string | null;
  topic: string;
}
