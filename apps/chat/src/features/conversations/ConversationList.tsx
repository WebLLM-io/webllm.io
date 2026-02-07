import { useStore } from '../../store';
import { ConversationItem } from './ConversationItem';

interface Props {
  onCloseMobile?: () => void;
}

export function ConversationList({ onCloseMobile }: Props) {
  const conversations = useStore((s) => s.conversations);
  const activeId = useStore((s) => s.activeId);

  if (conversations.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-zinc-600 text-center">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {conversations.map((c) => (
        <ConversationItem
          key={c.id}
          conversation={c}
          isActive={c.id === activeId}
          onCloseMobile={onCloseMobile}
        />
      ))}
    </div>
  );
}
