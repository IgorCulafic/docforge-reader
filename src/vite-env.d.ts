/// <reference types="vite/client" />

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

interface Window {
  docforge?: {
    openFiles: () => Promise<NativeFileRecord[]>;
    createFile: () => Promise<NativeFileRecord | null>;
    openFolder: () => Promise<NativeFileRecord[]>;
    readPaths: (paths: string[]) => Promise<NativeFileRecord[]>;
    checkPaths: (paths: string[]) => Promise<Array<{ path: string; exists: boolean }>>;
    saveFile: (path: string, content: string) => Promise<NativeFileRecord>;
    saveAs: (suggestedName: string, content: string) => Promise<NativeFileRecord | null>;
    getPathForFile: (file: File) => string;
  };
}
