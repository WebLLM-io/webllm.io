import type { StateCreator } from 'zustand';

export interface ChatSlice {
  lastRouteDecision: 'local' | 'cloud' | null;
  localTokens: { prompt: number; completion: number };
  cloudTokens: { prompt: number; completion: number };
  setLastRouteDecision: (decision: 'local' | 'cloud' | null) => void;
  addTokenUsage: (target: 'local' | 'cloud', prompt: number, completion: number) => void;
}

export const createChatSlice: StateCreator<ChatSlice, [], [], ChatSlice> = (set) => ({
  lastRouteDecision: null,
  localTokens: { prompt: 0, completion: 0 },
  cloudTokens: { prompt: 0, completion: 0 },

  setLastRouteDecision: (lastRouteDecision) => set({ lastRouteDecision }),

  addTokenUsage: (target, prompt, completion) =>
    set((state) => {
      const key = target === 'local' ? 'localTokens' : 'cloudTokens';
      const current = state[key];
      return { [key]: { prompt: current.prompt + prompt, completion: current.completion + completion } };
    }),
});
