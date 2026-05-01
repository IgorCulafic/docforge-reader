export type DocumentFormat =
  | "txt"
  | "md"
  | "rtf"
  | "docx"
  | "pdf"
  | "epub"
  | "html"
  | "json"
  | "xml"
  | "csv"
  | "unknown";

export type EditMode = "native" | "converted" | "readOnly";

export interface FormatProfile {
  format: DocumentFormat;
  label: string;
  editMode: EditMode;
  canSaveOriginal: boolean;
  warning?: string;
}

const profileByExtension: Record<string, FormatProfile> = {
  ".txt": { format: "txt", label: "Plain text", editMode: "native", canSaveOriginal: true },
  ".md": { format: "md", label: "Markdown", editMode: "native", canSaveOriginal: true },
  ".markdown": { format: "md", label: "Markdown", editMode: "native", canSaveOriginal: true },
  ".html": { format: "html", label: "HTML", editMode: "native", canSaveOriginal: true },
  ".htm": { format: "html", label: "HTML", editMode: "native", canSaveOriginal: true },
  ".json": { format: "json", label: "JSON", editMode: "native", canSaveOriginal: true },
  ".xml": { format: "xml", label: "XML", editMode: "native", canSaveOriginal: true },
  ".csv": { format: "csv", label: "CSV", editMode: "native", canSaveOriginal: true },
  ".rtf": {
    format: "rtf",
    label: "Rich text",
    editMode: "converted",
    canSaveOriginal: false,
    warning: "RTF is opened as editable text; exact formatting may not be preserved."
  },
  ".docx": {
    format: "docx",
    label: "Word document",
    editMode: "converted",
    canSaveOriginal: false,
    warning: "DOCX editing uses converted text; export to a new file to avoid losing layout."
  },
  ".pdf": {
    format: "pdf",
    label: "PDF",
    editMode: "readOnly",
    canSaveOriginal: false,
    warning: "PDF files are opened as extracted text/readable content; original layout is not editable."
  },
  ".epub": {
    format: "epub",
    label: "EPUB ebook",
    editMode: "converted",
    canSaveOriginal: false,
    warning: "EPUB editing works on extracted chapter text; export to preserve a new copy."
  }
};

export const supportedExtensions = Object.keys(profileByExtension);

export function getExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.[^.\\/]+$/);
  return match?.[0] ?? "";
}

export function detectDocumentType(fileName: string): DocumentFormat {
  return profileByExtension[getExtension(fileName)]?.format ?? "unknown";
}

export function getFormatProfile(fileName: string): FormatProfile {
  return (
    profileByExtension[getExtension(fileName)] ?? {
      format: "unknown",
      label: "Unknown text",
      editMode: "converted",
      canSaveOriginal: false,
      warning: "This file type is not recognized; open it only if it contains readable text."
    }
  );
}

export function isSupportedFile(fileName: string): boolean {
  return supportedExtensions.includes(getExtension(fileName));
}
