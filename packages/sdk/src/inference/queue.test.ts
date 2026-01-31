import { describe, it, expect, vi } from 'vitest';
import { RequestQueue } from './queue.js';
import { WebLLMError } from '../core/errors.js';

describe('RequestQueue', () => {
  it('should enqueue and execute tasks in order', async () => {
    const queue = new RequestQueue();
    const order: number[] = [];

    const p1 = queue.enqueue(async () => {
      order.push(1);
      return 'a';
    });
    const p2 = queue.enqueue(async () => {
      order.push(2);
      return 'b';
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('a');
    expect(r2).toBe('b');
    expect(order).toEqual([1, 2]);
  });

  it('should enforce max queue size', async () => {
    const queue = new RequestQueue(2);

    // Block the queue with a slow task so items accumulate
    let unblock!: () => void;
    const blocker = new Promise<void>((r) => { unblock = r; });
    const p1 = queue.enqueue(() => blocker);

    // Fill queue (2 items max while first is running)
    const p2 = queue.enqueue(async () => 'b');
    const p3 = queue.enqueue(async () => 'c');

    // Third enqueue should fail
    await expect(queue.enqueue(async () => 'd')).rejects.toThrow(WebLLMError);
    await expect(queue.enqueue(async () => 'e')).rejects.toMatchObject({
      code: 'QUEUE_FULL',
    });

    unblock();
    await Promise.all([p1, p2, p3]);
  });

  it('should reject if signal is already aborted before enqueue', async () => {
    const queue = new RequestQueue();
    const controller = new AbortController();
    controller.abort();

    await expect(
      queue.enqueue(async () => 'value', controller.signal),
    ).rejects.toThrow(WebLLMError);

    await expect(
      queue.enqueue(async () => 'value', controller.signal),
    ).rejects.toMatchObject({ code: 'ABORTED' });
  });

  it('should remove item from queue when signal is aborted while queued', async () => {
    const queue = new RequestQueue();
    const controller = new AbortController();

    // Block the queue
    let unblock!: () => void;
    const blocker = new Promise<void>((r) => { unblock = r; });
    const p1 = queue.enqueue(() => blocker);

    // Enqueue a cancellable task
    const p2 = queue.enqueue(async () => 'cancelled', controller.signal);

    // Abort while queued
    controller.abort();

    await expect(p2).rejects.toMatchObject({ code: 'ABORTED' });

    unblock();
    await p1;
  });

  it('should drain serially (one at a time)', async () => {
    const queue = new RequestQueue();
    let concurrency = 0;
    let maxConcurrency = 0;

    const task = async () => {
      concurrency++;
      maxConcurrency = Math.max(maxConcurrency, concurrency);
      await new Promise((r) => setTimeout(r, 10));
      concurrency--;
      return 'done';
    };

    const promises = [
      queue.enqueue(task),
      queue.enqueue(task),
      queue.enqueue(task),
    ];

    await Promise.all(promises);
    expect(maxConcurrency).toBe(1);
  });

  it('should report queue size correctly', async () => {
    const queue = new RequestQueue();
    expect(queue.size).toBe(0);

    let unblock!: () => void;
    const blocker = new Promise<void>((r) => { unblock = r; });
    const p1 = queue.enqueue(() => blocker);
    // First item gets dequeued and starts running, so size could be 0 already
    // Add more items
    const p2 = queue.enqueue(async () => 'b');
    expect(queue.size).toBeGreaterThanOrEqual(1);

    unblock();
    await Promise.all([p1, p2]);
    expect(queue.size).toBe(0);
  });

  it('should propagate errors from tasks', async () => {
    const queue = new RequestQueue();
    const err = new Error('task failed');

    await expect(
      queue.enqueue(async () => { throw err; }),
    ).rejects.toBe(err);
  });
});
