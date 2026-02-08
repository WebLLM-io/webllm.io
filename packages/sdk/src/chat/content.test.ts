import { describe, it, expect } from 'vitest';
import { flattenContent } from './content';

describe('flattenContent', () => {
  it('returns string content as-is', () => {
    expect(flattenContent('hello world')).toBe('hello world');
  });

  it('returns empty string for empty string input', () => {
    expect(flattenContent('')).toBe('');
  });

  it('extracts text from a single TextContentPart', () => {
    expect(flattenContent([{ type: 'text', text: 'hello' }])).toBe('hello');
  });

  it('joins multiple TextContentParts with newlines', () => {
    const parts = [
      { type: 'text' as const, text: 'first' },
      { type: 'text' as const, text: 'second' },
      { type: 'text' as const, text: 'third' },
    ];
    expect(flattenContent(parts)).toBe('first\nsecond\nthird');
  });

  it('returns empty string for empty array', () => {
    expect(flattenContent([])).toBe('');
  });
});
