import type { FileAttachment } from './types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  attachments: FileAttachment[];
  onRemove: (id: string) => void;
}

export function AttachmentPreview({ attachments, onRemove }: Props) {
  if (!attachments.length) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 pt-2">
      {attachments.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-1.5 bg-bg-surface border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs text-text-muted"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="truncate max-w-[120px]">{a.name}</span>
          <span className="text-text-faint">{formatSize(a.size)}</span>
          <button
            onClick={() => onRemove(a.id)}
            className="ml-0.5 text-text-faint hover:text-text transition-colors"
            title="Remove"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
