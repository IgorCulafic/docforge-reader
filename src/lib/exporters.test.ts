import { describe, expect, it } from "vitest";
import { createExportPayload, exportFormats } from "./exporters";

describe("exporters", () => {
  it("exports markdown as plain text without markdown markers", () => {
    const result = createExportPayload("# Title\n\n**bold** text", "txt");
    expect(result.mimeType).toBe("text/plain;charset=utf-8");
    expect(result.contents).toContain("Title");
    expect(result.contents).toContain("bold text");
  });

  it("wraps content in a complete html document", () => {
    const result = createExportPayload("Hello\nworld", "html");
    expect(result.fileExtension).toBe(".html");
    expect(result.contents).toContain("<!doctype html>");
    expect(result.contents).toContain("Hello<br />");
  });

  it("lists first-class MVP export formats", () => {
    expect(exportFormats.map((format) => format.id)).toEqual(["txt", "md", "html", "rtf"]);
  });
});
