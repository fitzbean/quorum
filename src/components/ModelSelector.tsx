import type { PanelMemberConfig, ModelOption, ModelTier } from '../types';
import { MODEL_TIER_ORDER } from '../utils/modelCatalog';

interface ModelSelectorProps {
  member: PanelMemberConfig;
  onChange: (role: string, modelId: string) => void;
  models: ModelOption[];
}

const TIER_COLORS: Record<ModelTier, string> = {
  free: 'text-green-400',
  balanced: 'text-yellow-400',
  'last-generation': 'text-orange-400',
  'bleeding-edge': 'text-fuchsia-400',
};

const TIER_LABELS: Record<ModelTier, string> = {
  free: '\u{1F193}',
  balanced: '\u2696\uFE0F',
  'last-generation': '\u23EE',
  'bleeding-edge': '\u{1F52C}',
};

const TIER_NAMES: Record<ModelTier, string> = {
  free: 'Free',
  balanced: 'Standard',
  'last-generation': 'Advanced',
  'bleeding-edge': 'Latest',
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
              label={`${TIER_LABELS[tier]} ${TIER_NAMES[tier]}`}
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
