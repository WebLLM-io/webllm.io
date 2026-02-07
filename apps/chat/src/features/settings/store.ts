import type { StateCreator } from 'zustand';
import { loadSettings, saveSettings, type PersistedSettings } from '../conversations/persistence';

export interface SettingsSlice {
  mode: string;
  localModel: string;
  localWebWorker: boolean;
  localCache: boolean;
  cloudBaseURL: string;
  cloudApiKey: string;
  cloudModel: string;
  cloudTimeout: string;
  cloudRetries: string;
  setMode: (mode: string) => void;
  setLocalModel: (model: string) => void;
  setLocalWebWorker: (enabled: boolean) => void;
  setLocalCache: (enabled: boolean) => void;
  setCloudBaseURL: (url: string) => void;
  setCloudApiKey: (key: string) => void;
  setCloudModel: (model: string) => void;
  setCloudTimeout: (timeout: string) => void;
  setCloudRetries: (retries: string) => void;
  persistSettings: () => void;
  hydrateSettings: () => Promise<void>;
}

export const createSettingsSlice: StateCreator<SettingsSlice, [], [], SettingsSlice> = (set, get) => ({
  mode: 'auto',
  localModel: '',
  localWebWorker: true,
  localCache: true,
  cloudBaseURL: '',
  cloudApiKey: '',
  cloudModel: '',
  cloudTimeout: '',
  cloudRetries: '',

  setMode: (mode) => set({ mode }),
  setLocalModel: (localModel) => set({ localModel }),
  setLocalWebWorker: (localWebWorker) => set({ localWebWorker }),
  setLocalCache: (localCache) => set({ localCache }),
  setCloudBaseURL: (cloudBaseURL) => set({ cloudBaseURL }),
  setCloudApiKey: (cloudApiKey) => set({ cloudApiKey }),
  setCloudModel: (cloudModel) => set({ cloudModel }),
  setCloudTimeout: (cloudTimeout) => set({ cloudTimeout }),
  setCloudRetries: (cloudRetries) => set({ cloudRetries }),

  persistSettings: () => {
    const s = get();
    const data: PersistedSettings = {
      mode: s.mode,
      localModel: s.localModel,
      localWebWorker: s.localWebWorker,
      localCache: s.localCache,
      cloudBaseURL: s.cloudBaseURL,
      cloudApiKey: s.cloudApiKey,
      cloudModel: s.cloudModel,
      cloudTimeout: s.cloudTimeout,
      cloudRetries: s.cloudRetries,
    };
    saveSettings(data);
  },

  hydrateSettings: async () => {
    const data = await loadSettings();
    if (data) {
      set({
        mode: data.mode,
        localModel: data.localModel,
        localWebWorker: data.localWebWorker,
        localCache: data.localCache,
        cloudBaseURL: data.cloudBaseURL,
        cloudApiKey: data.cloudApiKey,
        cloudModel: data.cloudModel,
        cloudTimeout: data.cloudTimeout,
        cloudRetries: data.cloudRetries,
      });
    }
  },
});
