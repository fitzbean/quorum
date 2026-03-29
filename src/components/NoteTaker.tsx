import { useRef, useEffect, useState } from 'react';
import { ChevronDown, Trash2, Copy, Check, NotebookPen } from 'lucide-react';
import type { NoteEntry, NoteDetailLevel, NoteTakerConfig, ModelOption, ModelTier } from '../types';
import { NOTE_DETAIL_LEVELS } from '../constants';
import { MODEL_TIER_ORDER } from '../utils/modelCatalog';

interface NoteTakerProps {
  notes: NoteEntry[];
  config: NoteTakerConfig;
  onConfigChange: (config: Partial<NoteTakerConfig>) => void;
  onClearNotes: () => void;
  models: ModelOption[];
}

const TIER_LABELS: Record<ModelTier, string> = {
  free: '\u{1F193} Free',
  balanced: '\u2696\uFE0F Balanced',
  'last-generation': '\u23EE Last Generation',
  'bleeding-edge': '\u{1F52C} Bleeding Edge',
};

export function NoteTaker({ notes, config, onConfigChange, onClearNotes, models }: NoteTakerProps) {
  const notesEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  useEffect(() => {
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const handleCopy = () => {
    if (notes.length === 0) return;
    const text = notes
      .map(
        (n) =>
          `[${n.speakerEmoji} ${n.speakerLabel}]\n${n.summary}`
      )
      .join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const groupedModels = models.reduce<Record<string, ModelOption[]>>(
    (acc, m) => {
      if (!acc[m.tier]) acc[m.tier] = [];
      acc[m.tier].push(m);
      return acc;
    },
    {}
  );

  const currentModel = models.find((m) => m.id === config.selectedModel);
  const tierOrder = MODEL_TIER_ORDER;

  return (
    <div className="flex flex-col h-full bg-gray-900/60 border-t border-gray-700/50">
      <div className="px-3 py-2 border-b border-gray-700/50 bg-gray-900/80 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <NotebookPen className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400">Live Notes</span>
            {notes.length > 0 && (
              <span className="text-[10px] bg-emerald-900/50 text-emerald-400 border border-emerald-700/50 rounded-full px-1.5 py-0.5">
                {notes.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notes.length > 0 && (
              <>
                <button
                  onClick={handleCopy}
                  title="Copy all notes"
                  className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-700/50 transition-all"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={onClearNotes}
                  title="Clear notes"
                  className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700/50 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onConfigChange({ enabled: !config.enabled })}
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors flex-shrink-0 ${
              config.enabled ? 'bg-emerald-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                config.enabled ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </button>

          <div className="flex gap-0.5 flex-1">
            {(Object.keys(NOTE_DETAIL_LEVELS) as NoteDetailLevel[]).map((level) => {
              const lvl = NOTE_DETAIL_LEVELS[level];
              return (
                <button
                  key={level}
                  onClick={() => onConfigChange({ detailLevel: level })}
                  title={lvl.description}
                  className={`flex-1 text-[9px] py-0.5 px-1 rounded font-medium transition-all leading-tight ${
                    config.detailLevel === level
                      ? 'bg-emerald-700 text-white'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  {lvl.emoji}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-1 text-[10px] text-gray-500">
          {NOTE_DETAIL_LEVELS[config.detailLevel].label} {'\u2014'} {NOTE_DETAIL_LEVELS[config.detailLevel].description}
        </div>

        <div className="mt-1.5 relative">
          <button
            onClick={() => setModelOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-1 text-[10px] bg-gray-800/80 border border-gray-700/50 rounded px-2 py-1 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-all"
          >
            <span className="truncate">
              {'\u{1F916}'} {currentModel?.name ?? config.selectedModel.split('/')[1]?.split(':')[0] ?? config.selectedModel}
            </span>
            <ChevronDown className={`w-2.5 h-2.5 flex-shrink-0 transition-transform ${modelOpen ? 'rotate-180' : ''}`} />
          </button>

          {modelOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
              {tierOrder.map((tier) => {
                const tierModels = groupedModels[tier];
                if (!tierModels) return null;
                return (
                  <div key={tier}>
                    <div className="px-2 py-1 text-[9px] font-bold text-gray-500 uppercase tracking-wider bg-gray-900/60 sticky top-0">
                      {TIER_LABELS[tier]}
                    </div>
                    {tierModels.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          onConfigChange({ selectedModel: m.id });
                          setModelOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 text-[10px] hover:bg-gray-700/60 transition-colors ${
                          config.selectedModel === m.id ? 'bg-emerald-900/40 text-emerald-300' : 'text-gray-300'
                        }`}
                      >
                        <div className="font-medium truncate">{m.name}</div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-4">
            <NotebookPen className="w-6 h-6 text-gray-700 mb-2" />
            <p className="text-[10px] text-gray-600 leading-relaxed">
              {config.enabled
                ? 'Notes will appear here as the panel speaks...'
                : 'Enable note-taking to capture summaries'}
            </p>
          </div>
        ) : (
          <>
            {notes.map((note) => (
              <div
                key={note.id}
                className={`rounded-lg border px-2.5 py-2 transition-all ${
                  note.isStreaming
                    ? 'border-emerald-600/50 bg-emerald-950/30'
                    : 'border-gray-700/40 bg-gray-800/30'
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px]">{note.speakerEmoji}</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">
                    {note.speakerLabel}
                  </span>
                  {note.isStreaming && (
                    <span className="ml-auto flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '240ms' }} />
                    </span>
                  )}
                </div>
                <p
                  className={`text-[11px] leading-relaxed whitespace-pre-wrap ${
                    note.summary.startsWith('\u26A0\uFE0F')
                      ? 'text-red-400'
                      : 'text-gray-300'
                  }`}
                >
                  {note.summary || (note.isStreaming ? '...' : '')}
                </p>
              </div>
            ))}
            <div ref={notesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
