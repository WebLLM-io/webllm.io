import type { InferenceBackend } from '../inference/backend.js';
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionRequest,
} from '../chat/types.js';
import type { DeviceStats } from '../capability/types.js';
import type { CloudFn } from '../core/config.js';
import type { RouteContext } from '../router/types.js';
import type { ResolvedCloudBackend, ResolvedLocalBackend } from './types.js';
import { WebLLMError } from '../core/errors.js';

// --- Custom local provider (wraps user function) ---

type LocalSelectorFn = (stats: DeviceStats) => string | null;

class CustomLocalBackend implements InferenceBackend {
  private innerBackend: InferenceBackend | null = null;
  private selectorFn: LocalSelectorFn;
  private resolveModel: (modelId: string) => InferenceBackend;

  constructor(
    selectorFn: LocalSelectorFn,
    resolveModel: (modelId: string) => InferenceBackend,
  ) {
    this.selectorFn = selectorFn;
    this.resolveModel = resolveModel;
  }

  isReady(): boolean {
    return this.innerBackend?.isReady() ?? false;
  }

  async initialize(): Promise<void> {
    // Deferred: model selection happens at first request via the router
  }

  async initializeWithStats(stats: DeviceStats): Promise<void> {
    const modelId = this.selectorFn(stats);
    if (!modelId) {
      throw new WebLLMError('NO_PROVIDER_AVAILABLE', 'Local selector returned null');
    }
    this.innerBackend = this.resolveModel(modelId);
    await this.innerBackend.initialize();
  }

  async complete(req: ChatCompletionRequest, signal?: AbortSignal): Promise<ChatCompletion> {
    if (!this.innerBackend) {
      throw new WebLLMError('INFERENCE_FAILED', 'Custom local backend not initialized');
    }
    return this.innerBackend.complete(req, signal);
  }

  async *stream(
    req: ChatCompletionRequest,
    signal?: AbortSignal,
  ): AsyncIterable<ChatCompletionChunk> {
    if (!this.innerBackend) {
      throw new WebLLMError('INFERENCE_FAILED', 'Custom local backend not initialized');
    }
    yield* this.innerBackend.stream(req, signal);
  }

  async dispose(): Promise<void> {
    await this.innerBackend?.dispose();
    this.innerBackend = null;
  }
}

export function customLocal(selectorFn: LocalSelectorFn): ResolvedLocalBackend {
  return {
    __kind: 'resolved-local',
    providerName: 'custom-local',
    createBackend(_options) {
      // For custom local, we create a lazy backend that defers model selection.
      // The actual @mlc-ai/web-llm backend is created internally when stats are available.
      // For now, we create a placeholder that requires initializeWithStats.
      return new CustomLocalBackend(selectorFn, (_modelId: string) => {
        // This will be replaced with actual MLC backend creation
        // by the client when it integrates providers.
        throw new WebLLMError(
          'INFERENCE_FAILED',
          'Custom local model resolution not yet wired',
        );
      });
    },
  };
}

// --- Custom cloud provider (wraps user function) ---

class CustomCloudBackend implements InferenceBackend {
  private cloudFn: CloudFn;
  private routeContext: RouteContext;

  constructor(cloudFn: CloudFn, routeContext?: RouteContext) {
    this.cloudFn = cloudFn;
    this.routeContext = routeContext ?? {
      reason: 'local-unavailable',
      deviceStats: {
        gpu: null,
        grade: 'C',
        battery: null,
        memory: 0,
      },
      attempt: 1,
    };
  }

  isReady(): boolean {
    return true;
  }

  async initialize(): Promise<void> {
    // No-op for custom cloud
  }

  async complete(req: ChatCompletionRequest): Promise<ChatCompletion> {
    const result = await this.cloudFn(req.messages, this.routeContext);
    if (Symbol.asyncIterator in (result as object)) {
      // Collect stream into a single completion
      let content = '';
      let model = '';
      for await (const chunk of result as AsyncIterable<ChatCompletionChunk>) {
        content += chunk.choices[0]?.delta?.content ?? '';
        model = chunk.model;
      }
      return {
        id: `custom-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
      };
    }
    return result as ChatCompletion;
  }

  async *stream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const result = await this.cloudFn(req.messages, this.routeContext);
    if (Symbol.asyncIterator in (result as object)) {
      yield* result as AsyncIterable<ChatCompletionChunk>;
    } else {
      // Convert single completion to a chunk
      const completion = result as ChatCompletion;
      yield {
        id: completion.id,
        object: 'chat.completion.chunk',
        created: completion.created,
        model: completion.model,
        choices: [
          {
            index: 0,
            delta: { role: 'assistant', content: completion.choices[0]?.message.content ?? '' },
            finish_reason: 'stop',
          },
        ],
      };
    }
  }

  async dispose(): Promise<void> {
    // No-op
  }
}

export function customCloud(cloudFn: CloudFn): ResolvedCloudBackend {
  return {
    __kind: 'resolved-cloud',
    providerName: 'custom-cloud',
    createBackend() {
      return new CustomCloudBackend(cloudFn);
    },
  };
}
