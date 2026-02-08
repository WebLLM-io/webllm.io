import type { SearchResult } from './types';

export function formatSearchContext(results: SearchResult[], query: string): string {
  if (!results.length) return '';

  const entries = results.map(
    (r, i) => `${i + 1}. [${r.title}](${r.url}) — ${r.content}`,
  );

  return `[Search Context]\nWeb search results for "${query}":\n${entries.join('\n')}`;
}
