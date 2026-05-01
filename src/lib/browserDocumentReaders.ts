import pdfWorkerSrc from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

export interface BrowserDocumentExtractors {
  extractPdfText?: (file: File) => Promise<string>;
  extractPdfHtml?: (file: File) => Promise<string>;
  extractDocxText?: (file: File) => Promise<string>;
  extractDocxHtml?: (file: File) => Promise<string>;
}

export interface BrowserDocumentData {
  content: string;
  contentHtml?: string;
}

export async function readBrowserDocumentContent(
  file: File,
  extension: string,
  extractors: BrowserDocumentExtractors = {}
): Promise<string> {
  if (extension === ".pdf") {
    const text = await (extractors.extractPdfText ?? extractPdfText)(file);
    return text.trim() || noSelectableTextMessage(file.name, "PDF");
  }

  if (extension === ".docx") {
    const text = await (extractors.extractDocxText ?? extractDocxText)(file);
    return text.trim() || noSelectableTextMessage(file.name, "DOCX");
  }

  if (extension === ".epub") {
    return noSelectableTextMessage(file.name, "EPUB");
  }

  return readFileText(file);
}

export async function readBrowserDocumentData(
  file: File,
  extension: string,
  extractors: BrowserDocumentExtractors = {}
): Promise<BrowserDocumentData> {
  if (extension === ".pdf") {
    const text = await (extractors.extractPdfText ?? extractPdfText)(file);
    const content = text.trim() || noSelectableTextMessage(file.name, "PDF");
    const contentHtml = text.trim() ? await tryExtractHtml(() => (extractors.extractPdfHtml ?? extractPdfHtml)(file)) : undefined;
    return { content, contentHtml };
  }

  if (extension === ".docx") {
    const text = await (extractors.extractDocxText ?? extractDocxText)(file);
    const content = text.trim() || noSelectableTextMessage(file.name, "DOCX");
    const contentHtml = text.trim() ? await tryExtractHtml(() => (extractors.extractDocxHtml ?? extractDocxHtml)(file)) : undefined;
    return { content, contentHtml };
  }

  if (extension === ".epub") {
    return { content: noSelectableTextMessage(file.name, "EPUB") };
  }

  return { content: await readFileText(file) };
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
  const data = new Uint8Array(await readFileArrayBuffer(file));
  const document = await pdfjs.getDocument({
    data,
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

async function extractPdfHtml(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
  const data = new Uint8Array(await readFileArrayBuffer(file));
  const document = await pdfjs.getDocument({
    data,
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

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({ arrayBuffer: await readFileArrayBuffer(file) });
  return result.value;
}

async function extractDocxHtml(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.convertToHtml(
    { arrayBuffer: await readFileArrayBuffer(file) },
    {
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
    }
  );

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

async function readFileText(file: File): Promise<string> {
  if ("text" in file && typeof file.text === "function") {
    return file.text();
  }

  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error("Unable to read file text"));
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.readAsText(file);
    });
  }

  return new TextDecoder("utf-8").decode(await file.arrayBuffer());
}

async function readFileArrayBuffer(file: File): Promise<ArrayBuffer> {
  if ("arrayBuffer" in file && typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }

  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(file);
    });
  }

  throw new Error("This environment cannot read browser file data.");
}

async function tryExtractHtml(extract: () => Promise<string>): Promise<string | undefined> {
  try {
    return await extract();
  } catch {
    return undefined;
  }
}
