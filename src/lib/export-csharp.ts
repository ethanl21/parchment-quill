import { bookIdOf } from "./model";
import type { Doc, ElementData, PageData } from "../types/parchment";

// Turns an editor Doc into a C# snippet that builds the same book with
// Parchment's fluent builder API (see Parchment docs > Reference > Building books in C#).
//
// How the pieces fit together:
//   Writer  - collects output lines and hands out unique variable names.
//   Chain   - builds one fluent expression, e.g. `el1.AddTitle("Hi").Alignment("Center")`.
//   add*    - each appends one family of properties to a Chain (base, actions, style, …).
//   emit*   - walk the Doc and write the actual lines.

function cs(s: string): string {
  // Wrap a value in a C# string literal, escaping the three characters that matter:
  //   backslash       -> \\    (first, so the escapes below aren't doubled)
  //   double quote    -> \"
  //   newline (LF/CRLF) -> \n  (C# literals can't span more than one line)
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n")}"`;
}

/** Numbers are written verbatim; this helper keeps the call sites uniform. */
function num(n: number): string {
  return String(n);
}

/** Turn arbitrary text into a usable C# identifier (for variable/method names). */
function ident(s: string): string {
  // Regex 1: /[^A-Za-z0-9_]/g  - every character that is NOT a letter, digit, or
  // underscore, replaced with "_" (so "My Mod!" becomes "My_Mod_").
  // Regex 2: /^([0-9])/         - a digit at the very start, captured and prefixed
  // with "_" (so "2cool" becomes "_2cool"; C# identifiers can't start with a digit).
  const clean = s.replace(/[^A-Za-z0-9_]/g, "_").replace(/^([0-9])/, "_$1");
  return clean || "unnamed";
}

// Builder has no .Height() for these types, so Height is skipped when emitting them.
const NO_HEIGHT = new Set([
  "Title",
  "Heading",
  "Paragraph",
  "Image",
  "Divider",
  "Button",
  "Banner",
  "PageNumber",
]);

// Element types whose page-level constructor takes the text directly,
// e.g. AddTitle("Hi") rather than Add("Title").Text("Hi").
const TEXT_CTOR = new Set(["Title", "Heading", "Paragraph", "Banner"]);

// Element types whose page-level constructor takes no arguments,
// e.g. AddDivider() rather than Add("Divider").
const BARE_CTOR = new Set(["Divider", "Panel", "PageNumber"]);

/** Collects generated source as an array of lines, joined at the very end. */
class Writer {
  private lines: string[] = [];
  private varCount = 0;

  /** Append one line of source (an empty string writes a blank line). */
  line(s = "") {
    this.lines.push(s);
  }

  /** Return a fresh, unique variable name such as "el1" or "tpl2". */
  var(prefix: string): string {
    this.varCount += 1;
    return `${prefix}${this.varCount}`;
  }

  /** Append a comment flagging something the export could not translate. */
  todo(msg: string) {
    this.line(`// TODO: ${msg}`);
  }

  /** Append all lines of another writer, indented (used for the method body). */
  paste(other: Writer, indent = "    ") {
    for (const line of other.build().split("\n")) this.line(line ? `${indent}${line}` : line);
  }

  build(): string {
    return this.lines.join("\n");
  }
}

/** Builds one fluent C# expression by appending ".Method(args)" calls. */
class Chain {
  expr: string;

  constructor(expr: string) {
    this.expr = expr;
  }

  call(method: string, ...args: string[]): this {
    this.expr += `.${method}(${args.join(", ")})`;
    return this;
  }

  text(): string {
    return this.expr;
  }
}

// Anything that can carry a main action plus per-action sound.
type Actionable = { Action?: string; Actions?: string[]; Sound?: string | null };

/** Append `.Action(...)` calls; only the first action gets the element's Sound. */
function applyActions(b: Chain, el: Actionable) {
  const actions = [el.Action, ...(el.Actions ?? [])].filter(Boolean) as string[];
  actions.forEach((action, i) => {
    if (i === 0 && el.Sound) b.call("Action", cs(action), cs(el.Sound));
    else b.call("Action", cs(action));
  });
}

// Which list an element is being added to; decides the method used to attach it.
type Adder = "page" | "child" | "background" | "foreground" | "underlay" | "overlay";

/** The `.Add…` / `.AddChild…` call that attaches an element to its parent. */
function adderExpr(parentVar: string, adder: Adder): string {
  const map: Record<Adder, string> = {
    page: `${parentVar}.Add`,
    child: `${parentVar}.AddChild`,
    background: `${parentVar}.AddBackground`,
    foreground: `${parentVar}.AddForeground`,
    underlay: `${parentVar}.AddUnderlay`,
    overlay: `${parentVar}.AddOverlay`,
  };
  return map[adder];
}

// The first creation call for an element, plus a note on what it already consumed.
interface Created {
  expr: string;
  /** The constructor already took el.Text, so don't add .Text() later. */
  textConsumed: boolean;
  /** AddButton(text, action) already carries the action, so don't add .Action() later. */
  actionConsumed: boolean;
}

function made(expr: string, flags: Partial<Omit<Created, "expr">> = {}): Created {
  return { expr, textConsumed: false, actionConsumed: false, ...flags };
}

/** The opening call for an element, e.g. `page1.AddTitle("Hi")` or `el2.AddChild("Input")`. */
function createElementExpr(parentVar: string, adder: Adder, el: ElementData, w: Writer): Created {
  const open = adderExpr(parentVar, adder);
  // Page-level shorthands (AddTitle, AddButton, ...) exist only on IPageBuilder;
  // nested elements use the generic AddChild / AddBackground / AddForeground.
  const pg = adder === "page";
  const text = el.Text ?? "";
  const type = el.Type;

  // Page-level shorthands that take the element's text directly.
  if (pg && text && TEXT_CTOR.has(type)) {
    return made(`${parentVar}.Add${type}(${cs(text)})`, { textConsumed: true });
  }
  if (pg && BARE_CTOR.has(type)) {
    return made(`${parentVar}.Add${type}()`);
  }

  // Types with a dedicated constructor for their main value.
  if (type === "Image") {
    if (pg && el.ItemId) return made(`${parentVar}.AddItemImage(${cs(el.ItemId)})`);
    if (pg && el.TexturePath) return made(`${parentVar}.AddImage(${cs(el.TexturePath)})`);
  }
  if (pg && type === "Button" && text && el.Action && !el.Sound) {
    return made(`${parentVar}.AddButton(${cs(text)}, ${cs(el.Action)})`, {
      textConsumed: true,
      actionConsumed: true,
    });
  }
  if (type === "Grid") {
    if (pg && el.CellWidth != null && el.CellHeight != null && el.Columns != null) {
      const dims = `${num(el.CellWidth)}, ${num(el.CellHeight)}, columns: ${num(el.Columns)}`;
      const rows = el.Rows != null ? `, rows: ${num(el.Rows)}` : "";
      return made(`${parentVar}.AddGrid(${dims}${rows})`);
    }
    w.todo(
      `Grid "${el.Id ?? "(no id)"}" needs CellWidth, CellHeight and Columns; set them before registering.`,
    );
  }

  // Fall back to the generic constructor, e.g. AddChild("Image").
  return made(`${open}(${cs(type)})`);
}

/** Text, alignment, size, position, visibility. */
function addBaseProps(b: Chain, el: ElementData, textConsumed: boolean) {
  // Text and alignment.
  if (el.Text && !textConsumed) b.call("Text", cs(el.Text));
  if (el.Alignment) b.call("Alignment", cs(el.Alignment));
  if (el.VerticalAlignment) b.call("VerticalAlignment", cs(el.VerticalAlignment));

  // Size and spacing.
  if (el.Scale != null) b.call("Scale", num(el.Scale));
  if (el.TextScale != null) b.call("TextScale", num(el.TextScale));
  if (el.SpacingAfter != null) b.call("Spacing", num(el.SpacingAfter));
  if (el.MarginLeft != null || el.MarginRight != null)
    b.call("Margin", num(el.MarginLeft ?? 0), num(el.MarginRight ?? 0));

  // Placement, identity, and lifetime.
  if (el.Position) b.call("Position", num(el.Position.X), num(el.Position.Y));
  if (el.Condition) b.call("Condition", cs(el.Condition));
  if (el.Id) b.call("WithId", cs(el.Id));
  if (el.Lifetime != null) b.call("Lifetime", num(el.Lifetime));
  if (el.FadeAfter != null) b.call("FadeAfter", num(el.FadeAfter));
  if (el.IgnoreCursor) b.call("IgnoreCursor");
}

/** Click and hover handlers. */
function addActions(b: Chain, w: Writer, el: ElementData, actionConsumed: boolean) {
  if (actionConsumed) {
    // AddButton(text, action) already has the main action; only extras remain.
    for (const extra of el.Actions ?? []) b.call("Action", cs(extra));
  } else {
    applyActions(b, el);
    if (el.Sound && !el.Action && !(el.Actions ?? []).length) {
      w.todo(`Sound on a ${el.Type} with no Action does nothing; add an action or drop the sound.`);
    }
  }

  // Hover handlers.
  if (el.HoverAction) b.call("HoverAction", cs(el.HoverAction));
  for (const extra of el.HoverActions ?? []) b.call("HoverAction", cs(extra));
}

/** Tooltip, tags, fonts, and colors. */
function addStyle(b: Chain, el: ElementData) {
  // Hover tooltip and search tags.
  if (el.DisplayName != null || el.Description != null)
    b.call("Tooltip", cs(el.DisplayName ?? ""), cs(el.Description ?? ""));
  for (const tag of el.Tags ?? []) b.call("WithTag", cs(tag));

  // Font and colors.
  if (el.FontType) b.call("Font", cs(el.FontType));
  if (el.TextColor) b.call("TextColor", cs(el.TextColor));
  if (el.ShadowColor) b.call("ShadowColor", cs(el.ShadowColor));
}

/** Textures and item images (page-level Image can pass them straight to its constructor). */
function addMedia(b: Chain, el: ElementData, pg: boolean) {
  // Texture path and item id, unless the constructor already took them.
  const consumedTexture = el.Type === "Image" && pg && !el.ItemId && !!el.TexturePath;
  const consumedItem = el.Type === "Image" && pg && !!el.ItemId;
  if (el.TexturePath && !consumedTexture) b.call("Texture", cs(el.TexturePath));
  if (el.ItemId && !consumedItem) b.call("Item", cs(el.ItemId));

  // Source rectangles for spritesheet frames.
  if (el.TextureSourceRectangle) {
    const r = el.TextureSourceRectangle;
    b.call("TextureSource", num(r.X), num(r.Y), num(r.Width), num(r.Height));
  }
  if (el.HoverTextureSourceRectangle) {
    const r = el.HoverTextureSourceRectangle;
    b.call("HoverTextureSource", num(r.X), num(r.Y), num(r.Width), num(r.Height));
  }

  // Tint.
  if (el.TintColor) b.call("Tint", cs(el.TintColor));
}

/** Size, padding, and grid/column geometry. */
function addLayout(b: Chain, el: ElementData) {
  // Box sizing.
  if (el.Sizing) b.call("Sizing", cs(el.Sizing));
  if (el.Width != null && el.Type !== "Grid") b.call("Width", num(el.Width));
  if (el.Height != null && !NO_HEIGHT.has(el.Type)) b.call("Height", num(el.Height));
  if (el.Padding != null) b.call("Padding", num(el.Padding));

  // Grid and column geometry (Grid carries these in its constructor instead).
  if (el.Columns != null && el.Type !== "Grid") b.call("Columns", num(el.Columns));
  if (el.Rows != null && el.Type !== "Grid") b.call("Rows", num(el.Rows));
  if (el.CellWidth != null && el.Type !== "Grid") b.call("CellWidth", num(el.CellWidth));
  if (el.CellHeight != null && el.Type !== "Grid") b.call("CellHeight", num(el.CellHeight));
  if (el.ColumnSpacing != null || el.RowSpacing != null)
    b.call("CellSpacing", num(el.ColumnSpacing ?? 0), num(el.RowSpacing ?? 0));
}

/** Input/format settings and grid Source options. */
function addData(b: Chain, el: ElementData) {
  // Scope and text formatting.
  if (el.Scope) b.call("Scope", cs(el.Scope));
  if (el.Format) b.call("Format", cs(el.Format));

  // Input field basics.
  if (el.InputId) b.call("InputId", cs(el.InputId));
  if (el.Placeholder) b.call("Placeholder", cs(el.Placeholder));
  if (el.MaxLength != null) b.call("MaxLength", num(el.MaxLength));
  if (el.TextChangedDelay != null) b.call("TextChangedDelay", num(el.TextChangedDelay));

  // Input actions.
  if (el.SubmitAction) b.call("SubmitAction", cs(el.SubmitAction));
  for (const extra of el.SubmitActions ?? []) b.call("SubmitAction", cs(extra));
  if (el.TextChangedAction) b.call("TextChangedAction", cs(el.TextChangedAction));
  for (const extra of el.TextChangedActions ?? []) b.call("TextChangedAction", cs(extra));

  // Grid Source options.
  if (el.Source?.ItemQuery) b.call("Source", cs(el.Source.ItemQuery));
  if (el.Source?.InputId) b.call("SourceFilter", cs(el.Source.InputId));
  if (el.Source?.PerItemCondition) b.call("SourceCondition", cs(el.Source.PerItemCondition));
  if (el.Source?.OrderBy) b.call("SourceOrder", cs(el.Source.OrderBy));
  if (el.Source?.OrderDescending) b.call("SourceOrderDescending", "true");
  if (el.Source?.Count != null) b.call("SourceCount", num(el.Source.Count));
}

/** Properties the builder has no method for, emitted as `.Set(field, value)`. */
function addFallbackSets(b: Chain, w: Writer, el: ElementData) {
  const set = (field: string, value: string) => b.call("Set", cs(field), value);

  // Individual fields with no dedicated builder method.
  if (el.CapWidth != null) set("CapWidth", num(el.CapWidth));
  if (el.Thickness != null) set("Thickness", num(el.Thickness));
  if (el.TextAlignment) set("TextAlignment", cs(el.TextAlignment));
  if (el.TextOffset)
    set("TextOffset", `new Point(${num(el.TextOffset.X)}, ${num(el.TextOffset.Y)})`);
  if (el.TextArea) {
    const r = el.TextArea;
    set("TextArea", `new Rectangle(${num(r.X)}, ${num(r.Y)}, ${num(r.Width)}, ${num(r.Height)})`);
  }
  if (el.Rotation != null) set("Rotation", `${num(el.Rotation)}f`);
  if (el.Origin) set("Origin", `new Vector2(${num(el.Origin.X)}f, ${num(el.Origin.Y)}f)`);
  if (el.PlaceholderColor) set("PlaceholderColor", cs(el.PlaceholderColor));

  // Unknown JSON fields copied through from an import.
  if (el.passthrough) {
    for (const [key, value] of Object.entries(el.passthrough)) {
      if (typeof value === "string") set(key, cs(value));
      else if (typeof value === "number" || typeof value === "boolean") set(key, String(value));
      else
        w.todo(`"${key}" on ${el.Type} needs a hand-written value; copy it from the JSON export.`);
    }
  }
}

/** Write one element (and recursively its children and grid template); returns its variable. */
function emitElement(w: Writer, parentVar: string, adder: Adder, el: ElementData): string {
  const v = w.var("el");
  const created = createElementExpr(parentVar, adder, el, w);
  const b = new Chain(created.expr);

  // Assemble the fluent expression one family of properties at a time.
  addBaseProps(b, el, created.textConsumed);
  addActions(b, w, el, created.actionConsumed);
  addStyle(b, el);
  addMedia(b, el, adder === "page");
  addLayout(b, el);
  addData(b, el);
  addFallbackSets(b, w, el);

  w.line(`IElementBuilder ${v} = ${b.text()};`);

  // Child elements can live in three separate lists.
  for (const list of [el.Children, el.Background, el.Foreground]) {
    for (const child of list ?? []) emitElement(w, v, "child", child);
  }

  // A grid Source renders one template per matched item.
  if (el.Source?.Template) {
    const t = w.var("tpl");
    w.line(`IElementBuilder ${t} = ${v}.AddSourceTemplate(${cs(el.Source.Template.Type)});`);
    emitTemplateInto(w, t, el.Source.Template);
  }
  return v;
}

/** A grid's Source template only supports a small subset of element properties. */
function emitTemplateInto(w: Writer, tplVar: string, template: ElementData) {
  const b = new Chain(tplVar);

  // Text and layout.
  if (template.Text) b.call("Text", cs(template.Text));
  if (template.Alignment) b.call("Alignment", cs(template.Alignment));
  if (template.VerticalAlignment) b.call("VerticalAlignment", cs(template.VerticalAlignment));
  if (template.Scale != null) b.call("Scale", num(template.Scale));

  // Actions and visibility.
  applyActions(b, { Action: template.Action, Actions: template.Actions });
  if (template.Condition) b.call("Condition", cs(template.Condition));

  w.line(`${b.text()};`);
  for (const child of template.Children ?? []) emitElement(w, tplVar, "child", child);
}

/** A key press on the book or page; unlike elements, sound uses a separate `.Sound()`. */
function emitKeybind(
  w: Writer,
  ownerVar: string,
  kb: { Keybind: string; Condition?: string; Action?: string; Actions?: string[]; Sound?: string },
) {
  const v = w.var("kb");
  const b = new Chain(`${ownerVar}.OnKeyPress(${cs(kb.Keybind)})`);
  if (kb.Condition) b.call("Condition", cs(kb.Condition));

  // Actions; the first one may carry the keybind's sound.
  const actions = [kb.Action, ...(kb.Actions ?? [])].filter(Boolean) as string[];
  actions.forEach((action, i) => {
    if (i === 0 && kb.Sound) b.call("Action", cs(action)).call("Sound", cs(kb.Sound));
    else b.call("Action", cs(action));
  });
  w.line(`var ${v} = ${b.text()};`);
}

/** Emit unknown JSON fields as `.Set(...)` calls, or a TODO when the value is structured. */
function emitPassthroughLines(
  w: Writer,
  ownerVar: string,
  passthrough: Record<string, unknown> | undefined,
  todoMessage: (key: string) => string,
  indent = "",
) {
  if (!passthrough) return;
  for (const [key, value] of Object.entries(passthrough)) {
    if (typeof value === "string") w.line(`${indent}${ownerVar}.Set(${cs(key)}, ${cs(value)});`);
    else if (typeof value === "number" || typeof value === "boolean")
      w.line(`${indent}${ownerVar}.Set(${cs(key)}, ${String(value)});`);
    else w.line(`${indent}// TODO: ${todoMessage(key)}`);
  }
}

/** Write a page builder plus its elements, layers, keybinds, and passthrough fields. */
function emitPage(w: Writer, bookVar: string, page: PageData) {
  const v = `page_${ident(page.Id) || "page"}`;
  const args =
    page.ChapterId != null ? `${cs(page.Id)}, ${cs(page.ChapterId)}` : cs(page.Id || "page");
  w.line(`IPageBuilder ${v} = ${bookVar}.AddPage(${args});`);

  // Condition and tags.
  if (page.Condition) w.line(`${v}.Condition(${cs(page.Condition)});`);
  for (const tag of page.Tags ?? []) w.line(`${v}.Tag(${cs(tag)});`);

  // OnView handlers.
  for (const entry of page.OnView) {
    // First action carries the Condition; the rest are bare OnView calls.
    w.line(
      entry.Condition
        ? `${v}.OnView(${cs(entry.Actions[0] ?? "")}, ${cs(entry.Condition)});`
        : `${v}.OnView(${cs(entry.Actions[0] ?? "")});`,
    );
    for (const extra of entry.Actions.slice(1)) w.line(`${v}.OnView(${cs(extra)});`);
  }

  // Content layers and keybinds.
  for (const el of page.Elements) emitElement(w, v, "page", el);
  for (const el of page.Background) emitElement(w, v, "background", el);
  for (const el of page.Foreground) emitElement(w, v, "foreground", el);
  for (const kb of page.OnKeyPress) emitKeybind(w, v, kb);

  // Unknown fields copied through from an import.
  emitPassthroughLines(
    w,
    v,
    page.passthrough,
    (k) => `port page "${k}" from the JSON export by hand.`,
  );
}

/** Entry point: turn a Doc into a complete, copy-pasteable C# method plus usage notes. */
export function toCSharp(doc: Doc): string {
  const w = new Writer();
  const id = bookIdOf(doc);
  const method = `Build${ident(doc.slug || "Book")}`;

  // Header comments explaining where the snippet goes.
  w.line(`// ${id} - generated by parchment-quill, drop it into your SMAPI mod`);
  w.line(`// (needs the Parchment API; see Parchment docs > Reference > Building books in C#).`);
  w.line(
    `// Content Patcher tokens like {{ModId}} do not exist in C#; values are substituted below.`,
  );
  w.line(`// Assumes: using Microsoft.Xna.Framework; (for Point/Rectangle/Vector2 in .Set calls).`);
  w.line(``);
  w.line(`private IBookBuilder ${method}(IParchmentApi parchment)`);
  w.line(`{`);

  // Create the book, substituting the mod id for the Content Patcher token.
  w.line(
    `    IBookBuilder book = parchment.CreateBook(${cs(id.replace("{{ModId}}", doc.modId || "MyMod"))});`,
  );
  w.line(`    book.Set("Format", ${cs(doc.book.Format || "1.0.0")});`);
  const b = doc.book;

  // Book-level settings.
  if (b.SpritePath) w.line(`    book.Sprite(${cs(b.SpritePath)});`);
  const set = (field: string, value: string) => w.line(`    book.Set(${cs(field)}, ${value});`);

  // Cover behavior.
  if (b.StartOnCover != null) set("StartOnCover", String(b.StartOnCover));
  if (b.ExitToCover != null) set("ExitToCover", String(b.ExitToCover));

  // Page layout margins.
  if (b.Layout.MarginOuter != null) set("Layout.MarginOuter", num(b.Layout.MarginOuter));
  if (b.Layout.MarginSpine != null) set("Layout.MarginSpine", num(b.Layout.MarginSpine));
  if (b.Layout.MarginTop != null) set("Layout.MarginTop", num(b.Layout.MarginTop));
  if (b.Layout.MarginBottom != null) set("Layout.MarginBottom", num(b.Layout.MarginBottom));
  if (b.Layout.IsSinglePage != null) set("Layout.IsSinglePage", String(b.Layout.IsSinglePage));

  // Appearance.
  if (b.Appearance.TintColor) set("Appearance.TintColor", cs(b.Appearance.TintColor));
  if (b.Appearance.Scale != null) set("Appearance.Scale", num(b.Appearance.Scale));

  // Unknown fields copied through from an import.
  emitPassthroughLines(
    w,
    "book",
    b.passthrough,
    (k) => `port book field "${k}" from the JSON export by hand.`,
    "    ",
  );

  // Book body is generated separately so it can be indented inside the method.
  const inner = new Writer();
  for (const el of b.Underlay) emitElement(inner, "book", "underlay", el);
  for (const el of b.Overlay) emitElement(inner, "book", "overlay", el);
  for (const page of b.Pages) emitPage(inner, "book", page);
  for (const kb of b.OnKeyPress) emitKeybind(inner, "book", kb);
  w.paste(inner);

  // Footer: return value plus a registration example.
  w.line(``);
  w.line(`    return book;`);
  w.line(`}`);
  w.line(``);
  w.line(`// Register it (e.g. in GameLaunched):`);
  w.line(`// if (${method}(parchment).TryRegister(out string error) is false)`);
  w.line(`//     Monitor.Log($"Couldn't register the book: {error}.", LogLevel.Warn);`);
  return w.build() + "\n";
}
