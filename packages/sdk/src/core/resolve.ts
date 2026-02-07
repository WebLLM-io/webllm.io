import type { CloudConfig, LocalConfig, LocalObjectConfig } from './config.js';
import type { ResolvedCloudBackend, ResolvedLocalBackend } from '../providers/types.js';
import { isResolvedCloud, isResolvedLocal } from '../providers/types.js';
import { mlc } from '../providers/mlc.js';
import { fetchSSE } from '../providers/fetch.js';
import { customLocal, customCloud } from '../providers/custom.js';

const DEFAULT_TIERS = {
  high: 'Qwen3-8B-q4f16_1-MLC',
  medium: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
  low: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
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

export function resolveLocal(config?: LocalConfig): ResolvedLocalBackend | null {
  if (config === undefined || config === false || config === null) return null;
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
