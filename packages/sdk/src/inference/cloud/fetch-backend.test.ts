import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchBackend } from './fetch-backend.js';
import { WebLLMError } from '../../core/errors.js';
import type { ChatCompletionRequest, ChatCompletion } from '../../chat/types.js';

const mockRequest: ChatCompletionRequest = {
  messages: [{ role: 'user', content: 'Hello' }],
};

function makeCompletion(): ChatCompletion {
  return {
    id: 'test-id',
    object: 'chat.completion',
    created: Date.now(),
    model: 'test-model',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: 'Hi there!' },
        finish_reason: 'stop',
      },
    ],
  };
}

function createSSEResponseBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk + '\n'));
      }
      controller.close();
    },
  });
}

describe('FetchBackend', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createBackend(overrides = {}) {
    return new FetchBackend({
      baseURL: 'https://api.example.com/v1',
      apiKey: 'test-key',
      model: 'test-model',
      timeout: 5000,
      retries: 2,
      ...overrides,
    });
  }

  describe('complete()', () => {
    it('should return a ChatCompletion on success', async () => {
      const completion = makeCompletion();
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(completion), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const backend = createBackend();
      const result = await backend.complete(mockRequest);

      expect(result.id).toBe('test-id');
      expect(result.choices[0].message.content).toBe('Hi there!');
    });

    it('should include Authorization header when apiKey is provided', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(makeCompletion()), { status: 200 }),
      );

      const backend = createBackend({ apiKey: 'my-secret' });
      await backend.complete(mockRequest);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, init] = fetchSpy.mock.calls[0];
      const headers = JSON.parse(init.body);
      // Check the headers passed to fetch
      expect(init.headers['Authorization']).toBe('Bearer my-secret');
    });

    it('should not include Authorization header when no apiKey', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(makeCompletion()), { status: 200 }),
      );

      const backend = createBackend({ apiKey: undefined });
      await backend.complete(mockRequest);

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.headers['Authorization']).toBeUndefined();
    });

    it('should POST to baseURL/chat/completions', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(makeCompletion()), { status: 200 }),
      );

      const backend = createBackend();
      await backend.complete(mockRequest);

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://api.example.com/v1/chat/completions');
    });
  });

  describe('stream()', () => {
    it('should yield chunks from SSE response', async () => {
      const chunk1 = {
        id: 'c1',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'test-model',
        choices: [{ index: 0, delta: { content: 'Hi' }, finish_reason: null }],
      };
      const chunk2 = {
        id: 'c2',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'test-model',
        choices: [{ index: 0, delta: { content: '!' }, finish_reason: 'stop' }],
      };

      const body = createSSEResponseBody([
        `data: ${JSON.stringify(chunk1)}`,
        `data: ${JSON.stringify(chunk2)}`,
        'data: [DONE]',
      ]);

      fetchSpy.mockResolvedValueOnce(new Response(body, { status: 200 }));

      const backend = createBackend();
      const results = [];
      for await (const c of backend.stream(mockRequest)) {
        results.push(c);
      }

      expect(results).toHaveLength(2);
      expect(results[0].choices[0].delta.content).toBe('Hi');
      expect(results[1].choices[0].delta.content).toBe('!');
    });
  });

  describe('retry behavior', () => {
    it('should retry on 5xx errors', async () => {
      // First two calls return 500, third succeeds
      fetchSpy
        .mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Internal Server Error' }))
        .mockResolvedValueOnce(new Response('', { status: 502, statusText: 'Bad Gateway' }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify(makeCompletion()), { status: 200 }),
        );

      const backend = createBackend({ retries: 2, timeout: 30000 });

      // Use fake timers to avoid waiting for retry delays
      vi.useFakeTimers();
      const promise = backend.complete(mockRequest);
      // Advance through retry delays
      await vi.advanceTimersByTimeAsync(1000); // 2^0 * 1000
      await vi.advanceTimersByTimeAsync(2000); // 2^1 * 1000
      const result = await promise;
      vi.useRealTimers();

      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(result.id).toBe('test-id');
    });

    it('should not retry on 4xx errors', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response('', { status: 400, statusText: 'Bad Request' }),
      );

      const backend = createBackend({ retries: 2 });

      await expect(backend.complete(mockRequest)).rejects.toMatchObject({
        code: 'CLOUD_REQUEST_FAILED',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 Unauthorized', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response('', { status: 401, statusText: 'Unauthorized' }),
      );

      const backend = createBackend({ retries: 2 });

      await expect(backend.complete(mockRequest)).rejects.toThrow(WebLLMError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout handling', () => {
    it('should throw TIMEOUT error when request times out', async () => {
      fetchSpy.mockImplementation(() => {
        const error = new DOMException('The operation was aborted', 'TimeoutError');
        (error as unknown as Record<string, string>).name = 'TimeoutError';
        return Promise.reject(error);
      });

      const backend = createBackend({ timeout: 100, retries: 0 });

      await expect(backend.complete(mockRequest)).rejects.toMatchObject({
        code: 'TIMEOUT',
      });
    });
  });

  describe('abort handling', () => {
    it('should throw ABORTED error when signal is aborted', async () => {
      fetchSpy.mockImplementation(() => {
        const error = new DOMException('The operation was aborted', 'AbortError');
        (error as unknown as Record<string, string>).name = 'AbortError';
        return Promise.reject(error);
      });

      const backend = createBackend({ retries: 0 });
      const controller = new AbortController();
      controller.abort();

      await expect(
        backend.complete(mockRequest, controller.signal),
      ).rejects.toMatchObject({ code: 'ABORTED' });
    });
  });

  describe('lifecycle', () => {
    it('should not be ready initially', () => {
      const backend = createBackend();
      expect(backend.isReady()).toBe(false);
    });

    it('should be ready after initialize()', async () => {
      const backend = createBackend();
      await backend.initialize();
      expect(backend.isReady()).toBe(true);
    });

    it('should not be ready after dispose()', async () => {
      const backend = createBackend();
      await backend.initialize();
      await backend.dispose();
      expect(backend.isReady()).toBe(false);
    });
  });
});
