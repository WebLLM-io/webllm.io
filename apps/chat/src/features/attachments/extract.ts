import { MAX_TEXT_LENGTH } from './types';

async function extractPDF(file: File): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;

  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    if (text.trim()) pages.push(text);
  }

  return pages.join('\n\n');
}

export async function extractText(file: File): Promise<string> {
  let text: string;

  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    text = await extractPDF(file);
  } else {
    text = await file.text();
  }

  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH);
  }

  return text;
}
