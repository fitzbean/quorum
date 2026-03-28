import { useState } from 'react';
import { MODEL_PRESETS, DISCUSSION_PRESETS, PARTICIPANT_PRESETS } from '../constants';
import type { ActiveParticipant, Preset, RoleVisibility, PanelMember } from '../types';
import { Zap, Settings, ChevronDown, ChevronRight } from 'lucide-react';

interface PanelSidebarProps {
  participants: ActiveParticipant[];
  onPresetApply: (models: Record<string, string>, presetKey: string) => void;
  selectedPreset: Preset | null;
  onSelectDiscussionPreset: (preset: Preset) => void;
  currentSpeakerId: string | null;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  apiKey: string;
  topic: string;
  onTopicChange: (t: string) => void;
  roundCount: number;
  onRoundCountChange: (n: number) => void;
  responseDelay: number;
  onResponseDelayChange: (ms: number) => void;
  selectedModelPreset: string | null;
  roleVisibility: RoleVisibility;
  onToggleRoleVisibility: (role: PanelMember) => void;
}

type ConfigTab = 'discussion' | 'models';

export function PanelSidebar({
  participants,
  onPresetApply,
  selectedPreset,
  onSelectDiscussionPreset,
  isRunning,
  onStart,
  onStop,
  onReset,
  apiKey,
  topic,
  onTopicChange,
  roundCount,
  onRoundCountChange,
  responseDelay,
  onResponseDelayChange,
  selectedModelPreset,
  roleVisibility,
  onToggleRoleVisibility,
}: PanelSidebarProps) {
  const [topicOpen, setTopicOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<ConfigTab>('discussion');

  const activeCount = participants.filter((p) => p.isActive).length;

  const delayLabel =
    responseDelay === 0
      ? 'Instant'
      : responseDelay < 1000
      ? `${responseDelay}ms`
      : `${(responseDelay / 1000).toFixed(1)}s`;

  const visibleRoles = PARTICIPANT_PRESETS;

  return (
    <div className="flex flex-col bg-gray-900 border-l border-gray-700/50 overflow-y-auto h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xl">🎰</span>
          <h1 className="text-sm font-bold text-white">SlotMind AI</h1>
        </div>
        <p className="text-[10px] text-gray-500">Casino Slot Design Panel</p>
      </div>

      {/* ── TOPIC / BRIEF ── collapsible */}
      <div className="border-b border-gray-700/50 flex-shrink-0">
        <button
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/50 transition-colors"
          onClick={() => setTopicOpen((v) => !v)}
        >
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            📌 Topic / Brief
          </span>
          {topicOpen
            ? <ChevronDown className="w-3 h-3 text-gray-500" />
            : <ChevronRight className="w-3 h-3 text-gray-500" />}
        </button>

        {topicOpen && (
          <div className="px-3 pb-3 space-y-2.5">
            {/* Topic textarea */}
            <textarea
              value={topic}
              onChange={(e) => onTopicChange(e.target.value)}
              placeholder="What should the panel discuss? E.g. 'Design a Norse mythology slot with a progressive jackpot and Megaways mechanic…'"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl text-xs text-gray-300 placeholder-gray-600 px-2.5 py-2 h-14 resize-none focus:outline-none focus:border-purple-500"
              disabled={isRunning}
            />

            {/* Rounds + Speed sliders */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                  Rounds <span className="text-purple-400 normal-case">{roundCount}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={roundCount}
                  onChange={(e) => onRoundCountChange(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full accent-purple-500"
                />
                <p className="text-[9px] text-gray-600 mt-0.5">~{activeCount * roundCount} msgs</p>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                  Speed <span className="text-amber-400 normal-case">{delayLabel}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={250}
                  value={responseDelay}
                  onChange={(e) => onResponseDelayChange(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <p className="text-[9px] text-gray-600 mt-0.5">between turns</p>
              </div>
            </div>

            {/* ── START / STOP / RESET ── live inside Topic section */}
            <div className="flex flex-col gap-1.5 pt-0.5">
              {!isRunning ? (
                <button
                  onClick={onStart}
                  disabled={!topic.trim() || !apiKey || activeCount === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-amber-500 text-white font-semibold py-2 rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  <span>▶</span> Start Discussion
                </button>
              ) : (
                <button
                  onClick={onStop}
                  className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold py-2 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  <span>⏹</span> Stop Discussion
                </button>
              )}
              <button
                onClick={onReset}
                disabled={isRunning}
                className="w-full bg-gray-700/80 hover:bg-gray-700 text-gray-300 font-medium py-1.5 rounded-xl transition-all text-xs disabled:opacity-40"
              >
                🔄 New Session
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── DISCUSSION TYPE + MODEL PRESETS ── combined collapsible with tabs */}
      <div className="border-b border-gray-700/50 flex-shrink-0">
        <button
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/50 transition-colors"
          onClick={() => setConfigOpen((v) => !v)}
        >
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            {activeTab === 'discussion'
              ? <><Zap className="w-3 h-3" /> Discussion Type</>
              : <><Settings className="w-3 h-3" /> Model Presets</>}
          </span>
          {configOpen
            ? <ChevronDown className="w-3 h-3 text-gray-500" />
            : <ChevronRight className="w-3 h-3 text-gray-500" />}
        </button>

        {configOpen && (
          <div className="pb-3">
            {/* Tab switcher */}
            <div className="flex mx-3 mb-2.5 bg-gray-800/80 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setActiveTab('discussion')}
                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  activeTab === 'discussion'
                    ? 'bg-purple-700 text-white shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Zap className="w-3 h-3" /> Discussion
              </button>
              <button
                onClick={() => setActiveTab('models')}
                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  activeTab === 'models'
                    ? 'bg-amber-700 text-white shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Settings className="w-3 h-3" /> Models
              </button>
            </div>

            {/* ── Discussion Type tab ── */}
            {activeTab === 'discussion' && (
              <div className="px-3">
                <div className="grid grid-cols-2 gap-1">
                  {DISCUSSION_PRESETS.map((preset) => {
                    const isSelected = selectedPreset?.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => onSelectDiscussionPreset(preset)}
                        disabled={isRunning}
                        className={`text-left px-2 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50 ${
                          isSelected
                            ? 'bg-purple-700/70 border border-purple-400/80 text-white ring-1 ring-purple-400/40'
                            : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                        }`}
                      >
                        <div className="font-medium text-[11px]">{preset.emoji} {preset.label}</div>
                        {isSelected && (
                          <div className="text-[9px] text-purple-300 mt-0.5 leading-tight line-clamp-2">
                            {preset.description}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Model Presets tab ── */}
            {activeTab === 'models' && (
              <div className="px-3">
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(MODEL_PRESETS).map(([key, preset]) => {
                    const isSelected = selectedModelPreset === key;
                    return (
                      <button
                        key={key}
                        onClick={() => onPresetApply(preset.models, key)}
                        disabled={isRunning}
                        title={preset.description}
                        className={`text-left px-2 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50 ${
                          isSelected
                            ? 'bg-amber-700/50 border border-amber-400/70 text-white ring-1 ring-amber-400/30'
                            : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                        }`}
                      >
                        <div className="font-medium text-[11px]">{preset.emoji} {preset.label}</div>
                        <div className="text-[9px] text-gray-500 mt-0.5 leading-tight truncate">
                          {preset.description.split(',')[0]}
                        </div>
                        {isSelected && (
                          <div className="text-[9px] text-amber-300 mt-0.5 font-semibold">✓ Active</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'discussion' && (
              <div className="px-3 pt-3">
                <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        Role Visibility
                      </p>
                      <p className="text-[10px] text-gray-600">Disable roles you never want to add or auto-load.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {visibleRoles.map((preset) => {
                      const enabled = roleVisibility[preset.role];
                      return (
                        <button
                          key={preset.role}
                          type="button"
                          onClick={() => onToggleRoleVisibility(preset.role)}
                          className={`rounded-lg border px-2 py-1.5 text-left text-xs transition-all ${
                            enabled
                              ? 'border-gray-700 bg-gray-900 text-gray-200 hover:border-purple-500/50'
                              : 'border-gray-800 bg-gray-950 text-gray-500 opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{preset.emoji}</span>
                            <span className="truncate font-medium">{preset.label}</span>
                          </div>
                          <div className="mt-0.5 text-[9px] uppercase tracking-wider text-gray-500">
                            {enabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
