import { useStore } from '../../store';
import { ModelCombobox } from './ModelCombobox';

export function LocalSettings() {
  const localWebWorker = useStore((s) => s.localWebWorker);
  const setLocalWebWorker = useStore((s) => s.setLocalWebWorker);
  const localCache = useStore((s) => s.localCache);
  const setLocalCache = useStore((s) => s.setLocalCache);

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-text-muted uppercase tracking-wider">Local Config</div>

      <div>
        <label className="block text-xs text-text-muted mb-1">Model ID</label>
        <ModelCombobox />
      </div>

      <label className="flex items-center justify-between">
        <span className="text-xs text-text-muted">WebWorker</span>
        <input
          type="checkbox"
          checked={localWebWorker}
          onChange={(e) => setLocalWebWorker(e.target.checked)}
          className="accent-blue-500"
        />
      </label>

      <label className="flex items-center justify-between">
        <span className="text-xs text-text-muted">OPFS Cache</span>
        <input
          type="checkbox"
          checked={localCache}
          onChange={(e) => setLocalCache(e.target.checked)}
          className="accent-blue-500"
        />
      </label>
    </div>
  );
}
