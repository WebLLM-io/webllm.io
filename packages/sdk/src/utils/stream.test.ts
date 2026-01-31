import { describe, it, expect } from 'vitest';
import { parseSSEStream } from './stream.js';

function makeChunk(id: string, content: string) {
  return {
    id,
    object: 'chat.completion.chunk' as const,
    created: Date.now(),
    model: 'test-model',
    choices: [{ index: 0, delta: { content }, finish_reason: null }],
  };
}

function createSSEResponse(lines: string[]): Response {
  const text = lines.join('\n') + '\n';
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream);
}

function createMultiChunkResponse(chunks: string[][]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk.join('\n') + '\n'));
      }
      controller.close();
    },
  });
  return new Response(stream);
}

describe('parseSSEStream', () => {
  it('should parse normal SSE data lines', async () => {
    const chunk1 = makeChunk('1', 'Hello');
    const chunk2 = makeChunk('2', ' World');
    const response = createSSEResponse([
      `data: ${JSON.stringify(chunk1)}`,
      `data: ${JSON.stringify(chunk2)}`,
      'data: [DONE]',
    ]);

    const results = [];
    for await (const item of parseSSEStream(response)) {
      results.push(item);
    }

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('1');
    expect(results[1].id).toBe('2');
  });

  it('should stop at [DONE] terminator', async () => {
    const chunk1 = makeChunk('1', 'Hello');
    const response = createSSEResponse([
      `data: ${JSON.stringify(chunk1)}`,
      'data: [DONE]',
      `data: ${JSON.stringify(makeChunk('2', 'ignored'))}`,
    ]);

    const results = [];
    for await (const item of parseSSEStream(response)) {
      results.push(item);
    }

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });

  it('should handle multi-chunk responses arriving separately', async () => {
    const c1 = makeChunk('1', 'A');
    const c2 = makeChunk('2', 'B');
    const response = createMultiChunkResponse([
      [`data: ${JSON.stringify(c1)}`],
      [`data: ${JSON.stringify(c2)}`],
      ['data: [DONE]'],
    ]);

    const results = [];
    for await (const item of parseSSEStream(response)) {
      results.push(item);
    }

    expect(results).toHaveLength(2);
    expect(results[0].choices[0].delta.content).toBe('A');
    expect(results[1].choices[0].delta.content).toBe('B');
  });

  it('should handle partial buffers split across chunks', async () => {
    const chunk = makeChunk('1', 'split');
    const json = JSON.stringify(chunk);
    const line = `data: ${json}`;
    const mid = Math.floor(line.length / 2);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send first half
        controller.enqueue(encoder.encode(line.slice(0, mid)));
        // Send second half with newline and DONE
        controller.enqueue(encoder.encode(line.slice(mid) + '\ndata: [DONE]\n'));
        controller.close();
      },
    });

    const response = new Response(stream);
    const results = [];
    for await (const item of parseSSEStream(response)) {
      results.push(item);
    }

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
    expect(results[0].choices[0].delta.content).toBe('split');
  });

  it('should handle empty lines (SSE spec allows blank lines)', async () => {
    const chunk = makeChunk('1', 'ok');
    const response = createSSEResponse([
      '',
      `data: ${JSON.stringify(chunk)}`,
      '',
      'data: [DONE]',
    ]);

    const results = [];
    for await (const item of parseSSEStream(response)) {
      results.push(item);
    }

    expect(results).toHaveLength(1);
  });

  it('should handle remaining buffer after stream ends', async () => {
    const chunk = makeChunk('1', 'tail');
    // No trailing newline — data stays in buffer until stream ends
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}`));
        controller.close();
      },
    });

    const response = new Response(stream);
    const results = [];
    for await (const item of parseSSEStream(response)) {
      results.push(item);
    }

    expect(results).toHaveLength(1);
    expect(results[0].choices[0].delta.content).toBe('tail');
  });
});
