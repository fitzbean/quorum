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

export const MODEL_TIER_ORDER: ModelTier[] = ['free', 'balanced', 'last-generation', 'bleeding-edge'];

export const MODEL_PRESET_DEFINITIONS: Record<ModelTier, ModelPresetDefinition> = {
  free: {
    label: 'Free',
    emoji: '\u{1F193}',
    description: 'Zero-cost models from the live OpenRouter catalog',
    targetTier: 'free',
  },
  balanced: {
    label: 'Standard',
    emoji: '\u2696\uFE0F',
    description: 'Reliable general-purpose models for everyday work',
    targetTier: 'balanced',
  },
  'last-generation': {
    label: 'Advanced',
    emoji: '\u23EE',
    description: 'Strong previous-generation flagship models with proven performance',
    targetTier: 'last-generation',
  },
  'bleeding-edge': {
    label: 'Latest',
    emoji: '\u{1F52C}',
    description: 'Newest OpenAI, Anthropic, and Gemini model families available',
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
  const match = source.match(/(?:^|[-_\s])(\d+(?:\.\d+)*)\b/);
  return match?.[1] ?? null;
}

function parseVersionSegments(version: string | null): number[] | null {
  if (!version) return null;

  const segments = version.split('.').map((part) => Number(part));
  return segments.every(Number.isFinite) ? segments : null;
}

function compareVersionSegments(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

function getFamilyKey(model: OpenRouterModel): string | null {
  const slug = model.id.split('/')[1]?.split(':')[0]?.toLowerCase() ?? '';
  if (!slug) return null;

  const versionMatch = slug.match(/(?:^|[-_])(\d+(?:\.\d+)*)\b/);
  const familyPrefix = versionMatch ? slug.slice(0, versionMatch.index) : slug;
  return familyPrefix.split(/[-_]/).filter(Boolean)[0] ?? null;
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

function getLastGenerationIds(models: OpenRouterModel[], bleedingEdgeIds: Set<string>): Set<string> {
  const bleedingEdgeVersionByFamily = new Map<string, number[]>();

  for (const model of models) {
    if (!bleedingEdgeIds.has(model.id)) continue;

    const provider = getProvider(model.id);
    const family = getFamilyKey(model);
    const version = parseVersionSegments(getVersionKey(model));
    if (!provider || !family || !version) continue;

    const key = `${provider}:${family}`;
    const current = bleedingEdgeVersionByFamily.get(key);
    if (!current || compareVersionSegments(version, current) > 0) {
      bleedingEdgeVersionByFamily.set(key, version);
    }
  }

  const previousVersionByFamily = new Map<string, string>();

  for (const model of models) {
    const provider = getProvider(model.id);
    const family = getFamilyKey(model);
    const versionKey = getVersionKey(model);
    const version = parseVersionSegments(versionKey);
    if (!provider || !family || !versionKey || !version) continue;

    const key = `${provider}:${family}`;
    const bleedingEdgeVersion = bleedingEdgeVersionByFamily.get(key);
    if (!bleedingEdgeVersion || compareVersionSegments(version, bleedingEdgeVersion) >= 0) continue;

    const currentPreviousVersion = previousVersionByFamily.get(key);
    if (!currentPreviousVersion) {
      previousVersionByFamily.set(key, versionKey);
      continue;
    }

    const currentPreviousSegments = parseVersionSegments(currentPreviousVersion);
    if (!currentPreviousSegments || compareVersionSegments(version, currentPreviousSegments) > 0) {
      previousVersionByFamily.set(key, versionKey);
    }
  }

  return new Set(
    models
      .filter((model) => {
        if (bleedingEdgeIds.has(model.id)) return false;

        const provider = getProvider(model.id);
        const family = getFamilyKey(model);
        const versionKey = getVersionKey(model);
        if (!provider || !family || !versionKey) return false;

        return previousVersionByFamily.get(`${provider}:${family}`) === versionKey;
      })
      .map((model) => model.id)
  );
}

function deriveTier(model: OpenRouterModel): ModelTier {
  const prompt = getPromptPrice(model);
  const completion = getCompletionPrice(model);

  if (prompt === 0 && completion === 0) return 'free';
  return 'balanced';
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
  const lastGenerationIds = getLastGenerationIds(rawModels, bleedingEdgeIds);
  const models = rawModels.map((model) => {
    const normalized = normalizeOpenRouterModel(model);
    return {
      ...normalized,
      tier: bleedingEdgeIds.has(model.id)
        ? 'bleeding-edge'
        : lastGenerationIds.has(model.id)
          ? 'last-generation'
          : normalized.tier,
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
