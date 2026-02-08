import type { FileAttachment } from './types';

export function formatAttachmentsContext(attachments: FileAttachment[]): string {
  if (!attachments.length) return '';

  const blocks = attachments.map(
    (a) => `--- ${a.name} ---\n${a.extractedText}`,
  );

  return `[Document Context]\n${blocks.join('\n\n')}`;
}
