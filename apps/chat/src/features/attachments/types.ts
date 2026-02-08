export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  extractedText: string;
}

export const ACCEPTED_TYPES = '.pdf,.txt,.md,.csv,.json,.html';
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_ATTACHMENTS = 5;
export const MAX_TEXT_LENGTH = 100_000; // 100K characters
