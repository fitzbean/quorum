import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message, ActiveParticipant } from '../types';

interface ChatMessageProps {
  message: Message;
  participants: ActiveParticipant[];
  isLatest?: boolean;
}

export function ChatMessage({ message, participants, isLatest }: ChatMessageProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLatest) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [message.content, isLatest]);

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
              <ReactMarkdown>{message.content}</ReactMarkdown>
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
          <span className="text-xs text-gray-500">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {message.isStreaming && (
            <span className="flex gap-0.5 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
        <div className={`${member.bgColor} border ${member.borderColor} rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-gray-100`}>
          <div className="prose prose-invert prose-sm max-w-none break-words">
            <ReactMarkdown>{message.content || '\u00a0'}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
