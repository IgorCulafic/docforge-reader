# DocForge Reader

DocForge Reader is a local-first desktop document reader and editor built with Electron, React, TypeScript, and Vite. It is designed as a practical workspace for opening, reading, editing, searching, organizing, and exporting common readable document formats without depending on an internet connection.

## Features

- Open individual files or entire folders.
- Drag and drop files into the app.
- Browse open and recent documents from the left sidebar.
- Keep a persistent recent-file history with clickable shortcuts.
- Mark missing or moved recent files in red with strikethrough styling.
- Remove history items with the `x` action on each row.
- Create new Markdown files from the app.
- Edit text-based formats directly.
- View extracted text from converted formats.
- Render PDF pages with graphics in read mode.
- Render DOCX content with preserved HTML structure and embedded images where possible.
- Search the active document and globally search opened folder files.
- View metadata such as format, size, modified date, word count, and character count.
- Save editable files back to disk.
- Export readable content as TXT, Markdown, HTML, RTF, DOCX-compatible text, EPUB-compatible text, and PDF-style output where supported by the current exporter.
- Use edit, read, split, and focus modes.
- Zoom document text with `Shift + mouse wheel`.
- Resize the left file sidebar and right inspector panel.
- Switch between light and dark themes.
- Autosave draft recovery for unsaved changes.

## Supported Formats

DocForge Reader can open:

- `.txt`
- `.md`
- `.markdown`
- `.rtf`
- `.docx`
- `.pdf`
- `.epub`
- `.html`
- `.htm`
- `.json`
- `.xml`
- `.csv`

## Editing Model

Native text formats such as TXT, Markdown, HTML, JSON, XML, and CSV can be saved back to their original file paths.

Converted formats such as DOCX, RTF, EPUB, and PDF are handled more carefully:

- DOCX opens as extracted text plus a formatted read preview.
- PDF opens as extracted text and rendered page images for reading.
- EPUB and RTF open through conversion paths.
- Formats that cannot safely preserve their original layout should be exported as a new file instead of overwritten.

This keeps the original document safe when exact layout preservation is not guaranteed.

## Text Formatting

The editor toolbar can apply text formatting to the current selection:

- Heading
- Larger text
- Bold
- Italic
- Underline
- Strikethrough
- Bullet list
- Numbered list
- Quote
- Inline code
- Serif font
- Monospace font

Formatting is stored as Markdown or simple HTML-style markup so files remain plain-text editable.

## Development

Install dependencies:

```powershell
npm install
```

Run the desktop app in development mode:

```powershell
npm start
```

Run tests:

```powershell
npm test
```

Build the app:

```powershell
npm run build
```

Create a local unpacked Windows build:

```powershell
npm run pack
```

The packaged executable is created at:

```text
release/win-unpacked/DocForgeReader.exe
```

## Project Structure

```text
electron/                  Electron main/preload process code
src/                       React renderer application
src/lib/                   File readers, exporters, search, stats, and UI helpers
docs/superpowers/plans/    Original implementation planning notes
dist/                      Generated renderer build output
dist-electron/             Generated Electron build output
release/                   Generated packaged desktop app
```

Generated folders such as `dist`, `dist-electron`, `release`, `release-*`, and `node_modules` are ignored by git.

## Notes

DocForge Reader is an early local desktop prototype. The current focus is reliable local reading, editing, search, conversion safety, and a desktop-style workflow. Future improvements could include richer DOCX round-trip editing, stronger EPUB export, better PDF text layer controls, and release installers.
