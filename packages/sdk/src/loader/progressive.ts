import type { InferenceBackend } from '../inference/backend.js';
import type { ProgressCallback } from '../core/config.js';
import { logger } from '../utils/logger.js';

/**
 * Progressive loading strategy:
 * 1. Start with cloud backend for immediate responsiveness
 * 2. Load local model in background
 * 3. Hot-switch to local once ready
 *
 * Returns a proxy backend that switches from cloud to local when ready.
 */
export function createProgressiveLoader(
  localBackend: InferenceBackend,
  cloudBackend: InferenceBackend,
  onProgress?: ProgressCallback,
): {
  activeBackend: () => InferenceBackend;
  startLocalLoad: () => Promise<void>;
} {
  let active: InferenceBackend = cloudBackend;
  let localReady = false;

  async function startLocalLoad(): Promise<void> {
    try {
      await localBackend.initialize();
      localReady = true;
      active = localBackend;
      logger.info('Progressive load: switched to local backend');
    } catch (err) {
      logger.warn('Progressive load: local backend failed, staying on cloud', err);
    }
  }

  return {
    activeBackend: () => active,
    startLocalLoad,
  };
}
