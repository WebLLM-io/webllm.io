import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useStore } from '../store';
import { ChatPanel } from '../features/chat/ChatPanel';

export function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const conversations = useStore((s) => s.conversations);
  const setActiveId = useStore((s) => s.setActiveId);

  const exists = conversations.some((c) => c.id === id);

  useEffect(() => {
    if (id && exists) {
      setActiveId(id);
    } else if (!exists && conversations.length > 0) {
      navigate('/', { replace: true });
    }
  }, [id, exists, setActiveId, navigate, conversations.length]);

  if (!id || !exists) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-muted text-sm">Conversation not found</p>
      </div>
    );
  }

  return <ChatPanel key={id} conversationId={id} />;
}
