import { useStore } from '../../store';

export function CloudSettings() {
  const cloudBaseURL = useStore((s) => s.cloudBaseURL);
  const setCloudBaseURL = useStore((s) => s.setCloudBaseURL);
  const cloudApiKey = useStore((s) => s.cloudApiKey);
  const setCloudApiKey = useStore((s) => s.setCloudApiKey);
  const cloudModel = useStore((s) => s.cloudModel);
  const setCloudModel = useStore((s) => s.setCloudModel);
  const cloudTimeout = useStore((s) => s.cloudTimeout);
  const setCloudTimeout = useStore((s) => s.setCloudTimeout);
  const cloudRetries = useStore((s) => s.cloudRetries);
  const setCloudRetries = useStore((s) => s.setCloudRetries);

  const inputClass = 'w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-zinc-500';

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Cloud Config</div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Base URL</label>
        <input
          type="text"
          value={cloudBaseURL}
          onChange={(e) => setCloudBaseURL(e.target.value)}
          placeholder="https://api.openai.com/v1"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">API Key</label>
        <input
          type="password"
          value={cloudApiKey}
          onChange={(e) => setCloudApiKey(e.target.value)}
          placeholder="sk-..."
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Model Name</label>
        <input
          type="text"
          value={cloudModel}
          onChange={(e) => setCloudModel(e.target.value)}
          placeholder="gpt-4o-mini"
          className={inputClass}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-zinc-400 mb-1">Timeout (ms)</label>
          <input
            type="number"
            value={cloudTimeout}
            onChange={(e) => setCloudTimeout(e.target.value)}
            placeholder="30000"
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-zinc-400 mb-1">Retries</label>
          <input
            type="number"
            value={cloudRetries}
            onChange={(e) => setCloudRetries(e.target.value)}
            placeholder="1"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
