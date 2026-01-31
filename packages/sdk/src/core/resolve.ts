import type { CloudConfig, LocalConfig, LocalObjectConfig } from './config.js';
import type { ResolvedCloudBackend, ResolvedLocalBackend } from '../providers/types.js';
import { isResolvedCloud, isResolvedLocal } from '../providers/types.js';
import { mlc } from '../providers/mlc.js';
import { fetchSSE } from '../providers/fetch.js';
import { customLocal, customCloud } from '../providers/custom.js';

const DEFAULT_TIERS = {
  high: 'Llama-3.1-8B-Instruct-q4f16_1-MLC',
  medium: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
  low: null,
} as const;

function isLocalObjectConfig(value: unknown): value is LocalObjectConfig {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    'tiers' in obj ||
    'model' in obj ||
    'useCache' in obj ||
    'useWebWorker' in obj
  );
}

export function resolveLocal(config: LocalConfig = 'auto'): ResolvedLocalBackend | null {
  if (config === false || config === null) return null;
  if (config === 'auto') return mlc({ tiers: DEFAULT_TIERS });
  if (isResolvedLocal(config)) return config;
  if (typeof config === 'string') return mlc({ model: config });
  if (typeof config === 'function') return customLocal(config);
  if (isLocalObjectConfig(config)) return mlc(config);
  return mlc({ tiers: DEFAULT_TIERS });
}

export function resolveCloud(config?: CloudConfig): ResolvedCloudBackend | null {
  if (config === undefined || config === null) return null;
  if (isResolvedCloud(config)) return config;
  if (typeof config === 'string') return fetchSSE({ baseURL: config });
  if (typeof config === 'function') return customCloud(config);
  return fetchSSE(config);
}
