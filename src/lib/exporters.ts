export type ExportFormat = "txt" | "md" | "html" | "rtf";

export interface ExportOption {
  id: ExportFormat;
  label: string;
  extension: string;
}

export interface ExportPayload {
  contents: string;
  fileExtension: string;
  mimeType: string;
}

export const exportFormats: ExportOption[] = [
  { id: "txt", label: "Plain text", extension: ".txt" },
  { id: "md", label: "Markdown", extension: ".md" },
  { id: "html", label: "HTML", extension: ".html" },
  { id: "rtf", label: "Rich text", extension: ".rtf" }
];

export function createExportPayload(content: string, format: ExportFormat): ExportPayload {
  switch (format) {
    case "txt":
      return {
        contents: markdownToPlainText(content),
        fileExtension: ".txt",
        mimeType: "text/plain;charset=utf-8"
      };
    case "md":
      return {
        contents: content,
        fileExtension: ".md",
        mimeType: "text/markdown;charset=utf-8"
      };
    case "html":
      return {
        contents: toHtmlDocument(content),
        fileExtension: ".html",
        mimeType: "text/html;charset=utf-8"
      };
    case "rtf":
      return {
        contents: toRtf(content),
        fileExtension: ".rtf",
        mimeType: "application/rtf"
      };
  }
}

export function markdownToPlainText(content: string): string {
  return content
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function toHtmlDocument(content: string): string {
  const body = escapeHtml(content).replace(/\r\n|\r|\n/g, "<br />\n");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Exported Document</title>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function toRtf(content: string): string {
  const escaped = content
    .replace(/\\/g, "\\\\")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/\r\n|\r|\n/g, "\\par\n");

  return `{\\rtf1\\ansi\n${escaped}\n}`;
}
