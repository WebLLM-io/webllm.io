import { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  onSend: (text: string) => void;
  isStreaming: boolean;
  onAbort: () => void;
}

export function ChatInput({ onSend, isStreaming, onAbort }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-bg-input rounded-xl px-3 py-2 border border-border-subtle focus-within:border-text-muted transition-colors">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-text placeholder-text-muted outline-none resize-none max-h-[200px]"
          />
          <div className="flex items-center gap-1">
            {isStreaming ? (
              <button
                onClick={onAbort}
                className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                title="Stop"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className="p-1.5 text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Send"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="text-center text-[10px] text-text-faint mt-1.5">
          AI models can make mistakes. Verify important information.
        </div>
      </div>
    </div>
  );
}
