import { useRef, useEffect, useState } from 'react';
import { ChevronDown, Trash2, Copy, Check, NotebookPen, Bot, FileText, Download } from 'lucide-react';
import type { NoteEntry, NoteDetailLevel, NoteTakerConfig, ModelOption, ModelTier, Message } from '../types';
import { NOTE_DETAIL_LEVELS } from '../constants';
import { MODEL_TIER_ORDER } from '../utils/modelCatalog';

interface NoteTakerProps {
  notes: NoteEntry[];
  artifacts: Message[];
  notesSectionPercent: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onResizeHandlePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  config: NoteTakerConfig;
  onConfigChange: (config: Partial<NoteTakerConfig>) => void;
  onClearNotes: () => void;
  onTestNote: () => void;
  models: ModelOption[];
}

const TIER_LABELS: Record<ModelTier, string> = {
  free: 'Free',
  balanced: 'Standard',
  'last-generation': 'Advanced',
  'bleeding-edge': 'Latest',
};

function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.md') ? filename : `${filename}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function NoteTaker({
  notes,
  artifacts,
  notesSectionPercent,
  containerRef,
  onResizeHandlePointerDown,
  config,
  onConfigChange,
  onClearNotes,
  onTestNote,
  models,
}: NoteTakerProps) {
  const notesEndRef = useRef<HTMLDivElement>(null);
  const artifactsEndRef = useRef<HTMLDivElement>(null);
  const notesScrollRef = useRef<HTMLDivElement>(null);
  const artifactsScrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  useEffect(() => {
    const container = notesScrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [notes]);

  useEffect(() => {
    const container = artifactsScrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [artifacts]);

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
    <div data-tutorial="live-notes" className="flex flex-col h-full bg-gray-900/60 border-t border-gray-700/50">
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
            <button
              onClick={onTestNote}
              title="Test note generation"
              className="p-1 rounded text-gray-500 hover:text-emerald-400 hover:bg-gray-700/50 transition-all"
            >
              <NotebookPen className="w-3 h-3" />
            </button>
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
            <span className="truncate flex items-center gap-1">
              <Bot className="w-3 h-3 flex-shrink-0" /> {currentModel?.name ?? config.selectedModel.split('/')[1]?.split(':')[0] ?? config.selectedModel}
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

      <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
        <div ref={notesScrollRef} className="min-h-0 flex-shrink-0 overflow-y-auto px-2 py-2 space-y-2" style={{ height: `${notesSectionPercent}%` }}>
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

        <div
          onPointerDown={onResizeHandlePointerDown}
          className="group flex h-2 flex-shrink-0 cursor-row-resize items-center justify-center bg-gray-950/60 transition-colors hover:bg-gray-900"
          title="Drag to resize panel"
        >
          <div className="h-1 w-12 rounded-full bg-gray-700/80 transition-colors group-hover:bg-purple-500/70" />
        </div>

        <div className="min-h-0 flex-1 bg-gray-950/40">
          <div className="flex items-center justify-between border-b border-gray-700/50 bg-gray-900/70 px-3 py-2">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-bold text-violet-300">Artifacts</span>
              {artifacts.length > 0 && (
                <span className="rounded-full border border-violet-700/50 bg-violet-900/40 px-1.5 py-0.5 text-[10px] text-violet-300">
                  {artifacts.length}
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-500">Generated during this conversation</span>
          </div>
          <div ref={artifactsScrollRef} className="h-full overflow-y-auto px-2 py-2 space-y-2">
            {artifacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-5 text-center">
                <FileText className="mb-2 h-6 w-6 text-gray-700" />
                <p className="text-[10px] leading-relaxed text-gray-600">
                  Generated documents, analyses, and recaps will be listed here as they are created.
                </p>
              </div>
            ) : (
              <>
                {artifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="rounded-lg border border-violet-700/30 bg-violet-950/20 px-2.5 py-2"
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <FileText className="h-3 w-3 text-violet-400" />
                      <span className="truncate text-[10px] font-bold uppercase tracking-wide text-violet-300">
                        {artifact.artifactTitle ?? 'Artifact'}
                      </span>
                      {!artifact.isStreaming && artifact.content && (
                        <button
                          onClick={() => downloadMarkdown(artifact.content, artifact.artifactTitle ?? 'artifact')}
                          title="Download markdown artifact"
                          className="ml-auto inline-flex items-center gap-1 rounded-md border border-violet-600/40 bg-violet-900/30 px-1.5 py-0.5 text-[9px] text-violet-200 transition-all hover:bg-violet-800/40"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </button>
                      )}
                      {artifact.isStreaming && (
                        <span className="ml-auto text-[9px] text-violet-400">Generating…</span>
                      )}
                    </div>
                    <p className="line-clamp-4 whitespace-pre-wrap text-[10px] leading-relaxed text-gray-300">
                      {artifact.content || (artifact.isStreaming ? 'Generating artifact…' : 'No content yet.')}
                    </p>
                  </div>
                ))}
                <div ref={artifactsEndRef} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
