import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Attachment } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_PDF_PAGES = 20;

export async function parseFile(file: File): Promise<Attachment> {
  const id = Math.random().toString(36).slice(2);
  const name = file.name;
  const mimeType = file.type;

  if (mimeType.startsWith('image/')) {
    const content = await fileToBase64(file);
    return { id, name, type: 'image', content, mimeType };
  }

  if (mimeType === 'application/pdf' || name.endsWith('.pdf')) {
    try {
      const content = await parsePdf(file);
      return { id, name, type: 'pdf', content, mimeType: 'application/pdf' };
    } catch {
      const content = `[PDF file: ${name} - could not extract text]`;
      return { id, name, type: 'pdf', content, mimeType: 'application/pdf' };
    }
  }

  // Text files
  const content = await file.text();
  return { id, name, type: 'text', content, mimeType: mimeType || 'text/plain' };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function parsePdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= Math.min(pdf.numPages, MAX_PDF_PAGES); i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    const normalizedText = normalizeWhitespace(pageText);

    if (normalizedText) {
      pages.push(`[Page ${i}]\n${normalizedText}`);
    }
  }

  if (pages.length === 0) {
    return `[PDF file: ${file.name} - no extractable text found]`;
  }

  return pages.join('\n\n');
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function formatAttachmentsForContext(attachments: Attachment[]): string {
  if (attachments.length === 0) return '';

  return attachments
    .map((att) => {
      if (att.type === 'image') {
        return `[Image attached: ${att.name}] (The image has been provided for visual reference)`;
      }
      return `[Document: ${att.name}]\n${att.content}`;
    })
    .join('\n\n---\n\n');
}
