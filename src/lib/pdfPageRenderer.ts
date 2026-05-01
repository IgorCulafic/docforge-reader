import pdfWorkerSrc from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

export async function renderPdfPagesAsImages(data: Uint8Array, qualityScale = 3): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

  const document = await pdfjs.getDocument({
    data,
    useSystemFonts: true
  } as Record<string, unknown>).promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const displayViewport = page.getViewport({ scale: 1.25 });
    const renderViewport = page.getViewport({ scale: 1.25 * qualityScale });
    const canvas = globalThis.document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      continue;
    }

    canvas.width = Math.ceil(renderViewport.width);
    canvas.height = Math.ceil(renderViewport.height);
    await page.render({ canvas, canvasContext: context, viewport: renderViewport }).promise;

    pages.push(
      `<section class="pdf-image-page" style="--pdf-page-width: ${Math.ceil(displayViewport.width)}px"><img src="${canvas.toDataURL("image/png")}" width="${Math.ceil(displayViewport.width)}" height="${Math.ceil(displayViewport.height)}" alt="PDF page ${pageNumber}" /></section>`
    );
  }

  await document.destroy();
  return `<div class="formatted-pdf image-backed">${pages.join("")}</div>`;
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
