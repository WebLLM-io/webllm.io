import type { StateCreator } from 'zustand';
import type { WebLLMClient, CapabilityReport } from '@webllm-io/sdk';

export type PipelineStatus = 'idle' | 'initializing' | 'loading' | 'ready' | 'error';

export type PipelineStage = 'download' | 'compile' | 'ready';

export interface LoadProgress {
  stage: PipelineStage;
  progress: number;
  model: string;
}

export interface SDKSlice {
  client: WebLLMClient | null;
  capability: CapabilityReport | null;
  pipelineStatus: PipelineStatus;
  loadProgress: LoadProgress | null;
  errorMessage: string | null;
  setClient: (client: WebLLMClient | null) => void;
  setCapability: (capability: CapabilityReport | null) => void;
  setPipelineStatus: (status: PipelineStatus) => void;
  setLoadProgress: (progress: LoadProgress | null) => void;
  setErrorMessage: (message: string | null) => void;
}

export const createSDKSlice: StateCreator<SDKSlice, [], [], SDKSlice> = (set) => ({
  client: null,
  capability: null,
  pipelineStatus: 'idle',
  loadProgress: null,
  errorMessage: null,

  setClient: (client) => set({ client }),
  setCapability: (capability) => set({ capability }),
  setPipelineStatus: (pipelineStatus) => set({ pipelineStatus }),
  setLoadProgress: (loadProgress) => set({ loadProgress }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
});
