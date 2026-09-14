# Parchment Quill

Build [Parchment](https://floogen.github.io/Parchment/getting-started/first-book/) books in a form UI instead of raw JSON. Page through a live preview, then export Content Patcher JSON or SMAPI C#.

It opens with a small example book (a Camping Guide) so there's something to click through first. Drafts autosave to `localStorage` in the browser.

## What you can do

- Add, rename, duplicate, reorder, and delete pages. Group them into chapters or gate them with conditions and tags.
- Edit every element type: Title, Heading, Paragraph, Image, Divider, Panel, Banner, Button, PageNumber, Grid, Input. Panels nest children, background, and foreground lists. Grids take static cells or an item-query `Source` with a cell template.
- Flip through a single-page or spread preview with rough in-game styling. Actions show as tooltips, conditions get a badge, and item sprites resolve through `stardew-valley-data`.
- Export formatted JSON via `toExportObject` or builder-style C# via `toCSharp`, then copy or download it. Import JSON back with `importBook`. Fields the form doesn't know ride along in `passthrough`, so re-exports don't drop data.
- Watch the live issues panel: dup page ids, buttons without actions, grids missing dims, `FadeAfter >= Lifetime`, `IgnoreCursor` combined with actions, and more. Warnings don't block export.
- Switch between light, dark, and system themes. The choice persists, with a view-transition cross-fade where the browser supports it.

## Quick start

Requires the Vite+ toolchain (`vp`). After pulling:

```bash
vp install
vp dev
```

Other commands:

```bash
vp test       # export round-trip, validation, C# emit
vp check      # format, lint, typecheck
vp run build  # tsc plus production build
```

## Layout

```
src/
  App.tsx                 shell: header, page list, editor, right panel
  components/
    page-list.tsx         page ordering and selection
    page-editor.tsx       per-page fields plus layer tabs
    elements.tsx          element cards and per-type fields
    book-settings.tsx     mod/book metadata, layout, appearance, underlay/overlay
    preview.tsx           spread preview
    right-panel.tsx       preview / JSON / C# tabs plus validation list
    item-sprite.tsx       lazy item-sprite lookup
    theme-switcher.tsx
    ui/                   shared primitives (button, card, fields, tabs, …)
  lib/
    model.ts              new/import/strip/seed plus export object
    export-csharp.ts      C# builder emitter
    validate.ts           doc validation
    sprites.ts            (O)24-style id parsing and CDN sprite lookup
    storage.ts            localStorage persistence plus file download
    theme.ts              theme preference hook
  state/book-reducer.ts   editor state (useReducer with structuredClone drafts)
  types/parchment.ts      BookData / PageData / ElementData schema
```

## Notes

- The book Id is built from mod id plus slug, or `{{ModId}}_slug` when the token toggle is on.
- A `Grid` needs `Columns` plus `CellWidth` plus `CellHeight`. The C# emitter leaves a `// TODO` when they're missing instead of guessing.
- Page curl, animation, custom textures and frames, and anything else the form doesn't cover survives an import/export round trip through `passthrough`.
- Sprite lookup lazily imports the ~1MB dataset chunk, and only when an `ItemId` actually renders.
