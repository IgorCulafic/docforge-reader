import { describe, expect, it } from "vitest";
import { searchDocuments, searchText } from "./search";

describe("document search", () => {
  it("returns line-aware matches for a document", () => {
    expect(searchText("alpha\nbeta alpha", "alpha")).toEqual([
      { line: 1, column: 1, preview: "alpha" },
      { line: 2, column: 6, preview: "beta alpha" }
    ]);
  });

  it("searches across a loaded folder collection", () => {
    const results = searchDocuments(
      [
        { id: "1", name: "a.md", path: "a.md", content: "hello alpha" },
        { id: "2", name: "b.txt", path: "b.txt", content: "nothing" }
      ],
      "alpha"
    );

    expect(results).toEqual([
      { documentId: "1", name: "a.md", path: "a.md", line: 1, column: 7, preview: "hello alpha" }
    ]);
  });
});
