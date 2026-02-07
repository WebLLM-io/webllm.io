import { useStore } from '../../store';
import { cn } from '../../shared/cn';

const modes = [
  { value: 'auto', label: 'Auto' },
  { value: 'local', label: 'Local' },
  { value: 'cloud', label: 'Cloud' },
] as const;

export function ModeSelector() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);

  return (
    <div className="flex bg-zinc-800 rounded-lg p-0.5">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => setMode(m.value)}
          className={cn(
            'flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            mode === m.value
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-200',
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
