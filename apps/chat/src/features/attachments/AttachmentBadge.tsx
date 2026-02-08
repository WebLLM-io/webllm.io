import type { FileAttachment } from './types';

interface Props {
  attachments: FileAttachment[];
}

export function AttachmentBadge({ attachments }: Props) {
  if (!attachments.length) return null;

  return (
    <div className="flex flex-wrap gap-1 mb-1.5">
      {attachments.map((a) => (
        <span
          key={a.id}
          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white/15 text-white/80"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          {a.name}
        </span>
      ))}
    </div>
  );
}
