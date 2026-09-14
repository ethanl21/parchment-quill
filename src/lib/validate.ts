import type { Doc, ElementData } from "../types/parchment";

export interface Issue {
  level: "error" | "warning";
  message: string;
}

// Sizing "Fixed" only makes sense when a Width is given, for these types.
const NEEDS_WIDTH = new Set(["Panel", "Divider", "Banner", "Button", "Input"]);

/** Depth-first walk over every element, including nested lists and grid templates. */
function* walkElements(lists: ElementData[][]): Generator<ElementData> {
  for (const list of lists) {
    for (const el of list) {
      yield el;
      // A grid Template is a single element, so wrap it as a one-item list.
      const templateList = el.Source?.Template ? [[el.Source.Template]] : [];
      yield* walkElements([
        el.Children ?? [],
        el.Background ?? [],
        el.Foreground ?? [],
        ...templateList,
      ]);
    }
  }
}

export function validateDoc(doc: Doc): Issue[] {
  const issues: Issue[] = [];

  // Document identity.
  if (!doc.modId.trim() && !doc.useToken) {
    issues.push({
      level: "warning",
      message: "Mod ID is empty; the book Id will use a placeholder.",
    });
  }
  if (!doc.slug.trim()) issues.push({ level: "error", message: "Book name is empty." });
  if (doc.book.Pages.length === 0)
    issues.push({ level: "error", message: "The book has no pages." });

  // Pages: non-empty, unique ids, and at least one element per layer.
  const seen = new Map<string, number>();
  for (const page of doc.book.Pages) {
    if (!page.Id.trim()) {
      issues.push({ level: "error", message: "A page has an empty Id." });
    } else {
      seen.set(page.Id, (seen.get(page.Id) ?? 0) + 1);
    }
    if (
      page.Elements.length === 0 &&
      page.Background.length === 0 &&
      page.Foreground.length === 0
    ) {
      issues.push({ level: "warning", message: `Page "${page.Id || "(no id)"}" has no content.` });
    }
  }
  for (const [id, count] of seen) {
    if (count > 1)
      issues.push({ level: "error", message: `Duplicate page Id "${id}" (${count}×).` });
  }

  // Elements across every page and the book-level layers.
  const lists = [
    ...doc.book.Pages.flatMap((p) => [p.Elements, p.Background, p.Foreground]),
    doc.book.Underlay,
    doc.book.Overlay,
  ];
  for (const el of walkElements(lists)) {
    const where = el.Id ? `${el.Type} "${el.Id}"` : el.Type;

    // Required fields per type.
    if (el.Type === "Button" && !el.Action && !(el.Actions ?? []).length) {
      issues.push({ level: "error", message: `${where}: Button needs an Action.` });
    }
    if (el.Type === "Input" && !el.InputId) {
      issues.push({ level: "error", message: `${where}: Input needs an InputId.` });
    }
    if (el.Type === "Grid" && !el.Source) {
      if (el.CellWidth == null || el.CellHeight == null || el.Columns == null) {
        issues.push({
          level: "error",
          message: `${where}: Grid needs Columns, CellWidth and CellHeight (or a Source).`,
        });
      }
      if ((el.Children ?? []).length === 0) {
        issues.push({ level: "warning", message: `${where}: Grid has no children and no Source.` });
      }
    }
    if (el.Sizing === "Fixed" && el.Width == null && NEEDS_WIDTH.has(el.Type)) {
      issues.push({ level: "error", message: `${where}: Sizing Fixed needs a Width.` });
    }

    // Timed elements.
    if (el.Lifetime != null && !el.Id) {
      issues.push({
        level: "error",
        message: `${where}: a timed element (Lifetime) needs an Id for ShowElement.`,
      });
    }
    if (el.Lifetime != null && el.FadeAfter != null && el.FadeAfter >= el.Lifetime) {
      issues.push({ level: "error", message: `${where}: FadeAfter must be below Lifetime.` });
    }

    // Cursor behavior.
    // IgnoreCursor means clicks pass through, so any action on the same element never fires.
    const hasAction =
      !!el.Action ||
      (el.Actions ?? []).length > 0 ||
      (el.HoverActions ?? []).length > 0 ||
      !!el.HoverAction;
    if (el.IgnoreCursor && hasAction) {
      issues.push({
        level: "warning",
        message: `${where}: IgnoreCursor with an action never fires.`,
      });
    }
  }
  return issues;
}
