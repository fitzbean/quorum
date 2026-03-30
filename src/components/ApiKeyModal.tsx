import { useState } from 'react';
import { Key, ExternalLink, Eye, EyeOff, X, Settings, Users, Sliders, Dices } from 'lucide-react';
import { PERSONALITY_TRAITS } from '../types';
import { APP_NAME, APP_BYLINE } from '../appConfig';
import { PARTICIPANT_PRESETS } from '../constants';
import type { RoleVisibility, PanelMember } from '../types';

type ModalTab = 'connection' | 'roles' | 'traits';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
  existingKey?: string;
  roleVisibility?: RoleVisibility;
  onToggleRoleVisibility?: (role: PanelMember) => void;
  customTraits?: string[];
  onAddTrait?: (trait: string) => void;
  onRemoveTrait?: (trait: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  creative: 'Creative',
  technical: 'Technical',
  business: 'Business',
  specialist: 'Specialist',
};

const CATEGORY_ORDER = ['core', 'creative', 'technical', 'business', 'specialist'] as const;

export function ApiKeyModal({ onSave, existingKey, roleVisibility, onToggleRoleVisibility, customTraits, onAddTrait, onRemoveTrait }: ApiKeyModalProps) {
  const sanitize = (v: string) => v.replace(/[^\x20-\x7E]/g, '').trim();
  const [key, setKey] = useState(sanitize(existingKey || ''));
  const [show, setShow] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('connection');
  const [newTrait, setNewTrait] = useState('');

  const isFirstTime = !existingKey;
  const hasChanged = sanitize(key) !== sanitize(existingKey || '');

  const handleSave = () => {
    const safe = sanitize(key);
    if (safe) onSave(safe);
  };

  const handleClose = () => {
    if (existingKey) onSave(existingKey);
  };

  const groupedRoles = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    presets: PARTICIPANT_PRESETS.filter((p) => p.category === cat),
  })).filter((g) => g.presets.length > 0);

  const enabledCount = roleVisibility
    ? PARTICIPANT_PRESETS.filter((p) => roleVisibility[p.role]).length
    : PARTICIPANT_PRESETS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full shadow-2xl relative flex flex-col"
        style={{ maxWidth: isFirstTime ? '28rem' : '36rem', maxHeight: '90vh' }}>

        {/* Close button */}
        {!isFirstTime && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-all z-10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 px-8 pt-8 pb-5 flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-amber-500 flex items-center justify-center">
            {isFirstTime ? (
              <Dices className="w-6 h-6 text-white" />
            ) : (
              <Settings className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {isFirstTime ? APP_NAME : 'System Settings'}
            </h2>
            <p className="text-gray-400 text-sm">
              {isFirstTime ? APP_BYLINE : 'API connection & role configuration'}
            </p>
          </div>
        </div>

        {/* Tabs — only when not first-time setup */}
        {!isFirstTime && (
          <div className="flex mx-8 mb-0 bg-gray-800/80 rounded-xl p-0.5 gap-0.5 flex-shrink-0">
            <button
              onClick={() => setActiveTab('connection')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'connection'
                  ? 'bg-purple-700 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Key className="w-3.5 h-3.5" /> API Connection
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'roles'
                  ? 'bg-indigo-700 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Role Visibility
              <span className="ml-0.5 rounded-full bg-gray-700 px-1.5 py-0 text-[9px] text-gray-300">
                {enabledCount}/{PARTICIPANT_PRESETS.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('traits')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'traits'
                  ? 'bg-emerald-700 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Traits
              <span className="ml-0.5 rounded-full bg-gray-700 px-1.5 py-0 text-[9px] text-gray-300">
                {customTraits?.length ?? 0}
              </span>
            </button>
          </div>
        )}

        {/* Tab content — scrollable */}
        <div className="overflow-y-auto flex-1 min-h-0">

          {/* ── Connection tab (or first-time setup) ── */}
          {(activeTab === 'connection' || isFirstTime) && (
            <div className="px-8 py-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-amber-400" />
                  <label className="text-sm font-medium text-gray-300">OpenRouter API Key</label>
                </div>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={key}
                    onChange={(e) => setKey(sanitize(e.target.value))}
                    placeholder="sk-or-v1-..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 pr-12"
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text');
                      setKey(sanitize(pasted));
                    }}
                  />
                  <button
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {!isFirstTime && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${existingKey ? 'bg-green-400' : 'bg-red-400'}`} />
                    <p className="text-xs text-gray-500">
                      {existingKey
                        ? hasChanged
                          ? 'New key entered — save to apply'
                          : 'Key active · stored locally in your browser'
                        : 'No key saved yet'}
                    </p>
                  </div>
                )}
                {isFirstTime && (
                  <p className="text-xs text-gray-500 mt-2">
                    Your key is stored locally in your browser and never sent anywhere except OpenRouter.
                  </p>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={!key.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-amber-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isFirstTime ? 'Enter the Panel Room' : hasChanged ? 'Save New Key' : 'Confirm & Close'}
              </button>

              <div className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-500">
                <span>Get your API key at</span>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  openrouter.ai/keys
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* ── Role Visibility tab ── */}
          {activeTab === 'roles' && !isFirstTime && roleVisibility && onToggleRoleVisibility && (
            <div className="px-8 py-6 space-y-5">
              <p className="text-xs text-gray-500 leading-relaxed">
                Disable roles you never want to see in the spawner or auto-load panel presets.
                Hidden roles are preserved in saved presets but won't appear as options.
              </p>

              {groupedRoles.map(({ category, label, presets }) => (
                <div key={category}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {presets.map((preset) => {
                      const enabled = roleVisibility[preset.role];
                      return (
                        <button
                          key={preset.role}
                          type="button"
                          onClick={() => onToggleRoleVisibility(preset.role)}
                          className={`group relative flex items-start gap-2 rounded-xl border p-2.5 text-left text-xs transition-all ${
                            enabled
                              ? 'border-gray-600 bg-gray-800 text-gray-200 hover:border-purple-500/60 hover:bg-gray-700'
                              : 'border-gray-800 bg-gray-900/60 text-gray-500 opacity-60 hover:opacity-80'
                          }`}
                        >
                          <span className="text-base leading-none">{preset.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold text-[11px]">{preset.label}</div>
                            <div className={`mt-0.5 text-[9px] font-semibold uppercase tracking-wider ${enabled ? 'text-purple-400' : 'text-gray-600'}`}>
                              {enabled ? 'Visible' : 'Hidden'}
                            </div>
                          </div>
                          {/* Toggle pip */}
                          <div className={`absolute right-2 top-2 h-2 w-2 rounded-full flex-shrink-0 transition-colors ${enabled ? 'bg-purple-400' : 'bg-gray-700'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => PARTICIPANT_PRESETS.forEach((p) => !roleVisibility[p.role] && onToggleRoleVisibility(p.role))}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-all"
                >
                  Enable All
                </button>
                <button
                  onClick={() => PARTICIPANT_PRESETS.forEach((p) => roleVisibility[p.role] && onToggleRoleVisibility(p.role))}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-all"
                >
                  Disable All
                </button>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-indigo-700 hover:bg-indigo-600 text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
              >
                Done
              </button>
            </div>
          )}
          {/* ── Traits tab ── */}
          {activeTab === 'traits' && !isFirstTime && customTraits && onAddTrait && onRemoveTrait && (
            <div className="px-8 py-6 space-y-5">
              <p className="text-xs text-gray-500 leading-relaxed">
                These traits are available when configuring panel participants. Add your own or remove ones you don't need.
              </p>

              <div className="flex gap-2">
                <input
                  value={newTrait}
                  onChange={(e) => setNewTrait(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTrait.trim()) {
                      onAddTrait(newTrait);
                      setNewTrait('');
                    }
                  }}
                  placeholder="Add trait..."
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => {
                    if (newTrait.trim()) {
                      onAddTrait(newTrait);
                      setNewTrait('');
                    }
                  }}
                  disabled={!newTrait.trim()}
                  className="rounded-xl border border-emerald-600/50 bg-emerald-700/40 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {customTraits.map((trait) => (
                  <span
                    key={trait}
                    className="flex items-center gap-1 rounded-full border border-gray-600 bg-gray-800 px-2.5 py-1 text-xs text-gray-200"
                  >
                    <span className="capitalize">{trait.replace(/_/g, ' ')}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveTrait(trait)}
                      className="ml-0.5 text-gray-500 hover:text-red-400 transition-colors leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
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
