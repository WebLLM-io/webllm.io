import { useState, useRef, useCallback } from 'react';
import { useStore } from '../../store';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { ThinkingSection } from './ThinkingSection';
import { ChatError } from './ChatError';
import { useChat } from './hooks/useChat';
import { useStreamRenderer } from './hooks/useStreamRenderer';
import { renderMarkdown } from '../../shared/markdown';

interface Props {
  conversationId: string;
}

export function ChatPanel({ conversationId }: Props) {
  const conversations = useStore((s) => s.conversations);
  const conversation = conversations.find((c) => c.id === conversationId);
  const messages = conversation?.messages ?? [];

  const { sendMessage, abort } = useChat();
  const renderer = useStreamRenderer();

  const [isWaiting, setIsWaiting] = useState(false);
  const [streamingEl, setStreamingEl] = useState<React.ReactNode>(null);
  const [error, setError] = useState<{ message: string; text: string } | null>(null);

  const answerRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<{ text: string; isThinking: boolean; startTime: number | null }>({
    text: '', isThinking: false, startTime: null,
  });
  const [thinkingState, setThinkingState] = useState({ text: '', isThinking: false, time: null as number | null });

  const handleSend = useCallback((text: string) => {
    setError(null);
    setIsWaiting(true);
    setStreamingEl(null);
    thinkingRef.current = { text: '', isThinking: false, startTime: null };
    setThinkingState({ text: '', isThinking: false, time: null });
    renderer.reset();

    sendMessage(text, conversationId, {
      onFirstChunk: () => {
        setIsWaiting(false);
        setStreamingEl(
          <div className="flex justify-start">
            <div className="max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 bg-zinc-800 text-zinc-100">
              <div ref={answerRef} className="markdown-content" />
            </div>
          </div>,
        );
        if (answerRef.current) {
          renderer.setTarget(answerRef.current);
        }
      },
      onThinking: (thinking, isThinking) => {
        if (!thinkingRef.current.startTime) {
          thinkingRef.current.startTime = Date.now();
        }
        thinkingRef.current.text = thinking;
        thinkingRef.current.isThinking = isThinking;

        const elapsed = isThinking ? null : Date.now() - thinkingRef.current.startTime!;
        setThinkingState({ text: thinking, isThinking, time: elapsed });

        setStreamingEl(
          <div className="flex justify-start">
            <div className="max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 bg-zinc-800 text-zinc-100">
              <ThinkingSection thinking={thinking} isThinking={isThinking} thinkingTime={elapsed} />
              <div ref={answerRef} className="markdown-content" />
            </div>
          </div>,
        );
        // Re-set target since the element might be recreated
        setTimeout(() => {
          if (answerRef.current) renderer.setTarget(answerRef.current);
        }, 0);
      },
      onAnswer: (answer) => {
        renderer.update(answer);
      },
      onFinalize: (answer) => {
        renderer.finalize(answer);
      },
      onModel: () => {},
      onError: (err) => {
        setStreamingEl(null);
        setError({ message: err.message, text });
      },
      onAbort: (partialAnswer) => {
        renderer.finalize(partialAnswer + ' [Interrupted]');
      },
      onDone: () => {
        setIsWaiting(false);
        setStreamingEl(null);
      },
    });
  }, [conversationId, sendMessage, renderer]);

  const handleRetry = useCallback(() => {
    if (error) {
      handleSend(error.text);
    }
  }, [error, handleSend]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <MessageList messages={messages}>
        {isWaiting && (
          <div className="flex justify-start">
            <div className="max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 bg-zinc-800">
              <TypingIndicator />
            </div>
          </div>
        )}
        {streamingEl}
        {error && (
          <div className="flex justify-start">
            <div className="max-w-[85%] md:max-w-[70%]">
              <ChatError message={error.message} onRetry={handleRetry} />
            </div>
          </div>
        )}
      </MessageList>
      <ChatInput onSend={handleSend} />
    </div>
  );
}
