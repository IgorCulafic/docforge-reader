# Document Reader Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop-style document reader/editor MVP that opens files/folders, edits text-like formats, previews common formats, searches, saves, exports, and presents conversion limitations clearly.

**Architecture:** Electron owns native filesystem access and recent-file operations through a preload IPC bridge. React owns the three-panel interface, tabs, editor/preview modes, metadata, search, themes, and export controls. Shared TypeScript helpers handle file type detection, document metadata, search, and text/HTML/Markdown export.

**Tech Stack:** Electron, React, TypeScript, Vite, Vitest, CSS modules/plain CSS, lightweight renderer-side document adapters.

---

### Task 1: Scaffold And Test Harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `src/main.tsx`
- Create: `src/vite-env.d.ts`

- [x] Create the app scaffold with Vite, Electron entrypoints, and Vitest configuration.
- [x] Keep Electron IPC limited to explicit file/folder operations and browser-safe renderer fallbacks.

### Task 2: Document Core

**Files:**
- Create: `src/lib/documentTypes.ts`
- Create: `src/lib/documentTypes.test.ts`
- Create: `src/lib/documentStats.ts`
- Create: `src/lib/documentStats.test.ts`
- Create: `src/lib/search.ts`
- Create: `src/lib/search.test.ts`
- Create: `src/lib/exporters.ts`
- Create: `src/lib/exporters.test.ts`

- [x] Write tests for supported format detection, editability modes, metadata stats, search results, and export conversion.
- [x] Implement minimal pure helpers to satisfy those tests.

### Task 3: Desktop Workspace UI

**Files:**
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [x] Implement the three-panel layout: file sidebar, main tabs/editor/reader, right inspector/export panel.
- [x] Include a usable first screen with drop zone, recent items, and open file/folder commands.
- [x] Include light, dark, and focus reading/writing modes.

### Task 4: File Workflows

**Files:**
- Modify: `src/App.tsx`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`

- [x] Support open file, open folder, drag-and-drop file import, tabs, dirty state, save, save as/export.
- [x] Show preservation warnings for converted or read-only source formats.

### Task 5: Search, Autosave, Metadata, Export

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [x] Add current document search, global file search over loaded files, metadata panel, autosave drafts in local storage, export format picker, and command shortcuts.

### Task 6: Verification

**Files:**
- Modify only if verification reveals issues.

- [ ] Run `npm install`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run dev` and provide the local URL.
