import type { ModelOption, ModelPresetDefinition, ModelTier, PanelMember } from '../types';

type OpenRouterModel = {
  id: string;
  name?: string;
  description?: string;
  created?: number;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
    instruct_type?: string;
  };
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
};

export const MODEL_TIER_ORDER: ModelTier[] = ['free', 'budget', 'balanced', 'premium', 'flagship', 'bleeding-edge'];

export const MODEL_PRESET_DEFINITIONS: Record<ModelTier, ModelPresetDefinition> = {
  free: {
    label: 'Free',
    emoji: '🆓',
    description: 'Zero-cost models from the live OpenRouter catalog',
    targetTier: 'free',
  },
  budget: {
    label: 'Budget',
    emoji: '💵',
    description: 'Lowest-cost paid models with strong value',
    targetTier: 'budget',
  },
  balanced: {
    label: 'Balanced',
    emoji: '⚖️',
    description: 'Best quality-to-cost ratio from current OpenRouter models',
    targetTier: 'balanced',
  },
  premium: {
    label: 'Premium',
    emoji: '⭐',
    description: 'High-end models for stronger reasoning and creativity',
    targetTier: 'premium',
  },
  flagship: {
    label: 'Flagship',
    emoji: '🚀',
    description: 'Top-tier frontier models from major providers',
    targetTier: 'flagship',
  },
  'bleeding-edge': {
    label: 'Bleeding Edge',
    emoji: '🔬',
    description: 'Newest OpenAI, Anthropic, and Gemini models available',
    targetTier: 'bleeding-edge',
  },
};

function toNumber(value?: string): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getProvider(id: string): string {
  return id.split('/')[0] ?? '';
}

function compareProvider(a: string, b: string): number {
  return a.localeCompare(b);
}

function getContextLength(model: OpenRouterModel): number {
  return model.context_length || model.top_provider?.context_length || 0;
}

function getPromptPrice(model: OpenRouterModel): number {
  return toNumber(model.pricing?.prompt);
}

function getCompletionPrice(model: OpenRouterModel): number {
  return toNumber(model.pricing?.completion);
}

function getCreatedAt(model: OpenRouterModel): string | undefined {
  return model.created ? new Date(model.created * 1000).toISOString() : undefined;
}

function isNewestMajorProviderModel(model: OpenRouterModel): boolean {
  const provider = getProvider(model.id);
  if (!['openai', 'anthropic', 'google'].includes(provider)) return false;

  const ageScore = model.created ?? 0;
  const id = model.id.toLowerCase();

  return ageScore > 0 && !id.includes(':free');
}

function toUtcDay(timestamp?: number): string | null {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function getVersionKey(model: OpenRouterModel): string | null {
  const source = `${model.id} ${model.name ?? ''}`.toLowerCase();
  const match = source.match(/\b(\d+(?:\.\d+)+)\b/);
  return match?.[1] ?? null;
}

function getLatestBleedingEdgeIds(models: OpenRouterModel[]): Set<string> {
  const latestModelByProvider = new Map<string, OpenRouterModel>();

  for (const model of models) {
    if (!isNewestMajorProviderModel(model)) continue;

    const provider = getProvider(model.id);
    if (!provider) continue;

    const currentLatest = latestModelByProvider.get(provider);
    if (!currentLatest || (model.created ?? 0) > (currentLatest.created ?? 0)) {
      latestModelByProvider.set(provider, model);
    }
  }

  return new Set(
    models
      .filter((model) => {
        if (!isNewestMajorProviderModel(model)) return false;

        const provider = getProvider(model.id);
        if (!provider) return false;

        const latestModel = latestModelByProvider.get(provider);
        if (!latestModel) return false;

        const latestVersionKey = getVersionKey(latestModel);
        const candidateVersionKey = getVersionKey(model);

        if (latestVersionKey && candidateVersionKey) {
          return latestVersionKey === candidateVersionKey;
        }

        const latestDay = toUtcDay(latestModel.created);
        const candidateDay = toUtcDay(model.created);
        if (!latestDay || !candidateDay) return false;

        return latestDay === candidateDay;
      })
      .map((model) => model.id)
  );
}

function deriveTier(model: OpenRouterModel): ModelTier {
  const prompt = getPromptPrice(model);
  const completion = getCompletionPrice(model);
  const totalPrice = prompt + completion;
  const contextLength = getContextLength(model);

  if (prompt === 0 && completion === 0) return 'free';

  if (totalPrice <= 0.5 && contextLength >= 64000) return 'budget';
  if (totalPrice <= 2) return 'balanced';
  if (totalPrice <= 12) return 'premium';
  return 'flagship';
}

export function normalizeOpenRouterModel(model: OpenRouterModel): ModelOption {
  return {
    id: model.id,
    name: model.name || model.id,
    description: model.description || 'Live model from OpenRouter',
    contextLength: getContextLength(model),
    pricing: {
      prompt: getPromptPrice(model),
      completion: getCompletionPrice(model),
    },
    tier: deriveTier(model),
    architecture: model.architecture,
    topProvider: model.top_provider
      ? {
          contextLength: model.top_provider.context_length,
          maxCompletionTokens: model.top_provider.max_completion_tokens,
          isModerated: model.top_provider.is_moderated,
        }
      : undefined,
    createdAt: getCreatedAt(model),
  };
}

export async function fetchOpenRouterCatalog(): Promise<ModelOption[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models');
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenRouter models: ${response.status}`);
  }

  const payload = (await response.json()) as { data?: OpenRouterModel[] };
  const rawModels = payload.data || [];
  const bleedingEdgeIds = getLatestBleedingEdgeIds(rawModels);
  const models = rawModels.map((model) => {
    const normalized = normalizeOpenRouterModel(model);
    return {
      ...normalized,
      tier: bleedingEdgeIds.has(model.id) ? 'bleeding-edge' : normalized.tier,
    };
  });

  return models
    .filter((model) => Boolean(model.id))
    .sort((a, b) => {
      const tierDelta = MODEL_TIER_ORDER.indexOf(a.tier) - MODEL_TIER_ORDER.indexOf(b.tier);
      if (tierDelta !== 0) return tierDelta;

      const providerDelta = compareProvider(getProvider(a.id), getProvider(b.id));
      if (providerDelta !== 0) return providerDelta;

      return a.pricing.prompt - b.pricing.prompt || b.contextLength - a.contextLength || a.name.localeCompare(b.name);
    });
}

export function getModelsForTier(models: ModelOption[], tier: ModelTier): ModelOption[] {
  return models.filter((model) => model.tier === tier);
}

export function formatModelPricePerThousand(pricePerToken: number): string {
  const perThousand = pricePerToken * 1000;

  if (perThousand === 0) return '$0';
  if (perThousand >= 1) return `$${perThousand.toFixed(2).replace(/\.00$/, '')}`;
  if (perThousand >= 0.01) return `$${perThousand.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}`;

  return `$${perThousand.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}`;
}

export function buildPresetModelMap(models: ModelOption[], tier: ModelTier): Record<string, string> {
  const tierModels = getModelsForTier(models, tier);
  if (tierModels.length === 0) return {};

  const providerPriority: Record<PanelMember | 'note_taker', string[]> = {
    moderator: ['anthropic', 'openai', 'google'],
    mathematician: ['openai', 'anthropic', 'google'],
    psychologist: ['anthropic', 'openai', 'google'],
    artist: ['anthropic', 'google', 'openai'],
    game_designer: ['openai', 'anthropic', 'google'],
    engineer: ['openai', 'google', 'anthropic'],
    producer: ['openai', 'google', 'anthropic'],
    marketing: ['anthropic', 'google', 'openai'],
    narrative: ['anthropic', 'openai', 'google'],
    sound: ['google', 'anthropic', 'openai'],
    qa: ['openai', 'google', 'anthropic'],
    legal: ['openai', 'anthropic', 'google'],
    player_advocate: ['anthropic', 'openai', 'google'],
    data_scientist: ['openai', 'google', 'anthropic'],
    monetization: ['openai', 'anthropic', 'google'],
    note_taker: ['google', 'openai', 'anthropic'],
  };

  const pickModel = (preferredProviders: string[]) => {
    for (const provider of preferredProviders) {
      const match = tierModels.find((model) => model.id.startsWith(`${provider}/`));
      if (match) return match.id;
    }
    return tierModels[0]?.id;
  };

  return Object.fromEntries(
    Object.entries(providerPriority).map(([role, providers]) => [role, pickModel(providers)])
  );
}
