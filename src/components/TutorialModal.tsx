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
    description: 'Start on the left by giving the panel context. You can add source files, write a prompt, and save system instructions before the discussion begins.',
    accent: 'from-indigo-600 to-purple-500',
    icon: Sparkles,
    target: '[data-tutorial="input-panel"]',
    placement: 'right',
    cta: 'Show panel setup',
    points: [
      'Drop in files or screenshots to give the panel more context.',
      'Use the context and system tabs to shape the discussion before you start.',
      'This area is where each session begins, so the tour jumps here first.',
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getCardPosition(rect: HighlightRect | null, placement: TutorialStep['placement']) {
  const cardWidth = Math.min(420, window.innerWidth - 32);
  const viewportPadding = 16;
  const centeredCardHeight = Math.min(560, window.innerHeight - viewportPadding * 2);
  const anchoredCardHeight = Math.min(420, window.innerHeight - viewportPadding * 2);
  const cardHeight = placement === 'center' || !rect ? centeredCardHeight : anchoredCardHeight;
  const margin = 20;

  if (!rect || placement === 'center') {
    return {
      width: cardWidth,
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

  const preferred = placements[placement];
  const clampedTop = clamp(preferred.top, viewportPadding, Math.max(window.innerHeight - cardHeight - viewportPadding, viewportPadding));
  const clampedLeft = clamp(preferred.left, viewportPadding, Math.max(window.innerWidth - cardWidth - viewportPadding, viewportPadding));

  const fitsPreferredVertically = preferred.top >= viewportPadding && preferred.top + cardHeight <= window.innerHeight - viewportPadding;
  const fitsPreferredHorizontally = preferred.left >= viewportPadding && preferred.left + cardWidth <= window.innerWidth - viewportPadding;

  const fallbackPlacement: Partial<Record<TutorialPlacement, TutorialPlacement>> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  };

  if ((!fitsPreferredVertically || !fitsPreferredHorizontally) && fallbackPlacement[placement]) {
    const fallback = placements[fallbackPlacement[placement]!];
    return {
      width: cardWidth,
      maxHeight: cardHeight,
      top: clamp(fallback.top, viewportPadding, Math.max(window.innerHeight - cardHeight - viewportPadding, viewportPadding)),
      left: clamp(fallback.left, viewportPadding, Math.max(window.innerWidth - cardWidth - viewportPadding, viewportPadding)),
    };
  }

  return {
    width: cardWidth,
    maxHeight: cardHeight,
    top: clampedTop,
    left: clampedLeft,
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
  const cardPosition = useMemo(() => getCardPosition(highlightRect, step.placement), [highlightRect, step.placement]);

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
        top: Math.max(rect.top - 8, 8),
        left: Math.max(rect.left - 8, 8),
        width: Math.min(rect.width + 16, window.innerWidth - 16),
        height: Math.min(rect.height + 16, window.innerHeight - 16),
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
    <div className="fixed inset-0 z-50 bg-black/72">
      {highlightRect && (
        <div
          className="pointer-events-none fixed rounded-[28px] border border-purple-400/80 bg-transparent shadow-[0_0_0_9999px_rgba(3,7,18,0.72),0_0_0_1px_rgba(196,181,253,0.35),0_0_28px_rgba(168,85,247,0.35)] transition-all duration-300"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
        />
      )}

      <div
        className="fixed overflow-hidden rounded-3xl border border-gray-700 bg-gray-900 shadow-2xl transition-all duration-300"
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
          width: cardPosition.width,
          maxHeight: cardPosition.maxHeight,
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-400 transition-all hover:bg-gray-700 hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>

        <div className={`bg-gradient-to-r ${step.accent} px-6 py-5`}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                Quick Tour · Step {currentStep + 1} of {TUTORIAL_STEPS.length}
              </p>
              <h2 className="text-2xl font-bold text-white">{step.title}</h2>
              {step.target && (
                <p className="mt-1 text-xs text-white/75">Following the interface to the area you need right now.</p>
              )}
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

        <div className="space-y-6 overflow-y-auto px-6 py-6">
          <p className="text-sm leading-7 text-gray-300">{step.description}</p>

          <div className="grid gap-3">
            {step.points.map((point) => (
              <div
                key={point}
                className="rounded-2xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-sm text-gray-200"
              >
                {point}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
              disabled={isFirstStep}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-all hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <div className="text-center text-xs text-gray-500">
              You can restart this tour anytime from the top-right help button.
            </div>

            {isLastStep ? (
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
              >
                Finish tour
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep((prev) => Math.min(prev + 1, TUTORIAL_STEPS.length - 1))}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
              >
                {step.cta}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
