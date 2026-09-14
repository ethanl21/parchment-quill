import type { Doc } from "../types/parchment";

const KEY = "parchment-quill-doc-v1";

export function saveDoc(doc: Doc) {
  try {
    localStorage.setItem(KEY, JSON.stringify(doc));
  } catch {
    // full or blocked storage, the editor just keeps working in memory
  }
}

export function loadDoc(): Doc | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const doc = JSON.parse(raw) as Doc;
    if (!doc || !doc.book || !Array.isArray(doc.book.Pages)) return null;
    return doc;
  } catch {
    return null;
  }
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
