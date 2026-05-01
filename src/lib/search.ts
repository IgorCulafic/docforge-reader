export interface TextSearchMatch {
  line: number;
  column: number;
  preview: string;
}

export interface SearchableDocument {
  id: string;
  name: string;
  path: string;
  content: string;
}

export interface DocumentSearchMatch extends TextSearchMatch {
  documentId: string;
  name: string;
  path: string;
}

export function searchText(text: string, query: string): TextSearchMatch[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  return text.split(/\r\n|\r|\n/).flatMap((line, lineIndex) => {
    const matches: TextSearchMatch[] = [];
    const searchableLine = line.toLowerCase();
    let searchFrom = 0;

    while (searchFrom <= searchableLine.length) {
      const foundAt = searchableLine.indexOf(normalizedQuery, searchFrom);
      if (foundAt === -1) {
        break;
      }

      matches.push({
        line: lineIndex + 1,
        column: foundAt + 1,
        preview: line.trim() || line
      });
      searchFrom = foundAt + normalizedQuery.length;
    }

    return matches;
  });
}

export function searchDocuments(documents: SearchableDocument[], query: string): DocumentSearchMatch[] {
  return documents.flatMap((document) =>
    searchText(document.content, query).map((match) => ({
      ...match,
      documentId: document.id,
      name: document.name,
      path: document.path
    }))
  );
}
