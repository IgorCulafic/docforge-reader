import { describe, expect, it } from "vitest";
import { applyTextFormat } from "./textFormatting";

describe("text formatting", () => {
  it("wraps a selected range with markdown markers", () => {
    expect(applyTextFormat("make this bold", { start: 5, end: 9 }, "bold")).toEqual({
      text: "make **this** bold",
      selectionStart: 7,
      selectionEnd: 11
    });
  });

  it("uses a helpful placeholder when no text is selected", () => {
    expect(applyTextFormat("Start ", { start: 6, end: 6 }, "italic")).toEqual({
      text: "Start *italic text*",
      selectionStart: 7,
      selectionEnd: 18
    });
  });

  it("applies line-based heading and list formats", () => {
    expect(applyTextFormat("Title", { start: 0, end: 5 }, "heading")).toEqual({
      text: "## Title",
      selectionStart: 3,
      selectionEnd: 8
    });

    expect(applyTextFormat("one\ntwo", { start: 0, end: 7 }, "bulletList")).toEqual({
      text: "- one\n- two",
      selectionStart: 2,
      selectionEnd: 11
    });
  });

  it("supports underline, strikethrough, code, and quote", () => {
    expect(applyTextFormat("word", { start: 0, end: 4 }, "underline").text).toBe("<u>word</u>");
    expect(applyTextFormat("word", { start: 0, end: 4 }, "strike").text).toBe("~~word~~");
    expect(applyTextFormat("word", { start: 0, end: 4 }, "code").text).toBe("`word`");
    expect(applyTextFormat("word", { start: 0, end: 4 }, "quote").text).toBe("> word");
  });

  it("supports larger text and font-family spans", () => {
    expect(applyTextFormat("word", { start: 0, end: 4 }, "large").text).toBe(
      '<span style="font-size: 1.25em">word</span>'
    );
    expect(applyTextFormat("word", { start: 0, end: 4 }, "fontSerif").text).toBe(
      '<span style="font-family: Georgia, serif">word</span>'
    );
    expect(applyTextFormat("word", { start: 0, end: 4 }, "fontMono").text).toBe(
      '<span style="font-family: Consolas, monospace">word</span>'
    );
  });
});
