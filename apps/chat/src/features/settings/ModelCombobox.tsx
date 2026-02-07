import { useState, useRef, useEffect, useCallback } from 'react';
import { prebuiltAppConfig } from '@mlc-ai/web-llm';
import { hasModelInCache } from '@webllm-io/sdk';
import { useStore } from '../../store';
import { RECOMMENDED_MODELS } from '../../shared/constants';

interface ModelOption {
  model_id: string;
  cached: boolean;
  recommended: boolean;
}

function isQwenModel(id: string) { return /qwen/i.test(id); }
function isQwenBrand(id: string) { return /^qwen/i.test(id); }

function sortOptions(options: ModelOption[]) {
  return [...options].sort((a, b) => {
    if (a.cached !== b.cached) return a.cached ? -1 : 1;
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    const aQ = isQwenModel(a.model_id), bQ = isQwenModel(b.model_id);
    if (aQ !== bQ) return aQ ? -1 : 1;
    if (aQ && bQ) {
      const aB = isQwenBrand(a.model_id), bB = isQwenBrand(b.model_id);
      if (aB !== bB) return aB ? -1 : 1;
    }
    return a.model_id.localeCompare(b.model_id);
  });
}

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return escapeHtml(text).replace(regex, '<mark class="bg-yellow-500/30 text-inherit">$1</mark>');
}

export function ModelCombobox() {
  const localModel = useStore((s) => s.localModel);
  const setLocalModel = useStore((s) => s.setLocalModel);
  const grade = useStore((s) => s.capability?.grade ?? 'C');

  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ModelOption[]>([]);
  const [filtered, setFiltered] = useState<ModelOption[]>([]);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize options
  useEffect(() => {
    const recommendedId = RECOMMENDED_MODELS[grade] || '';
    const modelIds = prebuiltAppConfig.model_list.map((m) => m.model_id);
    const opts: ModelOption[] = modelIds.map((id) => ({
      model_id: id,
      cached: false,
      recommended: id === recommendedId,
    }));
    const sorted = sortOptions(opts);
    setOptions(sorted);
    setFiltered(sorted);

    // Check cache in background
    (async () => {
      const BATCH = 10;
      for (let i = 0; i < opts.length; i += BATCH) {
        const batch = opts.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map(async (o) => {
            try { return { id: o.model_id, cached: await hasModelInCache(o.model_id) }; }
            catch { return { id: o.model_id, cached: false }; }
          }),
        );
        for (const r of results) {
          const o = opts.find((x) => x.model_id === r.id);
          if (o) o.cached = r.cached;
        }
        const reSorted = sortOptions(opts);
        setOptions([...reSorted]);
        setFiltered((prev) => {
          const q = inputRef.current?.value.toLowerCase().trim() ?? '';
          return q ? reSorted.filter((o) => o.model_id.toLowerCase().includes(q)) : reSorted;
        });
      }
    })();
  }, [grade]);

  const filterOptions = useCallback((query: string) => {
    const q = query.toLowerCase().trim();
    const f = q ? options.filter((o) => o.model_id.toLowerCase().includes(q)) : options;
    setFiltered(f);
    setHighlightedIdx(f.length > 0 ? 0 : -1);
  }, [options]);

  const open = () => {
    setIsOpen(true);
    filterOptions(localModel);
  };

  const close = () => {
    setIsOpen(false);
    setHighlightedIdx(-1);
  };

  const select = (value: string) => {
    setLocalModel(value);
    close();
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Scroll highlighted into view
  useEffect(() => {
    if (highlightedIdx >= 0 && listRef.current) {
      const el = listRef.current.children[highlightedIdx] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIdx]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIdx((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIdx((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIdx >= 0 && highlightedIdx < filtered.length) {
          select(filtered[highlightedIdx].model_id);
        } else {
          close();
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex">
        <input
          ref={inputRef}
          type="text"
          value={localModel}
          onChange={(e) => { setLocalModel(e.target.value); filterOptions(e.target.value); if (!isOpen) open(); }}
          onFocus={open}
          onKeyDown={handleKeyDown}
          placeholder="Leave empty for auto"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-l-md px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-zinc-500"
        />
        <button
          type="button"
          onClick={() => isOpen ? close() : open()}
          className="px-2 bg-zinc-800 border border-l-0 border-zinc-700 rounded-r-md text-zinc-400 hover:text-zinc-200"
          tabIndex={-1}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      <div className="flex justify-between mt-1 text-[10px] text-zinc-500">
        <span>{options.length} models available</span>
        <a href="https://github.com/mlc-ai/web-llm/blob/main/src/config.ts" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300">
          Browse on GitHub &rarr;
        </a>
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-md shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-zinc-500">No matching models</li>
          ) : (
            filtered.map((opt, idx) => (
              <li
                key={opt.model_id}
                onClick={() => select(opt.model_id)}
                onMouseEnter={() => setHighlightedIdx(idx)}
                className={`px-3 py-1.5 cursor-pointer text-sm flex items-center justify-between gap-2 ${
                  idx === highlightedIdx ? 'bg-zinc-700' : 'hover:bg-zinc-700/50'
                } ${opt.model_id === localModel ? 'text-blue-400' : 'text-zinc-300'}`}
              >
                <span
                  className="truncate"
                  dangerouslySetInnerHTML={{ __html: highlightMatch(opt.model_id, localModel) }}
                />
                <span className="flex gap-1 shrink-0">
                  {opt.cached && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400">Downloaded</span>}
                  {opt.recommended && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400">Recommended</span>}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
