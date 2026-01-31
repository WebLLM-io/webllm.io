import type { LocalObjectConfig } from '../core/config.js';
import type { ResolvedLocalBackend } from './types.js';
import { MLCBackend } from '../inference/local/mlc-backend.js';

export interface MLCProviderOptions {
  model?: string;
  tiers?: {
    high?: string | 'auto' | null;
    medium?: string | 'auto' | null;
    low?: string | 'auto' | null;
  };
  useCache?: boolean;
  useWebWorker?: boolean;
}

export function mlc(options: MLCProviderOptions = {}): ResolvedLocalBackend {
  return {
    __kind: 'resolved-local',
    providerName: 'mlc',
    createBackend({ onProgress } = {}) {
      return new MLCBackend(
        {
          model: options.model,
          tiers: options.tiers,
          useCache: options.useCache,
          useWebWorker: options.useWebWorker,
        },
        onProgress,
      );
    },
  };
}

export function localObjectToMLCOptions(config: LocalObjectConfig): MLCProviderOptions {
  return {
    model: config.model,
    tiers: config.tiers,
    useCache: config.useCache,
    useWebWorker: config.useWebWorker,
  };
}
