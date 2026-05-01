import type { TextFormatCommand } from "./textFormatting";

export interface KeyboardShortcutLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export function getEditorShortcutCommand(event: KeyboardShortcutLike): TextFormatCommand | null {
  const primary = Boolean(event.ctrlKey || event.metaKey);
  if (!primary) {
    return null;
  }

  const key = event.key.toLowerCase();

  if (!event.shiftKey && !event.altKey && key === "b") {
    return "bold";
  }

  if (!event.shiftKey && !event.altKey && key === "i") {
    return "italic";
  }

  if (!event.shiftKey && !event.altKey && key === "u") {
    return "underline";
  }

  if (event.shiftKey && !event.altKey && key === "x") {
    return "strike";
  }

  if (!event.shiftKey && !event.altKey && key === "`") {
    return "code";
  }

  if (event.shiftKey && !event.altKey && key === "7") {
    return "numberedList";
  }

  if (event.shiftKey && !event.altKey && key === "8") {
    return "bulletList";
  }

  if (event.shiftKey && !event.altKey && key === "9") {
    return "quote";
  }

  if (!event.shiftKey && event.altKey && key === "2") {
    return "heading";
  }

  if (event.shiftKey && !event.altKey && key === ".") {
    return "large";
  }

  return null;
}
