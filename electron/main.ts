import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readDocumentData } from "./documentReaders.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDataPath = path.join(app.getPath("appData"), "DocForge Reader");
app.setPath("userData", userDataPath);
app.setPath("sessionData", path.join(userDataPath, "Session"));

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

const supportedExtensions = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".rtf",
  ".docx",
  ".pdf",
  ".epub",
  ".html",
  ".htm",
  ".json",
  ".xml",
  ".csv"
]);

interface NativeFileRecord {
  path: string;
  name: string;
  extension: string;
  size: number;
  modifiedAt: string;
  content: string;
  contentHtml?: string;
  binaryBase64?: string;
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1040,
    minHeight: 680,
    title: "DocForge Reader",
    backgroundColor: "#f5f4ef",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await window.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(async () => {
  registerIpc();
  if (hasSingleInstanceLock) {
    await createWindow();
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("second-instance", () => {
  const existingWindow = BrowserWindow.getAllWindows()[0];
  if (!existingWindow) {
    return;
  }

  if (existingWindow.isMinimized()) {
    existingWindow.restore();
  }

  existingWindow.focus();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function registerIpc() {
  ipcMain.handle("file:open", async () => {
    const result = await dialog.showOpenDialog({
      title: "Open document",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Readable documents", extensions: Array.from(supportedExtensions).map((item) => item.slice(1)) }]
    });

    if (result.canceled) {
      return [];
    }

    return Promise.all(result.filePaths.map(readNativeFile));
  });

  ipcMain.handle("file:create", async () => {
    const result = await dialog.showSaveDialog({
      title: "Create document",
      defaultPath: "Untitled.md",
      filters: [
        { name: "Markdown", extensions: ["md"] },
        { name: "Plain text", extensions: ["txt"] },
        { name: "HTML", extensions: ["html"] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await mkdir(path.dirname(result.filePath), { recursive: true });
    await writeFile(result.filePath, "", "utf8");
    return readNativeFile(result.filePath);
  });

  ipcMain.handle("folder:open", async () => {
    const result = await dialog.showOpenDialog({
      title: "Open folder",
      properties: ["openDirectory"]
    });

    if (result.canceled || !result.filePaths[0]) {
      return [];
    }

    const paths = await scanFolder(result.filePaths[0]);
    return Promise.all(paths.map(readNativeFile));
  });

  ipcMain.handle("file:readPaths", async (_event, paths: string[]) => {
    return Promise.all(paths.filter((filePath) => supportedExtensions.has(path.extname(filePath).toLowerCase())).map(readNativeFile));
  });

  ipcMain.handle("file:checkPaths", async (_event, paths: string[]) => {
    return Promise.all(
      paths.map(async (filePath) => {
        try {
          const info = await stat(filePath);
          return { path: filePath, exists: info.isFile() && supportedExtensions.has(path.extname(filePath).toLowerCase()) };
        } catch {
          return { path: filePath, exists: false };
        }
      })
    );
  });

  ipcMain.handle("file:save", async (_event, payload: { path: string; content: string }) => {
    await writeFile(payload.path, payload.content, "utf8");
    return readNativeFile(payload.path);
  });

  ipcMain.handle("file:saveAs", async (_event, payload: { suggestedName: string; content: string }) => {
    const result = await dialog.showSaveDialog({
      title: "Save document",
      defaultPath: payload.suggestedName
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await mkdir(path.dirname(result.filePath), { recursive: true });
    await writeFile(result.filePath, payload.content, "utf8");
    return readNativeFile(result.filePath);
  });
}

async function scanFolder(folderPath: string, limit = 600): Promise<string[]> {
  const found: string[] = [];

  async function visit(currentPath: string) {
    if (found.length >= limit) {
      return;
    }

    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          await visit(entryPath);
        }
        continue;
      }

      if (entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase())) {
        found.push(entryPath);
      }
    }
  }

  await visit(folderPath);
  return found;
}

async function readNativeFile(filePath: string): Promise<NativeFileRecord> {
  const info = await stat(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);
  const data = await readDocumentData(filePath, extension, name);
  const binaryBase64 = extension === ".pdf" ? (await readFile(filePath)).toString("base64") : undefined;

  return {
    path: filePath,
    name,
    extension,
    size: info.size,
    modifiedAt: info.mtime.toISOString(),
    content: data.content,
    contentHtml: extension === ".pdf" ? undefined : data.contentHtml,
    binaryBase64
  };
}
