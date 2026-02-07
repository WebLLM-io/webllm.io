interface Props {
  message: string;
  onRetry: () => void;
}

export function ChatError({ message, onRetry }: Props) {
  return (
    <div className="bg-red-950/30 border border-red-900/30 rounded-lg p-3">
      <div className="text-xs font-medium text-red-300 mb-1">Request Failed</div>
      <div className="text-xs text-red-400 mb-2">{message}</div>
      <button
        onClick={onRetry}
        className="px-3 py-1 bg-red-800/50 hover:bg-red-800 text-red-200 text-xs rounded transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
