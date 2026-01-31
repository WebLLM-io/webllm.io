import type { InferenceBackend } from '../backend.js';
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionRequest,
} from '../../chat/types.js';
import type { CloudBackendConfig } from './types.js';
import { WebLLMError } from '../../core/errors.js';
import { parseSSEStream } from '../../utils/stream.js';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildURL(baseURL: string): string {
  const base = baseURL.replace(/\/$/, '');
  // If baseURL already ends with /chat/completions, use as-is
  if (base.endsWith('/chat/completions')) return base;
  return `${base}/chat/completions`;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number,
  timeout: number,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const signals: AbortSignal[] = [AbortSignal.timeout(timeout)];
      if (options.signal) signals.push(options.signal);
      const combinedSignal = AbortSignal.any(signals);

      const res = await fetch(url, { ...options, signal: combinedSignal });

      if (res.status >= 500 && attempt < retries) {
        await delay(2 ** attempt * 1000);
        continue;
      }

      if (!res.ok) {
        throw new WebLLMError(
          'CLOUD_REQUEST_FAILED',
          `HTTP ${res.status}: ${res.statusText}`,
        );
      }

      return res;
    } catch (err) {
      if (err instanceof WebLLMError) throw err;

      const error = err as Error;
      if (error.name === 'AbortError') {
        throw new WebLLMError('ABORTED', 'Request aborted');
      }
      if (error.name === 'TimeoutError') {
        throw new WebLLMError('TIMEOUT', 'Request timed out');
      }

      if (attempt === retries) {
        throw new WebLLMError('CLOUD_REQUEST_FAILED', error.message, error);
      }
      await delay(2 ** attempt * 1000);
    }
  }

  throw new WebLLMError('CLOUD_REQUEST_FAILED', 'All retries exhausted');
}

export class FetchBackend implements InferenceBackend {
  private config: CloudBackendConfig;
  private url: string;
  private ready = false;

  constructor(config: CloudBackendConfig) {
    this.config = config;
    this.url = buildURL(config.baseURL);
  }

  isReady(): boolean {
    return this.ready;
  }

  async initialize(): Promise<void> {
    this.ready = true;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  private buildBody(req: ChatCompletionRequest, stream: boolean): string {
    return JSON.stringify({
      model: req.model ?? this.config.model ?? 'default',
      messages: req.messages,
      stream,
      ...(req.temperature !== undefined && { temperature: req.temperature }),
      ...(req.max_tokens !== undefined && { max_tokens: req.max_tokens }),
      ...(req.response_format && { response_format: req.response_format }),
    });
  }

  async complete(
    req: ChatCompletionRequest,
    signal?: AbortSignal,
  ): Promise<ChatCompletion> {
    const response = await fetchWithRetry(
      this.url,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: this.buildBody(req, false),
        signal,
      },
      this.config.retries ?? 1,
      this.config.timeout ?? 30_000,
    );

    return (await response.json()) as ChatCompletion;
  }

  async *stream(
    req: ChatCompletionRequest,
    signal?: AbortSignal,
  ): AsyncIterable<ChatCompletionChunk> {
    const response = await fetchWithRetry(
      this.url,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: this.buildBody(req, true),
        signal,
      },
      this.config.retries ?? 1,
      this.config.timeout ?? 30_000,
    );

    yield* parseSSEStream(response);
  }

  async dispose(): Promise<void> {
    this.ready = false;
  }
}
