import { useState } from "react";
import { ChevronDown, ArrowUp, ArrowDown, GripVertical, Trash2, Plus } from "lucide-react";
import { AdvancedSection } from "./ui/advanced-section";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Check, Field, Input, Num, PointInput, RectInput, Select, Textarea } from "./ui/fields";
import { cn } from "../lib/utils";
import { newElement } from "../lib/model";
import type { BookAction, ElementTarget } from "../state/book-reducer";
import { ELEMENT_TYPES, type ElementData, type ElementType } from "../types/parchment";

type Dispatch = React.Dispatch<BookAction>;

const ALIGN = ["", "Left", "Center", "Right"];
const VALIGN = ["", "Top", "Center", "Bottom"];
const FONTS = ["", "Dialogue", "Small", "Tiny", "SpriteText"];
const SIZING = ["", "Fill", "ShrinkToFit", "Fixed"];

// 3-family tint keeps element headers scannable; split further if types grow
function elementChrome(type: ElementType): { stripe: string; header: string } {
  switch (type) {
    // Text-like elements.
    case "Title":
    case "Heading":
    case "Paragraph":
      return {
        stripe: "bg-sky-500 dark:bg-sky-400",
        header: "bg-sky-50/60 dark:bg-sky-500/10",
      };
    // Interactive elements.
    case "Button":
    case "Input":
    case "PageNumber":
      return {
        stripe: "bg-violet-500 dark:bg-violet-400",
        header: "bg-violet-50/60 dark:bg-violet-500/10",
      };
    // Decorative / layout elements.
    default:
      return {
        stripe: "bg-emerald-500 dark:bg-emerald-400",
        header: "bg-emerald-50/60 dark:bg-emerald-500/10",
      };
  }
}

/** Render a list of option strings, mapping "" to "(default)". */
function opt(list: string[]) {
  return list.map((v) => (
    <option key={v} value={v}>
      {v === "" ? "(default)" : v}
    </option>
  ));
}

/** One-line label for a collapsed element card. */
function summary(el: ElementData): string {
  // Priority: first text line, then ids, then texture filename.
  return (
    el.Text?.split("\n")[0]?.slice(0, 40) ||
    el.InputId ||
    el.ItemId ||
    (el.TexturePath ? el.TexturePath.split("/").pop() : "") ||
    el.Id ||
    ""
  );
}

/** Props spread onto a textarea to edit a `string[]` as one line per entry. */
function lines(value: string[], onChange: (v: string[] | undefined) => void) {
  // Adapter: edit a string[] as newline-separated textarea text.
  return {
    value: value.join("\n"),
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const arr = e.target.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      onChange(arr.length > 0 ? arr : undefined);
    },
  };
}

/** Texture, source rectangle, tint, and scale — shared by sprite-based types. */
function SpriteFields({
  el,
  patch,
}: {
  el: ElementData;
  patch: (p: Partial<ElementData>) => void;
}) {
  return (
    <>
      {/* Texture asset. */}
      <Field label="TexturePath (game asset name)">
        <Input
          className="font-mono text-xs"
          placeholder="Mods/YourMod/Asset or LooseSprites/Cursors"
          value={el.TexturePath ?? ""}
          onChange={(e) => patch({ TexturePath: e.target.value || undefined })}
        />
      </Field>

      {/* Region of the sprite sheet to draw. */}
      <RectInput
        label="TextureSourceRectangle"
        value={el.TextureSourceRectangle}
        onChange={(v) => patch({ TextureSourceRectangle: v })}
      />

      {/* Tint and scale. */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="TintColor">
          <Input
            value={el.TintColor ?? ""}
            onChange={(e) => patch({ TintColor: e.target.value || undefined })}
            placeholder="white"
          />
        </Field>
        <Field label="Scale">
          <Num value={el.Scale} onChange={(v) => patch({ Scale: v })} />
        </Field>
      </div>
    </>
  );
}

/** Font, size, and colors — shared by text-bearing types. */
function TextStyleFields({
  el,
  patch,
}: {
  el: ElementData;
  patch: (p: Partial<ElementData>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label="FontType">
        <Select
          value={el.FontType ?? ""}
          onChange={(e) => patch({ FontType: e.target.value || undefined })}
        >
          {opt(FONTS)}
        </Select>
      </Field>
      <Field label="TextScale">
        <Num value={el.TextScale} onChange={(v) => patch({ TextScale: v })} />
      </Field>
      <Field label="TextColor">
        <Input
          value={el.TextColor ?? ""}
          onChange={(e) => patch({ TextColor: e.target.value || undefined })}
        />
      </Field>
      <Field label="ShadowColor">
        <Input
          value={el.ShadowColor ?? ""}
          onChange={(e) => patch({ ShadowColor: e.target.value || undefined })}
        />
      </Field>
    </div>
  );
}

/** Sizing mode, width, and padding. */
function SizingFields({
  el,
  patch,
}: {
  el: ElementData;
  patch: (p: Partial<ElementData>) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Field label="Sizing">
        <Select
          value={el.Sizing ?? ""}
          onChange={(e) => patch({ Sizing: e.target.value || undefined })}
        >
          {opt(SIZING)}
        </Select>
      </Field>
      <Field label="Width">
        <Num value={el.Width} onChange={(v) => patch({ Width: v })} />
      </Field>
      <Field label="Padding">
        <Num value={el.Padding} onChange={(v) => patch({ Padding: v })} />
      </Field>
    </div>
  );
}

/** Picks the per-type field editor for an element. */
function TypeFields({
  el,
  patch,
  dispatch,
  depth,
}: {
  el: ElementData;
  patch: (p: Partial<ElementData>) => void;
  dispatch: Dispatch;
  depth: number;
}) {
  switch (el.Type) {
    case "Title":
    case "Heading":
    case "Paragraph":
      return <TextFields el={el} patch={patch} />;
    case "Image":
      return <ImageFields el={el} patch={patch} />;
    case "Divider":
      return <DividerFields el={el} patch={patch} />;
    case "Panel":
      return <PanelFields el={el} patch={patch} dispatch={dispatch} depth={depth} />;
    case "Banner":
      return <BannerFields el={el} patch={patch} />;
    case "Button":
      return <ButtonFields el={el} patch={patch} />;
    case "PageNumber":
      return <PageNumberFields el={el} patch={patch} />;
    case "Grid":
      return <GridFields el={el} patch={patch} dispatch={dispatch} depth={depth} />;
    case "Input":
      return <InputFields el={el} patch={patch} />;
  }
}

// ---- Per-type field editors -------------------------------------------------
// Each renders the fields for one element type; TypeFields above just routes to them.

interface FieldsProps {
  el: ElementData;
  patch: (p: Partial<ElementData>) => void;
}

interface NestedFieldsProps extends FieldsProps {
  dispatch: Dispatch;
  depth: number;
}

function TextFields({ el, patch }: FieldsProps) {
  return (
    <>
      {/* Text content. */}
      <Field label="Text">
        <Textarea
          rows={el.Type === "Paragraph" ? 4 : 2}
          value={el.Text ?? ""}
          onChange={(e) => patch({ Text: e.target.value || undefined })}
        />
      </Field>

      {/* Typography. */}
      <TextStyleFields el={el} patch={patch} />

      {/* Paragraphs may wrap at an explicit width. */}
      {el.Type === "Paragraph" && (
        <Field label="Width (wraps at this width when set)">
          <Num value={el.Width} onChange={(v) => patch({ Width: v })} />
        </Field>
      )}
    </>
  );
}

function ImageFields({ el, patch }: FieldsProps) {
  return (
    <>
      {/* Label and item id. */}
      <Field label="Text (optional label drawn on the sprite)">
        <Textarea
          rows={2}
          value={el.Text ?? ""}
          onChange={(e) => patch({ Text: e.target.value || undefined })}
        />
      </Field>
      <Field label="ItemId (like (O)24; wins over TexturePath)">
        <Input
          className="font-mono text-xs"
          value={el.ItemId ?? ""}
          onChange={(e) => patch({ ItemId: e.target.value || undefined })}
        />
      </Field>

      {/* Sprite art and typography. */}
      <SpriteFields el={el} patch={patch} />
      <TextStyleFields el={el} patch={patch} />

      {/* Alignment and rotation. */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="TextAlignment">
          <Select
            value={el.TextAlignment ?? ""}
            onChange={(e) => patch({ TextAlignment: e.target.value || undefined })}
          >
            {opt(ALIGN)}
          </Select>
        </Field>
        <Field label="Rotation">
          <Num value={el.Rotation} onChange={(v) => patch({ Rotation: v })} />
        </Field>
      </div>

      {/* Label placement, in sprite pixels. */}
      <PointInput
        label="Origin (pivot, sprite pixels)"
        value={el.Origin}
        onChange={(v) => patch({ Origin: v })}
      />
      <RectInput
        label="TextArea (label region, sprite pixels)"
        value={el.TextArea}
        onChange={(v) => patch({ TextArea: v })}
      />
    </>
  );
}

function DividerFields({ el, patch }: FieldsProps) {
  return (
    <>
      {/* Line geometry. */}
      <div className="grid grid-cols-3 gap-2">
        <Field label="Sizing">
          <Select
            value={el.Sizing ?? ""}
            onChange={(e) => patch({ Sizing: e.target.value || undefined })}
          >
            {opt(SIZING)}
          </Select>
        </Field>
        <Field label="Width">
          <Num value={el.Width} onChange={(v) => patch({ Width: v })} />
        </Field>
        <Field label="Thickness (no texture)">
          <Num value={el.Thickness} onChange={(v) => patch({ Thickness: v })} />
        </Field>
      </div>

      {/* Optional texture override. */}
      <SpriteFields el={el} patch={patch} />
    </>
  );
}

function PanelFields({ el, patch, dispatch, depth }: NestedFieldsProps) {
  return (
    <>
      {/* Frame and box sizing. */}
      <SpriteFields el={el} patch={patch} />
      <SizingFields el={el} patch={patch} />
      <Field label="Height (omit = hug children)">
        <Num value={el.Height} onChange={(v) => patch({ Height: v })} />
      </Field>

      {/* Nested content. */}
      <NestedList
        label="Children"
        target={{ kind: "element", elementUid: el.uid, list: "children" }}
        elements={el.Children ?? []}
        dispatch={dispatch}
        depth={depth}
      />
      <NestedList
        label="Background (placed)"
        target={{ kind: "element", elementUid: el.uid, list: "background" }}
        elements={el.Background ?? []}
        dispatch={dispatch}
        depth={depth}
      />
      <NestedList
        label="Foreground (placed)"
        target={{ kind: "element", elementUid: el.uid, list: "foreground" }}
        elements={el.Foreground ?? []}
        dispatch={dispatch}
        depth={depth}
      />
    </>
  );
}

function BannerFields({ el, patch }: FieldsProps) {
  return (
    <>
      {/* Text and art. */}
      <Field label="Text">
        <Input
          value={el.Text ?? ""}
          onChange={(e) => patch({ Text: e.target.value || undefined })}
        />
      </Field>
      <SpriteFields el={el} patch={patch} />
      <TextStyleFields el={el} patch={patch} />
      <SizingFields el={el} patch={patch} />

      {/* Ribbon cap and text offset. */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="CapWidth">
          <Num value={el.CapWidth} onChange={(v) => patch({ CapWidth: v })} />
        </Field>
      </div>
      <PointInput
        label="TextOffset"
        value={el.TextOffset}
        onChange={(v) => patch({ TextOffset: v })}
      />
    </>
  );
}

function ButtonFields({ el, patch }: FieldsProps) {
  return (
    <>
      {/* Label and click action. */}
      <Field label="Text (label)">
        <Input
          value={el.Text ?? ""}
          onChange={(e) => patch({ Text: e.target.value || undefined })}
        />
      </Field>
      <Field label="Action (required, runs on click)">
        <Input
          className="font-mono text-xs"
          placeholder="PeacefulEnd.Parchment_NextPage"
          value={el.Action ?? ""}
          onChange={(e) => patch({ Action: e.target.value || undefined })}
        />
      </Field>

      {/* Art, typography, and size. */}
      <SpriteFields el={el} patch={patch} />
      <TextStyleFields el={el} patch={patch} />
      <SizingFields el={el} patch={patch} />

      {/* Hover frame. */}
      <RectInput
        label="HoverTextureSourceRectangle"
        value={el.HoverTextureSourceRectangle}
        onChange={(v) => patch({ HoverTextureSourceRectangle: v })}
      />
    </>
  );
}

function PageNumberFields({ el, patch }: FieldsProps) {
  return (
    <>
      {/* Scope and number format. */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Scope">
          <Select
            value={el.Scope ?? ""}
            onChange={(e) => patch({ Scope: e.target.value || undefined })}
          >
            {opt(["", "Book", "Chapter"])}
          </Select>
        </Field>
        <Field label="Format ({0} = number)">
          <Input
            value={el.Format ?? ""}
            onChange={(e) => patch({ Format: e.target.value || undefined })}
            placeholder="- {0} -"
          />
        </Field>
      </div>

      {/* Typography. */}
      <TextStyleFields el={el} patch={patch} />
    </>
  );
}

function GridFields({ el, patch, dispatch, depth }: NestedFieldsProps) {
  return (
    <>
      {/* Grid dimensions. */}
      <div className="grid grid-cols-3 gap-2">
        <Field label="Columns *">
          <Num value={el.Columns} onChange={(v) => patch({ Columns: v })} />
        </Field>
        <Field label="CellWidth *">
          <Num value={el.CellWidth} onChange={(v) => patch({ CellWidth: v })} />
        </Field>
        <Field label="CellHeight *">
          <Num value={el.CellHeight} onChange={(v) => patch({ CellHeight: v })} />
        </Field>
        <Field label="Rows (cap)">
          <Num value={el.Rows} onChange={(v) => patch({ Rows: v })} />
        </Field>
        <Field label="ColumnSpacing">
          <Num value={el.ColumnSpacing} onChange={(v) => patch({ ColumnSpacing: v })} />
        </Field>
        <Field label="RowSpacing">
          <Num value={el.RowSpacing} onChange={(v) => patch({ RowSpacing: v })} />
        </Field>
      </div>

      {/* Manual cells (ignored once Source is set). */}
      <NestedList
        label="Children (cells, ignored when Source is set)"
        target={{ kind: "element", elementUid: el.uid, list: "children" }}
        elements={el.Children ?? []}
        dispatch={dispatch}
        depth={depth}
      />

      {/* Source: fill cells from an item query. */}
      <div className="space-y-2 rounded-md border border-dashed border-stone-300 p-2 dark:border-stone-700">
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
          Source (fill cells from an item query)
        </p>

        {/* Query. */}
        <Field label="ItemQuery">
          <Input
            className="font-mono text-xs"
            value={el.Source?.ItemQuery ?? ""}
            onChange={(e) =>
              patch({ Source: { ...el.Source, ItemQuery: e.target.value || undefined } })
            }
            placeholder="ALL_ITEMS (O)"
          />
        </Field>

        {/* Filtering and sorting. */}
        <div className="grid grid-cols-2 gap-2">
          <Field label="InputId (filter box)">
            <Input
              className="font-mono text-xs"
              value={el.Source?.InputId ?? ""}
              onChange={(e) =>
                patch({ Source: { ...el.Source, InputId: e.target.value || undefined } })
              }
            />
          </Field>
          <Field label="OrderBy">
            <Input
              value={el.Source?.OrderBy ?? ""}
              onChange={(e) =>
                patch({ Source: { ...el.Source, OrderBy: e.target.value || undefined } })
              }
              placeholder="Name / Price / None"
            />
          </Field>
        </div>
        <Field label="PerItemCondition">
          <Input
            className="font-mono text-xs"
            value={el.Source?.PerItemCondition ?? ""}
            onChange={(e) =>
              patch({ Source: { ...el.Source, PerItemCondition: e.target.value || undefined } })
            }
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Count">
            <Num
              value={el.Source?.Count}
              onChange={(v) => patch({ Source: { ...el.Source, Count: v } })}
            />
          </Field>
          <div className="flex items-end pb-1">
            <Check
              label="OrderDescending"
              checked={el.Source?.OrderDescending}
              onChange={(v) => patch({ Source: { ...el.Source, OrderDescending: v || undefined } })}
            />
          </div>
        </div>

        {/* Cell template, rendered once per matched item. */}
        {el.Source?.Template ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Cell template
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => dispatch({ type: "delete-element", uid: el.Source!.Template!.uid })}
              >
                <Trash2 size={14} /> Remove template
              </Button>
            </div>
            <ElementCard element={el.Source.Template} dispatch={dispatch} depth={depth + 1} />
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              patch({
                Source: {
                  ...el.Source,
                  Template: newElement("Image", {
                    Scale: 3,
                    Alignment: "Center",
                    VerticalAlignment: "Center",
                  }),
                },
              })
            }
          >
            <Plus size={14} /> Add cell template
          </Button>
        )}
      </div>

      {/* Placed layers. */}
      <NestedList
        label="Background (placed)"
        target={{ kind: "element", elementUid: el.uid, list: "background" }}
        elements={el.Background ?? []}
        dispatch={dispatch}
        depth={depth}
      />
      <NestedList
        label="Foreground (placed)"
        target={{ kind: "element", elementUid: el.uid, list: "foreground" }}
        elements={el.Foreground ?? []}
        dispatch={dispatch}
        depth={depth}
      />
    </>
  );
}

function InputFields({ el, patch }: FieldsProps) {
  return (
    <>
      {/* Id and length limit. */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="InputId *">
          <Input
            className="font-mono text-xs"
            value={el.InputId ?? ""}
            onChange={(e) => patch({ InputId: e.target.value || undefined })}
          />
        </Field>
        <Field label="MaxLength">
          <Num value={el.MaxLength} onChange={(v) => patch({ MaxLength: v })} />
        </Field>
      </div>

      {/* Initial text and placeholder. */}
      <Field label="Starting text (editable by the reader)">
        <Input
          value={el.Text ?? ""}
          onChange={(e) => patch({ Text: e.target.value || undefined })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Placeholder">
          <Input
            value={el.Placeholder ?? ""}
            onChange={(e) => patch({ Placeholder: e.target.value || undefined })}
            placeholder="Search..."
          />
        </Field>
        <Field label="PlaceholderColor">
          <Input
            value={el.PlaceholderColor ?? ""}
            onChange={(e) => patch({ PlaceholderColor: e.target.value || undefined })}
          />
        </Field>
      </div>

      {/* Actions. */}
      <Field label="SubmitAction (on enter)">
        <Input
          className="font-mono text-xs"
          value={el.SubmitAction ?? ""}
          onChange={(e) => patch({ SubmitAction: e.target.value || undefined })}
        />
      </Field>
      <Field label="TextChangedAction (after pause)">
        <Input
          className="font-mono text-xs"
          value={el.TextChangedAction ?? ""}
          onChange={(e) => patch({ TextChangedAction: e.target.value || undefined })}
        />
      </Field>

      {/* Art, typography, and size. */}
      <SpriteFields el={el} patch={patch} />
      <TextStyleFields el={el} patch={patch} />
      <SizingFields el={el} patch={patch} />
      <Field label="Height">
        <Num value={el.Height} onChange={(v) => patch({ Height: v })} />
      </Field>
    </>
  );
}

function CommonAdvanced({
  el,
  patch,
}: {
  el: ElementData;
  patch: (p: Partial<ElementData>) => void;
}) {
  return (
    <AdvancedSection>
      {/* Alignment, spacing, and identity. */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Alignment">
          <Select
            value={el.Alignment ?? ""}
            onChange={(e) => patch({ Alignment: e.target.value || undefined })}
          >
            {opt(ALIGN)}
          </Select>
        </Field>
        <Field label="VerticalAlignment (placed)">
          <Select
            value={el.VerticalAlignment ?? ""}
            onChange={(e) => patch({ VerticalAlignment: e.target.value || undefined })}
          >
            {opt(VALIGN)}
          </Select>
        </Field>
        <Field label="SpacingAfter">
          <Num value={el.SpacingAfter} onChange={(v) => patch({ SpacingAfter: v })} />
        </Field>
        <Field label="Id (for ShowElement)">
          <Input
            className="font-mono text-xs"
            value={el.Id ?? ""}
            onChange={(e) => patch({ Id: e.target.value || undefined })}
          />
        </Field>
        <Field label="MarginLeft">
          <Num value={el.MarginLeft} onChange={(v) => patch({ MarginLeft: v })} />
        </Field>
        <Field label="MarginRight">
          <Num value={el.MarginRight} onChange={(v) => patch({ MarginRight: v })} />
        </Field>
      </div>

      {/* Absolute placement and visibility condition. */}
      <PointInput
        label="Position (placed lists, screen px)"
        value={el.Position}
        onChange={(v) => patch({ Position: v })}
      />
      <Field label="Condition (game state query)">
        <Input
          className="font-mono text-xs"
          value={el.Condition ?? ""}
          onChange={(e) => patch({ Condition: e.target.value || undefined })}
        />
      </Field>

      {/* Click actions. A Button's required Action lives on its main form. */}
      {el.Type !== "Button" && (
        <>
          <Field label="Action (on click)">
            <Input
              className="font-mono text-xs"
              value={el.Action ?? ""}
              onChange={(e) => patch({ Action: e.target.value || undefined })}
            />
          </Field>
          <Field label="Actions (one per line, run in order)">
            <Textarea
              rows={2}
              {...lines(el.Actions ?? [], (v) => patch({ Actions: v }))}
              className="font-mono text-xs"
            />
          </Field>
        </>
      )}
      {el.Type === "Button" && (
        <Field label="Actions (one per line, run after Action)">
          <Textarea
            rows={2}
            {...lines(el.Actions ?? [], (v) => patch({ Actions: v }))}
            className="font-mono text-xs"
          />
        </Field>
      )}

      {/* Sound, hover, and lifetime. */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Sound">
          <Input
            value={el.Sound ?? ""}
            onChange={(e) => patch({ Sound: (e.target.value || undefined) as string | undefined })}
            placeholder="bigSelect (null = silent)"
          />
        </Field>
        <Field label="HoverAction">
          <Input
            className="font-mono text-xs"
            value={el.HoverAction ?? ""}
            onChange={(e) => patch({ HoverAction: e.target.value || undefined })}
          />
        </Field>
        <Field label="Lifetime (timed element)">
          <Num value={el.Lifetime} onChange={(v) => patch({ Lifetime: v })} />
        </Field>
        <Field label="FadeAfter">
          <Num value={el.FadeAfter} onChange={(v) => patch({ FadeAfter: v })} />
        </Field>
      </div>

      {/* Tooltip and tags. */}
      <Field label="Tooltip title (DisplayName)">
        <Input
          value={el.DisplayName ?? ""}
          onChange={(e) => patch({ DisplayName: e.target.value || undefined })}
        />
      </Field>
      <Field label="Tooltip body (Description)">
        <Textarea
          rows={2}
          value={el.Description ?? ""}
          onChange={(e) => patch({ Description: e.target.value || undefined })}
        />
      </Field>
      <Field label="Tags (comma-separated)">
        <Input
          value={(el.Tags ?? []).join(", ")}
          onChange={(e) => {
            const arr = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            patch({ Tags: arr.length > 0 ? arr : undefined });
          }}
        />
      </Field>

      {/* Cursor. */}
      <Check
        label="IgnoreCursor (cursor passes through)"
        checked={el.IgnoreCursor}
        onChange={(v) => patch({ IgnoreCursor: v || undefined })}
      />
    </AdvancedSection>
  );
}

/** One collapsible element row: header controls plus the type-specific editor. */
export function ElementCard({
  element: el,
  dispatch,
  depth,
  index = 0,
  dimmed,
  dropBefore,
  dropAfter,
  onDragStartCard,
  onDragOverCard,
  onDropCard,
  onDragEndCard,
}: {
  element: ElementData;
  dispatch: Dispatch;
  depth: number;
  index?: number;
  dimmed?: boolean;
  dropBefore?: boolean;
  dropAfter?: boolean;
  onDragStartCard?: (e: React.DragEvent) => void;
  onDragOverCard?: (e: React.DragEvent) => void;
  onDropCard?: (e: React.DragEvent) => void;
  onDragEndCard?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const patch = (p: Partial<ElementData>) =>
    dispatch({ type: "update-element", uid: el.uid, patch: p });
  return (
    <>
      {dropBefore && <div aria-hidden className="h-0.5 rounded bg-stone-900 dark:bg-stone-100" />}
      <Card
        className={cn(depth > 0 && "border-dashed", dimmed && "opacity-50")}
        onDragOver={onDragOverCard}
        onDrop={onDropCard}
      >
        <div className={cn("flex items-center gap-1 px-2 py-1.5", elementChrome(el.Type).header)}>
          <span
            aria-hidden
            className={cn("w-1 self-stretch rounded-full", elementChrome(el.Type).stripe)}
          />
          {onDragStartCard && (
            <span
              draggable
              role="button"
              tabIndex={-1}
              title="Drag to reorder"
              aria-label="Drag to reorder"
              onDragStart={onDragStartCard}
              onDragEnd={onDragEndCard}
              className="cursor-grab rounded p-0.5 text-stone-400 outline-none hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-stone-400 active:cursor-grabbing dark:hover:bg-stone-800"
            >
              <GripVertical size={15} />
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="cursor-pointer rounded p-0.5 outline-none hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-stone-400 dark:hover:bg-stone-800"
            aria-label={open ? "Collapse element" : "Expand element"}
          >
            <ChevronDown
              size={15}
              className={cn(
                "text-stone-500 dark:text-stone-400 transition-transform",
                !open && "-rotate-90",
              )}
            />
          </button>
          <Select
            aria-label="Element type"
            className="h-7 w-32 text-xs font-semibold"
            value={el.Type}
            onChange={(e) => patch({ Type: e.target.value as ElementType })}
          >
            {ELEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <span className="min-w-0 flex-1 truncate text-xs text-stone-400">{summary(el)}</span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Move up"
            onClick={() => dispatch({ type: "reorder-element", uid: el.uid, toIndex: index - 1 })}
          >
            <ArrowUp size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Move down"
            onClick={() => dispatch({ type: "reorder-element", uid: el.uid, toIndex: index + 1 })}
          >
            <ArrowDown size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete element"
            onClick={() => dispatch({ type: "delete-element", uid: el.uid })}
          >
            <Trash2 size={14} />
          </Button>
        </div>
        {open && (
          <div className="space-y-2 border-t border-stone-100 px-2 py-2 dark:border-stone-800">
            <TypeFields el={el} patch={patch} dispatch={dispatch} depth={depth} />
            <CommonAdvanced el={el} patch={patch} />
          </div>
        )}
      </Card>
      {dropAfter && <div aria-hidden className="h-0.5 rounded bg-stone-900 dark:bg-stone-100" />}
    </>
  );
}

/** A labeled sub-list rendered one level deeper (nested children/layers). */
function NestedList({
  label,
  target,
  elements,
  dispatch,
  depth,
}: {
  label: string;
  target: ElementTarget;
  elements: ElementData[];
  dispatch: Dispatch;
  depth: number;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-violet-800 dark:text-violet-300">
        {label} ({elements.length})
      </p>
      <ElementList target={target} elements={elements} dispatch={dispatch} depth={depth + 1} />
    </div>
  );
}

export function ElementList({
  target,
  elements,
  dispatch,
  depth = 0,
}: {
  target: ElementTarget;
  elements: ElementData[];
  dispatch: Dispatch;
  depth?: number;
}) {
  // True when the cursor is in the top half of the row.
  const isBefore = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientY - rect.top < rect.height / 2;
  };
  // Type chosen in the "add element" row.
  const [next, setNext] = useState<ElementType>("Paragraph");

  // Drag state: which card is being dragged, and where it would drop.
  const [dragUid, setDragUid] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ uid: string; before: boolean } | null>(null);
  const ids = new Set(elements.map((e) => e.uid));

  /** Clear the drag highlight on drop or cancel. */
  const endDrag = () => {
    setDragUid(null);
    setDrop(null);
  };

  /** Move the dragged element to the index under the cursor. */
  const dropAt = (targetUid: string, e: React.DragEvent) => {
    const uid = e.dataTransfer.getData("text/plain");
    setDragUid(null);
    setDrop(null);
    if (!uid || uid === targetUid || !ids.has(uid)) return;
    const from = elements.findIndex((el) => el.uid === uid);
    const target = elements.findIndex((el) => el.uid === targetUid);
    // Drop above/below the midpoint; -1 adjusts for the removal shift.
    const before = isBefore(e);
    let to = target + (before ? 0 : 1);
    if (from < to) to -= 1;
    dispatch({ type: "reorder-element", uid, toIndex: to });
  };

  return (
    <div
      className={cn(
        "space-y-2",
        depth > 0 && "border-l-2 border-stone-200 pl-2 dark:border-stone-800",
      )}
    >
      {elements.map((el, i) => (
        <ElementCard
          key={el.uid}
          element={el}
          dispatch={dispatch}
          depth={depth}
          index={i}
          dimmed={dragUid === el.uid}
          dropBefore={drop?.uid === el.uid && drop.before}
          dropAfter={drop?.uid === el.uid && !drop.before}
          onDragStartCard={(e) => {
            e.dataTransfer.setData("text/plain", el.uid);
            e.dataTransfer.effectAllowed = "move";
            setDragUid(el.uid);
          }}
          onDragOverCard={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            const uid = el.uid;
            const before = isBefore(e);
            setDrop((prev) =>
              prev?.uid === uid && prev.before === before ? prev : { uid, before },
            );
          }}
          onDropCard={(e) => {
            e.preventDefault();
            dropAt(el.uid, e);
          }}
          onDragEndCard={endDrag}
        />
      ))}
      <div className="flex gap-1.5">
        <Select
          aria-label="New element type"
          className="h-8 text-xs"
          value={next}
          onChange={(e) => setNext(e.target.value as ElementType)}
        >
          {ELEMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: "add-element", target, elementType: next })}
        >
          <Plus size={14} /> Add
        </Button>
      </div>
    </div>
  );
}
