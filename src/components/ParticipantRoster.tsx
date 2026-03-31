import { useEffect, useRef, useState } from 'react';
import { Info, LayoutList, Plus, X, Save, ArrowUp, Copy, Volume2, VolumeX, Users, Globe, Check } from 'lucide-react';
import type { ActiveParticipant, ParticipantPreset, PanelPreset, ModelOption, ModelTier, PersonalityTrait, RoleVisibility } from '../types';
import { formatModelPricePerThousand } from '../utils/modelCatalog';

interface ParticipantRosterProps {
  participants: ActiveParticipant[];
  currentSpeakerId: string | null;
  isRunning: boolean;
  onAdd: (preset: ParticipantPreset) => void;
  onClone: (instanceId: string) => void;
  onRemove: (instanceId: string) => void;
  onToggleActive: (instanceId: string) => void;
  onModelChange: (instanceId: string, modelId: string) => void;
  onPersonalityTraitsChange: (instanceId: string, traits: PersonalityTrait[]) => void;
  onApplyPanelPreset: (preset: PanelPreset) => void;
  selectedPanelPreset: string | null;
  models: ModelOption[];
  participantPresets: ParticipantPreset[];
  roleVisibility: RoleVisibility;
  savedPanelPresets: PanelPreset[];
  onSavePanelPreset: (label: string) => void;
  onUpdatePanelPreset: (presetId: string) => void;
  onDeletePanelPreset: (presetId: string) => void;
  customTraits: string[];
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  core:       { label: 'Core',       emoji: '🎰' },
  creative:   { label: 'Creative',   emoji: '🎨' },
  technical:  { label: 'Technical',  emoji: '⚙️' },
  business:   { label: 'Business',   emoji: '💼' },
  specialist: { label: 'Specialist', emoji: '🔬' },
};

const TIER_COLORS: Record<string, string> = {
  free:            'text-gray-400',
  balanced:        'text-blue-400',
  'last-generation': 'text-purple-400',
  'bleeding-edge': 'text-fuchsia-400',
};

function getInlineModelLabel(modelName: string): string {
  return modelName.replace(/^\S+\s+/, '');
}

export function ParticipantRoster({
  participants,
  currentSpeakerId,
  isRunning,
  onAdd,
  onClone,
  onRemove,
  onToggleActive,
  onModelChange,
  onPersonalityTraitsChange,
  onApplyPanelPreset,
  selectedPanelPreset,
  models,
  participantPresets,
  roleVisibility,
  savedPanelPresets,
  onSavePanelPreset,
  onUpdatePanelPreset,
  onDeletePanelPreset,
  customTraits,
}: ParticipantRosterProps) {
  const [showSpawner, setShowSpawner] = useState(false);
  const [showPanelPresets, setShowPanelPresets] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [infoPopupId, setInfoPopupId] = useState<string | null>(null);
  const [spawnerCategory, setSpawnerCategory] = useState<string>('all');
  const [savePresetName, setSavePresetName] = useState('');
  const infoPopupRef = useRef<HTMLDivElement | null>(null);

  const categories = ['all', 'core', 'creative', 'technical', 'business', 'specialist'];

  const filteredPresets = (spawnerCategory === 'all'
    ? participantPresets
    : participantPresets.filter((p) => p.category === spawnerCategory)
  ).filter((p) => roleVisibility[p.role] !== false);

  const selectedModelTier = (selectedModelId: string): ModelTier | null => {
    const match = models.find((model) => model.id === selectedModelId);
    return match?.tier ?? null;
  };

  useEffect(() => {
    if (!infoPopupId) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!infoPopupRef.current?.contains(event.target as Node)) {
        setInfoPopupId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [infoPopupId]);

  const roleCounts: Record<string, number> = {};

  return (
    <div className="flex flex-col h-full bg-gray-900 border-t border-gray-700/50">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Panel</span>
          <span className="text-xs bg-purple-700/50 text-purple-200 rounded-full px-1.5 py-0.5">
            {participants.filter(p => p.isActive).length}/{participants.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Presets button */}
          <button
            onClick={() => { setShowPanelPresets(!showPanelPresets); setShowSpawner(false); }}
            disabled={isRunning}
            title="Panel presets"
            className={`text-[10px] px-2 py-1 rounded-lg transition-all disabled:opacity-40 border flex items-center gap-1 ${
              showPanelPresets
                ? 'bg-purple-700/60 border-purple-500/70 text-purple-200'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border-gray-700'
            }`}
          >
            <LayoutList className="w-3 h-3" /> {showPanelPresets ? 'Close' : 'Presets'}
          </button>
          {/* Add / Close toggle */}
          <button
            onClick={() => { setShowSpawner(!showSpawner); setShowPanelPresets(false); }}
            disabled={isRunning}
            title={showSpawner ? 'Close' : 'Add participant'}
            className={`text-[10px] px-2 py-1 rounded-lg transition-all disabled:opacity-40 border flex items-center gap-1 ${
              showSpawner
                ? 'bg-red-700/60 border-red-500/60 text-red-200 hover:bg-red-700/80'
                : 'bg-purple-700/60 hover:bg-purple-600/70 text-purple-200 hover:text-white border-purple-600/50'
            }`}
          >
            {showSpawner ? <><X className="w-3 h-3" /> Close</> : <><Plus className="w-3 h-3" /> Add</>}
          </button>
        </div>
      </div>

      {/* Panel Presets Dropdown */}
      {showPanelPresets && (
        <div className="border-b border-gray-700/50 bg-gray-900/95 flex-shrink-0 max-h-72 overflow-y-auto">
          <div className="px-3 py-2">
            {/* Save current panel */}
            {participants.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-semibold">Save Current Panel</p>
                <div className="flex gap-1">
                  <input
                    value={savePresetName}
                    onChange={(e) => setSavePresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && savePresetName.trim()) {
                        onSavePanelPreset(savePresetName.trim());
                        setSavePresetName('');
                      }
                    }}
                    placeholder="Preset name..."
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg text-[11px] text-gray-200 px-2 py-1.5 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => {
                      if (savePresetName.trim()) {
                        onSavePanelPreset(savePresetName.trim());
                        setSavePresetName('');
                      }
                    }}
                    disabled={!savePresetName.trim()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-700/60 border border-purple-500/50 text-[10px] text-purple-200 hover:bg-purple-600/70 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Save className="w-3 h-3" /> Save
                  </button>
                </div>
              </div>
            )}

            {/* Saved presets list */}
            {savedPanelPresets.length > 0 ? (
              <>
                <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider font-semibold">Saved Lineups</p>
                <div className="flex flex-col gap-1.5">
                  {savedPanelPresets.map((preset) => {
                    const isSelected = selectedPanelPreset === preset.id;
                    return (
                      <div
                        key={preset.id}
                        className={`text-left px-2.5 py-2 rounded-lg border transition-all group ${
                          isSelected
                            ? 'bg-purple-800/50 border-purple-400/70 ring-1 ring-purple-400/30'
                            : 'bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <button
                            className="flex-1 text-left flex items-center gap-1.5 min-w-0"
                            onClick={() => {
                              onApplyPanelPreset(preset);
                              setShowPanelPresets(false);
                            }}
                          >
                            <span className={`text-xs font-semibold transition-colors truncate ${isSelected ? 'text-purple-200' : 'text-white group-hover:text-purple-300'}`}>
                              {preset.label}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] bg-purple-500/40 text-purple-200 px-1.5 py-0.5 rounded-full flex-shrink-0 flex items-center gap-0.5"><Check className="w-2.5 h-2.5" /> Active</span>
                            )}
                          </button>
                          {isSelected && (
                            <button
                              onClick={() => onUpdatePanelPreset(preset.id)}
                              title="Update preset with current panel"
                              className="px-1.5 h-5 rounded flex items-center justify-center text-[9px] font-medium text-amber-400 hover:text-amber-200 hover:bg-amber-900/50 border border-amber-700/40 transition-all flex-shrink-0"
                            >
                              <ArrowUp className="w-2.5 h-2.5" /> Update
                            </button>
                          )}
                          <button
                            onClick={() => onDeletePanelPreset(preset.id)}
                            title="Delete preset"
                            className="w-5 h-5 rounded flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-900/50 transition-all flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {preset.participants.map((p, i) => {
                            const pp = participantPresets.find(r => r.role === p.role);
                            return pp ? (
                              <span key={i} className="text-[9px] bg-gray-700 px-1.5 py-0.5 rounded-full text-gray-300">
                                {pp.emoji} {pp.label}{p.count > 1 ? ` ×${p.count}` : ''}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-[10px] text-gray-500 text-center py-2">No saved presets yet. Build a panel and save it above.</p>
            )}
          </div>
        </div>
      )}

      {/* Spawner */}
      {showSpawner && (
        <div className="border-b border-gray-700/50 bg-gray-900/95 flex-shrink-0 max-h-72 overflow-y-auto">
          <div className="px-3 py-2">
            <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider font-semibold">Add Participant</p>
            {/* Category filter */}
            <div className="flex flex-wrap gap-1 mb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSpawnerCategory(cat)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all capitalize ${
                    spawnerCategory === cat
                      ? 'bg-purple-700/60 border-purple-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {cat === 'all' ? <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> All</span> : `${CATEGORY_LABELS[cat]?.emoji} ${CATEGORY_LABELS[cat]?.label}`}
                </button>
              ))}
            </div>
            {/* Role list */}
            <div className="flex flex-col gap-1">
              {filteredPresets.map((preset) => {
                const count = participants.filter(p => p.role === preset.role).length;
                return (
                  <button
                    key={preset.role}
                    onClick={() => onAdd(preset)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all border ${preset.borderColor} ${preset.bgColor} hover:opacity-90`}
                  >
                    <span className="text-lg flex-shrink-0">{preset.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold ${preset.color}`}>{preset.label}</span>
                        {count > 0 && (
                          <span className="text-[9px] bg-white/10 px-1.5 rounded-full text-gray-300">×{count}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 leading-tight truncate">{preset.description}</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Participant list — chatroom style */}
      <div className="flex-1 overflow-y-auto">
        {participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <Users className="w-8 h-8 text-gray-700 mb-2" />
            <p className="text-xs text-gray-500">No participants yet.<br/>Add some above or load a preset.</p>
          </div>
        ) : (
          <div className="p-2 flex flex-col gap-1">
            {participants.map((p) => {
              roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
              const isSpeaking = currentSpeakerId === p.instanceId;
              const isExpanded = expandedId === p.instanceId;
              const model = models.find((m) => m.id === p.selectedModel);
              const modelLabel = model?.name ?? p.selectedModel.split('/')[1]?.split(':')[0] ?? p.selectedModel;
              const inlineModelLabel = getInlineModelLabel(modelLabel);
              const isInfoOpen = infoPopupId === p.instanceId;

              return (
                <div
                  key={p.instanceId}
                  className={`rounded-xl border transition-all ${
                    !p.isActive ? 'opacity-40' : ''
                  } ${
                    isSpeaking
                      ? `${p.borderColor} ${p.bgColor} ring-1 ring-offset-0 ring-current`
                      : `border-gray-700/60 bg-gray-800/40 hover:border-gray-600`
                  }`}
                >
                  {/* Row */}
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    {/* Avatar + speaking indicator */}
                    <div className="relative flex-shrink-0">
                      <span className={`text-lg ${isSpeaking ? 'animate-pulse' : ''}`}>{p.emoji}</span>
                      {isSpeaking && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-gray-900" />
                      )}
                    </div>

                    {/* Name + model */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : p.instanceId)}
                    >
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-semibold truncate ${p.color}`}>{p.label}</span>
                        {isSpeaking && (
                          <span className="flex gap-0.5 ml-1">
                            <span className="w-1 h-1 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-1 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        )}
                      </div>
                      <div className="relative mt-0.5 flex items-center gap-1 min-w-0" ref={isInfoOpen ? infoPopupRef : null}>
                        {model && (
                          <>
                            <button
                              type="button"
                              title="Model info"
                              aria-label={`Show info for ${modelLabel}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setInfoPopupId(isInfoOpen ? null : p.instanceId);
                              }}
                              className={`flex h-4 w-4 flex-shrink-0 items-center justify-center transition-all ${
                                isInfoOpen
                                  ? 'text-purple-200'
                                  : 'text-gray-500 hover:text-gray-200'
                              }`}
                            >
                              <Info className="h-2.5 w-2.5" />
                            </button>
                            {isInfoOpen && (
                              <div
                                className="absolute left-0 top-full z-20 mt-1.5 w-64 rounded-xl border border-gray-700 bg-gray-900/95 p-2 shadow-2xl"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <div className="text-[11px] font-semibold text-white">{model.name}</div>
                                <div className={`mt-1 text-[10px] font-medium capitalize ${TIER_COLORS[model.tier]}`}>
                                  {model.tier} tier
                                </div>
                                <p className="mt-1 text-[10px] leading-relaxed text-gray-300">{model.description}</p>
                                <div className="mt-2 text-[10px] text-gray-400">
                                  Context: {model.contextLength.toLocaleString()} tokens
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  Input: {formatModelPricePerThousand(model.pricing.prompt)}/1K
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  Output: {formatModelPricePerThousand(model.pricing.completion)}/1K
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        <p className="text-[10px] text-gray-500 truncate">
                          {inlineModelLabel}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onClone(p.instanceId)}
                        disabled={isRunning}
                        title="Clone"
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-gray-700 transition-all disabled:opacity-40"
                      >
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                      <button
                        onClick={() => onToggleActive(p.instanceId)}
                        disabled={isRunning}
                        title={p.isActive ? 'Mute' : 'Unmute'}
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-gray-700 transition-all disabled:opacity-40"
                      >
                        {p.isActive ? <Volume2 className="w-3 h-3 text-gray-400" /> : <VolumeX className="w-3 h-3 text-gray-500" />}
                      </button>
                      <button
                        onClick={() => onRemove(p.instanceId)}
                        disabled={isRunning}
                        title="Remove"
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-900/50 text-gray-600 hover:text-red-400 transition-all disabled:opacity-40"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded: model selector */}
                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 pt-0 border-t border-gray-700/40 mt-0">
                      <p className="text-[10px] text-gray-500 mb-1 mt-2 uppercase tracking-wider">Model</p>
                      <select
                        value={p.selectedModel}
                        onChange={(e) => onModelChange(p.instanceId, e.target.value)}
                        disabled={isRunning}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg text-[11px] text-gray-200 px-2 py-1.5 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                      >
                        {(() => {
                          const tier = selectedModelTier(p.selectedModel);
                          const tierModels = models.filter((m) => m.tier === tier);

                          return tierModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ));
                        })()}
                      </select>
                      <p className="text-[10px] text-gray-500 mb-1 mt-3 uppercase tracking-wider">Personality traits</p>
                      <div className="flex flex-wrap gap-1.5">
                        {customTraits.map((trait) => {
                          const selected = p.personalityTraits.includes(trait);
                          return (
                            <button
                              key={trait}
                              type="button"
                              disabled={isRunning}
                              onClick={() => {
                                const next = selected
                                  ? p.personalityTraits.filter((item) => item !== trait)
                                  : [...p.personalityTraits, trait];
                                onPersonalityTraitsChange(p.instanceId, next);
                              }}
                              className={`rounded-full border px-2 py-1 text-[10px] capitalize transition-all disabled:opacity-50 ${
                                selected
                                  ? 'border-purple-400/60 bg-purple-500/20 text-purple-200'
                                  : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                              }`}
                            >
                              {trait}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
