import { WebLLMError } from '../core/errors.js';

interface QueueItem<T = unknown> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  signal?: AbortSignal;
}

export class RequestQueue {
  private queue: QueueItem[] = [];
  private running = false;
  private maxSize: number;

  constructor(maxSize = 10) {
    this.maxSize = maxSize;
  }

  async enqueue<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) {
      throw new WebLLMError('ABORTED', 'Request was aborted before enqueue');
    }

    if (this.queue.length >= this.maxSize) {
      throw new WebLLMError('QUEUE_FULL', `Request queue is full (max ${this.maxSize})`);
    }

    return new Promise<T>((resolve, reject) => {
      const item: QueueItem<T> = { fn, resolve, reject, signal };

      if (signal) {
        const onAbort = () => {
          const idx = this.queue.indexOf(item as QueueItem);
          if (idx !== -1) {
            this.queue.splice(idx, 1);
            reject(new WebLLMError('ABORTED', 'Request aborted while queued'));
          }
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }

      this.queue.push(item as QueueItem);
      this.drain();
    });
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      if (item.signal?.aborted) {
        item.reject(new WebLLMError('ABORTED', 'Request aborted while queued'));
        continue;
      }

      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (err) {
        item.reject(err);
      }
    }

    this.running = false;
  }

  get size(): number {
    return this.queue.length;
  }
}
