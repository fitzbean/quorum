import { ChevronLeft, ChevronRight, CircleHelp, Sparkles, Users, Wand2, X } from 'lucide-react';

import { useEffect, useMemo, useState } from 'react';

interface TutorialStep {
  title: string;
  description: string;
  accent: string;
  icon: typeof CircleHelp;
  points: string[];
  target: string | null;
  placement: 'left' | 'right' | 'top' | 'bottom' | 'center';
  cta: string;
}

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to the Quorum',
    description: 'Quorum lets you assemble a cast of AI specialists, give them a brief, and watch the discussion unfold in real time.',
    accent: 'from-purple-600 to-fuchsia-500',
    icon: Sparkles,
    target: null,
    placement: 'center',
    cta: 'Start tour',
    points: [
      'Use the left column for your prompt, files, and system instructions.',
      'The center feed shows the conversation, generated docs, analysis, and recaps.',
      'The right side controls your panel lineup, presets, and discussion settings.',
    ],
  },
  {
    title: 'Set the brief',
    description: 'Start on the left by giving the panel context. You can add source files, write a prompt, and adjust system instructions before the discussion begins.',
    accent: 'from-indigo-600 to-purple-500',
    icon: Sparkles,
    target: '[data-tutorial="context-panel"]',
    placement: 'right',
    cta: 'Show panel setup',
    points: [
      'Drop in files or screenshots to give the panel more context.',
      'Be sure to click Send before starting the discussion to include the context.',
      'Use the System tab to adjust the core system prompt before you start.  Changes to system prompt will apply to all subsequent discussions.',
    ],
  },
  {
    title: 'Capture live notes',
    description: 'The Live Notes panel tracks concise takeaways while the discussion runs. You can turn it on or off, choose how detailed the notes should be, and pick the note-taker model.',
    accent: 'from-emerald-500 to-teal-500',
    icon: Sparkles,
    target: '[data-tutorial="live-notes"]',
    placement: 'right',
    cta: 'Show discussion setup',
    points: [
      'Use the toggle to enable or disable automatic notes for the current session.',
      'Switch between note detail levels to control how compact or exhaustive the summaries are.',
      'You can copy or clear notes from here as the session unfolds.',
    ],
  },
  {
    title: 'Open system settings',
    description: 'Use the settings button in the top toolbar to open system settings, which includes your API connection, role visibilit and shared traits.',
    accent: 'from-amber-500 to-orange-500',
    icon: Users,
    target: '[data-tutorial="settings-button"]',
    placement: 'bottom',
    cta: 'Show chat features',
    points: [
      'Settings consists of three sections: API Connection, Role Visibility, and Shared Traits.',
      'Role Visibility lets you control which roles are visible and available to add to discussions.',
      'Traits let you define shared characteristics that can be applied to participants of the discussion to create unique perspectives and personalities.',
    ],
  },
  {
    title: 'Use chat features',
    description: 'The toolbar above the conversation includes quick actions for turning the chat into structured outputs and higher-level summaries.  These outputs can be generated at any time during the discussion, but would be more commonly used at stopping points.',
    accent: 'from-violet-600 to-sky-500',
    icon: Wand2,
    target: '[data-tutorial="chat-features"]',
    placement: 'bottom',
    cta: 'Show discussion setup',
    points: [
      'The Doc button turns the conversation into a Markdown document based on the discussion type you specify.',
      'The Analysis button surfaces turning points, disagreements, alignments, key discussion flow and suggestions for next steps.',
      'The Recap button produces a macro summary of what was covered, decided, and left open.',
    ],
  },
  {
    title: 'Build your panel',
    description: 'Choose who joins the conversation before you start. You can mix roles, clone experts, and mute anyone you do not need.',
    accent: 'from-emerald-500 to-cyan-500',
    icon: Users,
    target: '[data-tutorial="participant-roster"]',
    placement: 'left',
    cta: 'Show live feed',
    points: [
      'Use the participant roster to add, clone, remove, or disable panel members.',
      'Saved panel presets help you restore your favorite team setup quickly.',
      'Expand a participant to inspect traits and model choices in more detail.',
    ],
  },  
  {
    title: 'Configure the discussion',
    description: 'The top-right controls are where you define the topic, timing, model preset, and discussion style before launching the panel.',
    accent: 'from-sky-600 to-cyan-500',
    icon: Users,
    target: '[data-tutorial="discussion-controls"]',
    placement: 'left',
    cta: 'Show roster',
    points: [
      'Write the topic brief and adjust duration and response speed here.',
      'Switch between discussion presets and model presets to change the panel behaviour.',
      'Start Discussion lives here, so this is your control center before going live.',
    ],
  },
  {
    title: 'Watch the discussion unfold',
    description: 'The center feed is the main stage. Messages, generated docs, analysis, and recaps all appear here as the session progresses.',
    accent: 'from-violet-600 to-fuchsia-500',
    icon: Wand2,
    target: '[data-tutorial="conversation-feed"]',
    placement: 'top',
    cta: 'Show live controls',
    points: [
      'When the conversation starts, each participant response appears in this stream.',
      'Header actions above the feed can generate docs, analysis, and recap views.',
      'Click a response to highlight it when you want to steer the next turn.',
    ],
  },
  {
    title: 'Run and steer the discussion',
    description: 'Once the panel is live, use the bottom bar to pause, interject, or ask a highlighted participant to respond next.',
    accent: 'from-amber-500 to-orange-500',
    icon: Wand2,
    target: '[data-tutorial="interjection-bar"]',
    placement: 'top',
    cta: 'Finish tour',
    points: [
      'Use the bottom bar to pause, interject, or ask a highlighted participant to respond.',
      'Click the ? button anytime to reopen this tutorial from the beginning.',
      'The tour now moves across the workspace so each step is shown in context.',
    ],
  },
];

type TutorialPlacement = Exclude<TutorialStep['placement'], 'center'>;

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface CardMetrics {
  width: number;
  height: number;
  maxHeight: number;
  top: number;
  left: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPlacementOrder(placement: TutorialPlacement): TutorialPlacement[] {
  const fallbackPlacement: Record<TutorialPlacement, TutorialPlacement[]> = {
    right: ['right', 'left', 'bottom', 'top'],
    left: ['left', 'right', 'bottom', 'top'],
    top: ['top', 'bottom', 'right', 'left'],
    bottom: ['bottom', 'top', 'right', 'left'],
  };

  return fallbackPlacement[placement];
}

function estimateCardHeight(step: TutorialStep, width: number, placement: TutorialStep['placement']) {
  const descriptionLines = Math.max(2, Math.ceil(step.description.length / (width >= 500 ? 84 : width >= 440 ? 70 : 56)));
  const pointLines = step.points.reduce((total, point) => total + Math.max(1, Math.ceil(point.length / (width >= 500 ? 70 : width >= 440 ? 58 : 46))), 0);
  const headerHeight = placement === 'center' ? 100 : 78;
  const footerHeight = 72;
  const bodyHeight = descriptionLines * 28 + pointLines * 24 + step.points.length * 24 + 64;

  return headerHeight + footerHeight + bodyHeight;
}

function getCandidateWidth(step: TutorialStep, placement: TutorialStep['placement']) {
  const baseWidth = placement === 'top' || placement === 'bottom' ? 520 : placement === 'center' ? 540 : 460;
  const contentBoost = step.description.length > 160 || step.points.some((point) => point.length > 90) ? 24 : 0;
  return Math.min(baseWidth + contentBoost, window.innerWidth - 32);
}

function getCardPosition(step: TutorialStep, rect: HighlightRect | null, placement: TutorialStep['placement']): CardMetrics {
  const viewportPadding = 16;
  const cardWidth = getCandidateWidth(step, placement);
  const estimatedHeight = estimateCardHeight(step, cardWidth, placement);
  const maxViewportHeight = window.innerHeight - viewportPadding * 2;
  const centeredCardHeight = Math.min(Math.max(estimatedHeight, 440), maxViewportHeight);
  const anchoredCardHeight = Math.min(Math.max(estimatedHeight, 320), maxViewportHeight);
  const cardHeight = placement === 'center' || !rect ? centeredCardHeight : anchoredCardHeight;
  const margin = 20;

  if (!rect || placement === 'center') {
    return {
      width: cardWidth,
      height: cardHeight,
      maxHeight: cardHeight,
      top: Math.max((window.innerHeight - cardHeight) / 2, viewportPadding),
      left: Math.max((window.innerWidth - cardWidth) / 2, viewportPadding),
    };
  }

  const placements: Record<TutorialPlacement, { top: number; left: number }> = {
    right: {
      top: rect.top + rect.height / 2 - cardHeight / 2,
      left: rect.left + rect.width + margin,
    },
    left: {
      top: rect.top + rect.height / 2 - cardHeight / 2,
      left: rect.left - cardWidth - margin,
    },
    top: {
      top: rect.top - cardHeight - margin,
      left: rect.left + rect.width / 2 - cardWidth / 2,
    },
    bottom: {
      top: rect.top + rect.height + margin,
      left: rect.left + rect.width / 2 - cardWidth / 2,
    },
  };

  const maxTop = Math.max(window.innerHeight - cardHeight - viewportPadding, viewportPadding);
  const maxLeft = Math.max(window.innerWidth - cardWidth - viewportPadding, viewportPadding);

  const fitsWithoutOverlap = (candidate: TutorialPlacement) => {
    if (candidate === 'left') {
      return rect.left - margin - cardWidth >= viewportPadding;
    }

    if (candidate === 'right') {
      return rect.left + rect.width + margin + cardWidth <= window.innerWidth - viewportPadding;
    }

    if (candidate === 'top') {
      return rect.top - margin - cardHeight >= viewportPadding;
    }

    return rect.top + rect.height + margin + cardHeight <= window.innerHeight - viewportPadding;
  };

  for (const candidate of getPlacementOrder(placement)) {
    if (!fitsWithoutOverlap(candidate)) {
      continue;
    }

    const preferred = placements[candidate];
    return {
      width: cardWidth,
      height: cardHeight,
      maxHeight: cardHeight,
      top: clamp(preferred.top, viewportPadding, maxTop),
      left: clamp(preferred.left, viewportPadding, maxLeft),
    };
  }

  const preferred = placements[placement];
  return {
    width: cardWidth,
    height: cardHeight,
    maxHeight: cardHeight,
    top: clamp(preferred.top, viewportPadding, maxTop),
    left: clamp(preferred.left, viewportPadding, maxLeft),
  };
}

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  if (!isOpen) return null;

  return <TutorialModalInner onClose={onClose} initialStep={0} />;
}

interface TutorialModalInnerProps {
  initialStep: number;
  onClose: () => void;
}

function TutorialModalInner({ initialStep, onClose }: TutorialModalInnerProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const step = TUTORIAL_STEPS[currentStep];
  const Icon = step.icon;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const cardPosition = useMemo(() => getCardPosition(step, highlightRect, step.placement), [highlightRect, step]);

  useEffect(() => {
    const updateHighlight = () => {
      if (!step.target) {
        setHighlightRect(null);
        return;
      }

      const element = document.querySelector(step.target);
      if (!(element instanceof HTMLElement)) {
        setHighlightRect(null);
        return;
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      const rect = element.getBoundingClientRect();

      setHighlightRect({
        top: Math.max(rect.top, 4),
        left: Math.max(rect.left, 4),
        width: Math.min(rect.width, window.innerWidth - 16),
        height: Math.min(rect.height, window.innerHeight - 16),
      });
    };

    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight, true);

    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight, true);
    };
  }, [step.target]);

  return (
    <div className="fixed inset-0 z-50">
      {highlightRect ? (
        <>
          <div className="pointer-events-none fixed inset-x-0 top-0 bg-black/72 transition-all duration-300" style={{ height: highlightRect.top }} />
          <div className="pointer-events-none fixed inset-x-0 bottom-0 bg-black/72 transition-all duration-300" style={{ top: highlightRect.top + highlightRect.height }} />
          <div className="pointer-events-none fixed left-0 bg-black/72 transition-all duration-300" style={{ top: highlightRect.top, width: highlightRect.left, height: highlightRect.height }} />
          <div className="pointer-events-none fixed right-0 bg-black/72 transition-all duration-300" style={{ top: highlightRect.top, left: highlightRect.left + highlightRect.width, height: highlightRect.height }} />
          <div
            className="pointer-events-none fixed rounded-[20px] ring-1 ring-purple-300/85 shadow-[0_0_18px_rgba(168,85,247,0.28)] transition-all duration-300"
            style={{
              top: highlightRect.top,
              left: highlightRect.left,
              width: highlightRect.width,
              height: highlightRect.height,
            }}
          />
        </>
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-black/72" />
      )}

      <div
        className="fixed flex flex-col overflow-hidden rounded-3xl border border-gray-700 bg-gray-900 shadow-2xl transition-all duration-300"
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
          width: cardPosition.width,
          height: cardPosition.height,
          maxHeight: cardPosition.maxHeight,
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-400 transition-all hover:bg-gray-700 hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>

        <div className={`bg-gradient-to-r ${step.accent} px-5 py-4`}>
          <div className="mb-3 flex items-center gap-2.5 pr-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                Quick Tour · Step {currentStep + 1} of {TUTORIAL_STEPS.length}
              </p>
              <h2 className="text-xl font-bold leading-tight text-white">{step.title}</h2>
            </div>
          </div>

          <div className="flex gap-2">
            {TUTORIAL_STEPS.map((item, index) => (
              <div
                key={item.title}
                className={`h-1.5 flex-1 rounded-full ${index === currentStep ? 'bg-white' : 'bg-white/25'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-4">
              <p className="text-sm leading-6 text-gray-300">{step.description}</p>

              <div className="grid gap-2.5">
                {step.points.map((point) => (
                  <div
                    key={point}
                    className="rounded-2xl border border-gray-700/80 bg-gray-800/80 px-4 py-2.5 text-sm leading-6 text-gray-200"
                  >
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-col gap-2 border-t border-gray-800 bg-gray-900 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
              disabled={isFirstStep}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <div className="text-center text-[11px] text-gray-500">
              Restart the tour anytime from the top-right help button.
            </div>

            {isLastStep ? (
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-amber-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
              >
                Finish tour
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep((prev) => Math.min(prev + 1, TUTORIAL_STEPS.length - 1))}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-amber-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
