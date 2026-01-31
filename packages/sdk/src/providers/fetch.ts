import type { CloudObjectConfig } from '../core/config.js';
import type { ResolvedCloudBackend } from './types.js';
import { FetchBackend } from '../inference/cloud/fetch-backend.js';

export interface FetchSSEOptions {
  baseURL: string;
  apiKey?: string;
  model?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export function fetchSSE(options: FetchSSEOptions | string): ResolvedCloudBackend {
  const config: CloudObjectConfig =
    typeof options === 'string' ? { baseURL: options } : options;

  return {
    __kind: 'resolved-cloud',
    providerName: 'fetch-sse',
    createBackend() {
      return new FetchBackend(config);
    },
  };
}
