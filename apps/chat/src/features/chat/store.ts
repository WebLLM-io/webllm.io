import type { StateCreator } from 'zustand';

export interface ChatSlice {
  isStreaming: boolean;
  streamingContent: string;
  streamingReasoning: string;
  streamingModel: string;
  abortController: AbortController | null;
  lastRouteDecision: 'local' | 'cloud' | null;
  localTokens: { prompt: number; completion: number };
  cloudTokens: { prompt: number; completion: number };
  setStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  setStreamingReasoning: (reasoning: string) => void;
  setStreamingModel: (model: string) => void;
  setAbortController: (controller: AbortController | null) => void;
  setLastRouteDecision: (decision: 'local' | 'cloud' | null) => void;
  addTokenUsage: (target: 'local' | 'cloud', prompt: number, completion: number) => void;
  resetStreamingState: () => void;
}

export const createChatSlice: StateCreator<ChatSlice, [], [], ChatSlice> = (set) => ({
  isStreaming: false,
  streamingContent: '',
  streamingReasoning: '',
  streamingModel: '',
  abortController: null,
  lastRouteDecision: null,
  localTokens: { prompt: 0, completion: 0 },
  cloudTokens: { prompt: 0, completion: 0 },

  setStreaming: (isStreaming) => set({ isStreaming }),
  setStreamingContent: (streamingContent) => set({ streamingContent }),
  setStreamingReasoning: (streamingReasoning) => set({ streamingReasoning }),
  setStreamingModel: (streamingModel) => set({ streamingModel }),
  setAbortController: (abortController) => set({ abortController }),
  setLastRouteDecision: (lastRouteDecision) => set({ lastRouteDecision }),

  addTokenUsage: (target, prompt, completion) =>
    set((state) => {
      const key = target === 'local' ? 'localTokens' : 'cloudTokens';
      const current = state[key];
      return { [key]: { prompt: current.prompt + prompt, completion: current.completion + completion } };
    }),

  resetStreamingState: () =>
    set({
      isStreaming: false,
      streamingContent: '',
      streamingReasoning: '',
      streamingModel: '',
      abortController: null,
      lastRouteDecision: null,
    }),
});
