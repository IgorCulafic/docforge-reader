export interface RecentFile {
  path: string;
  name: string;
  lastOpenedAt: string;
  missing?: boolean;
}

export interface RecentDocumentInput {
  path: string;
  name: string;
}

export function normalizeRecentItems(value: unknown): RecentFile[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const items: RecentFile[] = [];

  for (const item of value) {
    const normalized = normalizeRecentItem(item);
    if (!normalized || seen.has(normalized.path)) {
      continue;
    }

    seen.add(normalized.path);
    items.push(normalized);
  }

  return items;
}

export function rememberRecentFiles(
  current: RecentFile[],
  documents: RecentDocumentInput[],
  now = new Date().toISOString(),
  limit = 12
): RecentFile[] {
  const byPath = new Map<string, RecentFile>();

  for (const item of current) {
    byPath.set(item.path, item);
  }

  for (const document of documents) {
    byPath.delete(document.path);
    byPath.set(document.path, {
      path: document.path,
      name: document.name,
      lastOpenedAt: now
    });
  }

  return Array.from(byPath.values()).reverse().slice(0, limit);
}

export function markRecentMissing(current: RecentFile[], path: string): RecentFile[] {
  return current.map((item) => (item.path === path ? { ...item, missing: true } : item));
}

export function syncRecentAvailability(
  current: RecentFile[],
  availability: Array<{ path: string; exists: boolean }>
): RecentFile[] {
  const byPath = new Map(availability.map((item) => [item.path, item.exists]));
  return current.map((item) => {
    if (!byPath.has(item.path)) {
      return item;
    }

    return {
      ...item,
      missing: byPath.get(item.path) === false
    };
  });
}

export function removeRecentFile(current: RecentFile[], path: string): RecentFile[] {
  return current.filter((item) => item.path !== path);
}

function normalizeRecentItem(item: unknown): RecentFile | null {
  if (typeof item === "string" && item.trim()) {
    return {
      path: item,
      name: fileNameFromPath(item),
      lastOpenedAt: ""
    };
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const maybeItem = item as Partial<RecentFile>;
  if (typeof maybeItem.path !== "string" || !maybeItem.path.trim()) {
    return null;
  }

  return {
    path: maybeItem.path,
    name: typeof maybeItem.name === "string" && maybeItem.name.trim() ? maybeItem.name : fileNameFromPath(maybeItem.path),
    lastOpenedAt: typeof maybeItem.lastOpenedAt === "string" ? maybeItem.lastOpenedAt : "",
    missing: maybeItem.missing === true
  };
}

function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}
