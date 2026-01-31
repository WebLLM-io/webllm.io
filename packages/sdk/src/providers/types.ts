import type { InferenceBackend } from '../inference/backend.js';
import type { ProgressCallback } from '../core/config.js';

export interface ResolvedLocalBackend {
  readonly __kind: 'resolved-local';
  providerName: string;
  createBackend(options: { onProgress?: ProgressCallback }): InferenceBackend;
}

export interface ResolvedCloudBackend {
  readonly __kind: 'resolved-cloud';
  providerName: string;
  createBackend(): InferenceBackend;
}

export function isResolvedLocal(value: unknown): value is ResolvedLocalBackend {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ResolvedLocalBackend).__kind === 'resolved-local'
  );
}

export function isResolvedCloud(value: unknown): value is ResolvedCloudBackend {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ResolvedCloudBackend).__kind === 'resolved-cloud'
  );
}
