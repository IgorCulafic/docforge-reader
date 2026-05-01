export interface DocumentStats {
  wordCount: number;
  characterCount: number;
  lineCount: number;
}

export function calculateDocumentStats(text: string): DocumentStats {
  const trimmed = text.trim();
  const words = trimmed.match(/[\p{L}\p{N}']+/gu) ?? [];

  return {
    wordCount: words.length,
    characterCount: text.length,
    lineCount: text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} ${units[unitIndex]}`;
}
