import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readDocumentContent, readDocumentData } from "./documentReaders";

let tempDir: string | undefined;

async function writeTempFile(name: string, content: string | Buffer) {
  tempDir = await mkdtemp(path.join(tmpdir(), "docforge-reader-"));
  const filePath = path.join(tempDir, name);
  await writeFile(filePath, content);
  return filePath;
}

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("document readers", () => {
  it("reads plain text files as utf-8 text", async () => {
    const filePath = await writeTempFile("notes.txt", "Hello from a text file.");

    await expect(readDocumentContent(filePath, ".txt", "notes.txt")).resolves.toBe("Hello from a text file.");
  });

  it("returns extracted PDF text instead of a placeholder", async () => {
    const filePath = await writeTempFile("paper.pdf", Buffer.from("%PDF-1.7"));

    const content = await readDocumentContent(filePath, ".pdf", "paper.pdf", {
      extractPdfText: async () => "Real PDF words from the document."
    });

    expect(content).toBe("Real PDF words from the document.");
    expect(content).not.toContain("placeholder");
  });

  it("returns formatted PDF html for read mode", async () => {
    const filePath = await writeTempFile("paper.pdf", Buffer.from("%PDF-1.7"));

    const result = await readDocumentData(filePath, ".pdf", "paper.pdf", {
      extractPdfText: async () => "Real PDF words from the document.",
      extractPdfHtml: async () => "<div class=\"pdf-page\">Real PDF words from the document.</div>"
    });

    expect(result.content).toBe("Real PDF words from the document.");
    expect(result.contentHtml).toContain("pdf-page");
  });

  it("keeps PDF text openable when formatted html extraction fails", async () => {
    const filePath = await writeTempFile("paper.pdf", Buffer.from("%PDF-1.7"));

    const result = await readDocumentData(filePath, ".pdf", "paper.pdf", {
      extractPdfText: async () => "Real PDF words from the document.",
      extractPdfHtml: async () => {
        throw new Error("layout failed");
      }
    });

    expect(result.content).toBe("Real PDF words from the document.");
    expect(result.contentHtml).toBeUndefined();
  });

  it("returns extracted DOCX text instead of a placeholder", async () => {
    const filePath = await writeTempFile("paper.docx", Buffer.from("fake zip"));

    const content = await readDocumentContent(filePath, ".docx", "paper.docx", {
      extractDocxText: async () => "Real DOCX words from the document."
    });

    expect(content).toBe("Real DOCX words from the document.");
    expect(content).not.toContain("placeholder");
  });

  it("returns formatted DOCX html for read mode", async () => {
    const filePath = await writeTempFile("paper.docx", Buffer.from("fake zip"));

    const result = await readDocumentData(filePath, ".docx", "paper.docx", {
      extractDocxText: async () => "Real DOCX words from the document.",
      extractDocxHtml: async () => "<h1>Real DOCX heading</h1><p>Body</p>"
    });

    expect(result.content).toBe("Real DOCX words from the document.");
    expect(result.contentHtml).toContain("<h1>Real DOCX heading</h1>");
  });

  it("keeps DOCX text openable when formatted html extraction fails", async () => {
    const filePath = await writeTempFile("paper.docx", Buffer.from("fake zip"));

    const result = await readDocumentData(filePath, ".docx", "paper.docx", {
      extractDocxText: async () => "Real DOCX words from the document.",
      extractDocxHtml: async () => {
        throw new Error("html failed");
      }
    });

    expect(result.content).toBe("Real DOCX words from the document.");
    expect(result.contentHtml).toBeUndefined();
  });

  it("shows a useful scanned-PDF message only when no text is extractable", async () => {
    const filePath = await writeTempFile("scan.pdf", Buffer.from("%PDF-1.7"));

    const content = await readDocumentContent(filePath, ".pdf", "scan.pdf", {
      extractPdfText: async () => ""
    });

    expect(content).toContain("No selectable text was found");
    expect(content).toContain("OCR");
  });
});
