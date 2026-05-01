import { describe, expect, it } from "vitest";
import { readBrowserDocumentContent, readBrowserDocumentData } from "./browserDocumentReaders";

describe("browser document readers", () => {
  it("reads plain text with the browser file API", async () => {
    const file = new File(["Hello browser text"], "notes.txt", { type: "text/plain" });

    await expect(readBrowserDocumentContent(file, ".txt")).resolves.toBe("Hello browser text");
  });

  it("extracts PDF text instead of returning a placeholder", async () => {
    const file = new File([new Uint8Array([37, 80, 68, 70])], "paper.pdf", { type: "application/pdf" });

    const text = await readBrowserDocumentContent(file, ".pdf", {
      extractPdfText: async () => "Real browser PDF text"
    });

    expect(text).toBe("Real browser PDF text");
    expect(text).not.toContain("placeholder");
  });

  it("extracts PDF html for formatted reading", async () => {
    const file = new File([new Uint8Array([37, 80, 68, 70])], "paper.pdf", { type: "application/pdf" });

    const result = await readBrowserDocumentData(file, ".pdf", {
      extractPdfText: async () => "Real browser PDF text",
      extractPdfHtml: async () => "<div class=\"pdf-page\">Real browser PDF text</div>"
    });

    expect(result.content).toBe("Real browser PDF text");
    expect(result.contentHtml).toContain("pdf-page");
  });

  it("keeps browser PDF text openable when formatted html extraction fails", async () => {
    const file = new File([new Uint8Array([37, 80, 68, 70])], "paper.pdf", { type: "application/pdf" });

    const result = await readBrowserDocumentData(file, ".pdf", {
      extractPdfText: async () => "Real browser PDF text",
      extractPdfHtml: async () => {
        throw new Error("layout failed");
      }
    });

    expect(result.content).toBe("Real browser PDF text");
    expect(result.contentHtml).toBeUndefined();
  });

  it("extracts DOCX text instead of returning a placeholder", async () => {
    const file = new File([new Uint8Array([80, 75])], "paper.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    const text = await readBrowserDocumentContent(file, ".docx", {
      extractDocxText: async () => "Real browser DOCX text"
    });

    expect(text).toBe("Real browser DOCX text");
    expect(text).not.toContain("placeholder");
  });

  it("extracts DOCX html for formatted reading", async () => {
    const file = new File([new Uint8Array([80, 75])], "paper.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    const result = await readBrowserDocumentData(file, ".docx", {
      extractDocxText: async () => "Real browser DOCX text",
      extractDocxHtml: async () => "<h1>Real browser DOCX heading</h1>"
    });

    expect(result.content).toBe("Real browser DOCX text");
    expect(result.contentHtml).toContain("<h1>Real browser DOCX heading</h1>");
  });

  it("keeps browser DOCX text openable when formatted html extraction fails", async () => {
    const file = new File([new Uint8Array([80, 75])], "paper.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    const result = await readBrowserDocumentData(file, ".docx", {
      extractDocxText: async () => "Real browser DOCX text",
      extractDocxHtml: async () => {
        throw new Error("html failed");
      }
    });

    expect(result.content).toBe("Real browser DOCX text");
    expect(result.contentHtml).toBeUndefined();
  });
});
