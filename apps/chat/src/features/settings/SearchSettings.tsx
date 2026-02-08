import { useStore } from '../../store';

export function SearchSettings() {
  const searchBaseURL = useStore((s) => s.searchBaseURL);
  const setSearchBaseURL = useStore((s) => s.setSearchBaseURL);
  const searchApiKey = useStore((s) => s.searchApiKey);
  const setSearchApiKey = useStore((s) => s.setSearchApiKey);
  const searchMaxResults = useStore((s) => s.searchMaxResults);
  const setSearchMaxResults = useStore((s) => s.setSearchMaxResults);

  const inputClass = 'w-full bg-bg-input border border-border-subtle rounded-md px-3 py-1.5 text-sm text-text placeholder-text-muted outline-none focus:border-text-muted';

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-text-muted uppercase tracking-wider">Web Search</div>

      <div>
        <label className="block text-xs text-text-muted mb-1">Base URL</label>
        <input
          type="text"
          value={searchBaseURL}
          onChange={(e) => setSearchBaseURL(e.target.value)}
          placeholder="https://api.tavily.com"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-1">API Key</label>
        <input
          type="password"
          value={searchApiKey}
          onChange={(e) => setSearchApiKey(e.target.value)}
          placeholder="tvly-..."
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-1">Max Results</label>
        <input
          type="number"
          value={searchMaxResults}
          onChange={(e) => setSearchMaxResults(e.target.value)}
          placeholder="5"
          className={inputClass}
        />
      </div>
    </div>
  );
}
