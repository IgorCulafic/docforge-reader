import { contextBridge, ipcRenderer, webUtils } from "electron";

contextBridge.exposeInMainWorld("docforge", {
  openFiles: () => ipcRenderer.invoke("file:open"),
  createFile: () => ipcRenderer.invoke("file:create"),
  openFolder: () => ipcRenderer.invoke("folder:open"),
  readPaths: (paths: string[]) => ipcRenderer.invoke("file:readPaths", paths),
  checkPaths: (paths: string[]) => ipcRenderer.invoke("file:checkPaths", paths),
  saveFile: (path: string, content: string) => ipcRenderer.invoke("file:save", { path, content }),
  saveAs: (suggestedName: string, content: string) => ipcRenderer.invoke("file:saveAs", { suggestedName, content }),
  getPathForFile: (file: File) => webUtils.getPathForFile(file)
});
