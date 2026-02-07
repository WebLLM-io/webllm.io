import { useRef, useCallback, useEffect } from 'react';
import { renderMarkdown } from '../../../shared/markdown';

export function useStreamRenderer() {
  const rafId = useRef<number | null>(null);
  const currentText = useRef('');
  const cancelled = useRef(false);
  const targetRef = useRef<HTMLDivElement | null>(null);

  const setTarget = useCallback((el: HTMLDivElement | null) => {
    targetRef.current = el;
  }, []);

  const render = useCallback((text: string) => {
    if (targetRef.current) {
      targetRef.current.innerHTML = renderMarkdown(text);
    }
  }, []);

  const update = useCallback((text: string) => {
    if (cancelled.current) return;
    currentText.current = text;
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        if (!cancelled.current) render(currentText.current);
      });
    }
  }, [render]);

  const finalize = useCallback((text: string) => {
    if (cancelled.current) return;
    currentText.current = text;
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    render(currentText.current);
  }, [render]);

  const cancel = useCallback(() => {
    cancelled.current = true;
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cancelled.current = false;
    currentText.current = '';
    rafId.current = null;
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  return { setTarget, update, finalize, cancel, reset };
}
