import type { CreateClientOptions } from './config.js';
import type { CapabilityReport, DeviceStats } from '../capability/types.js';
import type { InferenceBackend } from '../inference/backend.js';
import type { Completions } from '../chat/types.js';
import { resolveLocal, resolveCloud } from './resolve.js';
import { createCompletions } from '../chat/completions.js';
import { getDeviceContext } from '../router/context.js';
import { checkCapability } from '../capability/detector.js';
import { WebLLMError } from './errors.js';
import { logger } from '../utils/logger.js';
import type { MLCBackend } from '../inference/local/mlc-backend.js';

export interface WebLLMClient {
  chat: {
    completions: Completions;
  };
  local: {
    load(modelId: string): Promise<void>;
    unload(): Promise<void>;
    isLoaded(): boolean;
  };
  capability(): Promise<CapabilityReport>;
  dispose(): Promise<void>;
}

export function createClient(options: CreateClientOptions = {}): WebLLMClient {
  const { local: localConfig, cloud: cloudConfig, onProgress } = options;

  const resolvedLocal = resolveLocal(localConfig);
  const resolvedCloud = resolveCloud(cloudConfig);

  if (!resolvedLocal && !resolvedCloud) {
    throw new WebLLMError(
      'NO_PROVIDER_AVAILABLE',
      'At least one of local or cloud must be configured',
    );
  }

  let localBackend: InferenceBackend | null = null;
  let cloudBackend: InferenceBackend | null = null;
  let localInitPromise: Promise<void> | null = null;

  // Initialize cloud immediately (it's lightweight)
  if (resolvedCloud) {
    cloudBackend = resolvedCloud.createBackend();
    cloudBackend.initialize().catch((err) => {
      logger.warn('Cloud backend initialization failed:', err);
    });
  }

  // Initialize local lazily on first use or eagerly in background
  if (resolvedLocal) {
    localBackend = resolvedLocal.createBackend({ onProgress });
    localInitPromise = initLocalBackend(localBackend);
  }

  async function initLocalBackend(backend: InferenceBackend): Promise<void> {
    try {
      const stats = await getDeviceContext();
      // MLCBackend has a grade-aware initialize
      if ('initialize' in backend && backend.initialize.length > 0) {
        await (backend as MLCBackend).initialize(stats.grade);
      } else {
        await backend.initialize();
      }
    } catch (err) {
      logger.warn('Local backend initialization failed:', err);
      localBackend = null;
    }
  }

  const completions = createCompletions({
    getLocalBackend: () => localBackend,
    getCloudBackend: () => cloudBackend,
    getDeviceStats: () => getDeviceContext(),
  });

  return {
    chat: {
      completions,
    },

    local: {
      async load(modelId: string): Promise<void> {
        if (!resolvedLocal) {
          throw new WebLLMError('NO_PROVIDER_AVAILABLE', 'No local provider configured');
        }
        // Create a new backend for the specified model
        const mlcModule = await import('../providers/mlc.js');
        const provider = mlcModule.mlc({ model: modelId });
        localBackend = provider.createBackend({ onProgress });
        await localBackend.initialize();
      },

      async unload(): Promise<void> {
        if (localBackend) {
          await localBackend.dispose();
          localBackend = null;
        }
      },

      isLoaded(): boolean {
        return localBackend?.isReady() ?? false;
      },
    },

    capability: () => checkCapability(),

    async dispose(): Promise<void> {
      await Promise.all([
        localBackend?.dispose(),
        cloudBackend?.dispose(),
      ]);
      localBackend = null;
      cloudBackend = null;
    },
  };
}
