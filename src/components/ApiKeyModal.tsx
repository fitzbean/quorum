import { useEffect, useMemo, useState } from 'react';
import { Bot, ExternalLink, Eye, EyeOff, Key, Plus, Settings, Sliders, Sparkles, Trash2, Users, X, Dices } from 'lucide-react';
import { APP_BYLINE, APP_NAME } from '../appConfig';
import type { ModelOption, PanelMember, ParticipantPreset, RoleVisibility } from '../types';

type ModalTab = 'connection' | 'roles' | 'traits';

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
}: ApiKeyModalProps) {
  const sanitize = (value: string) => value.replace(/[^\x20-\x7E]/g, '').trim();
  const [key, setKey] = useState(sanitize(existingKey || ''));
  const [show, setShow] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('connection');
  const [newTrait, setNewTrait] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>(participantPresets[0]?.role ?? '__new__');
  const [roleDraft, setRoleDraft] = useState<ParticipantPreset>(() => buildDraft(participantPresets[0] ?? null, availableModels));
  const [promptModel, setPromptModel] = useState(() => pickPromptGeneratorModel(availableModels));
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [generationError, setGenerationError] = useState('');

  const isFirstTime = !existingKey;
  const hasChanged = sanitize(key) !== sanitize(existingKey || '');
  const selectedPreset = participantPresets.find((preset) => preset.role === selectedRoleId) ?? null;
  const enabledCount = roleVisibility
    ? participantPresets.filter((preset) => roleVisibility[preset.role] !== false).length
    : participantPresets.length;
  const isNewRole = selectedRoleId === '__new__';
  const isVisible = roleVisibility ? roleVisibility[roleDraft.role] !== false : true;
  const roleExists = participantPresets.some((preset) => preset.role === roleDraft.role);
  const canSaveRole =
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
    setGenerationError('');
  }, [availableModels, isNewRole, participantPresets, selectedRoleId]);

  const groupedRoles = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        label: CATEGORY_LABELS[category],
        presets: participantPresets.filter((preset) => preset.category === category),
      })).filter((group) => group.presets.length > 0),
    [participantPresets]
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
    setRoleDraft(buildDraft(null, availableModels));
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
      defaultPersonalityTraits: roleDraft.defaultPersonalityTraits.filter(Boolean),
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
                `Default personality traits: ${roleDraft.defaultPersonalityTraits.join(', ') || 'none'}\n\n` +
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
            <p className="text-sm text-gray-400">{isFirstTime ? APP_BYLINE : 'API connection, role library, and traits'}</p>
          </div>
        </div>

        {!isFirstTime && (
          <div className="mx-8 mb-0 flex gap-0.5 rounded-xl bg-gray-800/80 p-0.5">
            <button
              onClick={() => setActiveTab('connection')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${activeTab === 'connection' ? 'bg-purple-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <span className="flex items-center justify-center gap-1.5"><Key className="h-3.5 w-3.5" /> API Connection</span>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${activeTab === 'roles' ? 'bg-indigo-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Role Library
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
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {(activeTab === 'connection' || isFirstTime) && (
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
                  <p className="mb-2 text-xs leading-relaxed text-gray-400">
                    Roles now live in a local role library. Pick one to edit it, or add a new one from scratch.
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={selectedRoleId}
                      onChange={(event) => setSelectedRoleId(event.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                    >
                      {groupedRoles.map((group) => (
                        <optgroup key={group.category} label={group.label}>
                          {group.presets.map((preset) => (
                            <option key={preset.role} value={preset.role}>
                              {preset.emoji} {preset.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleStartNewRole}
                      className="inline-flex items-center gap-1 rounded-xl border border-indigo-600/50 bg-indigo-700/30 px-3 py-2 text-xs font-semibold text-indigo-200 transition-all hover:bg-indigo-700/50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Library Overview</p>
                  <div className="space-y-2">
                    {participantPresets.map((preset) => (
                      <button
                        key={preset.role}
                        type="button"
                        onClick={() => setSelectedRoleId(preset.role)}
                        className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                          selectedRoleId === preset.role ? 'border-indigo-500/70 bg-indigo-900/20' : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                        }`}
                      >
                        <span className="text-base">{preset.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold text-gray-100">{preset.label}</div>
                          <div className="truncate text-[10px] text-gray-500">{preset.role}</div>
                        </div>
                        <span className={`h-2.5 w-2.5 rounded-full ${roleVisibility?.[preset.role] !== false ? 'bg-indigo-400' : 'bg-gray-700'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 rounded-2xl border border-gray-700 bg-gray-800/60 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Role Name</span>
                      <input
                        value={roleDraft.label}
                        onChange={(event) => setRoleDraft((current) => ({ ...current, label: event.target.value }))}
                        placeholder="AI Strategist"
                        className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Role ID</span>
                      <input
                        value={roleDraft.role}
                        onChange={(event) => setRoleDraft((current) => ({ ...current, role: sanitizeRoleId(event.target.value) }))}
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
                      <select
                        value={roleDraft.category}
                        onChange={(event) => setRoleDraft((current) => ({ ...current, category: event.target.value as RoleCategory }))}
                        className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                      >
                        {CATEGORY_ORDER.map((category) => (
                          <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                        ))}
                      </select>
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
                      className="h-20 w-full resize-none rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </label>

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Text Class</span>
                      <input
                        value={roleDraft.color}
                        onChange={(event) => setRoleDraft((current) => ({ ...current, color: event.target.value }))}
                        className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">BG Class</span>
                      <input
                        value={roleDraft.bgColor}
                        onChange={(event) => setRoleDraft((current) => ({ ...current, bgColor: event.target.value }))}
                        className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Border Class</span>
                      <input
                        value={roleDraft.borderColor}
                        onChange={(event) => setRoleDraft((current) => ({ ...current, borderColor: event.target.value }))}
                        className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Default Personality Traits</p>
                      <p className="text-xs text-gray-500">These are applied when a fresh participant of this role is added.</p>
                    </div>
                    {!isNewRole && roleDraft.role && onToggleRoleVisibility && (
                      <button
                        type="button"
                        onClick={() => onToggleRoleVisibility(roleDraft.role)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                          isVisible ? 'border-indigo-500/50 bg-indigo-700/30 text-indigo-200' : 'border-gray-700 bg-gray-900 text-gray-400'
                        }`}
                      >
                        {isVisible ? 'Visible' : 'Hidden'}
                      </button>
                    )}
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
                                ? current.defaultPersonalityTraits.filter((item) => item !== trait)
                                : [...current.defaultPersonalityTraits, trait],
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

                <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-4">
                  <div className="mb-3 flex flex-wrap items-end gap-3">
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
                      className="h-64 w-full resize-none rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm leading-relaxed text-gray-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  {generationError && <p className="mt-2 text-xs text-rose-400">{generationError}</p>}
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

              <div className="flex flex-wrap gap-1.5">
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
