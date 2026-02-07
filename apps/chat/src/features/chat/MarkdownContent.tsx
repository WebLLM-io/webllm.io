import { useEffect, useRef, useCallback } from 'react';
import { renderMarkdown } from '../../shared/markdown';

interface Props {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const container = ref.current;

    const handler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.code-copy-btn') as HTMLButtonElement | null;
      if (!btn) return;
      const wrapper = btn.closest('.code-block-wrapper');
      if (!wrapper) return;
      const codeEl = wrapper.querySelector('pre code');
      if (!codeEl) return;
      const code = codeEl.textContent || '';
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      });
    };

    container.addEventListener('click', handler);
    return () => container.removeEventListener('click', handler);
  }, []);

  const html = renderMarkdown(content);

  return (
    <div
      ref={ref}
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface StreamProps {
  className?: string;
}

export function StreamMarkdownTarget({ className = '' }: StreamProps & { ref?: React.Ref<HTMLDivElement> }) {
  return <div className={`markdown-content ${className}`} />;
}
