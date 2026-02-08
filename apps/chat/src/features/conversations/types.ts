import type { FileAttachment } from '../attachments/types';
import type { SearchResult } from '../search/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  thinkingTime?: number;
  model?: string;
  route?: 'local' | 'cloud';
  usage?: { prompt_tokens: number; completion_tokens: number };
  attachments?: FileAttachment[];
  searchResults?: SearchResult[];
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
