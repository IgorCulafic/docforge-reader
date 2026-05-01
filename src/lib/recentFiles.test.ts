import { describe, expect, it } from "vitest";
import {
  markRecentMissing,
  normalizeRecentItems,
  rememberRecentFiles,
  removeRecentFile,
  syncRecentAvailability
} from "./recentFiles";

describe("recent file helpers", () => {
  it("migrates old string-only recent paths", () => {
    expect(normalizeRecentItems(["C:\\Docs\\Plan.md", "/tmp/report.pdf"])).toEqual([
      {
        path: "C:\\Docs\\Plan.md",
        name: "Plan.md",
        lastOpenedAt: ""
      },
      {
        path: "/tmp/report.pdf",
        name: "report.pdf",
        lastOpenedAt: ""
      }
    ]);
  });

  it("deduplicates and ignores invalid recent entries", () => {
    expect(
      normalizeRecentItems([
        { path: "C:\\Docs\\Plan.md", name: "Plan.md", lastOpenedAt: "2026-04-30T10:00:00.000Z" },
        { path: "C:\\Docs\\Plan.md", name: "Duplicate.md", lastOpenedAt: "2026-04-30T11:00:00.000Z" },
        { name: "Missing path" },
        42
      ])
    ).toEqual([
      {
        path: "C:\\Docs\\Plan.md",
        name: "Plan.md",
        lastOpenedAt: "2026-04-30T10:00:00.000Z",
        missing: false
      }
    ]);
  });

  it("moves newly opened files to the front and caps the list", () => {
    const current = normalizeRecentItems([
      { path: "C:\\Docs\\A.txt", name: "A.txt", lastOpenedAt: "old-a" },
      { path: "C:\\Docs\\B.txt", name: "B.txt", lastOpenedAt: "old-b" },
      { path: "C:\\Docs\\C.txt", name: "C.txt", lastOpenedAt: "old-c" }
    ]);

    expect(
      rememberRecentFiles(
        current,
        [
          { path: "C:\\Docs\\B.txt", name: "B renamed.txt" },
          { path: "C:\\Docs\\D.txt", name: "D.txt" }
        ],
        "now",
        3
      )
    ).toEqual([
      { path: "C:\\Docs\\D.txt", name: "D.txt", lastOpenedAt: "now" },
      { path: "C:\\Docs\\B.txt", name: "B renamed.txt", lastOpenedAt: "now" },
      { path: "C:\\Docs\\C.txt", name: "C.txt", lastOpenedAt: "old-c", missing: false }
    ]);
  });

  it("marks a moved or deleted shortcut as missing before removing it", () => {
    const current = normalizeRecentItems(["C:\\Docs\\A.txt", "C:\\Docs\\B.txt"]);

    expect(markRecentMissing(current, "C:\\Docs\\B.txt")).toEqual([
      { path: "C:\\Docs\\A.txt", name: "A.txt", lastOpenedAt: "" },
      { path: "C:\\Docs\\B.txt", name: "B.txt", lastOpenedAt: "", missing: true }
    ]);

    expect(removeRecentFile(current, "C:\\Docs\\B.txt")).toEqual([
      { path: "C:\\Docs\\A.txt", name: "A.txt", lastOpenedAt: "" }
    ]);
  });

  it("syncs missing state from current file availability", () => {
    const current = normalizeRecentItems([
      { path: "C:\\Docs\\A.txt", name: "A.txt", lastOpenedAt: "old-a", missing: true },
      { path: "C:\\Docs\\B.txt", name: "B.txt", lastOpenedAt: "old-b" }
    ]);

    expect(
      syncRecentAvailability(current, [
        { path: "C:\\Docs\\A.txt", exists: true },
        { path: "C:\\Docs\\B.txt", exists: false }
      ])
    ).toEqual([
      { path: "C:\\Docs\\A.txt", name: "A.txt", lastOpenedAt: "old-a", missing: false },
      { path: "C:\\Docs\\B.txt", name: "B.txt", lastOpenedAt: "old-b", missing: true }
    ]);
  });
});
