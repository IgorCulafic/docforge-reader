const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("docforge", {
  openFiles: () => ipcRenderer.invoke("file:open"),
  createFile: () => ipcRenderer.invoke("file:create"),
  openFolder: () => ipcRenderer.invoke("folder:open"),
  readPaths: (paths) => ipcRenderer.invoke("file:readPaths", paths),
  checkPaths: (paths) => ipcRenderer.invoke("file:checkPaths", paths),
  saveFile: (path, content) => ipcRenderer.invoke("file:save", { path, content }),
  saveAs: (suggestedName, content) => ipcRenderer.invoke("file:saveAs", { suggestedName, content }),
  getPathForFile: (file) => webUtils.getPathForFile(file)
});
