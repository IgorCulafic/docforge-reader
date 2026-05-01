import { describe, expect, it } from "vitest";
import { getEditorShortcutCommand } from "./keyboardShortcuts";

describe("keyboard shortcuts", () => {
  it("maps standard editor shortcuts to formatting commands", () => {
    expect(getEditorShortcutCommand({ ctrlKey: true, key: "b" })).toBe("bold");
    expect(getEditorShortcutCommand({ metaKey: true, key: "i" })).toBe("italic");
    expect(getEditorShortcutCommand({ ctrlKey: true, key: "u" })).toBe("underline");
  });

  it("maps common list and block shortcuts", () => {
    expect(getEditorShortcutCommand({ ctrlKey: true, shiftKey: true, key: "7" })).toBe("numberedList");
    expect(getEditorShortcutCommand({ ctrlKey: true, shiftKey: true, key: "8" })).toBe("bulletList");
    expect(getEditorShortcutCommand({ ctrlKey: true, shiftKey: true, key: "9" })).toBe("quote");
    expect(getEditorShortcutCommand({ ctrlKey: true, altKey: true, key: "2" })).toBe("heading");
  });

  it("maps additional editing shortcuts without hijacking unrelated keys", () => {
    expect(getEditorShortcutCommand({ ctrlKey: true, shiftKey: true, key: "x" })).toBe("strike");
    expect(getEditorShortcutCommand({ ctrlKey: true, key: "`" })).toBe("code");
    expect(getEditorShortcutCommand({ ctrlKey: true, shiftKey: true, key: "." })).toBe("large");
    expect(getEditorShortcutCommand({ ctrlKey: true, key: "o" })).toBeNull();
    expect(getEditorShortcutCommand({ key: "b" })).toBeNull();
  });
});
