import { useState } from 'react';
import { PARTICIPANT_PRESETS, OPENROUTER_MODELS, PANEL_PRESETS } from '../constants';
import type { ActiveParticipant, ParticipantPreset, PanelPreset } from '../types';

interface ParticipantRosterProps {
  participants: ActiveParticipant[];
  currentSpeakerId: string | null;
  isRunning: boolean;
  onAdd: (preset: ParticipantPreset) => void;
  onClone: (instanceId: string) => void;
  onRemove: (instanceId: string) => void;
  onToggleActive: (instanceId: string) => void;
  onModelChange: (instanceId: string, modelId: string) => void;
  onApplyPanelPreset: (preset: PanelPreset) => void;
  selectedPanelPreset: string | null;
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
  budget:          'text-green-400',
  mid:             'text-blue-400',
  premium:         'text-purple-400',
  flagship:        'text-amber-400',
  'bleeding-edge': 'text-fuchsia-400',
};

export function ParticipantRoster({
  participants,
  currentSpeakerId,
  isRunning,
  onAdd,
  onClone,
  onRemove,
  onToggleActive,
  onModelChange,
  onApplyPanelPreset,
  selectedPanelPreset,
}: ParticipantRosterProps) {
  const [showSpawner, setShowSpawner] = useState(false);
  const [showPanelPresets, setShowPanelPresets] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [spawnerCategory, setSpawnerCategory] = useState<string>('all');

  const categories = ['all', 'core', 'creative', 'technical', 'business', 'specialist'];

  const filteredPresets = spawnerCategory === 'all'
    ? PARTICIPANT_PRESETS
    : PARTICIPANT_PRESETS.filter((p) => p.category === spawnerCategory);

  const roleCounts: Record<string, number> = {};

  return (
    <div className="flex flex-col h-full bg-gray-900 border-t border-gray-700/50">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">👥 Panel</span>
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
            📋 {showPanelPresets ? 'Close' : 'Presets'}
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
            {showSpawner ? '✕ Close' : '＋ Add'}
          </button>
        </div>
      </div>

      {/* Panel Presets Dropdown */}
      {showPanelPresets && (
        <div className="border-b border-gray-700/50 bg-gray-900/95 flex-shrink-0 max-h-72 overflow-y-auto">
          <div className="px-3 py-2">
            <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider font-semibold">Panel Lineup Presets</p>
            <div className="flex flex-col gap-1.5">
              {PANEL_PRESETS.map((preset) => {
                const isSelected = selectedPanelPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onApplyPanelPreset(preset);
                      setShowPanelPresets(false);
                    }}
                    className={`text-left px-2.5 py-2 rounded-lg border transition-all group ${
                      isSelected
                        ? 'bg-purple-800/50 border-purple-400/70 ring-1 ring-purple-400/30'
                        : 'bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{preset.emoji}</span>
                      <span className={`text-xs font-semibold transition-colors ${isSelected ? 'text-purple-200' : 'text-white group-hover:text-purple-300'}`}>
                        {preset.label}
                      </span>
                      {isSelected && (
                        <span className="ml-auto text-[9px] bg-purple-500/40 text-purple-200 px-1.5 py-0.5 rounded-full">✓ Active</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{preset.description}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {preset.participants.map((p, i) => {
                        const pp = PARTICIPANT_PRESETS.find(r => r.role === p.role);
                        return pp ? (
                          <span key={i} className="text-[9px] bg-gray-700 px-1.5 py-0.5 rounded-full text-gray-300">
                            {pp.emoji} {pp.label}{p.count > 1 ? ` ×${p.count}` : ''}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
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
                  {cat === 'all' ? '🌐 All' : `${CATEGORY_LABELS[cat]?.emoji} ${CATEGORY_LABELS[cat]?.label}`}
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
                    <span className="text-gray-500 text-sm flex-shrink-0">＋</span>
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
            <span className="text-3xl mb-2">👥</span>
            <p className="text-xs text-gray-500">No participants yet.<br/>Add some above or load a preset.</p>
          </div>
        ) : (
          <div className="p-2 flex flex-col gap-1">
            {participants.map((p) => {
              roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
              const isSpeaking = currentSpeakerId === p.instanceId;
              const isExpanded = expandedId === p.instanceId;

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
                      <p className="text-[10px] text-gray-500 truncate">
                        {p.selectedModel.split('/')[1]?.split(':')[0] || p.selectedModel}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onClone(p.instanceId)}
                        disabled={isRunning}
                        title="Clone"
                        className="w-5 h-5 rounded text-[10px] flex items-center justify-center hover:bg-gray-700 transition-all disabled:opacity-40"
                      >
                        ⧉
                      </button>
                      <button
                        onClick={() => onToggleActive(p.instanceId)}
                        disabled={isRunning}
                        title={p.isActive ? 'Mute' : 'Unmute'}
                        className="w-5 h-5 rounded text-[10px] flex items-center justify-center hover:bg-gray-700 transition-all disabled:opacity-40"
                      >
                        {p.isActive ? '🔊' : '🔇'}
                      </button>
                      <button
                        onClick={() => onRemove(p.instanceId)}
                        disabled={isRunning}
                        title="Remove"
                        className="w-5 h-5 rounded text-[10px] flex items-center justify-center hover:bg-red-900/50 text-gray-600 hover:text-red-400 transition-all disabled:opacity-40"
                      >
                        ✕
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
                        {['free', 'budget', 'mid', 'premium', 'flagship', 'bleeding-edge'].map((tier) => {
                          const tierModels = OPENROUTER_MODELS.filter((m) => m.tier === tier);
                          if (tierModels.length === 0) return null;
                          const tierLabel = { free: '🆓 Free', budget: '💚 Budget', mid: '💙 Mid', premium: '💜 Premium', flagship: '🌟 Flagship', 'bleeding-edge': '🔬 Bleeding Edge' }[tier];
                          return (
                            <optgroup key={tier} label={tierLabel || tier}>
                              {tierModels.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} — ${m.pricing.prompt}/1K in
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                      {/* Tier badge */}
                      {(() => {
                        const model = OPENROUTER_MODELS.find((m) => m.id === p.selectedModel);
                        return model ? (
                          <p className={`text-[10px] mt-1 ${TIER_COLORS[model.tier]}`}>
                            {model.description} · {model.contextLength.toLocaleString()} ctx
                          </p>
                        ) : null;
                      })()}
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
