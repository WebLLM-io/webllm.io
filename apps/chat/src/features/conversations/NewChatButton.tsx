import { useNavigate } from 'react-router';
import { useStore } from '../../store';

export function NewChatButton() {
  const createConversation = useStore((s) => s.createConversation);
  const navigate = useNavigate();

  const handleClick = () => {
    const id = createConversation();
    navigate(`/c/${id}`);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
      New Chat
    </button>
  );
}
