import type { ChatCompletionRequest } from './types.js';

/**
 * Helper to create a request configured for JSON structured output.
 * Wraps the web-llm / OpenAI response_format parameter.
 */
export function withJsonOutput<T extends ChatCompletionRequest>(req: T): T {
  return {
    ...req,
    response_format: { type: 'json_object' },
  };
}
