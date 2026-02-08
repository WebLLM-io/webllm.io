import { useStore } from '../store';
import { useCapability } from '../features/sdk/hooks/useCapability';
import { NewChatButton } from '../features/conversations/NewChatButton';
import { ConversationList } from '../features/conversations/ConversationList';
import { SettingsPanel } from '../features/settings/SettingsPanel';
import { ThemeToggle } from './ThemeToggle';
import { GRADE_THRESHOLDS } from '../shared/constants';
import type { PipelineStatus } from '../features/sdk/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplySettings: () => void;
}

const statusLabels: Record<PipelineStatus, string> = {
  idle: 'Idle',
  initializing: 'Initializing',
  loading: 'Loading',
  ready: 'Ready',
  error: 'Error',
};

const statusColors: Record<PipelineStatus, string> = {
  idle: 'text-text-muted',
  initializing: 'text-status-warning',
  loading: 'text-status-warning',
  ready: 'text-status-success',
  error: 'text-status-error',
};

export function Sidebar({ isOpen, onClose, onApplySettings }: Props) {
  const { capability } = useCapability();
  const pipelineStatus = useStore((s) => s.pipelineStatus);
  const loadProgress = useStore((s) => s.loadProgress);
  const errorMessage = useStore((s) => s.errorMessage);
  const client = useStore((s) => s.client);
  const localTokens = useStore((s) => s.localTokens);
  const cloudTokens = useStore((s) => s.cloudTokens);

  const clientStatus = client?.status();
  const localTotal = localTokens.prompt + localTokens.completion;
  const cloudTotal = cloudTokens.prompt + cloudTokens.completion;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-bg-overlay z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 w-[280px] bg-bg-sidebar border-r border-border
          flex flex-col overflow-hidden transition-transform duration-200
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <a href="/" className="flex items-center gap-2 text-text-secondary hover:text-text transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="font-semibold text-sm">WebLLM.io Chat</span>
          </a>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={onClose}
              className="md:hidden p-1 text-text-muted hover:text-text transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* New Chat */}
        <div className="shrink-0 px-3 py-3">
          <NewChatButton />
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Conversation list */}
          <div className="px-1">
            <ConversationList onCloseMobile={onClose} />
          </div>

          {/* Status card */}
          <div className="border-t border-border px-3 py-3">
            <div className="space-y-1.5 text-xs">
              <StatusRow label="WebGPU" value={capability?.webgpu ? 'Available' : 'Checking...'} className={capability?.webgpu ? 'text-status-success' : 'text-text-muted'} />
              <StatusRow label="VRAM" value={capability?.gpu ? `${capability.gpu.vram} MB` : '—'} />
              <StatusRow label="Grade" value={capability ? `${capability.grade} (${GRADE_THRESHOLDS[capability.grade] || ''})` : '—'} />
              <StatusRow label="Model" value={clientStatus?.localModel || '—'} />
              <StatusRow label="Status" value={statusLabels[pipelineStatus]} className={statusColors[pipelineStatus]} />
              <StatusRow label="Local" value={localTotal.toLocaleString()} />
              <StatusRow label="Cloud" value={cloudTotal.toLocaleString()} />
            </div>

            {/* Progress */}
            {loadProgress && (
              <div className="mt-2">
                <div className="text-xs text-text-muted mb-1">{loadProgress.model} ({Math.round(loadProgress.progress * 100)}%)</div>
                <div className="h-1 bg-bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${Math.round(loadProgress.progress * 100)}%` }}
                  />
                </div>
                <div className="flex gap-2 mt-1">
                  {(['download', 'compile', 'ready'] as const).map((stage) => {
                    const stages = ['download', 'compile', 'ready'];
                    const currentIdx = stages.indexOf(loadProgress.stage);
                    const stageIdx = stages.indexOf(stage);
                    const isComplete = stageIdx < currentIdx;
                    const isActive = stageIdx === currentIdx;
                    return (
                      <span
                        key={stage}
                        className={`text-[10px] ${isComplete ? 'text-status-success' : isActive ? 'text-status-info' : 'text-text-faint'}`}
                      >
                        {stage.charAt(0).toUpperCase() + stage.slice(1)}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error */}
            {pipelineStatus === 'error' && errorMessage && (
              <div className="mt-2 p-2 bg-bg-error border border-border-error rounded text-xs text-text-error">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Settings */}
          <SettingsPanel onApply={onApplySettings} />

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 text-[10px] text-text-faint text-center">
            &copy; 2026 WebLLM.io &middot; MIT License
          </div>
        </div>
      </aside>
    </>
  );
}

function StatusRow({ label, value, className = 'text-text-secondary' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className={`truncate ml-2 ${className}`} title={value}>{value}</span>
    </div>
  );
}
