import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionRequest,
  Completions,
} from './types.js';
import type { InferenceBackend } from '../inference/backend.js';
import type { DeviceStats } from '../capability/types.js';
import { decideRoute } from '../router/strategy.js';
import { WebLLMError } from '../core/errors.js';

export interface CompletionsContext {
  getLocalBackend(): InferenceBackend | null;
  getCloudBackend(): InferenceBackend | null;
  getDeviceStats(): Promise<DeviceStats>;
}

export function createCompletions(ctx: CompletionsContext): Completions {
  async function resolveBackend(req: ChatCompletionRequest) {
    const stats = await ctx.getDeviceStats();
    return decideRoute({
      localBackend: ctx.getLocalBackend(),
      cloudBackend: ctx.getCloudBackend(),
      deviceStats: stats,
      forceProvider: req.provider,
    });
  }

  function create(req: ChatCompletionRequest & { stream: true }): AsyncIterable<ChatCompletionChunk>;
  function create(req: ChatCompletionRequest & { stream?: false }): Promise<ChatCompletion>;
  function create(req: ChatCompletionRequest): Promise<ChatCompletion> | AsyncIterable<ChatCompletionChunk>;
  function create(req: ChatCompletionRequest): Promise<ChatCompletion> | AsyncIterable<ChatCompletionChunk> {
    if (req.stream) {
      return streamWithFallback(req);
    }
    return completeWithFallback(req);
  }

  async function completeWithFallback(req: ChatCompletionRequest): Promise<ChatCompletion> {
    const route = await resolveBackend(req);
    try {
      return await route.backend.complete(req, req.signal);
    } catch (err) {
      // Attempt fallback if we used local and cloud is available
      if (
        route.decision === 'local' &&
        ctx.getCloudBackend() &&
        !(err instanceof WebLLMError && err.code === 'ABORTED')
      ) {
        const cloudBackend = ctx.getCloudBackend()!;
        return cloudBackend.complete(req, req.signal);
      }
      // Attempt fallback if we used cloud and local is ready
      if (
        route.decision === 'cloud' &&
        ctx.getLocalBackend()?.isReady() &&
        !(err instanceof WebLLMError && err.code === 'ABORTED')
      ) {
        const localBackend = ctx.getLocalBackend()!;
        return localBackend.complete(req, req.signal);
      }
      throw err;
    }
  }

  async function* streamWithFallback(
    req: ChatCompletionRequest,
  ): AsyncIterable<ChatCompletionChunk> {
    const route = await resolveBackend(req);
    try {
      yield* route.backend.stream(req, req.signal);
    } catch (err) {
      if (err instanceof WebLLMError && err.code === 'ABORTED') throw err;

      // Fallback: local failed → try cloud
      if (route.decision === 'local' && ctx.getCloudBackend()) {
        yield* ctx.getCloudBackend()!.stream(req, req.signal);
        return;
      }
      // Fallback: cloud failed → try local
      if (route.decision === 'cloud' && ctx.getLocalBackend()?.isReady()) {
        yield* ctx.getLocalBackend()!.stream(req, req.signal);
        return;
      }
      throw err;
    }
  }

  return { create } as Completions;
}
