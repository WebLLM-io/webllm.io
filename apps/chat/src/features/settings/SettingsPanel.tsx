import { useState } from 'react';
import { useStore } from '../../store';
import { ModeSelector } from './ModeSelector';
import { LocalSettings } from './LocalSettings';
import { CloudSettings } from './CloudSettings';

interface Props {
  onApply: () => void;
}

export function SettingsPanel({ onApply }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const mode = useStore((s) => s.mode);
  const persistSettings = useStore((s) => s.persistSettings);

  const showLocal = mode === 'auto' || mode === 'local';
  const showCloud = mode === 'auto' || mode === 'cloud';

  const handleApply = () => {
    persistSettings();
    onApply();
  };

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-xs text-text-muted hover:text-text transition-colors"
      >
        <span className="font-medium">Settings</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-4 pb-3 space-y-4">
          <ModeSelector />

          {showLocal && <LocalSettings />}
          {showCloud && <CloudSettings />}

          <button
            onClick={handleApply}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Apply &amp; Reinitialize
          </button>
        </div>
      )}
    </div>
  );
}
