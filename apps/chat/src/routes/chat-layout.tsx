import { useState, useEffect } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { useSDKInit } from '../features/sdk/hooks/useSDKInit';
import { useStore } from '../store';

export function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { initClient } = useSDKInit();

  // Hydrate store on mount
  useEffect(() => {
    const store = useStore.getState();
    Promise.all([store._hydrate(), store.hydrateSettings()]).then(() => {
      initClient();
    });
  }, [initClient]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onApplySettings={initClient}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-2 border-b border-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 text-text-muted hover:text-text"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <span className="text-sm font-medium text-text-secondary">WebLLM.io Chat</span>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
