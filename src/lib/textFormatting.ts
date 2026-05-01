export type TextFormatCommand =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "heading"
  | "large"
  | "fontSerif"
  | "fontMono"
  | "bulletList"
  | "numberedList"
  | "quote"
  | "code";

export interface TextSelectionRange {
  start: number;
  end: number;
}

export interface TextFormatResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

const inlineFormats: Partial<Record<TextFormatCommand, { before: string; after: string; placeholder: string }>> = {
  bold: { before: "**", after: "**", placeholder: "bold text" },
  italic: { before: "*", after: "*", placeholder: "italic text" },
  underline: { before: "<u>", after: "</u>", placeholder: "underlined text" },
  strike: { before: "~~", after: "~~", placeholder: "struck text" },
  code: { before: "`", after: "`", placeholder: "code" },
  large: { before: '<span style="font-size: 1.25em">', after: "</span>", placeholder: "larger text" },
  fontSerif: { before: '<span style="font-family: Georgia, serif">', after: "</span>", placeholder: "serif text" },
  fontMono: { before: '<span style="font-family: Consolas, monospace">', after: "</span>", placeholder: "monospace text" }
};

export function applyTextFormat(
  text: string,
  selection: TextSelectionRange,
  command: TextFormatCommand
): TextFormatResult {
  if (command === "heading") {
    return applyLinePrefix(text, selection, "## ");
  }

  if (command === "bulletList") {
    return applyLinePrefix(text, selection, "- ");
  }

  if (command === "numberedList") {
    return applyNumberedList(text, selection);
  }

  if (command === "quote") {
    return applyLinePrefix(text, selection, "> ");
  }

  const format = inlineFormats[command];
  if (!format) {
    return { text, selectionStart: selection.start, selectionEnd: selection.end };
  }

  const selected = text.slice(selection.start, selection.end) || format.placeholder;
  const nextText = `${text.slice(0, selection.start)}${format.before}${selected}${format.after}${text.slice(selection.end)}`;
  return {
    text: nextText,
    selectionStart: selection.start + format.before.length,
    selectionEnd: selection.start + format.before.length + selected.length
  };
}

function applyLinePrefix(text: string, selection: TextSelectionRange, prefix: string): TextFormatResult {
  const selected = text.slice(selection.start, selection.end) || "text";
  const formatted = selected
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");

  return {
    text: `${text.slice(0, selection.start)}${formatted}${text.slice(selection.end)}`,
    selectionStart: selection.start + prefix.length,
    selectionEnd: selection.start + formatted.length
  };
}

function applyNumberedList(text: string, selection: TextSelectionRange): TextFormatResult {
  const selected = text.slice(selection.start, selection.end) || "text";
  const formatted = selected
    .split("\n")
    .map((line, index) => `${index + 1}. ${line}`)
    .join("\n");

  return {
    text: `${text.slice(0, selection.start)}${formatted}${text.slice(selection.end)}`,
    selectionStart: selection.start + 3,
    selectionEnd: selection.start + formatted.length
  };
}
