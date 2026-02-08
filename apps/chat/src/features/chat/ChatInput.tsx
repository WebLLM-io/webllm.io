import { useState, useRef, useCallback, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { AttachmentPreview } from '../attachments/AttachmentPreview';
import { extractText } from '../attachments/extract';
import { ACCEPTED_TYPES, MAX_FILE_SIZE, MAX_ATTACHMENTS } from '../attachments/types';
import type { FileAttachment } from '../attachments/types';
import { useStore } from '../../store';

export interface SendOptions {
  attachments?: FileAttachment[];
  searchEnabled?: boolean;
}

interface Props {
  onSend: (text: string, options?: SendOptions) => void;
  isStreaming: boolean;
  onAbort: () => void;
}

export function ChatInput({ onSend, isStreaming, onAbort }: Props) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [searchActive, setSearchActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchBaseURL = useStore((s) => s.searchBaseURL);
  const searchAvailable = !!searchBaseURL;

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
    onSend(trimmed, {
      attachments: attachments.length ? attachments : undefined,
      searchEnabled: searchActive,
    });
    setText('');
    setAttachments([]);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = MAX_ATTACHMENTS - attachments.length;
    const toProcess = Array.from(files).slice(0, remaining);

    for (const file of toProcess) {
      if (file.size > MAX_FILE_SIZE) continue;

      try {
        const extractedText = await extractText(file);
        const attachment: FileAttachment = {
          id: nanoid(),
          name: file.name,
          type: file.type,
          size: file.size,
          extractedText,
        };
        setAttachments((prev) => [...prev, attachment]);
      } catch {
        // Skip files that fail extraction
      }
    }

    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col bg-bg-input rounded-xl border border-border-subtle focus-within:border-text-muted transition-colors">
          <AttachmentPreview attachments={attachments} onRemove={handleRemoveAttachment} />
          <div className="flex items-end gap-2 px-3 py-2">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || attachments.length >= MAX_ATTACHMENTS}
                className="p-1.5 text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Attach files"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              {searchAvailable && (
                <button
                  onClick={() => setSearchActive(!searchActive)}
                  className={`p-1.5 transition-colors ${
                    searchActive
                      ? 'text-blue-500'
                      : 'text-text-muted hover:text-text'
                  }`}
                  title={searchActive ? 'Disable web search' : 'Enable web search'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </button>
              )}
            </div>
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
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-center text-[10px] text-text-faint mt-1.5">
          AI models can make mistakes. Verify important information.
        </div>
      </div>
    </div>
  );
}
