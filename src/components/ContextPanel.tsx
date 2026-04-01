import { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paperclip, Send, X, FileText, Image, File, Plus, Loader2, ScrollText, Save } from 'lucide-react';
import type { Attachment } from '../types';
import { parseFile } from '../utils/fileParser';

const SYSTEM_INSTRUCTIONS_KEY = 'slotmind_system_instructions';

type InputTab = 'context' | 'system';

interface ContextPanelProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  onSystemInstructionsChange: (instructions: string) => void;
  disabled: boolean;
}

export function ContextPanel({ onSendMessage, onSystemInstructionsChange, disabled }: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState<InputTab>('context');
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [systemInstructions, setSystemInstructions] = useState(
    () => localStorage.getItem(SYSTEM_INSTRUCTIONS_KEY) || 'Our primary markets are pre-determined, meaning the multiplier for the turn is chosen at the beginning of the turn, and then the game must "solve" for that multiplier by deciding what is shown in the game to display that win amount.'
  );
  const [instructionsSaved, setInstructionsSaved] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (systemInstructions) {
      onSystemInstructionsChange(systemInstructions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveInstructions = () => {
    localStorage.setItem(SYSTEM_INSTRUCTIONS_KEY, systemInstructions);
    onSystemInstructionsChange(systemInstructions);
    setInstructionsSaved(true);
  };

  const handleInstructionsChange = (value: string) => {
    setSystemInstructions(value);
    setInstructionsSaved(false);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);
    try {
      const parsed = await Promise.all(acceptedFiles.map(parseFile));
      setAttachments((prev) => [...prev, ...parsed]);
    } catch (err) {
      console.error('Failed to parse file:', err);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    accept: {
      'text/*': ['.txt', '.md', '.csv', '.json'],
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
  });

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) return;
    onSendMessage(text.trim(), attachments);
    setText('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSend();
    }
  };

  const getAttachmentIcon = (att: Attachment) => {
    if (att.type === 'image') return <Image className="w-3 h-3" />;
    if (att.type === 'pdf') return <FileText className="w-3 h-3" />;
    return <File className="w-3 h-3" />;
  };

  return (
    <div
      {...getRootProps()}
      data-tutorial="context-panel"
      className={`flex h-full flex-col bg-gray-900/50 ${isDragActive ? 'ring-2 ring-purple-500 ring-inset' : ''}`}
    >
      <input {...getInputProps()} />

      <div className="flex border-b border-gray-700/50">
        <button
          onClick={() => setActiveTab('context')}
          className={`flex-1 border-b-2 py-2 text-[11px] font-medium transition-all ${
            activeTab === 'context'
              ? 'border-purple-500 text-purple-300'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Context
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex-1 border-b-2 py-2 text-[11px] font-medium transition-all ${
            activeTab === 'system'
              ? 'border-cyan-500 text-cyan-300'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <ScrollText className="h-3 w-3" />
            System
            {!instructionsSaved && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
          </span>
        </button>
      </div>

      {activeTab === 'context' ? (
        <>
          <div className="border-b border-gray-700/50 px-3 pb-1 pt-3">
            <p className="text-[11px] leading-tight text-gray-500">
              Add material, brief, or docs for the panel.
            </p>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 py-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex max-w-full items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-gray-300"
                >
                  {getAttachmentIcon(att)}
                  <span className="max-w-[100px] truncate">{att.name}</span>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="flex-shrink-0 text-gray-500 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {isDragActive && (
            <div className="absolute inset-0 z-10 m-2 flex items-center justify-center rounded-xl border-2 border-dashed border-purple-400 bg-purple-900/30">
              <div className="text-center">
                <Paperclip className="mx-auto mb-2 h-8 w-8 text-purple-400" />
                <p className="font-medium text-purple-300">Drop files here</p>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 px-3 py-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste material, brief, or context for the panel..."
              disabled={disabled}
              className="h-full min-h-[72px] w-full resize-none bg-transparent text-sm leading-relaxed text-gray-200 placeholder-gray-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 px-3 pb-3">
            <button
              onClick={open}
              disabled={disabled || isUploading}
              className="flex items-center gap-1.5 rounded-lg bg-gray-700/50 px-3 py-2 text-xs text-gray-400 transition-all hover:bg-gray-700 hover:text-gray-200 disabled:opacity-40"
            >
              {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Attach
            </button>

            <div className="flex-1" />

            <span className="text-xs text-gray-600">Ctrl+↵ to send</span>

            <button
              onClick={handleSend}
              disabled={disabled || (!text.trim() && attachments.length === 0) || isUploading}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="px-3 pb-1 pt-2">
            <p className="text-[11px] leading-tight text-gray-500">
              Custom instructions prepended to every panelist&apos;s system prompt. Saved to local storage.
            </p>
          </div>

          <div className="min-h-0 flex-1 px-3 py-2">
            <textarea
              value={systemInstructions}
              onChange={(e) => handleInstructionsChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleSaveInstructions();
                }
              }}
              placeholder="e.g. Focus on mobile gaming. Keep responses under 200 words."
              className="h-full min-h-[72px] w-full resize-none bg-transparent text-sm leading-relaxed text-gray-200 placeholder-gray-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 px-3 pb-3">
            <button
              onClick={() => {
                setSystemInstructions('');
                localStorage.removeItem(SYSTEM_INSTRUCTIONS_KEY);
                onSystemInstructionsChange('');
                setInstructionsSaved(true);
              }}
              className="text-xs text-gray-500 transition-all hover:text-red-400"
            >
              Clear
            </button>

            <div className="flex-1" />

            <span className="text-xs text-gray-600">Ctrl+↵ to save</span>

            <button
              onClick={handleSaveInstructions}
              disabled={instructionsSaved}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              {instructionsSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
