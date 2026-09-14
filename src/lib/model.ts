import {
  type BookData,
  type Doc,
  type ElementData,
  type ElementType,
  type GridSource,
  type PageData,
} from "../types/parchment";

/** Editor-only unique id; uses crypto.randomUUID when available. */
export const newUid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

const KNOWN_ELEMENT_KEYS = new Set([
  "Type",
  "Id",
  "Text",
  "Alignment",
  "VerticalAlignment",
  "Scale",
  "TextScale",
  "SpacingAfter",
  "MarginLeft",
  "MarginRight",
  "Position",
  "Condition",
  "Lifetime",
  "FadeAfter",
  "IgnoreCursor",
  "Action",
  "Actions",
  "Sound",
  "HoverAction",
  "HoverActions",
  "DisplayName",
  "Description",
  "Tags",
  "FontType",
  "TextColor",
  "ShadowColor",
  "TexturePath",
  "TextureSourceRectangle",
  "HoverTextureSourceRectangle",
  "TintColor",
  "ItemId",
  "Sizing",
  "Width",
  "Height",
  "Thickness",
  "Padding",
  "CapWidth",
  "TextOffset",
  "TextAlignment",
  "TextArea",
  "Rotation",
  "Origin",
  "Columns",
  "Rows",
  "CellWidth",
  "CellHeight",
  "ColumnSpacing",
  "RowSpacing",
  "Scope",
  "Format",
  "InputId",
  "Placeholder",
  "PlaceholderColor",
  "MaxLength",
  "SubmitAction",
  "SubmitActions",
  "TextChangedAction",
  "TextChangedActions",
  "TextChangedDelay",
  "Children",
  "Background",
  "Foreground",
  "Source",
  "Frames",
  "HoverFrames",
  "FrameDuration",
  "SpriteEffects",
  "ParseTokenizableStrings",
]);

const KNOWN_PAGE_KEYS = new Set([
  "Id",
  "ChapterId",
  "Condition",
  "Tags",
  "Elements",
  "Background",
  "Foreground",
  "OnView",
  "OnKeyPress",
]);

const KNOWN_BOOK_KEYS = new Set([
  "Format",
  "Id",
  "SpritePath",
  "Pages",
  "Underlay",
  "Overlay",
  "Appearance",
  "PageCurl",
  "Animation",
  "Layout",
  "OnKeyPress",
  "Variables",
  "StartOnCover",
  "ExitToCover",
]);

/** Split an imported object into known fields and the rest, kept for passthrough. */
function splitKnown(
  obj: Record<string, unknown>,
  known: Set<string>,
): { rest: Record<string, unknown>; passthrough?: Record<string, unknown> } {
  const rest: Record<string, unknown> = {};
  const passthrough: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (known.has(k)) rest[k] = v;
    else passthrough[k] = v;
  }
  return {
    rest,
    passthrough: Object.keys(passthrough).length > 0 ? passthrough : undefined,
  };
}

/** Treat an unknown JSON value as a plain object. */
const asRaw = (v: unknown): Record<string, unknown> => v as unknown as Record<string, unknown>;

export function newElement(type: ElementType, partial: Partial<ElementData> = {}): ElementData {
  const el: ElementData = { uid: newUid(), Type: type, ...partial };

  // Type-specific defaults that make a freshly added element usable.
  if (type === "Panel" && !el.Children) el.Children = [];
  if (type === "Grid" && el.Columns == null) el.Columns = 4;
  if (type === "Grid" && el.CellWidth == null) el.CellWidth = 20;
  if (type === "Grid" && el.CellHeight == null) el.CellHeight = 20;
  if (type === "Input" && !el.InputId) el.InputId = "search";
  if ((type === "Title" || type === "Heading" || type === "Paragraph") && el.Text == null)
    el.Text = "";
  return el;
}

export function newPage(partial: Partial<PageData> = {}): PageData {
  return {
    uid: newUid(),
    Id: "page",
    Elements: [],
    Background: [],
    Foreground: [],
    OnView: [],
    OnKeyPress: [],
    ...partial,
  };
}

/** Rebuild an element from raw JSON: fresh uid, mapped children, unknown keys kept. */
function importElement(raw: Record<string, unknown>): ElementData {
  const { rest, passthrough } = splitKnown(raw, KNOWN_ELEMENT_KEYS);
  const el: ElementData = {
    uid: newUid(),
    Type: (rest.Type as ElementType) ?? "Paragraph",
    ...(rest as Partial<ElementData>),
  };

  // Nested child lists.
  for (const list of ["Children", "Background", "Foreground"] as const) {
    const arr = el[list];
    if (Array.isArray(arr)) el[list] = arr.map((c) => importElement(asRaw(c)));
  }

  // Grid template (a single nested element).
  if (el.Source?.Template) {
    el.Source = {
      ...el.Source,
      Template: importElement(asRaw(el.Source.Template)),
    };
  }

  if (passthrough) el.passthrough = passthrough;
  return el;
}

/** Rebuild a page from raw JSON: fresh uid, imported elements, unknown keys kept. */
function importPage(raw: Record<string, unknown>): PageData {
  const { rest, passthrough } = splitKnown(raw, KNOWN_PAGE_KEYS);
  const page: PageData = {
    uid: newUid(),
    Id: (rest.Id as string) ?? "page",
    Elements: [],
    Background: [],
    Foreground: [],
    OnView: [],
    OnKeyPress: [],
    ...(rest as Partial<PageData>),
  };

  // The three element lists.
  for (const list of ["Elements", "Background", "Foreground"] as const) {
    const arr = page[list];
    if (Array.isArray(arr)) page[list] = arr.map((c) => importElement(asRaw(c)));
  }

  if (passthrough) page.passthrough = passthrough;
  return page;
}

/** Split "MyMod_Book" or "{{ModId}}_Book" into its mod/slug parts. */
function splitBookId(rawId: string): { modId: string; slug: string; useToken: boolean } {
  // Match a leading "{{ModId}}_" and capture everything after it.
  const tokenMatch = rawId.match(/^\{\{ModId\}\}_(.+)$/);
  if (tokenMatch) return { modId: "MyMod", slug: tokenMatch[1], useToken: true };
  const i = rawId.indexOf("_");
  if (i > 0) return { modId: rawId.slice(0, i), slug: rawId.slice(i + 1), useToken: false };
  return { modId: "MyMod", slug: rawId, useToken: false };
}

/** Parse an exported/pasted BookData JSON object into an editor Doc. */
export function importBook(raw: Record<string, unknown>): Doc {
  const { rest, passthrough } = splitKnown(raw, KNOWN_BOOK_KEYS);

  // Book Id -> the editor's mod/slug fields.
  const rawId = (rest.Id as string) ?? "MyMod_Book";
  const { modId, slug, useToken } = splitBookId(rawId);

  // Pages, falling back to a single cover page for an empty book.
  const pages = Array.isArray(rest.Pages) ? rest.Pages.map((p) => importPage(asRaw(p))) : [];
  const importedPages = pages.length > 0 ? pages : [newPage({ Id: "cover" })];

  // Remaining book fields; Pages was mapped above with fresh uids.
  const { Pages: _rawPages, ...restNoPages } = rest;
  void _rawPages;
  const book: BookData = {
    Format: (rest.Format as string) ?? "1.0.0",
    Underlay: [],
    Overlay: [],
    Layout: (rest.Layout as BookData["Layout"]) ?? {},
    Appearance: (rest.Appearance as BookData["Appearance"]) ?? {},
    OnKeyPress: (rest.OnKeyPress as BookData["OnKeyPress"]) ?? [],
    ...(restNoPages as Partial<BookData>),
    Pages: importedPages,
  };

  // Book-level element layers.
  for (const list of ["Underlay", "Overlay"] as const) {
    const arr = book[list];
    if (Array.isArray(arr)) book[list] = arr.map((c) => importElement(asRaw(c)));
  }

  if (passthrough) book.passthrough = passthrough;
  return { modId, slug, useToken, book };
}

/** The built-in example book used on first run and by the "Example" button. */
export function seedDoc(): Doc {
  return importBook({
    Format: "1.0.0",
    Id: "{{ModId}}_CampingGuide",
    Pages: [
      {
        Id: "cover",
        Elements: [
          { Type: "Title", Text: "Camping Guide", Alignment: "Center" },
          { Type: "Heading", Text: "by Linus", Alignment: "Center" },
        ],
      },
      {
        Id: "tents",
        Elements: [
          { Type: "Heading", Text: "Pitching a tent" },
          { Type: "Divider", Sizing: "Fill" },
          { Type: "Paragraph", Text: "Find level ground, away from the river." },
          { Type: "Image", ItemId: "(O)24", Scale: 4, Alignment: "Center" },
          {
            Type: "Button",
            Text: "Back to start",
            Action: "PeacefulEnd.Parchment_GoToStart",
            Alignment: "Center",
          },
        ],
      },
    ],
  });
}

/** Compose the exported book Id from the mod id + slug (or the {{ModId}} token). */
export function bookIdOf(doc: Doc): string {
  const prefix = doc.useToken ? "{{ModId}}" : doc.modId || "MyMod";
  return `${prefix}_${doc.slug || "Book"}`;
}

/** Values the exporter omits: undefined, empty string, or empty array. */
const isEmpty = (v: unknown): boolean =>
  v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** Recursively drop editor-only keys and empty values from a plain object. */
function clean(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(clean);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "uid" || k === "passthrough" || isEmpty(v)) continue;
      out[k] = clean(v);
    }
    return out;
  }
  return obj;
}

/** Shallow copy of an object without the listed keys or any empty values. */
function omitEmpty(obj: Record<string, unknown>, omit: readonly string[]): Record<string, unknown> {
  const blocked = new Set(omit);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (blocked.has(k) || isEmpty(v)) continue;
    out[k] = v;
  }
  return out;
}

/** Element -> plain JSON: fields, then child lists, then Source, then passthrough. */
function stripElement(el: ElementData): Record<string, unknown> {
  // Scalar fields, excluding the ones handled separately below.
  const { passthrough, Children, Background, Foreground, Source } = el;
  const out = omitEmpty(el as unknown as Record<string, unknown>, [
    "uid",
    "passthrough",
    "Children",
    "Background",
    "Foreground",
    "Source",
  ]);

  // Nested child lists.
  if (Children && Children.length > 0) out.Children = Children.map(stripElement);
  if (Background && Background.length > 0) out.Background = Background.map(stripElement);
  if (Foreground && Foreground.length > 0) out.Foreground = Foreground.map(stripElement);

  // Grid source, including its template.
  if (Source) Object.assign(out, stripSource(Source));

  return { ...out, ...passthrough };
}

/** Grid Source -> plain JSON, recursing into the template element. */
function stripSource(source: ElementData["Source"]): Record<string, unknown> {
  const src: Record<string, unknown> = {};
  const { Template, ...srest } = source as GridSource & { Template?: ElementData };
  for (const [k, v] of Object.entries(srest)) {
    if (!isEmpty(v)) src[k] = v;
  }
  if (Template) src.Template = stripElement(Template);
  return Object.keys(src).length > 0 ? { Source: src } : {};
}

/** Page -> plain JSON: fields, then its three element lists. */
function stripPage(page: PageData): Record<string, unknown> {
  // Scalar fields, excluding the element lists handled separately below.
  const { passthrough, Elements, Background, Foreground } = page;
  const out = omitEmpty(page as unknown as Record<string, unknown>, [
    "uid",
    "passthrough",
    "Elements",
    "Background",
    "Foreground",
  ]);

  // Element lists.
  out.Elements = Elements.map(stripElement);
  if (Background.length > 0) out.Background = Background.map(stripElement);
  if (Foreground.length > 0) out.Foreground = Foreground.map(stripElement);

  return { ...out, ...passthrough };
}

/** Serialize the doc to a plain BookData object ready for JSON.stringify. */
export function toExportObject(doc: Doc): Record<string, unknown> {
  const { passthrough, Pages, Underlay, Overlay, ...rest } = doc.book;

  // Id and Format first, then the remaining scalar book fields.
  const out: Record<string, unknown> = { Format: doc.book.Format, Id: bookIdOf(doc) };
  for (const [k, v] of Object.entries(rest)) {
    if (k === "Format" || k === "Id" || isEmpty(v)) continue;
    out[k] = clean(v);
  }

  // Pages and book-level element layers.
  out.Pages = Pages.map(stripPage);
  if (Underlay.length > 0) out.Underlay = Underlay.map(stripElement);
  if (Overlay.length > 0) out.Overlay = Overlay.map(stripElement);

  return { ...out, ...passthrough };
}
