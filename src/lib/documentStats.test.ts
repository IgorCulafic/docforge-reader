import { describe, expect, it } from "vitest";
import { calculateDocumentStats, formatBytes } from "./documentStats";

describe("document stats", () => {
  it("counts words and characters from plain text", () => {
    const stats = calculateDocumentStats("One fish, two fish.\n\nRed fish.");
    expect(stats.wordCount).toBe(6);
    expect(stats.characterCount).toBe(30);
    expect(stats.lineCount).toBe(3);
  });

  it("formats byte sizes for metadata display", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });
});
