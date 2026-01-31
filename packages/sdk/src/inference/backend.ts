import type { ChatCompletion, ChatCompletionChunk, ChatCompletionRequest } from '../chat/types.js';

export interface InferenceBackend {
  isReady(): boolean;
  initialize(): Promise<void>;
  complete(req: ChatCompletionRequest, signal?: AbortSignal): Promise<ChatCompletion>;
  stream(req: ChatCompletionRequest, signal?: AbortSignal): AsyncIterable<ChatCompletionChunk>;
  dispose(): Promise<void>;
}
