import { logger } from '../utils/logger.js';

/**
 * OPFS cache utilities.
 * Delegates to @mlc-ai/web-llm's built-in cache management
 * but provides a unified interface for the SDK.
 */

export async function hasModelInCache(modelId: string): Promise<boolean> {
  try {
    const webllm = await import('@mlc-ai/web-llm');
    if (webllm.hasModelInCache) {
      return await webllm.hasModelInCache(modelId);
    }
    return false;
  } catch {
    logger.debug('web-llm not available for cache check');
    return false;
  }
}

export async function deleteModelFromCache(modelId: string): Promise<void> {
  try {
    const webllm = await import('@mlc-ai/web-llm');
    if (webllm.deleteModelAllInfoInCache) {
      await webllm.deleteModelAllInfoInCache(modelId);
    }
  } catch {
    logger.debug('web-llm not available for cache deletion');
  }
}
