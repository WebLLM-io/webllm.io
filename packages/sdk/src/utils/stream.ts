import type { ChatCompletionChunk } from '../chat/types.js';

/**
 * Parse a Server-Sent Events stream from a fetch Response into
 * an async generator of ChatCompletionChunk objects.
 */
export async function* parseSSEStream(
  response: Response,
): AsyncGenerator<ChatCompletionChunk> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') return;
          yield JSON.parse(data) as ChatCompletionChunk;
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim().startsWith('data: ')) {
      const data = buffer.trim().slice(6);
      if (data !== '[DONE]') {
        yield JSON.parse(data) as ChatCompletionChunk;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
