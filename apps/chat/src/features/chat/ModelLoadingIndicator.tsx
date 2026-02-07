import { useStore } from '../../store';

const stageLabels: Record<string, string> = {
  download: 'Downloading',
  compile: 'Compiling shaders',
  ready: 'Warming up',
};

export function ModelLoadingIndicator() {
  const loadProgress = useStore((s) => s.loadProgress);

  return (
    <div className="flex items-start gap-3">
      {/* Spinner */}
      <div className="mt-0.5 h-4 w-4 rounded-full border-2 border-border-muted border-t-status-info animate-spin shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="text-sm text-text-muted">Waiting for model to load</div>

        {loadProgress && (
          <div className="mt-2 space-y-1.5">
            <div className="text-xs text-text-faint truncate">{loadProgress.model}</div>

            {/* Progress bar */}
            <div className="h-1.5 bg-bg-input rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.round(loadProgress.progress * 100)}%` }}
              />
            </div>

            {/* Percentage + stage */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-status-info">
                {stageLabels[loadProgress.stage] || loadProgress.stage}
              </span>
              <span className="text-text-faint">
                {Math.round(loadProgress.progress * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
