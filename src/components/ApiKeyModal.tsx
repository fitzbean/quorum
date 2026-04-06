import { useEffect, useMemo, useState } from 'react';
import { Bot, ExternalLink, Eye, EyeOff, Key, Plus, Settings, Sliders, Sparkles, Trash2, Users, X, Dices } from 'lucide-react';
import { APP_BYLINE, APP_NAME } from '../appConfig';
import type { GenerationSettings, ModelOption, PanelMember, ParticipantPreset, RoleVisibility } from '../types';

type ModalTab = 'modelSettings' | 'roles' | 'traits';
type RoleEditorTab = 'info' | 'prompt';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
  existingKey?: string;
  apiKey?: string;
  participantPresets: ParticipantPreset[];
  roleVisibility?: RoleVisibility;
  onToggleRoleVisibility?: (role: PanelMember) => void;
  onUpsertRolePreset?: (preset: ParticipantPreset) => void;
  onDeleteRolePreset?: (role: PanelMember) => void;
  availableModels: ModelOption[];
  customTraits?: string[];
  onAddTrait?: (trait: string) => void;
  onRemoveTrait?: (trait: string) => void;
  generationSettings: GenerationSettings;
  onGenerationSettingsChange: (settings: Partial<GenerationSettings>) => void;
}

type RoleCategory = ParticipantPreset['category'];

const CATEGORY_LABELS: Record<RoleCategory, string> = {
  core: 'Core',
  creative: 'Creative',
  technical: 'Technical',
  business: 'Business',
  specialist: 'Specialist',
};

const CATEGORY_ORDER: RoleCategory[] = ['core', 'creative', 'technical', 'business', 'specialist'];
const ROLE_APPEARANCE_OPTIONS = [
  {
    id: 'indigo',
    label: 'Indigo',
    color: 'text-indigo-300',
    bgColor: 'bg-indigo-900/40',
    borderColor: 'border-indigo-500/60',
  },
  {
    id: 'purple',
    label: 'Purple',
    color: 'text-purple-300',
    bgColor: 'bg-purple-900/40',
    borderColor: 'border-purple-500/60',
  },
  {
    id: 'blue',
    label: 'Blue',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/40',
    borderColor: 'border-blue-500/60',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-900/40',
    borderColor: 'border-emerald-500/60',
  },
  {
    id: 'amber',
    label: 'Amber',
    color: 'text-amber-300',
    bgColor: 'bg-amber-900/40',
    borderColor: 'border-amber-500/60',
  },
  {
    id: 'rose',
    label: 'Rose',
    color: 'text-rose-300',
    bgColor: 'bg-rose-900/40',
    borderColor: 'border-rose-500/60',
  },
  {
    id: 'teal',
    label: 'Teal',
    color: 'text-teal-300',
    bgColor: 'bg-teal-900/40',
    borderColor: 'border-teal-500/60',
  },
  {
    id: 'slate',
    label: 'Slate',
    color: 'text-slate-300',
    bgColor: 'bg-slate-800/60',
    borderColor: 'border-slate-500/60',
  },
  {
    id: 'cyan',
    label: 'Cyan',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-900/40',
    borderColor: 'border-cyan-500/60',
  },
  {
    id: 'sky',
    label: 'Sky',
    color: 'text-sky-300',
    bgColor: 'bg-sky-900/40',
    borderColor: 'border-sky-500/60',
  },
  {
    id: 'violet',
    label: 'Violet',
    color: 'text-violet-300',
    bgColor: 'bg-violet-900/40',
    borderColor: 'border-violet-500/60',
  },
  {
    id: 'fuchsia',
    label: 'Fuchsia',
    color: 'text-fuchsia-300',
    bgColor: 'bg-fuchsia-900/40',
    borderColor: 'border-fuchsia-500/60',
  },
  {
    id: 'pink',
    label: 'Pink',
    color: 'text-pink-300',
    bgColor: 'bg-pink-900/40',
    borderColor: 'border-pink-500/60',
  },
  {
    id: 'orange',
    label: 'Orange',
    color: 'text-orange-300',
    bgColor: 'bg-orange-900/40',
    borderColor: 'border-orange-500/60',
  },
  {
    id: 'yellow',
    label: 'Yellow',
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-900/40',
    borderColor: 'border-yellow-500/60',
  },
  {
    id: 'lime',
    label: 'Lime',
    color: 'text-lime-300',
    bgColor: 'bg-lime-900/40',
    borderColor: 'border-lime-500/60',
  },
  {
    id: 'stone',
    label: 'Stone',
    color: 'text-stone-300',
    bgColor: 'bg-stone-900/40',
    borderColor: 'border-stone-500/60',
  },
] as const;

const TOKEN_LIMIT_OPTIONS = [2000, 3000, 4000, 6000, 8000, 12000, 16000, 24000, 32000, 48000, 64000, 96000, 128000];

const DEFAULT_ROLE_TEMPLATE = {
  role: '',
  label: '',
  emoji: '✨',
  color: 'text-indigo-300',
  bgColor: 'bg-indigo-900/40',
  borderColor: 'border-indigo-500/60',
  defaultModel: '',
  category: 'specialist' as RoleCategory,
  description: '',
  systemPrompt: '',
  defaultPersonalityTraits: ['analytical'],
  isBuiltIn: false,
};

function sanitizeRoleId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function pickPromptGeneratorModel(models: ModelOption[]): string {
  const preferred = [
    'google/gemini-2.0-flash-001',
    'openai/gpt-4o-mini',
    'anthropic/claude-3-haiku',
    'google/gemini-2.5-flash',
  ];

  for (const id of preferred) {
    if (models.some((model) => model.id === id)) return id;
  }

  return models[0]?.id ?? '';
}

function buildDraft(preset: ParticipantPreset | null, availableModels: ModelOption[]): ParticipantPreset {
  return {
    ...DEFAULT_ROLE_TEMPLATE,
    defaultModel: availableModels[0]?.id ?? '',
    ...preset,
    defaultPersonalityTraits:
      preset?.defaultPersonalityTraits && preset.defaultPersonalityTraits.length > 0
        ? [...preset.defaultPersonalityTraits]
        : [...DEFAULT_ROLE_TEMPLATE.defaultPersonalityTraits],
  };
}

function normalizePresetForCompare(preset: ParticipantPreset) {
  return JSON.stringify({
    role: preset.role,
    label: preset.label,
    emoji: preset.emoji,
    color: preset.color,
    bgColor: preset.bgColor,
    borderColor: preset.borderColor,
    defaultModel: preset.defaultModel,
    category: preset.category,
    description: preset.description,
    systemPrompt: preset.systemPrompt,
    defaultPersonalityTraits: [...(preset.defaultPersonalityTraits ?? [])].sort(),
    isBuiltIn: Boolean(preset.isBuiltIn),
  });
}

function getAppearanceOptionId(preset: ParticipantPreset): string {
  return (
    ROLE_APPEARANCE_OPTIONS.find(
      (option) =>
        option.color === preset.color &&
        option.bgColor === preset.bgColor &&
        option.borderColor === preset.borderColor
    )?.id ?? ROLE_APPEARANCE_OPTIONS[0].id
  );
}

export function ApiKeyModal({
  onSave,
  existingKey,
  apiKey,
  participantPresets,
  roleVisibility,
  onToggleRoleVisibility,
  onUpsertRolePreset,
  onDeleteRolePreset,
  availableModels,
  customTraits,
  onAddTrait,
  onRemoveTrait,
  generationSettings,
  onGenerationSettingsChange,
}: ApiKeyModalProps) {
  const sanitize = (value: string) => value.replace(/[^\x20-\x7E]/g, '').trim();
  const [key, setKey] = useState(sanitize(existingKey || ''));
  const [show, setShow] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('roles');
  const [newTrait, setNewTrait] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>(participantPresets[0]?.role ?? '__new__');
  const [roleDraft, setRoleDraft] = useState<ParticipantPreset>(() => buildDraft(participantPresets[0] ?? null, availableModels));
  const [promptModel, setPromptModel] = useState(() => pickPromptGeneratorModel(availableModels));
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [isGeneratingTrait, setIsGeneratingTrait] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState<RoleCategory | 'all'>('all');
  const [appearanceOptionId, setAppearanceOptionId] = useState<string>(() => ROLE_APPEARANCE_OPTIONS[0].id);
  const [isRoleIdManuallyEdited, setIsRoleIdManuallyEdited] = useState(false);
  const [roleEditorTab, setRoleEditorTab] = useState<RoleEditorTab>('info');

  const isFirstTime = !existingKey;
  const hasChanged = sanitize(key) !== sanitize(existingKey || '');
  const selectedPreset = participantPresets.find((preset) => preset.role === selectedRoleId) ?? null;
  const enabledCount = roleVisibility
    ? participantPresets.filter((preset) => roleVisibility[preset.role] !== false).length
    : participantPresets.length;
  const isNewRole = selectedRoleId === '__new__';
  const roleExists = participantPresets.some((preset) => preset.role === roleDraft.role);
  const hasRoleChanges = isNewRole
    ? Boolean(
        roleDraft.role ||
        roleDraft.label ||
        roleDraft.description ||
        roleDraft.systemPrompt ||
        roleDraft.emoji !== DEFAULT_ROLE_TEMPLATE.emoji ||
        roleDraft.category !== DEFAULT_ROLE_TEMPLATE.category ||
        roleDraft.defaultModel !== (availableModels[0]?.id ?? '') ||
        (roleDraft.defaultPersonalityTraits ?? []).join('|') !== DEFAULT_ROLE_TEMPLATE.defaultPersonalityTraits.join('|')
      )
    : selectedPreset
      ? normalizePresetForCompare(roleDraft) !== normalizePresetForCompare(selectedPreset)
      : false;
  const canSaveRole =
    hasRoleChanges &&
    Boolean(roleDraft.role && roleDraft.label && roleDraft.description && roleDraft.systemPrompt.trim()) &&
    (!isNewRole || !roleExists);

  useEffect(() => {
    if (!availableModels.length) return;
    setPromptModel((current) => current || pickPromptGeneratorModel(availableModels));
    setRoleDraft((current) => ({
      ...current,
      defaultModel: current.defaultModel || availableModels[0]?.id || '',
    }));
  }, [availableModels]);

  useEffect(() => {
    const nextPreset = participantPresets.find((preset) => preset.role === selectedRoleId) ?? null;
    if (!nextPreset && !isNewRole && participantPresets.length > 0) {
      setSelectedRoleId(participantPresets[0].role);
      return;
    }

    setRoleDraft(buildDraft(nextPreset, availableModels));
    setAppearanceOptionId(nextPreset ? getAppearanceOptionId(nextPreset) : getAppearanceOptionId(buildDraft(null, availableModels)));
    setIsRoleIdManuallyEdited(false);
    setRoleEditorTab('info');
    setGenerationError('');
  }, [availableModels, isNewRole, participantPresets, selectedRoleId]);

  const filteredLibraryPresets = useMemo(
    () =>
      libraryCategoryFilter === 'all'
        ? participantPresets
        : participantPresets.filter((preset) => preset.category === libraryCategoryFilter),
    [libraryCategoryFilter, participantPresets]
  );

  const handleSave = () => {
    const safe = sanitize(key);
    if (safe) onSave(safe);
  };

  const handleClose = () => {
    if (existingKey) onSave(existingKey);
  };

  const handleStartNewRole = () => {
    setSelectedRoleId('__new__');
    const nextDraft = buildDraft(null, availableModels);
    setRoleDraft(nextDraft);
    setAppearanceOptionId(getAppearanceOptionId(nextDraft));
    setIsRoleIdManuallyEdited(false);
    setRoleEditorTab('info');
    setGenerationError('');
  };

  const handleSaveRole = () => {
    if (!onUpsertRolePreset || !canSaveRole) return;

    const normalizedRole = sanitizeRoleId(roleDraft.role);
    const normalizedPreset: ParticipantPreset = {
      ...roleDraft,
      role: normalizedRole,
      label: roleDraft.label.trim(),
      description: roleDraft.description.trim(),
      systemPrompt: roleDraft.systemPrompt.trim(),
      defaultPersonalityTraits: (roleDraft.defaultPersonalityTraits ?? []).filter(Boolean),
      isBuiltIn: selectedPreset?.isBuiltIn ?? false,
    };

    onUpsertRolePreset(normalizedPreset);
    setSelectedRoleId(normalizedRole);
  };

  const handleGeneratePrompt = async () => {
    if (!apiKey || !roleDraft.label.trim() || !roleDraft.description.trim()) {
      setGenerationError('Add an API key, role name, and description first.');
      return;
    }

    setIsGeneratingPrompt(true);
    setGenerationError('');

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': APP_NAME,
        },
        body: JSON.stringify({
          model: promptModel,
          messages: [
            {
              role: 'system',
              content:
                'You write strong system prompts for role-based AI collaborators. Output only the final system prompt text with no commentary.',
            },
            {
              role: 'user',
              content:
                `Create a system prompt for a panel participant role in a collaborative discussion app.\n\n` +
                `Role name: ${roleDraft.label}\n` +
                `Role id: ${sanitizeRoleId(roleDraft.role || roleDraft.label)}\n` +
                `Category: ${roleDraft.category}\n` +
                `Short description: ${roleDraft.description}\n` +
                `Default personality traits: ${(roleDraft.defaultPersonalityTraits ?? []).join(', ') || 'none'}\n\n` +
                `Requirements:\n` +
                `- Make the role feel expert, specific, and useful.\n` +
                `- Tell the role what expertise it covers.\n` +
                `- Keep responses concise and collaborative in a live panel chat.\n` +
                `- Encourage direct engagement with other panelists.\n` +
                `- Keep the prompt under 260 words.\n` +
                `- Use plain text paragraphs and bullets if helpful.\n` +
                `- Do not mention these instructions or the app UI.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 450,
        }),
      });

      if (!response.ok) {
        throw new Error(`Prompt generation failed (${response.status})`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('No prompt returned by the model.');
      }

      setRoleDraft((current) => ({ ...current, systemPrompt: content }));
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Prompt generation failed.');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleGenerateMetadata = async () => {
    if (!apiKey || !roleDraft.label.trim()) {
      setGenerationError('Add an API key and role name first.');
      return;
    }

    setIsGeneratingMetadata(true);
    setGenerationError('');

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': APP_NAME,
        },
        body: JSON.stringify({
          model: promptModel,
          messages: [
            {
              role: 'system',
              content:
                'You classify AI collaborator roles based on their name and context. Carefully analyze the role name to generate a fitting emoji, appropriate category, and relevant description. Return valid JSON only with keys emoji, category, and description. Category must be one of: core, creative, technical, business, specialist. Emoji must be a single emoji that represents the role. Description should be a concise one-line summary under 80 characters that captures the essence of what this role does.',
            },
            {
              role: 'user',
              content:
                `Based on the following role details, generate appropriate metadata:\n\n` +
                `Role name: "${roleDraft.label}"\n` +
                `Current description: ${roleDraft.description || '(none)'}\n` +
                `System prompt: ${roleDraft.systemPrompt || '(none)'}`,
            },
          ],
          temperature: 0.4,
          max_tokens: 80,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`Metadata generation failed (${response.status})`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawContent = data.choices?.[0]?.message?.content?.trim();
      if (!rawContent) {
        throw new Error('No metadata returned by the model.');
      }

      const parsed = JSON.parse(rawContent) as { emoji?: string; category?: string; description?: string };
      const nextCategory = CATEGORY_ORDER.includes((parsed.category ?? '') as RoleCategory)
        ? (parsed.category as RoleCategory)
        : roleDraft.category;

      setRoleDraft((current) => ({
        ...current,
        emoji: parsed.emoji?.trim() || current.emoji,
        category: nextCategory,
        description: parsed.description?.trim() || current.description,
      }));
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Metadata generation failed.');
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  const handleGenerateTrait = async () => {
    if (!apiKey || !onAddTrait) {
      setGenerationError('Add an API key first.');
      return;
    }

    setIsGeneratingTrait(true);
    setGenerationError('');

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': APP_NAME,
        },
        body: JSON.stringify({
          model: promptModel,
          messages: [
            {
              role: 'system',
              content:
                'Generate exactly one concise personality trait for an AI discussion participant. Output only the trait in lowercase using underscores if needed. No punctuation, no explanation.',
            },
            {
              role: 'user',
              content:
                `Existing traits: ${(customTraits ?? []).join(', ')}\n` +
                'Return a new distinct trait that would be useful in a collaborative panel discussion app.',
            },
          ],
          temperature: 1,
          max_tokens: 20,
        }),
      });

      if (!response.ok) {
        throw new Error(`Trait generation failed (${response.status})`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('No trait returned by the model.');
      }

      const normalized = content.toLowerCase().replace(/[^a-z0-9\s_-]/g, '').trim().replace(/[\s-]+/g, '_');
      if (!normalized) {
        throw new Error('Generated trait was invalid.');
      }

      onAddTrait(normalized);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Trait generation failed.');
    } finally {
      setIsGeneratingTrait(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        data-tutorial="settings-window"
        className="relative flex max-h-[90vh] w-full flex-col rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl"
        style={{ maxWidth: isFirstTime ? '28rem' : '62rem' }}
      >
        {!isFirstTime && (
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-400 transition-all hover:bg-gray-700 hover:text-gray-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="flex items-center gap-3 px-8 pb-5 pt-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-amber-500">
            {isFirstTime ? <Dices className="h-6 w-6 text-white" /> : <Settings className="h-6 w-6 text-white" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{isFirstTime ? APP_NAME : 'System Settings'}</h2>
            <p className="text-sm text-gray-400">{isFirstTime ? APP_BYLINE : 'Role library, traits, and model output settings'}</p>
          </div>
        </div>

        {!isFirstTime && (
          <div className="mx-8 mb-0 flex gap-0.5 rounded-xl bg-gray-800/80 p-0.5">
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${activeTab === 'roles' ? 'bg-indigo-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Roles
                <span className="rounded-full bg-gray-700 px-1.5 py-0 text-[9px] text-gray-300">{enabledCount}/{participantPresets.length}</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('traits')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${activeTab === 'traits' ? 'bg-emerald-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Sliders className="h-3.5 w-3.5" /> Traits
                <span className="rounded-full bg-gray-700 px-1.5 py-0 text-[9px] text-gray-300">{customTraits?.length ?? 0}</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('modelSettings')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${activeTab === 'modelSettings' ? 'bg-purple-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <span className="flex items-center justify-center gap-1.5"><Key className="h-3.5 w-3.5" /> Model Settings</span>
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {(activeTab === 'modelSettings' || isFirstTime) && (
            <div className="px-8 py-6">
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <Key className="h-4 w-4 text-amber-400" />
                  <label className="text-sm font-medium text-gray-300">OpenRouter API Key</label>
                </div>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={key}
                    onChange={(event) => setKey(sanitize(event.target.value))}
                    placeholder="sk-or-v1-..."
                    className="w-full rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 pr-12 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                    onKeyDown={(event) => event.key === 'Enter' && handleSave()}
                    onPaste={(event) => {
                      event.preventDefault();
                      setKey(sanitize(event.clipboardData.getData('text')));
                    }}
                  />
                  <button
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {!isFirstTime && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${existingKey ? 'bg-green-400' : 'bg-red-400'}`} />
                    <p className="text-xs text-gray-500">
                      {existingKey ? (hasChanged ? 'New key entered, save to apply.' : 'Key active and stored locally in this browser.') : 'No key saved yet.'}
                    </p>
                  </div>
                )}
                {isFirstTime && (
                  <p className="mt-2 text-xs text-gray-500">
                    Your key stays in local storage and is only used for OpenRouter requests.
                  </p>
                )}
              </div>

              {!isFirstTime && (
                <div className="mb-6 rounded-2xl border border-gray-700 bg-gray-800/60 p-4">
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Document Output Caps</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">
                      These limits control the `max_tokens` sent for long-form artifact generation. Raise them if docs, analysis, or recaps are stopping too early.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Artifacts</span>
                      <select
                        value={generationSettings.artifactMaxTokens}
                        onChange={(event) =>
                          onGenerationSettingsChange({
                            artifactMaxTokens: Number(event.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                      >
                        {TOKEN_LIMIT_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option.toLocaleString()} tokens</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Analysis</span>
                      <select
                        value={generationSettings.analysisMaxTokens}
                        onChange={(event) =>
                          onGenerationSettingsChange({
                            analysisMaxTokens: Number(event.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                      >
                        {TOKEN_LIMIT_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option.toLocaleString()} tokens</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Recap</span>
                      <select
                        value={generationSettings.recapMaxTokens}
                        onChange={(event) =>
                          onGenerationSettingsChange({
                            recapMaxTokens: Number(event.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                      >
                        {TOKEN_LIMIT_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option.toLocaleString()} tokens</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Limits are stored locally in this browser and applied immediately to future artifact, analysis, and recap requests.
                  </p>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={!key.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-amber-500 py-3 font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isFirstTime ? 'Enter the Panel Room' : hasChanged ? 'Save New Key' : 'Confirm & Close'}
              </button>

              <div className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-500">
                <span>Get your API key at</span>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                >
                  openrouter.ai/keys
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {activeTab === 'roles' && !isFirstTime && (
            <div className="grid gap-6 px-8 py-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Role Library</p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-400">
                        Pick a role here to edit it, or add a new one from scratch.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartNewRole}
                      className="inline-flex items-center gap-1 rounded-xl border border-indigo-600/50 bg-indigo-700/30 px-3 py-2 text-xs font-semibold text-indigo-200 transition-all hover:bg-indigo-700/50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setLibraryCategoryFilter('all')}
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition-all ${
                        libraryCategoryFilter === 'all'
                          ? 'border-indigo-500/50 bg-indigo-700/30 text-indigo-200'
                          : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                      }`}
                    >
                      All
                    </button>
                    {CATEGORY_ORDER.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setLibraryCategoryFilter(category)}
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition-all ${
                          libraryCategoryFilter === category
                            ? 'border-indigo-500/50 bg-indigo-700/30 text-indigo-200'
                            : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                        }`}
                      >
                        {CATEGORY_LABELS[category]}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                    {filteredLibraryPresets.map((preset) => (
                      <div
                        key={preset.role}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                          selectedRoleId === preset.role ? 'border-indigo-500/70 bg-indigo-900/20' : 'border-gray-700 bg-gray-900'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedRoleId(preset.role)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className="text-base">{preset.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-semibold text-gray-100">{preset.label}</div>
                            <div className="truncate text-[10px] text-gray-500">{preset.role}</div>
                          </div>
                        </button>
                        {onToggleRoleVisibility && (
                          <button
                            type="button"
                            onClick={() => onToggleRoleVisibility(preset.role)}
                            title={roleVisibility?.[preset.role] !== false ? 'Hide role' : 'Show role'}
                            aria-label={roleVisibility?.[preset.role] !== false ? `Hide ${preset.label}` : `Show ${preset.label}`}
                            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                              roleVisibility?.[preset.role] !== false
                                ? 'border-indigo-500/50 bg-indigo-700/30 text-indigo-200'
                                : 'border-gray-700 bg-gray-800 text-gray-400'
                            }`}
                          >
                            {roleVisibility?.[preset.role] !== false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    ))}
                    {filteredLibraryPresets.length === 0 && (
                      <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/60 px-3 py-4 text-center text-xs text-gray-500">
                        No roles in this category yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-4">
                  <div className="mb-4 flex gap-1 rounded-xl bg-gray-900/80 p-1">
                    <button
                      type="button"
                      onClick={() => setRoleEditorTab('info')}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                        roleEditorTab === 'info' ? 'bg-indigo-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Role Information
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleEditorTab('prompt')}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                        roleEditorTab === 'prompt' ? 'bg-fuchsia-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      System Prompt
                    </button>
                  </div>

                  {roleEditorTab === 'info' && (
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Role Name</span>
                          <input
                            value={roleDraft.label}
                            onChange={(event) =>
                              setRoleDraft((current) => {
                                const nextLabel = event.target.value;
                                return {
                                  ...current,
                                  label: nextLabel,
                                  role: isNewRole && !isRoleIdManuallyEdited ? sanitizeRoleId(nextLabel) : current.role,
                                };
                              })
                            }
                            placeholder="AI Strategist"
                            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Role ID</span>
                          <input
                            value={roleDraft.role}
                            onChange={(event) => {
                              setIsRoleIdManuallyEdited(true);
                              setRoleDraft((current) => ({ ...current, role: sanitizeRoleId(event.target.value) }));
                            }}
                            disabled={!isNewRole}
                            placeholder="ai_strategist"
                            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                          />
                        </label>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)]">
                        <label className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Emoji</span>
                          <input
                            value={roleDraft.emoji}
                            onChange={(event) => setRoleDraft((current) => ({ ...current, emoji: event.target.value }))}
                            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Category</span>
                          <div className="flex gap-2">
                            <select
                              value={roleDraft.category}
                              onChange={(event) => setRoleDraft((current) => ({ ...current, category: event.target.value as RoleCategory }))}
                              className="min-w-0 flex-1 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                            >
                              {CATEGORY_ORDER.map((category) => (
                                <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleGenerateMetadata}
                              disabled={isGeneratingMetadata}
                              className="inline-flex items-center gap-1 rounded-xl border border-indigo-600/50 bg-indigo-700/20 px-3 py-2 text-xs font-semibold text-indigo-200 transition-all hover:bg-indigo-700/40 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              {isGeneratingMetadata ? 'Generating...' : 'Generate'}
                            </button>
                          </div>
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Default Model</span>
                          <select
                            value={roleDraft.defaultModel}
                            onChange={(event) => setRoleDraft((current) => ({ ...current, defaultModel: event.target.value }))}
                            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                          >
                            {availableModels.map((model) => (
                              <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Description</span>
                        <textarea
                          value={roleDraft.description}
                          onChange={(event) => setRoleDraft((current) => ({ ...current, description: event.target.value }))}
                          placeholder="Business-focused sparring partner for strategy, positioning, and decision quality."
                          className="h-32 w-full resize-none rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Appearance</span>
                        <select
                          value={appearanceOptionId}
                          onChange={(event) => {
                            const option = ROLE_APPEARANCE_OPTIONS.find((item) => item.id === event.target.value);
                            if (!option) return;
                            setAppearanceOptionId(option.id);
                            setRoleDraft((current) => ({
                              ...current,
                              color: option.color,
                              bgColor: option.bgColor,
                              borderColor: option.borderColor,
                            }));
                          }}
                          className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                        >
                          {ROLE_APPEARANCE_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                      </label>

                      <div>
                        <div className="mb-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Default Personality Traits</p>
                          <p className="text-xs text-gray-500">These are applied when a fresh participant of this role is added.</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(customTraits ?? []).map((trait) => {
                            const selected = roleDraft.defaultPersonalityTraits?.includes(trait);
                            return (
                              <button
                                key={trait}
                                type="button"
                                onClick={() =>
                                  setRoleDraft((current) => ({
                                    ...current,
                                    defaultPersonalityTraits: selected
                                      ? (current.defaultPersonalityTraits ?? []).filter((item) => item !== trait)
                                      : [...(current.defaultPersonalityTraits ?? []), trait],
                                  }))
                                }
                                className={`rounded-full border px-2 py-1 text-[10px] capitalize transition-all ${
                                  selected ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200' : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                                }`}
                              >
                                {trait}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {roleEditorTab === 'prompt' && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="min-w-0 flex-1 space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Prompt Generator Model</span>
                          <select
                            value={promptModel}
                            onChange={(event) => setPromptModel(event.target.value)}
                            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                          >
                            {availableModels.map((model) => (
                              <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={handleGeneratePrompt}
                          disabled={isGeneratingPrompt || !availableModels.length}
                          className="inline-flex items-center gap-1 rounded-xl border border-fuchsia-600/50 bg-fuchsia-700/20 px-3 py-2 text-xs font-semibold text-fuchsia-200 transition-all hover:bg-fuchsia-700/40 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {isGeneratingPrompt ? 'Generating...' : 'Generate Prompt'}
                        </button>
                      </div>

                      <label className="space-y-1">
                        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                          <Bot className="h-3.5 w-3.5" /> System Prompt
                        </span>
                        <textarea
                          value={roleDraft.systemPrompt}
                          onChange={(event) => setRoleDraft((current) => ({ ...current, systemPrompt: event.target.value }))}
                          placeholder="Define the role's expertise, boundaries, and conversational style..."
                          className="h-[23rem] w-full resize-none rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm leading-relaxed text-gray-200 focus:border-indigo-500 focus:outline-none"
                        />
                      </label>
                    </div>
                  )}

                  {generationError && <p className="mt-3 text-xs text-rose-400">{generationError}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSaveRole}
                    disabled={!canSaveRole}
                    className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isNewRole ? 'Create Role' : 'Save Role'}
                  </button>
                  {!isNewRole && !selectedPreset?.isBuiltIn && onDeleteRolePreset && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteRolePreset(roleDraft.role);
                        setSelectedRoleId(participantPresets[0]?.role ?? '__new__');
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-600/40 bg-rose-900/20 px-4 py-2 text-sm font-semibold text-rose-200 transition-all hover:bg-rose-900/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Role
                    </button>
                  )}
                  {roleExists && isNewRole && (
                    <p className="self-center text-xs text-amber-400">That role id already exists. Pick a different id.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'traits' && !isFirstTime && customTraits && onAddTrait && onRemoveTrait && (
            <div className="space-y-5 px-8 py-6">
              <p className="text-xs leading-relaxed text-gray-500">
                These traits are available across the app, including the default trait sets used by your saved roles.
              </p>

              <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
                <div className="space-y-4 rounded-2xl border border-gray-700 bg-gray-800/60 p-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Add Trait</p>
                    <p className="mt-1 text-xs text-gray-500">Create a custom reusable personality trait.</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newTrait}
                      onChange={(event) => setNewTrait(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && newTrait.trim()) {
                          onAddTrait(newTrait);
                          setNewTrait('');
                        }
                      }}
                      placeholder="Add trait..."
                      className="flex-1 rounded-xl border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (newTrait.trim()) {
                          onAddTrait(newTrait);
                          setNewTrait('');
                        }
                      }}
                      disabled={!newTrait.trim()}
                      className="rounded-xl border border-emerald-600/50 bg-emerald-700/40 px-3 py-2 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-700/60 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleGenerateTrait}
                      disabled={isGeneratingTrait}
                      className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-indigo-600/50 bg-indigo-700/20 px-3 py-2 text-xs font-semibold text-indigo-200 transition-all hover:bg-indigo-700/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {isGeneratingTrait ? 'Generating Trait...' : 'Generate Trait (AI)'}
                    </button>
                    <p className="text-xs text-gray-500">Creates a random new trait that is not already in your list.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Available Traits</p>
                      <p className="mt-1 text-xs text-gray-500">{customTraits.length} total</p>
                    </div>
                  </div>
                  <div className="flex max-h-[24rem] flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {customTraits.map((trait) => (
                      <span key={trait} className="flex items-center gap-1 rounded-full border border-gray-600 bg-gray-800 px-2.5 py-1 text-xs text-gray-200">
                        <span className="capitalize">{trait.replace(/_/g, ' ')}</span>
                        <button
                          type="button"
                          onClick={() => onRemoveTrait(trait)}
                          className="ml-0.5 leading-none text-gray-500 transition-colors hover:text-red-400"
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {generationError && <p className="text-xs text-rose-400">{generationError}</p>}

              <button
                onClick={handleClose}
                className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-600"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
