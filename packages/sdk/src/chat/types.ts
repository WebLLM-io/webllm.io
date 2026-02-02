// OpenAI-compatible Chat Completions types

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  messages: Message[];
  model?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'text' | 'json_object' };
  signal?: AbortSignal;
  provider?: 'local' | 'cloud';
}

export interface ChatCompletionChoice {
  index: number;
  message: Message;
  finish_reason: 'stop' | 'length' | null;
}

export interface ChatCompletion {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionChunkDelta {
  role?: 'assistant';
  content?: string;
}

export interface ChatCompletionChunkChoice {
  index: number;
  delta: ChatCompletionChunkDelta;
  finish_reason: 'stop' | 'length' | null;
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface Completions {
  create(req: ChatCompletionRequest & { stream: true }): AsyncIterable<ChatCompletionChunk>;
  create(req: ChatCompletionRequest & { stream?: false }): Promise<ChatCompletion>;
  create(req: ChatCompletionRequest): Promise<ChatCompletion> | AsyncIterable<ChatCompletionChunk>;
}
