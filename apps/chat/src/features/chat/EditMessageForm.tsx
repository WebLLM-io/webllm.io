import { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  initialContent: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}

export function EditMessageForm({ initialContent, onSubmit, onCancel }: Props) {
  const [text, setText] = useState(initialContent);
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

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="max-w-[85%] md:max-w-[70%] w-full">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        className="w-full bg-bg-input text-sm text-text rounded-xl px-4 py-3 border border-border-subtle focus:border-text-muted outline-none resize-none max-h-[200px] transition-colors"
      />
      <div className="flex items-center gap-2 mt-1.5 px-1">
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="text-xs px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Save & Submit
        </button>
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1 rounded-md text-text-muted hover:text-text hover:bg-bg-surface-hover transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
