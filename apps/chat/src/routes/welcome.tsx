import { useNavigate } from 'react-router';
import { useStore } from '../store';

export function WelcomePage() {
  const createConversation = useStore((s) => s.createConversation);
  const navigate = useNavigate();

  const handleNewChat = () => {
    const id = createConversation();
    navigate(`/c/${id}`);
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-zinc-600">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-zinc-200 mb-2">WebLLM Chat</h2>
        <p className="text-zinc-500 text-sm mb-6">Run large language models directly in your browser.</p>
        <button
          onClick={handleNewChat}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          New Chat
        </button>
      </div>
    </div>
  );
}
