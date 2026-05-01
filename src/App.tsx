import {
  ALargeSmall,
  BookOpen,
  Bold,
  Code2,
  Download,
  FileDown,
  FileText,
  FolderOpen,
  Heading2,
  History,
  Italic,
  List,
  ListOrdered,
  Moon,
  PanelRight,
  Plus,
  Quote,
  Save,
  Search,
  Sidebar,
  SplitSquareHorizontal,
  Strikethrough,
  Sun,
  Type,
  Underline,
  Upload,
  X,
  Zap,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { CSSProperties, ChangeEvent, DragEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent, useEffect, useMemo, useRef, useState } from "react";
import { readBrowserDocumentData } from "./lib/browserDocumentReaders";
import { calculateDocumentStats, formatBytes } from "./lib/documentStats";
import { getFormatProfile, isSupportedFile, type FormatProfile } from "./lib/documentTypes";
import { createExportPayload, exportFormats, type ExportFormat } from "./lib/exporters";
import { base64ToBytes, renderPdfPagesAsImages } from "./lib/pdfPageRenderer";
import {
  markRecentMissing,
  normalizeRecentItems,
  rememberRecentFiles,
  removeRecentFile,
  syncRecentAvailability,
  type RecentFile
} from "./lib/recentFiles";
import { searchDocuments, searchText } from "./lib/search";
import { applyTextFormat, type TextFormatCommand } from "./lib/textFormatting";
import {
  clampSidebarWidth,
  clampZoom,
  defaultSidebarWidths,
  nextZoomFromWheel,
  resetSidebarWidths,
  type SidebarSide,
  type SidebarWidths
} from "./lib/viewPreferences";

type Theme = "light" | "dark";
type WorkspaceMode = "edit" | "read" | "split" | "focus";

interface AppDocument {
  id: string;
  path: string;
  name: string;
  extension: string;
  size: number;
  modifiedAt: string;
  content: string;
  contentHtml?: string;
  binaryBase64?: string;
  originalContent: string;
  profile: FormatProfile;
  dirty: boolean;
  source: "desktop" | "browser";
  warning?: string;
}

const sampleDocument = `# Welcome to DocForge Reader

Open a file, drop documents here, or open a folder to build a working set.

Supported editable formats include TXT, Markdown, HTML, JSON, XML, and CSV. PDF, DOCX, EPUB, and RTF open through safe conversion modes so the original file is not overwritten by accident.`;

const recentStorageKey = "docforge.recent";
const themeStorageKey = "docforge.theme";
const textZoomStorageKey = "docforge.textZoom";
const sidebarWidthsStorageKey = "docforge.sidebarWidths";
const draftPrefix = "docforge.draft.";

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<WorkspaceMode>("edit");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(themeStorageKey) as Theme) || "light");
  const [query, setQuery] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [selectedExport, setSelectedExport] = useState<ExportFormat>("txt");
  const [status, setStatus] = useState("Ready");
  const [isDragging, setIsDragging] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentFile[]>(loadRecentItems);
  const missingRemovalTimers = useRef(new Map<string, number>());
  const [promotedRecentPath, setPromotedRecentPath] = useState<string | null>(null);
  const [textZoom, setTextZoom] = useState(loadTextZoom);
  const [sidebarWidths, setSidebarWidths] = useState<SidebarWidths>(loadSidebarWidths);
  const resizeState = useRef<{ side: SidebarSide; startX: number; startWidth: number } | null>(null);

  const activeDocument = documents.find((document) => document.id === activeId) ?? null;
  const activeStats = useMemo(() => calculateDocumentStats(activeDocument?.content ?? ""), [activeDocument?.content]);
  const currentMatches = useMemo(() => searchText(activeDocument?.content ?? "", query), [activeDocument?.content, query]);
  const globalMatches = useMemo(
    () =>
      searchDocuments(
        documents.map((document) => ({
          id: document.id,
          name: document.name,
          path: document.path,
          content: document.content
        })),
        globalQuery
      ),
    [documents, globalQuery]
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(textZoomStorageKey, String(textZoom));
  }, [textZoom]);

  useEffect(() => {
    localStorage.setItem(sidebarWidthsStorageKey, JSON.stringify(sidebarWidths));
  }, [sidebarWidths]);

  useEffect(() => {
    return () => {
      missingRemovalTimers.current.forEach((timer) => window.clearTimeout(timer));
      missingRemovalTimers.current.clear();
      window.removeEventListener("pointermove", resizeSidebar);
      window.removeEventListener("pointerup", stopSidebarResize);
    };
  }, []);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    if (!window.docforge || recentItems.length === 0) {
      return;
    }

    let cancelled = false;
    window.docforge
      .checkPaths(recentItems.map((item) => item.path))
      .then((availability) => {
        if (cancelled) {
          return;
        }

        setRecentItems((current) => {
          const next = syncRecentAvailability(current, availability);
          if (JSON.stringify(next) === JSON.stringify(current)) {
            return current;
          }

          saveRecentItems(next);
          return next;
        });
      })
      .catch(() => {
        setStatus("Recent file check failed");
      });

    return () => {
      cancelled = true;
    };
  }, [recentItems.length]);

  useEffect(() => {
    if (!activeDocument?.dirty) {
      return;
    }

    const handle = window.setTimeout(() => {
      localStorage.setItem(`${draftPrefix}${activeDocument.path}`, activeDocument.content);
      setStatus(`Autosaved draft for ${activeDocument.name}`);
    }, 500);

    return () => window.clearTimeout(handle);
  }, [activeDocument?.content, activeDocument?.dirty, activeDocument?.name, activeDocument?.path]);

  useEffect(() => {
    if (!activeDocument || activeDocument.extension !== ".pdf" || activeDocument.contentHtml || !activeDocument.binaryBase64) {
      return;
    }

    let cancelled = false;
    setStatus(`Rendering graphics for ${activeDocument.name}`);

    renderPdfPagesAsImages(base64ToBytes(activeDocument.binaryBase64))
      .then((contentHtml) => {
        if (cancelled) {
          return;
        }

        setDocuments((current) =>
          current.map((document) => (document.id === activeDocument.id ? { ...document, contentHtml } : document))
        );
        setStatus(`Rendered graphics for ${activeDocument.name}`);
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus(`Graphics render failed: ${errorMessage(error)}`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeDocument]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveActiveDocument();
      }

      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        void openFiles();
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        document.getElementById("document-search")?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function openFiles() {
    try {
      if (window.docforge) {
        const opened = await window.docforge.openFiles();
        addDocuments(opened.map(fromNativeRecord));
        return;
      }

      fileInputRef.current?.click();
    } catch (error) {
      setStatus(`Open failed: ${errorMessage(error)}`);
    }
  }

  async function openFolder() {
    try {
      if (window.docforge) {
        const opened = await window.docforge.openFolder();
        addDocuments(opened.map(fromNativeRecord));
        return;
      }

      folderInputRef.current?.click();
    } catch (error) {
      setStatus(`Open failed: ${errorMessage(error)}`);
    }
  }

  async function createNewFile() {
    try {
      if (window.docforge) {
        const created = await window.docforge.createFile();
        if (created) {
          addDocuments([fromNativeRecord(created)]);
          setStatus(`Created ${created.name}`);
        }
        return;
      }

      const created = createBrowserDocument();
      addDocuments([created]);
      setStatus(`Created ${created.name}`);
    } catch (error) {
      setStatus(`Create failed: ${errorMessage(error)}`);
    }
  }

  async function onBrowserFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    try {
      const files = Array.from(event.target.files ?? []);
      const opened = await readBrowserFiles(files);
      addDocuments(opened);
      event.target.value = "";
    } catch (error) {
      setStatus(`Open failed: ${errorMessage(error)}`);
    }
  }

  async function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    try {
      const files = Array.from(event.dataTransfer.files);
      if (window.docforge) {
        const paths = files.map((file) => window.docforge?.getPathForFile(file) ?? "").filter(Boolean);
        if (paths.length > 0) {
          const opened = await window.docforge.readPaths(paths);
          addDocuments(opened.map(fromNativeRecord));
          return;
        }
      }

      const opened = await readBrowserFiles(files);
      addDocuments(opened);
    } catch (error) {
      setStatus(`Open failed: ${errorMessage(error)}`);
    }
  }

  function addDocuments(nextDocuments: AppDocument[]) {
    if (nextDocuments.length === 0) {
      setStatus("No supported files found");
      return;
    }

    setDocuments((current) => {
      const byPath = new Map(current.map((document) => [document.path, document]));
      nextDocuments.forEach((document) => byPath.set(document.path, document));
      return Array.from(byPath.values()).sort((left, right) => left.name.localeCompare(right.name));
    });
    setActiveId(nextDocuments[0].id);
    rememberRecent(nextDocuments);
    setStatus(`Opened ${nextDocuments.length} document${nextDocuments.length === 1 ? "" : "s"}`);
  }

  async function openRecent(item: RecentFile) {
    if (item.missing) {
      return;
    }

    if (!window.docforge) {
      setStatus("Recent shortcuts are available in the desktop app");
      return;
    }

    try {
      const opened = await window.docforge.readPaths([item.path]);

      if (opened.length === 0) {
        markMissingRecent(item.path, item.name);
        return;
      }

      addDocuments(opened.map(fromNativeRecord));
    } catch {
      markMissingRecent(item.path, item.name);
    }
  }

  function rememberRecent(nextDocuments: AppDocument[]) {
    setRecentItems((current) => {
      const next = rememberRecentFiles(current, nextDocuments);
      saveRecentItems(next);
      return next;
    });
    setPromotedRecentPath(nextDocuments[0]?.path ?? null);
    window.setTimeout(() => setPromotedRecentPath(null), 450);
  }

  function markMissingRecent(path: string, name: string) {
    const existingTimer = missingRemovalTimers.current.get(path);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    setRecentItems((current) => {
      const next = markRecentMissing(current, path);
      saveRecentItems(next);
      return next;
    });

    setStatus(`Shortcut missing or moved: ${name}`);
  }

  function removeRecent(path: string) {
    const existingTimer = missingRemovalTimers.current.get(path);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      missingRemovalTimers.current.delete(path);
    }

    setRecentItems((current) => {
      const next = removeRecentFile(current, path);
      saveRecentItems(next);
      return next;
    });
  }

  function formatActiveText(command: TextFormatCommand) {
    if (!activeDocument || activeDocument.profile.editMode === "readOnly") {
      return;
    }

    const editor = editorRef.current;
    const selection = {
      start: editor?.selectionStart ?? activeDocument.content.length,
      end: editor?.selectionEnd ?? activeDocument.content.length
    };
    const result = applyTextFormat(activeDocument.content, selection, command);
    updateActiveContent(result.text);

    window.requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  function updateActiveContent(content: string) {
    if (!activeDocument) {
      return;
    }

    setDocuments((current) =>
      current.map((document) =>
        document.id === activeDocument.id
          ? {
              ...document,
              content,
              dirty: content !== document.originalContent
            }
          : document
      )
    );
  }

  async function saveActiveDocument() {
    if (!activeDocument) {
      return;
    }

    if (!activeDocument.profile.canSaveOriginal || !window.docforge) {
      await exportActiveDocument();
      return;
    }

    const saved = await window.docforge.saveFile(activeDocument.path, activeDocument.content);
    localStorage.removeItem(`${draftPrefix}${activeDocument.path}`);
    setDocuments((current) =>
      current.map((document) => (document.id === activeDocument.id ? fromNativeRecord(saved) : document))
    );
    setActiveId(makeDocumentId(saved.path));
    setStatus(`Saved ${saved.name}`);
  }

  async function exportActiveDocument(format = selectedExport) {
    if (!activeDocument) {
      return;
    }

    const payload = createExportPayload(activeDocument.content, format);
    const suggestedName = `${stripExtension(activeDocument.name)}${payload.fileExtension}`;

    if (window.docforge) {
      const saved = await window.docforge.saveAs(suggestedName, payload.contents);
      if (saved) {
        addDocuments([fromNativeRecord(saved)]);
        setStatus(`Exported ${saved.name}`);
      }
      return;
    }

    downloadPayload(suggestedName, payload.contents, payload.mimeType);
    setStatus(`Downloaded ${suggestedName}`);
  }

  function closeDocument(id: string) {
    setDocuments((current) => current.filter((document) => document.id !== id));
    if (activeId === id) {
      const next = documents.find((document) => document.id !== id);
      setActiveId(next?.id ?? null);
    }
  }

  function onDocumentWheel(event: ReactWheelEvent<HTMLElement>) {
    if (!event.shiftKey) {
      return;
    }

    event.preventDefault();
    setTextZoom((current) => nextZoomFromWheel(current, event.deltaY));
  }

  function adjustTextZoom(delta: number) {
    setTextZoom((current) => clampZoom(Math.round((current + delta) * 10) / 10));
  }

  function startSidebarResize(side: SidebarSide, event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    resizeState.current = {
      side,
      startX: event.clientX,
      startWidth: sidebarWidths[side]
    };
    window.addEventListener("pointermove", resizeSidebar);
    window.addEventListener("pointerup", stopSidebarResize);
  }

  function resizeSidebar(event: PointerEvent) {
    const state = resizeState.current;
    if (!state) {
      return;
    }

    const delta = event.clientX - state.startX;
    const nextWidth = state.side === "left" ? state.startWidth + delta : state.startWidth - delta;
    setSidebarWidths((current) => ({
      ...current,
      [state.side]: clampSidebarWidth(state.side, nextWidth)
    }));
  }

  function stopSidebarResize() {
    resizeState.current = null;
    window.removeEventListener("pointermove", resizeSidebar);
    window.removeEventListener("pointerup", stopSidebarResize);
  }

  function resetSidebar(side: SidebarSide) {
    const defaults = resetSidebarWidths();
    setSidebarWidths((current) => ({
      ...current,
      [side]: defaults[side]
    }));
  }

  const previewHtml = useMemo(
    () => activeDocument?.contentHtml ?? renderPreview(activeDocument?.content ?? sampleDocument),
    [activeDocument?.content, activeDocument?.contentHtml]
  );
  const workspaceStyle = {
    "--left-sidebar-width": `${sidebarWidths.left}px`,
    "--right-sidebar-width": `${sidebarWidths.right}px`,
    "--editor-font-size": `${14 * textZoom}px`,
    "--preview-font-size": `${17 * textZoom}px`
  } as CSSProperties;

  return (
    <main
      className={`app-shell ${mode === "focus" ? "is-focus" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <input ref={fileInputRef} className="visually-hidden" type="file" multiple onChange={onBrowserFilesSelected} />
      <input ref={folderInputRef} className="visually-hidden" type="file" multiple onChange={onBrowserFilesSelected} />

      <header className="toolbar">
        <div className="brand">
          <div className="brand-mark">D</div>
          <div>
            <strong>DocForge Reader</strong>
            <span>{status}</span>
          </div>
        </div>

        <div className="toolbar-actions">
          <button type="button" className="tool-button" onClick={createNewFile} title="Create new file">
            <Plus size={17} />
            <span>New File</span>
          </button>
          <button type="button" className="tool-button" onClick={openFiles} title="Open files">
            <Upload size={17} />
            <span>Open File</span>
          </button>
          <button type="button" className="tool-button" onClick={openFolder} title="Open folder">
            <FolderOpen size={17} />
            <span>Open Folder</span>
          </button>
          <button type="button" className="icon-button" onClick={saveActiveDocument} title="Save">
            <Save size={18} />
          </button>
          <button type="button" className="icon-button" onClick={() => void exportActiveDocument()} title="Export">
            <FileDown size={18} />
          </button>
          <div className="zoom-controls" aria-label="Text zoom">
            <button type="button" className="icon-button" onClick={() => adjustTextZoom(-0.1)} title="Zoom text out">
              <ZoomOut size={17} />
            </button>
            <button type="button" className="zoom-indicator" onClick={() => setTextZoom(1)} title="Reset text zoom">
              {Math.round(textZoom * 100)}%
            </button>
            <button type="button" className="icon-button" onClick={() => adjustTextZoom(0.1)} title="Zoom text in">
              <ZoomIn size={17} />
            </button>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            title="Toggle theme"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <section className="workspace" style={workspaceStyle}>
        <aside className="sidebar">
          <div className="panel-heading">
            <Sidebar size={17} />
            <span>Files</span>
          </div>

          <label className="search-box">
            <Search size={15} />
            <input
              value={globalQuery}
              onChange={(event) => setGlobalQuery(event.target.value)}
              placeholder="Search folder"
            />
          </label>

          <div className="file-list">
            {documents.map((document) => (
              <button
                type="button"
                key={document.id}
                className={`file-row ${document.id === activeId ? "is-active" : ""}`}
                onClick={() => setActiveId(document.id)}
              >
                <FileText size={16} />
                <span>{document.name}</span>
                {document.dirty && <em />}
              </button>
            ))}
          </div>

          {globalQuery && (
            <div className="search-results">
              <small>{globalMatches.length} global matches</small>
              {globalMatches.slice(0, 10).map((match) => (
                <button type="button" key={`${match.documentId}-${match.line}-${match.column}`} onClick={() => setActiveId(match.documentId)}>
                  <strong>{match.name}</strong>
                  <span>
                    {match.line}:{match.column} {match.preview}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="recent-list">
            <div className="recent-heading">
              <History size={15} />
              <small>Recent shortcuts</small>
            </div>
            {recentItems.length === 0 && <span>No recent files yet</span>}
            {recentItems.slice(0, 12).map((item) => (
              <div
                key={item.path}
                className={`recent-row ${item.missing ? "is-missing" : ""} ${
                  item.path === promotedRecentPath ? "is-promoted" : ""
                }`}
                title={item.path}
              >
                <button type="button" className="recent-open" onClick={() => void openRecent(item)}>
                  <FileText size={15} />
                  <span>{item.name}</span>
                </button>
                <button type="button" className="recent-remove" onClick={() => removeRecent(item.path)} title="Remove from history">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <div
          className="resize-handle resize-handle-left"
          role="separator"
          aria-label="Resize file sidebar"
          aria-orientation="vertical"
          onPointerDown={(event) => startSidebarResize("left", event)}
          onDoubleClick={() => resetSidebar("left")}
        />

        <section className="main-pane">
          <div className="tabs">
            {documents.map((document) => (
              <button
                type="button"
                key={document.id}
                className={`tab ${document.id === activeId ? "is-active" : ""}`}
                onClick={() => setActiveId(document.id)}
              >
                <span>{document.name}</span>
                {document.dirty && <i />}
                <X size={14} onClick={(event) => {
                  event.stopPropagation();
                  closeDocument(document.id);
                }} />
              </button>
            ))}
          </div>

          <div className="mode-strip">
            <button type="button" className={mode === "edit" ? "is-active" : ""} onClick={() => setMode("edit")}>
              <FileText size={16} />
              <span>Edit</span>
            </button>
            <button type="button" className={mode === "read" ? "is-active" : ""} onClick={() => setMode("read")}>
              <BookOpen size={16} />
              <span>Read</span>
            </button>
            <button type="button" className={mode === "split" ? "is-active" : ""} onClick={() => setMode("split")}>
              <SplitSquareHorizontal size={16} />
              <span>Split</span>
            </button>
            <button type="button" className={mode === "focus" ? "is-active" : ""} onClick={() => setMode("focus")}>
              <Zap size={16} />
              <span>Focus</span>
            </button>
            <div className="format-controls" aria-label="Text formatting">
              <button type="button" onClick={() => formatActiveText("heading")} title="Heading" disabled={!activeDocument || activeDocument.profile.editMode === "readOnly"}>
                <Heading2 size={16} />
              </button>
              <button type="button" onClick={() => formatActiveText("large")} title="Larger text" disabled={!activeDocument || activeDocument.profile.editMode === "readOnly"}>
                <ALargeSmall size={16} />
              </button>
              <button type="button" onClick={() => formatActiveText("bold")} title="Bold" disabled={!activeDocument || activeDocument.profile.editMode === "readOnly"}>
                <Bold size={16} />
              </button>
              <button type="button" onClick={() => formatActiveText("italic")} title="Italic" disabled={!activeDocument || activeDocument.profile.editMode === "readOnly"}>
                <Italic size={16} />
              </button>
              <button type="button" onClick={() => formatActiveText("underline")} title="Underline" disabled={!activeDocument || activeDocument.profile.editMode === "readOnly"}>
                <Underline size={16} />
              </button>
              <button type="button" onClick={() => formatActiveText("strike")} title="Strikethrough" disabled={!activeDocument || activeDocument.profile.editMode === "readOnly"}>
                <Strikethrough size={16} />
              </button>
              <button type="button" onClick={() => formatActiveText("bulletList")} title="Bullet list" disabled={!activeDocument || activeDocument.profile.editMode === "readOnly"}>
                <List size={16} />
              </button>
              <button type="button" onClick={() => formatActiveText("numberedList")} title="Numbered list" disabled={!activeDocument || activeDocument.profile.editMode === "readOnly"}>
                <ListOrdered size={16} />
              </button>
              <button type="button" onClick={() => formatActiveText("quote")} title="Quote" disabled={!activeDocument || activeDocument.profile.editMode === "readOnly"}>
                <Quote size={16} />
              </button>
              <button type="button" onClick={() => formatActiveText("code")} title="Inline code" disabled={!activeDocument || activeDocument.profile.editMode === "readOnly"}>
                <Code2 size={16} />
              </button>
              <button type="button" onClick={() => formatActiveText("fontSerif")} title="Serif font" disabled={!activeDocument || activeDocument.profile.editMode === "readOnly"}>
                <Type size={16} />
              </button>
              <button type="button" onClick={() => formatActiveText("fontMono")} title="Monospace font" disabled={!activeDocument || activeDocument.profile.editMode === "readOnly"}>
                <Code2 size={16} />
              </button>
            </div>
          </div>

          {!activeDocument ? (
            <div className={`empty-state ${isDragging ? "is-dragging" : ""}`}>
              <Download size={38} />
              <h1>Drop documents here</h1>
              <p>Open files or folders to start editing, searching, saving, and exporting readable documents.</p>
              <div>
                <button type="button" className="primary-action" onClick={openFiles}>
                  Open File
                </button>
                <button type="button" className="secondary-action" onClick={openFolder}>
                  Open Folder
                </button>
              </div>
            </div>
          ) : (
            <div className={`editor-grid ${mode}`} onWheel={onDocumentWheel}>
              {(mode === "edit" || mode === "split" || mode === "focus") && (
                <textarea
                  ref={editorRef}
                  className="editor"
                  value={activeDocument.content}
                  onChange={(event) => updateActiveContent(event.target.value)}
                  spellCheck="true"
                  readOnly={activeDocument.profile.editMode === "readOnly"}
                />
              )}
              {(mode === "read" || mode === "split") && (
                <article className="preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              )}
            </div>
          )}
        </section>

        <div
          className="resize-handle resize-handle-right"
          role="separator"
          aria-label="Resize inspector"
          aria-orientation="vertical"
          onPointerDown={(event) => startSidebarResize("right", event)}
          onDoubleClick={() => resetSidebar("right")}
        />

        <aside className="inspector">
          <div className="panel-heading">
            <PanelRight size={17} />
            <span>Inspector</span>
          </div>

          {activeDocument ? (
            <>
              <section>
                <h2>{activeDocument.name}</h2>
                <dl>
                  <div>
                    <dt>Format</dt>
                    <dd>{activeDocument.profile.label}</dd>
                  </div>
                  <div>
                    <dt>Mode</dt>
                    <dd>{activeDocument.profile.editMode}</dd>
                  </div>
                  <div>
                    <dt>Size</dt>
                    <dd>{formatBytes(activeDocument.size)}</dd>
                  </div>
                  <div>
                    <dt>Modified</dt>
                    <dd>{formatDate(activeDocument.modifiedAt)}</dd>
                  </div>
                  <div>
                    <dt>Words</dt>
                    <dd>{activeStats.wordCount}</dd>
                  </div>
                  <div>
                    <dt>Characters</dt>
                    <dd>{activeStats.characterCount}</dd>
                  </div>
                </dl>
              </section>

              {(activeDocument.profile.warning || activeDocument.warning) && (
                <div className="warning">
                  {activeDocument.warning ?? activeDocument.profile.warning}
                </div>
              )}

              <section>
                <label className="search-box">
                  <Search size={15} />
                  <input
                    id="document-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search document"
                  />
                </label>
                <div className="match-list">
                  {query && <small>{currentMatches.length} matches</small>}
                  {currentMatches.slice(0, 8).map((match) => (
                    <button type="button" key={`${match.line}-${match.column}`}>
                      {match.line}:{match.column} {match.preview}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="export-row">
                  <select value={selectedExport} onChange={(event) => setSelectedExport(event.target.value as ExportFormat)}>
                    {exportFormats.map((format) => (
                      <option key={format.id} value={format.id}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="primary-action compact" onClick={() => void exportActiveDocument()}>
                    Export
                  </button>
                </div>
                <button type="button" className="secondary-action wide" onClick={saveActiveDocument}>
                  {activeDocument.profile.canSaveOriginal && window.docforge ? "Save original" : "Save as new file"}
                </button>
              </section>
            </>
          ) : (
            <p className="muted">Open a supported file to inspect metadata, search, and export.</p>
          )}
        </aside>
      </section>
    </main>
  );
}

async function readBrowserFiles(files: File[]): Promise<AppDocument[]> {
  const supported = files.filter((file) => isSupportedFile(file.name));
  return Promise.all(
    supported.map(async (file) => {
      const path = browserPathFor(file);
      const extension = file.name.match(/\.[^.]+$/)?.[0]?.toLowerCase() ?? "";
      const profile = getFormatProfile(file.name);
      const draft = localStorage.getItem(`${draftPrefix}${path}`);
      const data = await readBrowserDocumentData(file, extension);
      const usableDraft = draft && !isOldPlaceholderDraft(draft) ? draft : null;

      return {
        id: makeDocumentId(path),
        path,
        name: file.name,
        extension,
        size: file.size,
        modifiedAt: new Date(file.lastModified).toISOString(),
        content: usableDraft ?? data.content,
        contentHtml: extension === ".pdf" ? undefined : data.contentHtml,
        binaryBase64: extension === ".pdf" ? await fileToBase64(file) : undefined,
        originalContent: data.content,
        profile,
        dirty: Boolean(usableDraft && usableDraft !== data.content),
        source: "browser",
        warning: usableDraft ? "Recovered an autosaved draft for this file." : undefined
      };
    })
  );
}

function createBrowserDocument(): AppDocument {
  const now = new Date().toISOString();
  const path = `Untitled-${Date.now()}.md`;
  return {
    id: makeDocumentId(path),
    path,
    name: path,
    extension: ".md",
    size: 0,
    modifiedAt: now,
    content: "",
    originalContent: "",
    profile: getFormatProfile(path),
    dirty: true,
    source: "browser"
  };
}

function fromNativeRecord(record: NativeFileRecord): AppDocument {
  const profile = getFormatProfile(record.name);
  const draft = localStorage.getItem(`${draftPrefix}${record.path}`);
  const usableDraft = draft && !isOldPlaceholderDraft(draft) ? draft : null;

  return {
    id: makeDocumentId(record.path),
    path: record.path,
    name: record.name,
    extension: record.extension,
    size: record.size,
    modifiedAt: record.modifiedAt,
    content: usableDraft ?? record.content,
    contentHtml: record.contentHtml,
    binaryBase64: record.binaryBase64,
    originalContent: record.content,
    profile,
    dirty: Boolean(usableDraft && usableDraft !== record.content),
    source: "desktop",
    warning: usableDraft ? "Recovered an autosaved draft for this file." : undefined
  };
}

function browserPathFor(file: File): string {
  const relativePath = "webkitRelativePath" in file ? String(file.webkitRelativePath) : "";
  return relativePath || file.name;
}

function isOldPlaceholderDraft(content: string): boolean {
  return content.includes("conversion placeholder") && content.includes("first production adapter should extract readable text");
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await fileToArrayBuffer(file);
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  if ("arrayBuffer" in file && typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function makeDocumentId(path: string): string {
  return btoa(unescape(encodeURIComponent(path))).replace(/=+$/g, "");
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function downloadPayload(name: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function loadRecentItems(): RecentFile[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(recentStorageKey) ?? "[]");
    return normalizeRecentItems(parsed);
  } catch {
    return [];
  }
}

function saveRecentItems(items: RecentFile[]) {
  localStorage.setItem(recentStorageKey, JSON.stringify(items));
}

function loadTextZoom(): number {
  const parsed = Number(localStorage.getItem(textZoomStorageKey));
  return Number.isFinite(parsed) && parsed > 0 ? clampZoom(parsed) : 1;
}

function loadSidebarWidths(): SidebarWidths {
  try {
    const parsed = JSON.parse(localStorage.getItem(sidebarWidthsStorageKey) ?? "{}") as Partial<SidebarWidths>;
    return {
      left: clampSidebarWidth("left", typeof parsed.left === "number" ? parsed.left : defaultSidebarWidths.left),
      right: clampSidebarWidth("right", typeof parsed.right === "number" ? parsed.right : defaultSidebarWidths.right)
    };
  } catch {
    return resetSidebarWidths();
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function renderPreview(content: string): string {
  const escaped = escapeHtml(content);
  return escaped
    .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
    .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
    .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, "<u>$1</u>")
    .replace(/&lt;span style=&quot;font-size: 1\.25em&quot;&gt;(.+?)&lt;\/span&gt;/g, '<span style="font-size: 1.25em">$1</span>')
    .replace(
      /&lt;span style=&quot;font-family: Georgia, serif&quot;&gt;(.+?)&lt;\/span&gt;/g,
      '<span style="font-family: Georgia, serif">$1</span>'
    )
    .replace(
      /&lt;span style=&quot;font-family: Consolas, monospace&quot;&gt;(.+?)&lt;\/span&gt;/g,
      '<span style="font-family: Consolas, monospace">$1</span>'
    )
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br />");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default App;
