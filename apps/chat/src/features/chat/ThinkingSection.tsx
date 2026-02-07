import { useEffect, useRef } from 'react';

interface Props {
  thinking: string;
  isThinking: boolean;
  thinkingTime: number | null;
}

export function ThinkingSection({ thinking, isThinking, thinkingTime }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [thinking]);

  const summary = isThinking
    ? <>Thinking<span className="thinking-dots"><span>.</span><span>.</span><span>.</span></span></>
    : `Thought for ${thinkingTime != null ? (thinkingTime / 1000).toFixed(1) : '?'}s`;

  return (
    <details className="thinking-section" open={isThinking}>
      <summary>{summary}</summary>
      <div ref={contentRef} className="thinking-content">{thinking}</div>
    </details>
  );
}
