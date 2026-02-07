import { useEffect, useRef, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '../conversations/types';

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  onRegenerate: () => void;
  onEditSubmit: (messageIndex: number, newContent: string) => void;
  children?: React.ReactNode;
}

export function MessageList({ messages, isStreaming, onRegenerate, onEditSubmit, children }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, children]);

  // Reset editing state when messages change (e.g. after edit submit)
  useEffect(() => {
    setEditingIndex(null);
  }, [messages.length]);

  const lastAssistantIndex = messages.reduce(
    (last, msg, i) => (msg.role === 'assistant' ? i : last),
    -1,
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLastAssistant={i === lastAssistantIndex}
            isStreaming={isStreaming}
            isEditing={editingIndex === i}
            onEdit={() => setEditingIndex(i)}
            onEditSubmit={(content) => onEditSubmit(i, content)}
            onEditCancel={() => setEditingIndex(null)}
            onRegenerate={onRegenerate}
          />
        ))}
        {children}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
