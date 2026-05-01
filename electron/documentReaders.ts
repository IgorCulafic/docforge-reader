import { readFile } from "node:fs/promises";

export interface DocumentExtractors {
  extractPdfText?: (filePath: string) => Promise<string>;
  extractPdfHtml?: (filePath: string) => Promise<string>;
  extractDocxText?: (filePath: string) => Promise<string>;
  extractDocxHtml?: (filePath: string) => Promise<string>;
}

export interface DocumentData {
  content: string;
  contentHtml?: string;
}

export async function readDocumentContent(
  filePath: string,
  extension: string,
  name: string,
  extractors: DocumentExtractors = {}
): Promise<string> {
  if (extension === ".pdf") {
    const text = await (extractors.extractPdfText ?? extractPdfText)(filePath);
    return text.trim() || noSelectableTextMessage(name, "PDF");
  }

  if (extension === ".docx") {
    const text = await (extractors.extractDocxText ?? extractDocxText)(filePath);
    return text.trim() || noSelectableTextMessage(name, "DOCX");
  }

  if (extension === ".epub") {
    return `[EPUB extraction not available yet]\n\n${name} is an EPUB ebook. This build keeps the source safe and does not overwrite it. EPUB chapter extraction is the next adapter to add.`;
  }

  const buffer = await readFile(filePath);
  return buffer.toString("utf8");
}

export async function readDocumentData(
  filePath: string,
  extension: string,
  name: string,
  extractors: DocumentExtractors = {}
): Promise<DocumentData> {
  if (extension === ".pdf") {
    const text = await (extractors.extractPdfText ?? extractPdfText)(filePath);
    const content = text.trim() || noSelectableTextMessage(name, "PDF");
    const contentHtml = text.trim() ? await tryExtractHtml(() => (extractors.extractPdfHtml ?? extractPdfHtml)(filePath)) : undefined;
    return { content, contentHtml };
  }

  if (extension === ".docx") {
    const text = await (extractors.extractDocxText ?? extractDocxText)(filePath);
    const content = text.trim() || noSelectableTextMessage(name, "DOCX");
    const contentHtml = text.trim() ? await tryExtractHtml(() => (extractors.extractDocxHtml ?? extractDocxHtml)(filePath)) : undefined;
    return { content, contentHtml };
  }

  if (extension === ".epub") {
    return {
      content: `[EPUB extraction not available yet]\n\n${name} is an EPUB ebook. This build keeps the source safe and does not overwrite it. EPUB chapter extraction is the next adapter to add.`
    };
  }

  const buffer = await readFile(filePath);
  return { content: buffer.toString("utf8") };
}

async function extractPdfText(filePath: string): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const buffer = await readFile(filePath);
  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    useSystemFonts: true
  } as Record<string, unknown>).promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/[ \t]+/g, " ")
      .trim();

    if (pageText) {
      pages.push(pageText);
    }
  }

  await document.destroy();
  return pages.join("\n\n");
}

async function extractPdfHtml(filePath: string): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const buffer = await readFile(filePath);
  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    useSystemFonts: true
  } as Record<string, unknown>).promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.35 });
    const textContent = await page.getTextContent();
    const spans = textContent.items
      .map((item) => {
        if (!("str" in item) || !item.str.trim()) {
          return "";
        }

        const transform = item.transform;
        const left = transform[4] * 1.35;
        const top = viewport.height - transform[5] * 1.35;
        const fontSize = Math.max(Math.hypot(transform[2], transform[3]) * 1.35, 8);

        return `<span style="left:${left.toFixed(2)}px;top:${top.toFixed(2)}px;font-size:${fontSize.toFixed(2)}px">${escapeHtml(item.str)}</span>`;
      })
      .join("");

    pages.push(
      `<section class="pdf-page" style="width:${viewport.width.toFixed(2)}px;height:${viewport.height.toFixed(2)}px">${spans}</section>`
    );
  }

  await document.destroy();
  return `<div class="formatted-pdf">${pages.join("")}</div>`;
}

async function extractDocxText(filePath: string): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function extractDocxHtml(filePath: string): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml({ path: filePath }, {
    convertImage: mammoth.images.imgElement(async (image) => ({
      src: `data:${image.contentType};base64,${await image.read("base64")}`
    })),
    styleMap: [
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Subtitle'] => h2.subtitle:fresh",
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh"
    ]
  });

  return `<article class="formatted-docx">${result.value}</article>`;
}

function noSelectableTextMessage(name: string, format: string): string {
  return `No selectable text was found in ${name}.\n\nThis ${format} may be scanned, image-based, encrypted, or otherwise not text-extractable. The original file is preserved. OCR support should be added for scanned documents.`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function tryExtractHtml(extract: () => Promise<string>): Promise<string | undefined> {
  try {
    return await extract();
  } catch {
    return undefined;
  }
}
