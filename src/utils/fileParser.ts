import type { Attachment } from '../types';

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
  // Dynamic import pdfjs
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str || '')
      .join(' ');
    fullText += `[Page ${i}]\n${pageText}\n\n`;
  }

  return fullText.trim();
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
