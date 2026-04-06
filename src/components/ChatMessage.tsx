import { useRef } from 'react';
import { Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message, ActiveParticipant } from '../types';

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function downloadMarkdown(content: string, filename: string) {
  const slug = slugify(filename);
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = slug.endsWith('.md') ? slug : `${slug}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

interface ChatMessageProps {
  message: Message;
  participants: ActiveParticipant[];
  isHighlighted?: boolean;
  onHighlight?: () => void;
}

export function ChatMessage({ message, participants, isHighlighted = false, onHighlight }: ChatMessageProps) {
  const ref = useRef<HTMLDivElement>(null);

  const isUser = message.role === 'user';
  // Find by instanceId first, fallback to role match
  const member = participants.find(
    (p) => p.instanceId === message.instanceId
  ) || participants.find(
    (p) => p.role === message.panelMember
  );

  if (isUser) {
    return (
      <div ref={ref} className="flex justify-end mb-4">
        <div className="max-w-[80%]">
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className="text-xs text-gray-500">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-xs font-medium text-gray-400">You</span>
            <span className="text-base">👤</span>
          </div>
          <div className="bg-gray-700 border border-gray-600 rounded-2xl rounded-tr-sm px-4 py-3 text-white text-sm leading-relaxed">
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {message.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1 bg-gray-600 rounded-lg px-2 py-1 text-xs text-gray-300"
                  >
                    {att.type === 'image' ? '🖼️' : att.type === 'pdf' ? '📄' : '📝'}
                    <span className="truncate max-w-[100px]">{att.name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!member) return null;

  return (
    <div ref={ref} className="flex justify-start mb-4">
      <div className="max-w-[85%] min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{member.emoji}</span>
          <span className={`text-sm font-semibold ${member.color}`}>{member.label}</span>
          {member.personalityTraits.map((trait) => (
            <span
              key={trait}
              className="text-[9px] rounded-full bg-purple-500/20 border border-purple-400/30 px-1.5 py-0 text-purple-300 capitalize"
            >
              {trait}
            </span>
          ))}
          <span className="text-xs text-gray-500">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {onHighlight && !message.isStreaming && (
            <button
              onClick={onHighlight}
              className={`rounded-md border px-2 py-0.5 text-[10px] transition-all ${
                isHighlighted
                  ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-cyan-500/40 hover:text-cyan-300'
              }`}
            >
              {isHighlighted ? 'Selected' : 'Highlight'}
            </button>
          )}
          {message.isStreaming && (
            <span className="flex gap-0.5 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
        <div className={`${member.bgColor} border ${isHighlighted ? 'border-cyan-400 ring-1 ring-cyan-400/50' : message.isArtifact ? 'border-emerald-600/50 ring-1 ring-emerald-700/30' : member.borderColor} rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-gray-100`}>
          {message.isArtifact && !message.isStreaming && (
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-emerald-700/30 pb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Markdown Artifact{message.artifactTitle ? ` · ${message.artifactTitle}` : ''}
              </span>
              <button
                onClick={() =>
                  downloadMarkdown(
                    message.content,
                    message.artifactTitle ?? 'artifact'
                  )
                }
                title="Download as .md file"
                className="flex items-center gap-1 rounded-md border border-emerald-600/40 bg-emerald-900/30 px-2 py-0.5 text-[10px] text-emerald-300 transition-all hover:bg-emerald-800/40"
              >
                <Download className="h-3 w-3" />
                Download .md
              </button>
            </div>
          )}
          <div className="prose prose-invert prose-sm max-w-none break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || '\u00a0'}</ReactMarkdown>
          </div>
          {!message.isStreaming && message.outputTokens !== undefined && (
            <div className="mt-1.5 text-right text-[10px] text-gray-500">
              {message.outputTokens.toLocaleString()} tokens
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
