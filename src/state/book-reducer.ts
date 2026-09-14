import { useReducer } from "react";
import { newElement, newPage, seedDoc } from "../lib/model";
import {
  type BookData,
  type Doc,
  type ElementData,
  type ElementListName,
  type ElementType,
  type PageData,
} from "../types/parchment";

export type ElementTarget =
  | { kind: "page"; pageUid: string; list: ElementListName }
  | { kind: "element"; elementUid: string; list: "children" | "background" | "foreground" }
  | { kind: "book"; list: "underlay" | "overlay" };

export type BookAction =
  | { type: "set-meta"; patch: Partial<Pick<Doc, "modId" | "slug" | "useToken">> }
  | { type: "update-book"; patch: Partial<BookData> }
  | { type: "update-layout"; patch: Partial<BookData["Layout"]> }
  | { type: "update-appearance"; patch: Partial<BookData["Appearance"]> }
  | { type: "add-page" }
  | { type: "update-page"; uid: string; patch: Partial<PageData> }
  | { type: "delete-page"; uid: string }
  | { type: "move-page"; uid: string; dir: -1 | 1 }
  | { type: "duplicate-page"; uid: string }
  | { type: "add-element"; target: ElementTarget; elementType: ElementType }
  | { type: "update-element"; uid: string; patch: Partial<ElementData> }
  | { type: "delete-element"; uid: string }
  | { type: "reorder-element"; uid: string; toIndex: number }
  | { type: "replace-doc"; doc: Doc };

type Location = { arr: ElementData[]; index: number } | { grid: ElementData };

/** The three lists an element can nest directly. */
function childListsOf(el: ElementData): ElementData[][] {
  const lists: ElementData[][] = [];
  if (el.Children) lists.push(el.Children);
  if (el.Background) lists.push(el.Background);
  if (el.Foreground) lists.push(el.Foreground);
  return lists;
}

/** Find an element in one list, descending into nested lists and grid templates. */
function locateIn(list: ElementData[], uid: string): Location | null {
  const index = list.findIndex((el) => el.uid === uid);
  if (index >= 0) return { arr: list, index };
  for (const el of list) {
    // A grid template is a single element stored on the grid, not a list.
    if (el.Source?.Template) {
      if (el.Source.Template.uid === uid) return { grid: el };
      const deep = locateTemplateKids(el.Source.Template, uid);
      if (deep) return deep;
    }
    // Recurse into nested child lists.
    for (const kids of childListsOf(el)) {
      const found = locateIn(kids, uid);
      if (found) return found;
    }
  }
  return null;
}

/** Search a grid template's own children and any templates nested inside it. */
function locateTemplateKids(template: ElementData, uid: string): Location | null {
  for (const kids of childListsOf(template)) {
    const found = locateIn(kids, uid);
    if (found) return found;
  }
  if (template.Source?.Template) {
    if (template.Source.Template.uid === uid) return { grid: template };
    return locateTemplateKids(template.Source.Template, uid);
  }
  return null;
}

/** Find an element anywhere: every page, then the book-level layers. */
function locateElement(book: BookData, uid: string): Location | null {
  for (const page of book.Pages) {
    for (const list of [page.Elements, page.Background, page.Foreground]) {
      const found = locateIn(list, uid);
      if (found) return found;
    }
  }
  for (const list of [book.Underlay, book.Overlay]) {
    const found = locateIn(list, uid);
    if (found) return found;
  }
  return null;
}

/** Resolve an ElementTarget to the concrete list it points at, creating it if needed. */
function targetList(book: BookData, target: ElementTarget): ElementData[] | null {
  // Book-level layers.
  if (target.kind === "book") return target.list === "underlay" ? book.Underlay : book.Overlay;

  // A layer on a specific page.
  if (target.kind === "page") {
    const page = book.Pages.find((p) => p.uid === target.pageUid);
    if (!page) return null;
    if (target.list === "elements") return page.Elements;
    if (target.list === "background") return page.Background;
    return page.Foreground;
  }

  // A nested list on an element; created on first use.
  const loc = locateElement(book, target.elementUid);
  if (!loc || !("arr" in loc)) return null;
  const el = loc.arr[loc.index];
  if (target.list === "children") {
    if (!el.Children) el.Children = [];
    return el.Children;
  }
  if (target.list === "background") {
    if (!el.Background) el.Background = [];
    return el.Background;
  }
  if (!el.Foreground) el.Foreground = [];
  return el.Foreground;
}

/** Deep-clone an element with fresh uids so a copy can't collide with the original. */
function reUidElement(el: ElementData): ElementData {
  const copy: ElementData = {
    ...el,
    uid: `${el.uid}-copy-${Math.floor(Math.random() * 1e9)}`,
  };
  for (const key of ["Children", "Background", "Foreground"] as const) {
    if (copy[key]) copy[key] = copy[key].map(reUidElement);
  }
  if (copy.Source?.Template) {
    copy.Source = { ...copy.Source, Template: reUidElement(copy.Source.Template) };
  }
  return copy;
}

function reducer(doc: Doc, action: BookAction): Doc {
  switch (action.type) {
    // Document and book metadata.
    case "set-meta":
      return { ...doc, ...action.patch };
    case "replace-doc":
      return action.doc;
    case "update-book":
      return { ...doc, book: { ...doc.book, ...action.patch } };
    case "update-layout":
      return { ...doc, book: { ...doc.book, Layout: { ...doc.book.Layout, ...action.patch } } };
    case "update-appearance":
      return {
        ...doc,
        book: { ...doc.book, Appearance: { ...doc.book.Appearance, ...action.patch } },
      };
    // Pages.
    case "add-page": {
      const draft = structuredClone(doc);
      // TODO: picks a dup Id if pages were deleted (validate flags it, user renames)
      draft.book.Pages.push(newPage({ Id: `page-${draft.book.Pages.length + 1}` }));
      return draft;
    }
    case "update-page": {
      const draft = structuredClone(doc);
      const page = draft.book.Pages.find((p) => p.uid === action.uid);
      if (page) Object.assign(page, action.patch);
      return draft;
    }
    case "delete-page": {
      if (doc.book.Pages.length <= 1) return doc;
      return {
        ...doc,
        book: { ...doc.book, Pages: doc.book.Pages.filter((p) => p.uid !== action.uid) },
      };
    }
    case "move-page": {
      const draft = structuredClone(doc);
      const i = draft.book.Pages.findIndex((p) => p.uid === action.uid);
      const j = i + action.dir;
      if (i < 0 || j < 0 || j >= draft.book.Pages.length) return doc;
      [draft.book.Pages[i], draft.book.Pages[j]] = [draft.book.Pages[j], draft.book.Pages[i]];
      return draft;
    }
    case "duplicate-page": {
      const draft = structuredClone(doc);
      const i = draft.book.Pages.findIndex((p) => p.uid === action.uid);
      if (i < 0) return doc;
      const pageCopy: PageData = {
        ...structuredClone(draft.book.Pages[i]),
        uid: `${draft.book.Pages[i].uid}-copy`,
        Id: `${draft.book.Pages[i].Id}-copy`,
      };
      pageCopy.Elements = pageCopy.Elements.map(reUidElement);
      pageCopy.Background = pageCopy.Background.map(reUidElement);
      pageCopy.Foreground = pageCopy.Foreground.map(reUidElement);
      draft.book.Pages.splice(i + 1, 0, pageCopy);
      return draft;
    }
    // Elements (any page or book layer, including nested and grid-template elements).
    case "add-element": {
      const draft = structuredClone(doc);
      const list = targetList(draft.book, action.target);
      if (!list) return doc;
      list.push(newElement(action.elementType));
      return draft;
    }
    case "update-element": {
      const draft = structuredClone(doc);
      const loc = locateElement(draft.book, action.uid);
      if (!loc) return doc;
      if ("grid" in loc) {
        // Template edit: grid wrapper holds no element fields itself.
        const template = loc.grid.Source?.Template;
        if (!template) return doc;
        loc.grid.Source = { ...loc.grid.Source, Template: { ...template, ...action.patch } };
      } else {
        Object.assign(loc.arr[loc.index], action.patch);
      }
      return draft;
    }
    case "delete-element": {
      const draft = structuredClone(doc);
      const loc = locateElement(draft.book, action.uid);
      if (!loc) return doc;
      if ("grid" in loc) {
        if (loc.grid.Source) {
          const { Template: _t, ...rest } = loc.grid.Source;
          loc.grid.Source = Object.keys(rest).length > 0 ? rest : undefined;
        }
      } else {
        loc.arr.splice(loc.index, 1);
      }
      return draft;
    }
    case "reorder-element": {
      const draft = structuredClone(doc);
      const loc = locateElement(draft.book, action.uid);
      if (!loc || !("arr" in loc)) return doc;
      const to = Math.max(0, Math.min(action.toIndex, loc.arr.length - 1));
      if (loc.index === to) return doc;
      const [moved] = loc.arr.splice(loc.index, 1);
      loc.arr.splice(to, 0, moved);
      return draft;
    }
    default:
      return doc;
  }
}

/** Hook wrapper around the reducer, seeded from a saved/imported doc or the example book. */
export function useBookDoc(initial?: Doc) {
  const [doc, dispatch] = useReducer(reducer, initial ?? seedDoc());
  return { doc, dispatch };
}
