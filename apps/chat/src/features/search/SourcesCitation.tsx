import type { SearchResult } from './types';

interface Props {
  results: SearchResult[];
}

export function SourcesCitation({ results }: Props) {
  if (!results.length) return null;

  return (
    <details className="mt-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
      <summary className="px-3 py-2 text-xs text-text-muted cursor-pointer select-none hover:text-text transition-colors">
        Sources ({results.length})
      </summary>
      <div className="px-3 pb-2.5 space-y-1.5">
        {results.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="text-text-faint shrink-0 mt-0.5">{i + 1}.</span>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-400 hover:underline truncate"
              title={r.url}
            >
              {r.title}
            </a>
          </div>
        ))}
      </div>
    </details>
  );
}
