
import type { PanelMemberConfig, ModelOption, ModelTier } from '../types';
import { MODEL_TIER_ORDER } from '../utils/modelCatalog';

interface ModelSelectorProps {
  member: PanelMemberConfig;
  onChange: (role: string, modelId: string) => void;
  models: ModelOption[];
}

const TIER_COLORS: Record<string, string> = {
  free: 'text-green-400',
  budget: 'text-blue-400',
  balanced: 'text-yellow-400',
  premium: 'text-orange-400',
  flagship: 'text-red-400',
  'bleeding-edge': 'text-fuchsia-400',
};

const TIER_LABELS: Record<string, string> = {
  free: '🆓',
  budget: '💵',
  balanced: '⚖️',
  premium: '⭐',
  flagship: '🚀',
  'bleeding-edge': '🔬',
};

export function ModelSelector({ member, onChange, models }: ModelSelectorProps) {
  const selectedTier = models.find((m) => m.id === member.selectedModel)?.tier || 'balanced';

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`text-xs ${TIER_COLORS[selectedTier]}`}>
        {TIER_LABELS[selectedTier]}
      </span>
      <select
        value={member.selectedModel}
        onChange={(e) => onChange(member.role, e.target.value)}
        className="bg-gray-800 border border-gray-600 rounded-lg text-xs text-gray-300 px-2 py-1 focus:outline-none focus:border-purple-500 truncate max-w-[160px]"
      >
        {MODEL_TIER_ORDER.map((tier) => {
          const tierModels = models.filter((m) => m.tier === tier);
          if (tierModels.length === 0) return null;
          return (
            <optgroup
              key={tier}
              label={`${TIER_LABELS[tier]} ${String(tier).split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')}`}
            >
              {tierModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </div>
  );
}

