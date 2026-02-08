import type { ContentPart } from './types.js';

/**
 * Flatten Message.content to a plain string.
 * - If already a string, return as-is.
 * - If ContentPart[], join all TextContentPart texts with newlines.
 */
export function flattenContent(content: string | ContentPart[]): string {
  if (typeof content === 'string') return content;
  return content
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('\n');
}
