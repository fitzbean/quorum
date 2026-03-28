export type MessageRole = 'user' | 'assistant' | 'system';

export type PanelMember =
  | 'moderator'
  | 'mathematician'
  | 'psychologist'
  | 'artist'
  | 'game_designer'
  | 'engineer'
  | 'producer'
  | 'marketing'
  | 'narrative'
  | 'sound'
  | 'qa'
  | 'legal'
  | 'player_advocate'
  | 'data_scientist'
  | 'monetization';

export type RoleVisibility = Record<PanelMember, boolean>;

export type NoteDetailLevel = 'brief' | 'standard' | 'detailed' | 'verbatim';

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

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  panelMember?: PanelMember;
  instanceId?: string; // unique per spawned participant
  timestamp: Date;
  isStreaming?: boolean;
  attachments?: Attachment[];
}

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
  tier: 'free' | 'budget' | 'mid' | 'premium' | 'flagship' | 'bleeding-edge';
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
  | 'postmortem';

export interface Preset {
  id: PresetType | string;
  label: string;
  emoji: string;
  description: string;
  discussionPrompt: string;
  preferredRoles: PanelMember[]; // suggested speaking order roles
  roundCount: number;
}

// A named discussion panel configuration (preset lineup of participants)
export interface PanelPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  participants: Array<{ role: PanelMember; count: number }>;
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
