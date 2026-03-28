
import { OPENROUTER_MODELS } from '../constants';
import type { PanelMemberConfig } from '../types';

interface ModelSelectorProps {
  member: PanelMemberConfig;
  onChange: (role: string, modelId: string) => void;
}

const TIER_COLORS: Record<string, string> = {
  free: 'text-green-400',
  budget: 'text-blue-400',
  mid: 'text-yellow-400',
  premium: 'text-orange-400',
  flagship: 'text-red-400',
};

const TIER_LABELS: Record<string, string> = {
  free: '🆓',
  budget: '💵',
  mid: '💳',
  premium: '⭐',
  flagship: '🚀',
};

export function ModelSelector({ member, onChange }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`text-xs ${TIER_COLORS[OPENROUTER_MODELS.find(m => m.id === member.selectedModel)?.tier || 'mid']}`}>
        {TIER_LABELS[OPENROUTER_MODELS.find(m => m.id === member.selectedModel)?.tier || 'mid']}
      </span>
      <select
        value={member.selectedModel}
        onChange={(e) => onChange(member.role, e.target.value)}
        className="bg-gray-800 border border-gray-600 rounded-lg text-xs text-gray-300 px-2 py-1 focus:outline-none focus:border-purple-500 truncate max-w-[160px]"
      >
        {['free', 'budget', 'mid', 'premium', 'flagship'].map((tier) => {
          const tierModels = OPENROUTER_MODELS.filter((m) => m.tier === tier);
          if (tierModels.length === 0) return null;
          return (
            <optgroup
              key={tier}
              label={`${TIER_LABELS[tier]} ${tier.charAt(0).toUpperCase() + tier.slice(1)}`}
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


