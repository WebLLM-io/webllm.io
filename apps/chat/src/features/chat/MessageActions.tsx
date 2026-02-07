import { useState, useCallback } from 'react';

interface Props {
  isUser: boolean;
  isLastAssistant: boolean;
  isStreaming: boolean;
  content: string;
  onEdit: () => void;
  onRegenerate: () => void;
}

export function MessageActions({ isUser, isLastAssistant, isStreaming, content, onEdit, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <div className="flex md:hidden md:group-hover/message:flex items-center gap-1 mt-1 px-1">
      <button
        onClick={handleCopy}
        className="p-0.5 text-text-faint hover:text-text-secondary transition-colors"
        title="Copy"
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>

      {isUser && (
        <button
          onClick={onEdit}
          className="p-0.5 text-text-faint hover:text-text-secondary transition-colors"
          title="Edit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}

      {isLastAssistant && (
        <button
          onClick={onRegenerate}
          disabled={isStreaming}
          className="p-0.5 text-text-faint hover:text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Regenerate"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
        </button>
      )}
    </div>
  );
}
