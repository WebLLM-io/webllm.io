import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../../store';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { ThinkingSection } from './ThinkingSection';
import { ChatError } from './ChatError';
import { useChat } from './hooks/useChat';
import { useStreamRenderer } from './hooks/useStreamRenderer';

interface Props {
  conversationId: string;
}

export function ChatPanel({ conversationId }: Props) {
  const conversations = useStore((s) => s.conversations);
  const conversation = conversations.find((c) => c.id === conversationId);
  const messages = conversation?.messages ?? [];

  const { sendMessage } = useChat();
  const renderer = useStreamRenderer();

  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [streamingEl, setStreamingEl] = useState<React.ReactNode>(null);
  const [error, setError] = useState<{ message: string; text: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<{ text: string; isThinking: boolean; startTime: number | null }>({
    text: '', isThinking: false, startTime: null,
  });
  const [thinkingState, setThinkingState] = useState({ text: '', isThinking: false, time: null as number | null });

  // Cleanup on unmount: abort in-flight request
  // (useStreamRenderer handles its own RAF cleanup via internal useEffect)
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleAbort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleSend = useCallback((text: string, options?: { skipUserMessage?: boolean }) => {
    // Abort any existing request
    abortRef.current?.abort();

    setError(null);
    setIsWaiting(true);
    setIsStreaming(true);
    setStreamingEl(null);
    thinkingRef.current = { text: '', isThinking: false, startTime: null };
    setThinkingState({ text: '', isThinking: false, time: null });
    renderer.reset();

    const controller = new AbortController();
    abortRef.current = controller;

    sendMessage(text, conversationId, controller.signal, {
      onFirstChunk: () => {
        setIsWaiting(false);
        setStreamingEl(
          <div className="flex justify-start">
            <div className="max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 bg-bg-surface text-text">
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
            <div className="max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 bg-bg-surface text-text">
              <ThinkingSection thinking={thinking} isThinking={isThinking} thinkingTime={elapsed} />
              <div ref={answerRef} className="markdown-content" />
            </div>
          </div>,
        );
        // Re-set target after React re-renders the element
        queueMicrotask(() => {
          if (answerRef.current) renderer.setTarget(answerRef.current);
        });
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
        setIsStreaming(false);
        setIsWaiting(false);
        setStreamingEl(null);
        abortRef.current = null;
      },
      getThinkingTime: () => {
        if (!thinkingRef.current.startTime) return null;
        return Date.now() - thinkingRef.current.startTime;
      },
    }, options);
  }, [conversationId, sendMessage, renderer]);

  const handleRetry = useCallback(() => {
    if (error) {
      handleSend(error.text);
    }
  }, [error, handleSend]);

  const handleRegenerate = useCallback(() => {
    const store = useStore.getState();
    const conv = store.conversations.find((c) => c.id === conversationId);
    if (!conv) return;

    // Find last assistant message index
    let lastAssistantIdx = -1;
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      if (conv.messages[i].role === 'assistant') {
        lastAssistantIdx = i;
        break;
      }
    }
    if (lastAssistantIdx === -1) return;

    // Find the user message that preceded it
    let userText = '';
    for (let i = lastAssistantIdx - 1; i >= 0; i--) {
      if (conv.messages[i].role === 'user') {
        userText = conv.messages[i].content;
        break;
      }
    }
    if (!userText) return;

    // Delete from the assistant message onward, then re-send (skip adding user message)
    store.deleteMessagesFrom(conversationId, lastAssistantIdx);
    handleSend(userText, { skipUserMessage: true });
  }, [conversationId, handleSend]);

  const handleEditSubmit = useCallback((messageIndex: number, newContent: string) => {
    const store = useStore.getState();
    // Delete from the edited message onward, then send the new content
    store.deleteMessagesFrom(conversationId, messageIndex);
    handleSend(newContent);
  }, [conversationId, handleSend]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <MessageList messages={messages} isStreaming={isStreaming} onRegenerate={handleRegenerate} onEditSubmit={handleEditSubmit}>
        {isWaiting && (
          <div className="flex justify-start">
            <div className="max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 bg-bg-surface">
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
      <ChatInput onSend={handleSend} isStreaming={isStreaming} onAbort={handleAbort} />
    </div>
  );
}
