export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  thinkingTime?: number;
  model?: string;
  route?: 'local' | 'cloud';
  usage?: { prompt_tokens: number; completion_tokens: number };
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
