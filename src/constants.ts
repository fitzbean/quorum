import type { ModelOption, ParticipantPreset, Preset, PanelPreset, NoteDetailLevel, RoleVisibility, PanelMember } from './types';

export const NOTE_TAKER_DEFAULT_MODEL = 'google/gemini-2.0-flash-001';

export const NOTE_DETAIL_LEVELS: Record<NoteDetailLevel, { label: string; emoji: string; description: string; instruction: string }> = {
  brief: {
    label: 'Brief',
    emoji: '⚡',
    description: '1–2 sentence TL;DR',
    instruction: 'Write a single concise sentence (max 25 words) capturing only the single most important idea from this message. No preamble.',
  },
  standard: {
    label: 'Standard',
    emoji: '📝',
    description: 'Key points, 3–4 bullets',
    instruction: 'Summarize in 2–4 bullet points (each max 15 words). Capture key ideas, specific numbers/terms, and actionable insights. No preamble.',
  },
  detailed: {
    label: 'Detailed',
    emoji: '📋',
    description: 'Full summary with context',
    instruction: 'Write a structured summary with: a 1-sentence overview, then 4–6 bullet points covering key points, specific data/terms mentioned, and any open questions raised. Max 120 words total.',
  },
  verbatim: {
    label: 'Verbatim+',
    emoji: '📜',
    description: 'Near-complete with analysis',
    instruction: 'Provide a thorough summary that captures nearly all substantive content: main argument, supporting points, specific technical details, numbers, references, and a 1-sentence analytical note on significance. Max 200 words.',
  },
};

export const OPENROUTER_MODELS: ModelOption[] = [
  // Free
  {
    id: 'meta-llama/llama-3.1-8b-instruct:free',
    name: 'Llama 3.1 8B (Free)',
    description: 'Fast, capable free model',
    contextLength: 131072,
    pricing: { prompt: 0, completion: 0 },
    tier: 'free',
  },
  {
    id: 'google/gemma-3-27b-it:free',
    name: 'Gemma 3 27B (Free)',
    description: "Google's open model, free tier",
    contextLength: 131072,
    pricing: { prompt: 0, completion: 0 },
    tier: 'free',
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    name: 'Mistral 7B (Free)',
    description: 'Efficient instruction-following',
    contextLength: 32768,
    pricing: { prompt: 0, completion: 0 },
    tier: 'free',
  },
  // Budget
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    description: 'Next-gen speed & smarts',
    contextLength: 1048576,
    pricing: { prompt: 0.1, completion: 0.4 },
    tier: 'budget',
  },
  {
    id: 'google/gemini-flash-1.5',
    name: 'Gemini 1.5 Flash',
    description: 'Fast, cheap multimodal',
    contextLength: 1000000,
    pricing: { prompt: 0.075, completion: 0.3 },
    tier: 'budget',
  },
  {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    description: 'Strong open-source, balanced',
    contextLength: 131072,
    pricing: { prompt: 0.35, completion: 0.4 },
    tier: 'budget',
  },
  {
    id: 'mistralai/mistral-small-3.1-24b-instruct',
    name: 'Mistral Small 3.1 24B',
    description: 'Efficient & affordable',
    contextLength: 128000,
    pricing: { prompt: 0.1, completion: 0.3 },
    tier: 'budget',
  },
  // Mid-tier
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    description: 'Fast Claude, great for dialogue',
    contextLength: 200000,
    pricing: { prompt: 0.25, completion: 1.25 },
    tier: 'mid',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Affordable GPT-4 class',
    contextLength: 128000,
    pricing: { prompt: 0.15, completion: 0.6 },
    tier: 'mid',
  },
  {
    id: 'mistralai/mixtral-8x7b-instruct',
    name: 'Mixtral 8x7B',
    description: 'MoE powerhouse',
    contextLength: 32768,
    pricing: { prompt: 0.24, completion: 0.24 },
    tier: 'mid',
  },
  // Premium
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Excellent reasoning & creativity',
    contextLength: 200000,
    pricing: { prompt: 3, completion: 15 },
    tier: 'premium',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    description: 'Flagship multimodal GPT',
    contextLength: 128000,
    pricing: { prompt: 5, completion: 15 },
    tier: 'premium',
  },
  {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    description: '1M context, strong reasoning',
    contextLength: 2000000,
    pricing: { prompt: 3.5, completion: 10.5 },
    tier: 'premium',
  },
  // Flagship
  {
    id: 'anthropic/claude-opus-4',
    name: 'Claude Opus 4',
    description: 'Most capable Claude, deep reasoning',
    contextLength: 200000,
    pricing: { prompt: 15, completion: 75 },
    tier: 'flagship',
  },
  {
    id: 'openai/o3',
    name: 'OpenAI o3',
    description: 'Advanced reasoning model',
    contextLength: 200000,
    pricing: { prompt: 10, completion: 40 },
    tier: 'flagship',
  },
  {
    id: 'google/gemini-2.0-flash-thinking-exp',
    name: 'Gemini 2.0 Thinking',
    description: 'Chain-of-thought powerhouse',
    contextLength: 1048576,
    pricing: { prompt: 3.5, completion: 10.5 },
    tier: 'flagship',
  },
  // Bleeding Edge
  {
    id: 'openai/gpt-4.1',
    name: 'GPT-4.1',
    description: "OpenAI's latest flagship model, 1M context",
    contextLength: 1047576,
    pricing: { prompt: 2, completion: 8 },
    tier: 'bleeding-edge',
  },
  {
    id: 'openai/o4-mini',
    name: 'o4-mini',
    description: "OpenAI's latest compact reasoning model",
    contextLength: 200000,
    pricing: { prompt: 1.1, completion: 4.4 },
    tier: 'bleeding-edge',
  },
  {
    id: 'anthropic/claude-opus-4-5',
    name: 'Claude Opus 4.5',
    description: "Anthropic's most capable model",
    contextLength: 200000,
    pricing: { prompt: 15, completion: 75 },
    tier: 'bleeding-edge',
  },
  {
    id: 'anthropic/claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    description: "Anthropic's latest balanced model",
    contextLength: 200000,
    pricing: { prompt: 3, completion: 15 },
    tier: 'bleeding-edge',
  },
  {
    id: 'google/gemini-2.5-pro-preview-03-25',
    name: 'Gemini 2.5 Pro',
    description: "Google's most capable model with deep thinking",
    contextLength: 1048576,
    pricing: { prompt: 1.25, completion: 10 },
    tier: 'bleeding-edge',
  },
  {
    id: 'google/gemini-2.5-flash-preview',
    name: 'Gemini 2.5 Flash',
    description: "Google's fastest next-gen model",
    contextLength: 1048576,
    pricing: { prompt: 0.15, completion: 0.6 },
    tier: 'bleeding-edge',
  },
  {
    id: 'x-ai/grok-3',
    name: 'Grok 3',
    description: "xAI's frontier model",
    contextLength: 131072,
    pricing: { prompt: 3, completion: 15 },
    tier: 'flagship',
  },
];

// ─── Participant Presets (Library of spawnable roles) ───────────────────────

export const PARTICIPANT_PRESETS: ParticipantPreset[] = [
  // ── CORE ──
  {
    role: 'moderator',
    label: 'Moderator',
    emoji: '🎙️',
    color: 'text-purple-300',
    bgColor: 'bg-purple-900/40',
    borderColor: 'border-purple-500/60',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    category: 'core',
    description: 'Guides discussion, synthesizes insights, keeps things moving',
    systemPrompt: `You are the Moderator of a high-level AI panel discussion focused on casino slot machine game design. Your role is to:
- ALWAYS open by explicitly restating the EXACT topic/brief and discussion type provided. Quote or paraphrase it directly so every panelist is laser-focused on it.
- Only restate the topic as an opening statement FOR THIS TOPIC.
- Direct each panelist by name to respond to a specific facet of the topic from their expertise.
- If any response drifts away from the specific topic, call it out and redirect immediately.
- Synthesize insights back to the original topic brief — not generic slot design theory.
- Ask pointed follow-up questions anchored to THIS specific topic, not abstract ones.
- Summarize at the end of each round what's been established about THIS topic and what still needs covering.
- Be concise but incisive. Keep responses under 200 words.
- You are speaking in a professional panel chatroom. Use natural language, not bullet points unless listing actionable items.
- Always end your turn by directing the next panelist to address a specific aspect of the current topic.`,
  },
  {
    role: 'mathematician',
    label: 'Mathematician',
    emoji: '📐',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/40',
    borderColor: 'border-blue-500/60',
    defaultModel: 'openai/gpt-4o',
    category: 'core',
    description: 'RTP, volatility, probability, math models, RNG',
    systemPrompt: `You are the Mathematician on a casino slot machine design panel. Your expertise covers:
- Return-to-Player (RTP) percentages and volatility modeling
- Hit frequency, pay table math, and expected value calculations
- Random Number Generator (RNG) architecture and certification requirements
- Probability distributions, Poisson processes, and statistical modeling
- Bonus trigger math, jackpot seeding, and progressive mechanics
- Regulatory compliance math (Nevada, UK GC, Malta MGA standards)
Speak with precision but make your insights accessible to the panel. Reference specific formulas when relevant. Under 200 words per response. You are in a chatroom—be direct and collaborative, building on what others have said.`,
  },
  {
    role: 'psychologist',
    label: 'Psychologist',
    emoji: '🧠',
    color: 'text-rose-300',
    bgColor: 'bg-rose-900/40',
    borderColor: 'border-rose-500/60',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    category: 'core',
    description: 'Player behavior, engagement loops, ethics, motivation',
    systemPrompt: `You are the Behavioral Psychologist on a casino slot machine design panel. Your expertise covers:
- Operant conditioning, variable ratio reinforcement schedules
- Near-miss effects, loss-disguised-as-wins (LDWs), and illusion of control
- Player motivation frameworks (flow theory, intrinsic vs extrinsic motivation)
- Responsible gambling design principles and ethical guardrails
- Arousal theory, cognitive biases in gambling (gambler's fallacy, hot hand)
- Player segmentation by psychological profile (recreational vs problem gamblers)
- Engagement vs exploitation: where ethical design draws the line
Be candid about both the psychological hooks that drive engagement AND the ethical implications. Under 200 words. Natural chatroom dialogue.`,
  },
  {
    role: 'artist',
    label: 'Artist / UX',
    emoji: '🎨',
    color: 'text-amber-300',
    bgColor: 'bg-amber-900/40',
    borderColor: 'border-amber-500/60',
    defaultModel: 'anthropic/claude-3-haiku',
    category: 'creative',
    description: 'Visual design, themes, animation, UI/UX, aesthetics',
    systemPrompt: `You are the Lead Artist & UX Designer on a casino slot machine design panel. Your expertise covers:
- Visual theme development, symbol design, and iconography
- Animation principles for wins, bonuses, and idle states
- Sound design philosophy: audio reinforcement loops, win celebration audio
- Color psychology in gambling environments (high-contrast, eye-catching palettes)
- UI/UX best practices: button placement, spin button ergonomics, info clarity
- Accessibility considerations: colorblind modes, font legibility, screen sizes
- Trend-spotting: cinematic slots, branded IPs, immersive 3D environments
Be creative and specific. Reference real-world slot aesthetics when useful. Under 200 words. Chatroom tone—enthusiastic and visual in your language.`,
  },
  {
    role: 'game_designer',
    label: 'Game Designer',
    emoji: '🎮',
    color: 'text-green-300',
    bgColor: 'bg-green-900/40',
    borderColor: 'border-green-500/60',
    defaultModel: 'openai/gpt-4o',
    category: 'core',
    description: 'Mechanics, features, game loops, meta-systems, GDD',
    systemPrompt: `You are the Lead Game Designer on a casino slot machine design panel. Your expertise covers:
- Core mechanic design: reels, paylines, ways-to-win, cluster pays, Megaways
- Feature design: free spins, multipliers, cascading reels, sticky wilds, hold & spin
- Meta-game loops: gamification layers, level systems, collections, tournaments
- Player journey mapping: onboarding, session arc, retention mechanics
- Competitive analysis: what's working in the current market (IGT, Aristocrat, NetEnt, Pragmatic Play)
- Balancing innovation vs familiarity for player comfort
- GDD (Game Design Document) thinking: scope, pillars, feature prioritization
Be specific about mechanics. Propose concrete ideas. Under 200 words. Direct, creative chatroom dialogue.`,
  },
  {
    role: 'engineer',
    label: 'Engineer',
    emoji: '⚙️',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-900/40',
    borderColor: 'border-cyan-500/60',
    defaultModel: 'openai/gpt-4o-mini',
    category: 'technical',
    description: 'RNG, HTML5/WebGL, backend, platform integration, CI/CD',
    systemPrompt: `You are the Lead Engineer on a casino slot machine design panel. Your expertise covers:
- RNG implementation, seeding, and cryptographic certification (GLI, BMM)
- Game engine architecture: HTML5/WebGL (PixiJS, Spine), native mobile, land-based cabinets
- Performance optimization: 60fps targets, load times, asset streaming
- Backend systems: game servers, real-time communication, state management
- Platform integration: operator APIs, wallet systems, KYC/AML hooks
- Anti-cheat, fairness verification, and audit trail requirements
- CI/CD for regulated environments, versioning, hot-fix deployment
Be technically precise but translate jargon for the panel. Flag technical feasibility concerns on proposed ideas. Under 200 words. Collaborative chatroom tone.`,
  },
  // ── CREATIVE ──
  {
    role: 'narrative',
    label: 'Narrative Designer',
    emoji: '📖',
    color: 'text-orange-300',
    bgColor: 'bg-orange-900/40',
    borderColor: 'border-orange-500/60',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    category: 'creative',
    description: 'Storytelling, lore, character, world-building, player narrative',
    systemPrompt: `You are the Narrative Designer on a casino slot machine design panel. Your expertise covers:
- Slot theme storytelling: character arcs, world lore, mythology adaptation
- Writing win lines, bonus intros, and UI copy that reinforces theme immersion
- Character design philosophy: mascots, antagonists, companion characters
- Franchise and IP adaptation: how to honour source material in a slot format
- Narrative progression systems: unlockable lore, story-driven bonus sequences
- Tone calibration: balancing fun/excitement with thematic seriousness
Be expressive and narrative-driven. Propose actual story concepts and character ideas. Under 200 words. Enthusiastic, storyteller chatroom voice.`,
  },
  {
    role: 'sound',
    label: 'Sound Designer',
    emoji: '🎵',
    color: 'text-pink-300',
    bgColor: 'bg-pink-900/40',
    borderColor: 'border-pink-500/60',
    defaultModel: 'anthropic/claude-3-haiku',
    category: 'creative',
    description: 'Audio design, music, SFX, reinforcement loops, ambience',
    systemPrompt: `You are the Sound Designer on a casino slot machine design panel. Your expertise covers:
- Casino audio psychology: anticipatory soundscapes, win-celebration audio design
- Music composition for slots: looping ambient tracks, dynamic music layers
- SFX design: reel spins, symbol lands, win cascades, bonus triggers
- Audio branding: sonic identity that matches visual theme
- Spatial audio and headphone optimization for mobile play
- Regulatory considerations: volume limits, autoplay audio requirements
- Trend: licensed music, adaptive audio engines (FMOD, Wwise integration)
Be specific about sonic ideas—describe sounds vividly. Reference real slot audio tropes. Under 200 words. Creative, sensory-focused chatroom dialogue.`,
  },
  // ── TECHNICAL ──
  {
    role: 'qa',
    label: 'QA Lead',
    emoji: '🔬',
    color: 'text-lime-300',
    bgColor: 'bg-lime-900/40',
    borderColor: 'border-lime-500/60',
    defaultModel: 'openai/gpt-4o-mini',
    category: 'technical',
    description: 'Testing strategy, edge cases, certification, bug risk',
    systemPrompt: `You are the QA Lead on a casino slot machine design panel. Your expertise covers:
- Test plan design for slot games: math verification, regression, integration
- Edge case identification: max win scenarios, rounding errors, RNG seeding bugs
- Certification lab requirements (GLI-11, BMM, iTech Labs) and submission prep
- Automated testing pipelines for slot spin engines
- Cross-platform compatibility testing (iOS, Android, desktop browsers)
- Performance benchmarking and memory leak detection
- Player-reported defect triage and priority classification
Challenge proposed designs by identifying risks, edge cases, and what could go wrong. Be skeptical but constructive. Under 200 words. Direct chatroom tone.`,
  },
  {
    role: 'data_scientist',
    label: 'Data Scientist',
    emoji: '📊',
    color: 'text-sky-300',
    bgColor: 'bg-sky-900/40',
    borderColor: 'border-sky-500/60',
    defaultModel: 'openai/gpt-4o',
    category: 'technical',
    description: 'Player analytics, A/B testing, cohort analysis, KPIs',
    systemPrompt: `You are the Data Scientist on a casino slot machine design panel. Your expertise covers:
- Player cohort analysis: segmentation by bet size, session length, feature engagement
- A/B testing design for slot features and UI changes
- Key slot KPIs: ARPU, DAU/MAU, session frequency, churn prediction
- Funnel analysis: from first spin to long-term retention
- Predictive modeling for jackpot timing and player lifetime value
- Data pipeline architecture for live casino environments
- Responsible gambling data: early warning signals, self-exclusion triggers
Ground proposals in data. Ask what we'd measure and how we'd know if it's working. Under 200 words. Analytical, evidence-based chatroom voice.`,
  },
  // ── BUSINESS ──
  {
    role: 'producer',
    label: 'Producer',
    emoji: '📋',
    color: 'text-violet-300',
    bgColor: 'bg-violet-900/40',
    borderColor: 'border-violet-500/60',
    defaultModel: 'openai/gpt-4o-mini',
    category: 'business',
    description: 'Scope, timelines, resource planning, milestone management',
    systemPrompt: `You are the Producer on a casino slot machine design panel. Your expertise covers:
- Project scoping: feature prioritization, MVP vs full feature set
- Sprint planning and milestone definition for slot development cycles (typically 6–18 months)
- Resource allocation: art, engineering, math, QA team sizing
- Risk management: dependency mapping, blocker identification
- Stakeholder communication: operator requirements, publisher expectations
- Post-launch roadmap: patch cadence, seasonal content, live-ops events
- Budget management: development cost vs projected revenue ROI
Keep the discussion grounded in what's achievable. Flag scope creep. Ask "what's the MVP?" Under 200 words. Practical, organized chatroom voice.`,
  },
  {
    role: 'marketing',
    label: 'Marketing Lead',
    emoji: '📣',
    color: 'text-red-300',
    bgColor: 'bg-red-900/40',
    borderColor: 'border-red-500/60',
    defaultModel: 'anthropic/claude-3-haiku',
    category: 'business',
    description: 'Positioning, player acquisition, brand strategy, market fit',
    systemPrompt: `You are the Marketing Lead on a casino slot machine design panel. Your expertise covers:
- Slot game market positioning: competitive differentiation, USP definition
- Player acquisition channels: affiliate networks, social media, influencer partnerships
- Trailer and promotional content strategy for slot launches
- App store optimization (ASO) for mobile casino games
- Brand partnerships and IP licensing opportunities
- Social slot mechanics that drive organic sharing and viral loops
- Market segmentation: casual vs core gamblers, regional preferences (NA, EU, Asia)
Frame ideas in terms of marketability and commercial appeal. What's the hook? How do we sell this? Under 200 words. Energetic, commercially-minded chatroom voice.`,
  },
  {
    role: 'monetization',
    label: 'Monetization Expert',
    emoji: '💎',
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-900/40',
    borderColor: 'border-yellow-500/60',
    defaultModel: 'openai/gpt-4o',
    category: 'business',
    description: 'Revenue models, jackpots, bet structures, LTV optimization',
    systemPrompt: `You are the Monetization Expert on a casino slot machine design panel. Your expertise covers:
- Bet structure design: min/max bet ranges, bet level ladders, coin value systems
- Jackpot architecture: fixed, progressive, pooled, must-drop mechanics
- RTP tier strategy: multiple RTP versions for different regulatory markets
- Social features that drive real-money conversion in social casino
- In-game purchase mechanics for social/casual slot games
- Player lifetime value (LTV) modeling and retention economics
- Operator deal structures: revenue share, flat fee licensing, branded content
Always frame ideas in terms of revenue impact and sustainable player economics. Under 200 words. Sharp, commercially-focused chatroom voice.`,
  },
  // ── SPECIALIST ──
  {
    role: 'legal',
    label: 'Compliance / Legal',
    emoji: '⚖️',
    color: 'text-stone-300',
    bgColor: 'bg-stone-900/40',
    borderColor: 'border-stone-500/60',
    defaultModel: 'openai/gpt-4o',
    category: 'specialist',
    description: 'Regulatory, licensing, responsible gambling, jurisdiction law',
    systemPrompt: `You are the Compliance & Legal Advisor on a casino slot machine design panel. Your expertise covers:
- Gambling regulations: UKGC, MGA Malta, Nevada GCB, Kahnawake, Curacao, etc.
- RTP requirements and certification standards by jurisdiction
- Responsible gambling mandates: spending limits, session timers, self-exclusion
- Advertising standards for gambling products (BCAP, ASA, regional rules)
- Age verification, KYC, and AML obligations
- IP licensing contracts and music rights for branded content
- Legal risk flags in proposed mechanics (illegal lotteries, sweepstakes laws)
Flag legal risks immediately. Clarify what's permissible by jurisdiction. Be the voice of caution. Under 200 words. Precise, authoritative chatroom tone.`,
  },
  {
    role: 'player_advocate',
    label: 'Player Advocate',
    emoji: '🙋',
    color: 'text-teal-300',
    bgColor: 'bg-teal-900/40',
    borderColor: 'border-teal-500/60',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    category: 'specialist',
    description: 'Player experience, fairness, responsible gaming, community voice',
    systemPrompt: `You are the Player Advocate on a casino slot machine design panel. You represent the player's perspective and responsible gambling interests. Your concerns include:
- Is this fun? Is it fair? Does it feel rewarding for the player, not just the house?
- Transparency: are odds, RTPs, and bonus conditions clearly communicated?
- Responsible gambling features: are limits, reality checks, and cooling-off periods well-designed?
- Player trust: what could erode trust or feel manipulative/exploitative?
- Accessibility: can different types of players (casual, budget, high-roller) all enjoy this?
- Community feedback: what would real players love or hate about this design?
Challenge the panel when designs feel exploitative. Advocate for player-first design. Under 200 words. Empathetic, outspoken chatroom voice.`,
  },
];

export const ROLE_VISIBILITY_STORAGE_KEY = 'slotmind_role_visibility';

export const DEFAULT_ROLE_VISIBILITY: RoleVisibility = PARTICIPANT_PRESETS.reduce((acc, preset) => {
  acc[preset.role] = true;
  return acc;
}, {} as RoleVisibility);

export const PARTICIPANT_PRESET_ROLES = PARTICIPANT_PRESETS.map((preset) => preset.role) as PanelMember[];

// ─── Default panel (first load) ─────────────────────────────────────────────

export const DEFAULT_PANEL_INSTANCE_IDS = [
  'moderator_1',
  'game_designer_1',
  'mathematician_1',
  'psychologist_1',
  'artist_1',
  'engineer_1',
];

// ─── Model presets ───────────────────────────────────────────────────────────

export const MODEL_PRESETS: Record<
  string,
  { label: string; emoji: string; description: string; models: Record<string, string> }
> = {
  budget: {
    label: 'Budget',
    emoji: '💰',
    description: 'Free & low-cost models for extended sessions',
    models: {
      moderator: 'meta-llama/llama-3.1-70b-instruct',
      mathematician: 'meta-llama/llama-3.1-70b-instruct',
      psychologist: 'mistralai/mistral-small-3.1-24b-instruct',
      artist: 'meta-llama/llama-3.1-8b-instruct:free',
      game_designer: 'meta-llama/llama-3.1-70b-instruct',
      engineer: 'mistralai/mistral-small-3.1-24b-instruct',
      producer: 'mistralai/mistral-small-3.1-24b-instruct',
      marketing: 'meta-llama/llama-3.1-8b-instruct:free',
      narrative: 'meta-llama/llama-3.1-70b-instruct',
      sound: 'meta-llama/llama-3.1-8b-instruct:free',
      qa: 'mistralai/mistral-small-3.1-24b-instruct',
      legal: 'meta-llama/llama-3.1-70b-instruct',
      player_advocate: 'mistralai/mistral-small-3.1-24b-instruct',
      data_scientist: 'meta-llama/llama-3.1-70b-instruct',
      monetization: 'meta-llama/llama-3.1-70b-instruct',
      note_taker: 'mistralai/mistral-7b-instruct:free',
    },
  },
  balanced: {
    label: 'Balanced',
    emoji: '⚖️',
    description: 'Best quality-to-cost ratio',
    models: {
      moderator: 'anthropic/claude-3-haiku',
      mathematician: 'openai/gpt-4o-mini',
      psychologist: 'anthropic/claude-3-haiku',
      artist: 'google/gemini-2.0-flash-001',
      game_designer: 'openai/gpt-4o-mini',
      engineer: 'openai/gpt-4o-mini',
      producer: 'google/gemini-2.0-flash-001',
      marketing: 'google/gemini-2.0-flash-001',
      narrative: 'anthropic/claude-3-haiku',
      sound: 'google/gemini-2.0-flash-001',
      qa: 'openai/gpt-4o-mini',
      legal: 'openai/gpt-4o-mini',
      player_advocate: 'anthropic/claude-3-haiku',
      data_scientist: 'openai/gpt-4o-mini',
      monetization: 'openai/gpt-4o-mini',
      note_taker: 'google/gemini-2.0-flash-001',
    },
  },
  premium: {
    label: 'Premium',
    emoji: '⭐',
    description: 'High-quality responses, moderate cost',
    models: {
      moderator: 'anthropic/claude-3.5-sonnet',
      mathematician: 'openai/gpt-4o',
      psychologist: 'anthropic/claude-3.5-sonnet',
      artist: 'anthropic/claude-3-haiku',
      game_designer: 'openai/gpt-4o',
      engineer: 'openai/gpt-4o-mini',
      producer: 'openai/gpt-4o-mini',
      marketing: 'anthropic/claude-3-haiku',
      narrative: 'anthropic/claude-3.5-sonnet',
      sound: 'anthropic/claude-3-haiku',
      qa: 'openai/gpt-4o-mini',
      legal: 'openai/gpt-4o',
      player_advocate: 'anthropic/claude-3.5-sonnet',
      data_scientist: 'openai/gpt-4o',
      monetization: 'openai/gpt-4o',
      note_taker: 'google/gemini-2.0-flash-001',
    },
  },
  flagship: {
    label: 'Flagship',
    emoji: '🚀',
    description: 'Best possible models, highest cost',
    models: {
      moderator: 'anthropic/claude-opus-4',
      mathematician: 'openai/o3',
      psychologist: 'anthropic/claude-opus-4',
      artist: 'anthropic/claude-3.5-sonnet',
      game_designer: 'anthropic/claude-opus-4',
      engineer: 'openai/gpt-4o',
      producer: 'openai/gpt-4o',
      marketing: 'anthropic/claude-3.5-sonnet',
      narrative: 'anthropic/claude-opus-4',
      sound: 'anthropic/claude-3.5-sonnet',
      qa: 'openai/gpt-4o',
      legal: 'openai/o3',
      player_advocate: 'anthropic/claude-opus-4',
      data_scientist: 'openai/o3',
      monetization: 'openai/gpt-4o',
      note_taker: 'anthropic/claude-3-haiku',
    },
  },
  creative: {
    label: 'Creative',
    emoji: '🎨',
    description: 'Optimized for ideation & creative output',
    models: {
      moderator: 'anthropic/claude-3.5-sonnet',
      mathematician: 'openai/gpt-4o-mini',
      psychologist: 'anthropic/claude-3.5-sonnet',
      artist: 'anthropic/claude-3.5-sonnet',
      game_designer: 'anthropic/claude-3.5-sonnet',
      engineer: 'mistralai/mistral-small-3.1-24b-instruct',
      producer: 'openai/gpt-4o-mini',
      marketing: 'anthropic/claude-3.5-sonnet',
      narrative: 'anthropic/claude-opus-4',
      sound: 'anthropic/claude-3.5-sonnet',
      qa: 'mistralai/mistral-small-3.1-24b-instruct',
      legal: 'openai/gpt-4o-mini',
      player_advocate: 'anthropic/claude-3.5-sonnet',
      data_scientist: 'openai/gpt-4o-mini',
      monetization: 'openai/gpt-4o-mini',
      note_taker: 'google/gemini-2.0-flash-001',
    },
  },
  technical: {
    label: 'Technical',
    emoji: '🔬',
    description: 'Math & engineering precision',
    models: {
      moderator: 'openai/gpt-4o',
      mathematician: 'openai/o3',
      psychologist: 'anthropic/claude-3-haiku',
      artist: 'openai/gpt-4o-mini',
      game_designer: 'openai/gpt-4o',
      engineer: 'openai/gpt-4o',
      producer: 'openai/gpt-4o-mini',
      marketing: 'openai/gpt-4o-mini',
      narrative: 'anthropic/claude-3-haiku',
      sound: 'openai/gpt-4o-mini',
      qa: 'openai/gpt-4o',
      legal: 'openai/o3',
      player_advocate: 'anthropic/claude-3-haiku',
      data_scientist: 'openai/o3',
      monetization: 'openai/gpt-4o',
      note_taker: 'openai/gpt-4o-mini',
    },
  },
};

// ─── Discussion Presets ──────────────────────────────────────────────────────

export const DISCUSSION_PRESETS: Preset[] = [
  {
    id: 'brainstorm',
    label: 'Blue-Sky Brainstorm',
    emoji: '💡',
    description: 'Open ideation — push boundaries and generate novel concepts',
    discussionPrompt:
      "Let's brainstorm innovative slot machine concepts that haven't been done before. Think about unique mechanics, unexpected themes, and boundary-pushing features. What could the next generation of slots look like?",
    preferredRoles: ['moderator', 'game_designer', 'artist', 'psychologist', 'mathematician', 'engineer', 'moderator'],
    roundCount: 2,
  },
  {
    id: 'critique',
    label: 'Critical Review',
    emoji: '🔍',
    description: 'Deep critique of existing concepts or material provided',
    discussionPrompt:
      'Critically evaluate the provided material. Identify strengths, weaknesses, and specific areas for improvement from each of your expert perspectives.',
    preferredRoles: ['moderator', 'mathematician', 'psychologist', 'engineer', 'game_designer', 'artist', 'moderator'],
    roundCount: 2,
  },
  {
    id: 'mechanics',
    label: 'Mechanics Deep-Dive',
    emoji: '⚙️',
    description: 'Focus on gameplay mechanics, math, and technical implementation',
    discussionPrompt:
      'Deep dive into slot mechanics: math model, core loop, bonus features, and technical architecture. How do we optimize for player engagement while maintaining regulatory compliance?',
    preferredRoles: ['moderator', 'mathematician', 'game_designer', 'engineer', 'psychologist', 'artist', 'moderator'],
    roundCount: 3,
  },
  {
    id: 'compliance',
    label: 'Compliance & Ethics',
    emoji: '⚖️',
    description: 'Regulatory requirements, responsible gambling, and ethical design',
    discussionPrompt:
      'Examine this concept through the lens of regulatory compliance and responsible gambling. How do we build a commercially successful slot while meeting regulatory requirements and protecting players?',
    preferredRoles: ['moderator', 'psychologist', 'mathematician', 'engineer', 'game_designer', 'legal', 'moderator'],
    roundCount: 2,
  },
  {
    id: 'monetization',
    label: 'Monetization Strategy',
    emoji: '💎',
    description: 'Revenue optimization, player lifetime value, and business model',
    discussionPrompt:
      'Analyze monetization strategies for maximum sustainable revenue. Consider RTP tiers, jackpot structures, social features, and player retention economics.',
    preferredRoles: ['moderator', 'monetization', 'mathematician', 'psychologist', 'game_designer', 'data_scientist', 'moderator'],
    roundCount: 2,
  },
  {
    id: 'accessibility',
    label: 'Accessibility & UX',
    emoji: '♿',
    description: 'Inclusive design, UX optimization, and broad market appeal',
    discussionPrompt:
      'How do we design this slot to be accessible to the widest possible audience while maintaining engagement? Discuss UX, accessibility standards, localization, and cross-platform consistency.',
    preferredRoles: ['moderator', 'artist', 'psychologist', 'engineer', 'game_designer', 'player_advocate', 'moderator'],
    roundCount: 2,
  },
  {
    id: 'pitch',
    label: 'Pitch & Greenlight',
    emoji: '🚀',
    description: 'Make the case for a new slot concept — sell it to the panel',
    discussionPrompt:
      'We are pitching this slot concept for greenlight. Each panelist should evaluate it from their expertise: is this commercially viable, technically feasible, creatively strong, and player-ready? Make your recommendation.',
    preferredRoles: ['moderator', 'marketing', 'producer', 'game_designer', 'mathematician', 'engineer', 'moderator'],
    roundCount: 2,
  },
  {
    id: 'theme',
    label: 'Theme & World-Building',
    emoji: '🌍',
    description: 'Build a rich, cohesive theme — story, art, audio, and lore',
    discussionPrompt:
      "Let's build a complete, cohesive theme world for this slot. Develop the visual identity, narrative lore, character roster, sound palette, and how the theme reinforces the mechanics.",
    preferredRoles: ['moderator', 'narrative', 'artist', 'sound', 'game_designer', 'psychologist', 'moderator'],
    roundCount: 2,
  },
  {
    id: 'feature_sprint',
    label: 'Feature Sprint',
    emoji: '⚡',
    description: 'Rapid-fire iteration on one specific feature or mechanic',
    discussionPrompt:
      'We are in a design sprint focused on one specific feature or problem. Iterate rapidly — build on each other\'s ideas, challenge assumptions, and converge on the best solution in minimal turns.',
    preferredRoles: ['moderator', 'game_designer', 'engineer', 'mathematician', 'artist', 'qa', 'moderator'],
    roundCount: 3,
  },
  {
    id: 'postmortem',
    label: 'Post-Mortem Analysis',
    emoji: '🔎',
    description: 'Retrospective on what worked, what failed, and key learnings',
    discussionPrompt:
      'Conduct a thorough post-mortem on the provided material. What worked well? What failed and why? What would you do differently? Extract the key learnings for future projects.',
    preferredRoles: ['moderator', 'data_scientist', 'game_designer', 'mathematician', 'player_advocate', 'producer', 'moderator'],
    roundCount: 2,
  },
];

// ─── Panel Presets (pre-configured lineups) ──────────────────────────────────

export const PANEL_PRESETS: PanelPreset[] = [
  {
    id: 'core_team',
    label: 'Core Team',
    emoji: '🎰',
    description: 'The essential six — balanced generalist panel',
    participants: [
      { role: 'moderator', count: 1 },
      { role: 'game_designer', count: 1 },
      { role: 'mathematician', count: 1 },
      { role: 'psychologist', count: 1 },
      { role: 'artist', count: 1 },
      { role: 'engineer', count: 1 },
    ],
  },
  {
    id: 'creative_powerhouse',
    label: 'Creative Powerhouse',
    emoji: '🎨',
    description: 'Art, narrative & sound — theme and feel focused',
    participants: [
      { role: 'moderator', count: 1 },
      { role: 'game_designer', count: 2 },
      { role: 'artist', count: 1 },
      { role: 'narrative', count: 1 },
      { role: 'sound', count: 1 },
      { role: 'psychologist', count: 1 },
    ],
    discussionPresetId: 'theme',
  },
  {
    id: 'math_lab',
    label: 'Math Lab',
    emoji: '📐',
    description: 'Heavy math & engineering — precision mechanics focus',
    participants: [
      { role: 'moderator', count: 1 },
      { role: 'mathematician', count: 2 },
      { role: 'engineer', count: 2 },
      { role: 'game_designer', count: 1 },
      { role: 'qa', count: 1 },
    ],
    discussionPresetId: 'mechanics',
  },
  {
    id: 'boardroom',
    label: 'Boardroom',
    emoji: '💼',
    description: 'Business, marketing & compliance — commercial focus',
    participants: [
      { role: 'moderator', count: 1 },
      { role: 'producer', count: 1 },
      { role: 'marketing', count: 1 },
      { role: 'monetization', count: 1 },
      { role: 'legal', count: 1 },
      { role: 'data_scientist', count: 1 },
    ],
    discussionPresetId: 'pitch',
  },
  {
    id: 'player_first',
    label: 'Player First',
    emoji: '🙋',
    description: 'Ethics, UX & responsible gambling emphasis',
    participants: [
      { role: 'moderator', count: 1 },
      { role: 'psychologist', count: 1 },
      { role: 'player_advocate', count: 1 },
      { role: 'legal', count: 1 },
      { role: 'artist', count: 1 },
      { role: 'game_designer', count: 1 },
    ],
    discussionPresetId: 'compliance',
  },
  {
    id: 'full_studio',
    label: 'Full Studio',
    emoji: '🏢',
    description: 'All departments — comprehensive deep dive',
    participants: [
      { role: 'moderator', count: 1 },
      { role: 'game_designer', count: 2 },
      { role: 'mathematician', count: 1 },
      { role: 'psychologist', count: 1 },
      { role: 'artist', count: 1 },
      { role: 'engineer', count: 1 },
      { role: 'narrative', count: 1 },
      { role: 'producer', count: 1 },
      { role: 'marketing', count: 1 },
    ],
  },
  {
    id: 'rival_designers',
    label: 'Rival Designers',
    emoji: '⚔️',
    description: 'Multiple game designers debate competing approaches',
    participants: [
      { role: 'moderator', count: 1 },
      { role: 'game_designer', count: 3 },
      { role: 'mathematician', count: 1 },
      { role: 'psychologist', count: 1 },
    ],
    discussionPresetId: 'brainstorm',
  },
  {
    id: 'sprint_team',
    label: 'Sprint Team',
    emoji: '⚡',
    description: 'Small, fast team for rapid feature iteration',
    participants: [
      { role: 'game_designer', count: 1 },
      { role: 'engineer', count: 1 },
      { role: 'mathematician', count: 1 },
      { role: 'qa', count: 1 },
    ],
    discussionPresetId: 'feature_sprint',
  },
];
