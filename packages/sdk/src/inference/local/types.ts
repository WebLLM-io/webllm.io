import type { TiersConfig } from '../../core/config.js';

export interface MLCBackendConfig {
  model?: string;
  tiers?: TiersConfig;
  useCache?: boolean;
  useWebWorker?: boolean;
}
