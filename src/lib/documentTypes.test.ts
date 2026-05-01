import { describe, expect, it } from "vitest";
import { detectDocumentType, getFormatProfile, supportedExtensions } from "./documentTypes";

describe("document type detection", () => {
  it("detects a supported extension case-insensitively", () => {
    expect(detectDocumentType("Novel.DOCX")).toBe("docx");
  });

  it("marks text-like files as natively editable", () => {
    expect(getFormatProfile("notes.md").editMode).toBe("native");
    expect(getFormatProfile("data.json").editMode).toBe("native");
  });

  it("marks layout formats as converted or read-only", () => {
    expect(getFormatProfile("book.epub").editMode).toBe("converted");
    expect(getFormatProfile("scan.pdf").editMode).toBe("readOnly");
  });

  it("exposes supported extensions for folder filtering", () => {
    expect(supportedExtensions).toContain(".txt");
    expect(supportedExtensions).toContain(".epub");
  });
});
