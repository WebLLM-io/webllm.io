import { MarkdownContent } from './MarkdownContent';
import { ThinkingSection } from './ThinkingSection';
import type { ChatMessage } from '../conversations/types';
import { cn } from '../../shared/cn';

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-bg-surface text-text',
        )}
      >
        {!isUser && message.thinking && (
          <ThinkingSection
            thinking={message.thinking}
            isThinking={false}
            thinkingTime={message.thinkingTime ?? null}
          />
        )}

        <div className={isUser ? 'user-markdown' : ''}>
          <MarkdownContent content={message.content} />
        </div>

        {!isUser && (message.model || message.route) && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {message.model && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-badge text-text-badge">
                {message.model}
              </span>
            )}
            {message.route && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-badge text-text-badge flex items-center gap-1">
                {message.route === 'local' ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                  </svg>
                )}
                {message.route}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
