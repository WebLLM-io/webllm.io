import type { InferenceBackend } from '../backend.js';
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionRequest,
} from '../../chat/types.js';
import type { ProgressCallback } from '../../core/config.js';
import type { MLCBackendConfig } from './types.js';
import type { DeviceGrade } from '../../capability/types.js';
import { WebLLMError } from '../../core/errors.js';
import { RequestQueue } from '../queue.js';

const RECOMMENDED_MODELS = {
  high: 'Qwen3-8B-q4f16_1-MLC',
  medium: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
  low: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
} as const;

interface MLCEngine {
  chat: {
    completions: {
      create(params: Record<string, unknown>): Promise<unknown>;
    };
  };
  interruptGenerate(): void;
  unload(): Promise<void>;
}

function resolveModelForGrade(
  config: MLCBackendConfig,
  grade: DeviceGrade,
): string | null {
  if (config.model) return config.model;

  const tiers = config.tiers ?? RECOMMENDED_MODELS;

  if (grade === 'S' || grade === 'A') {
    const model = tiers.high;
    if (model === 'auto' || model === undefined) return RECOMMENDED_MODELS.high;
    return model ?? null;
  }
  if (grade === 'B') {
    const model = tiers.medium;
    if (model === 'auto' || model === undefined) return RECOMMENDED_MODELS.medium;
    return model ?? null;
  }
  // Grade C
  const model = tiers.low;
  if (model === 'auto') return RECOMMENDED_MODELS.low;
  return model ?? RECOMMENDED_MODELS.low;
}

export class MLCBackend implements InferenceBackend {
  private engine: MLCEngine | null = null;
  private config: MLCBackendConfig;
  private onProgress?: ProgressCallback;
  private ready = false;
  private currentModel: string | null = null;
  private queue = new RequestQueue();
  private loadAbortController: AbortController | null = null;
  private worker: Worker | null = null;

  constructor(config: MLCBackendConfig, onProgress?: ProgressCallback) {
    this.config = config;
    this.onProgress = onProgress;
  }

  isReady(): boolean {
    return this.ready;
  }

  getModel(): string | null {
    return this.currentModel;
  }

  async initialize(grade: DeviceGrade = 'B'): Promise<void> {
    const modelId = resolveModelForGrade(this.config, grade);
    if (!modelId) {
      throw new WebLLMError('NO_PROVIDER_AVAILABLE', 'No suitable model for this device grade');
    }
    await this.load(modelId);
  }

  async load(modelId: string): Promise<void> {
    // Abort any previous loading operation
    if (this.loadAbortController) {
      this.loadAbortController.abort();
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.loadAbortController = new AbortController();
    const signal = this.loadAbortController.signal;
    const useWorker = this.config.useWebWorker !== false;

    try {
      if (useWorker) {
        const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');

        if (signal.aborted) {
          throw new WebLLMError('ABORTED', 'Model load aborted');
        }

        const worker = new Worker(
          new URL('./worker-entry.js', import.meta.url),
          { type: 'module' },
        );
        this.worker = worker;

        this.engine = (await CreateWebWorkerMLCEngine(worker, modelId, {
          initProgressCallback: (progress) => {
            if (signal.aborted) return;
            const text: string = (progress as any).text || '';
            let stage: 'download' | 'compile' | 'warmup' = 'download';
            if (progress.progress >= 1) {
              stage = 'warmup';
            } else if (/shader|compile/i.test(text)) {
              stage = 'compile';
            }
            this.onProgress?.({
              stage,
              progress: progress.progress,
              model: modelId,
            });
          },
        })) as unknown as MLCEngine;
      } else {
        const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

        if (signal.aborted) {
          throw new WebLLMError('ABORTED', 'Model load aborted');
        }

        this.engine = (await CreateMLCEngine(modelId, {
          initProgressCallback: (progress) => {
            if (signal.aborted) return;
            const text: string = (progress as any).text || '';
            let stage: 'download' | 'compile' | 'warmup' = 'download';
            if (progress.progress >= 1) {
              stage = 'warmup';
            } else if (/shader|compile/i.test(text)) {
              stage = 'compile';
            }
            this.onProgress?.({
              stage,
              progress: progress.progress,
              model: modelId,
            });
          },
        })) as unknown as MLCEngine;
      }

      if (signal.aborted) {
        throw new WebLLMError('ABORTED', 'Model load aborted');
      }

      this.currentModel = modelId;
      this.ready = true;
      this.loadAbortController = null;
    } catch (err) {
      if ((err as Error).message?.includes('aborted') || signal.aborted) {
        throw new WebLLMError('ABORTED', 'Model load aborted');
      }
      throw new WebLLMError('MODEL_LOAD_FAILED', `Failed to load model: ${modelId}`, err);
    }
  }

  async unload(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
      this.ready = false;
      this.currentModel = null;
    }
  }

  async complete(
    req: ChatCompletionRequest,
    signal?: AbortSignal,
  ): Promise<ChatCompletion> {
    return this.queue.enqueue(async () => {
      if (!this.engine) {
        throw new WebLLMError('INFERENCE_FAILED', 'MLC engine not initialized');
      }

      if (signal?.aborted) {
        throw new WebLLMError('ABORTED', 'Request aborted');
      }

      const onAbort = () => this.engine?.interruptGenerate();
      signal?.addEventListener('abort', onAbort, { once: true });

      try {
        const result = await this.engine.chat.completions.create({
          messages: req.messages,
          stream: false,
          ...(req.temperature !== undefined && { temperature: req.temperature }),
          ...(req.max_tokens !== undefined && { max_tokens: req.max_tokens }),
          ...(req.response_format && { response_format: req.response_format }),
        });
        return result as ChatCompletion;
      } catch (err) {
        if (signal?.aborted) {
          throw new WebLLMError('ABORTED', 'Request aborted during inference');
        }
        throw new WebLLMError('INFERENCE_FAILED', 'MLC inference failed', err);
      } finally {
        signal?.removeEventListener('abort', onAbort);
      }
    }, signal);
  }

  async *stream(
    req: ChatCompletionRequest,
    signal?: AbortSignal,
  ): AsyncIterable<ChatCompletionChunk> {
    if (!this.engine) {
      throw new WebLLMError('INFERENCE_FAILED', 'MLC engine not initialized');
    }

    if (signal?.aborted) {
      throw new WebLLMError('ABORTED', 'Already aborted');
    }

    const onAbort = () => this.engine?.interruptGenerate();
    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      const chunks = await this.engine.chat.completions.create({
        messages: req.messages,
        stream: true,
        ...(req.temperature !== undefined && { temperature: req.temperature }),
        ...(req.max_tokens !== undefined && { max_tokens: req.max_tokens }),
        ...(req.response_format && { response_format: req.response_format }),
      });

      for await (const chunk of chunks as AsyncIterable<ChatCompletionChunk>) {
        if (signal?.aborted) break;
        yield chunk;
      }
    } catch (err) {
      if (signal?.aborted) {
        throw new WebLLMError('ABORTED', 'Request aborted during streaming');
      }
      throw new WebLLMError('INFERENCE_FAILED', 'MLC streaming failed', err);
    } finally {
      signal?.removeEventListener('abort', onAbort);
    }
  }

  async dispose(): Promise<void> {
    // Abort any ongoing load operation
    if (this.loadAbortController) {
      this.loadAbortController.abort();
      this.loadAbortController = null;
    }

    // Terminate worker if it exists (covers both loading and loaded states)
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    await this.unload();
  }
}
