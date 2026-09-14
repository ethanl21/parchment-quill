import { useState } from "react";
import { ElementList } from "./elements";
import { Field, Input } from "./ui/fields";
import { cn } from "../lib/utils";
import type { BookAction } from "../state/book-reducer";
import type { ElementListName, PageData } from "../types/parchment";

const LAYERS: { value: ElementListName; label: string }[] = [
  { value: "elements", label: "Content" },
  { value: "background", label: "Background" },
  { value: "foreground", label: "Foreground" },
];

export function PageEditor({
  page,
  dispatch,
}: {
  page: PageData;
  dispatch: React.Dispatch<BookAction>;
}) {
  const [layer, setLayer] = useState<ElementListName>("elements");
  const patch = (p: Partial<PageData>) =>
    dispatch({ type: "update-page", uid: page.uid, patch: p });
  // Layer names match PageData lists, except "elements" (plural) vs Elements.
  const lists = {
    elements: page.Elements,
    background: page.Background,
    foreground: page.Foreground,
  };
  const list = lists[layer as keyof typeof lists];
  const count = (name: ElementListName) => lists[name as keyof typeof lists]?.length ?? 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Page Id *">
          <Input
            className="font-mono text-xs"
            value={page.Id}
            onChange={(e) => patch({ Id: e.target.value })}
          />
        </Field>
        <Field label="ChapterId (pages sharing one read together)">
          <Input
            className="font-mono text-xs"
            value={page.ChapterId ?? ""}
            onChange={(e) => patch({ ChapterId: e.target.value || undefined })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Condition (page exists only when true)">
          <Input
            className="font-mono text-xs"
            value={page.Condition ?? ""}
            onChange={(e) => patch({ Condition: e.target.value || undefined })}
          />
        </Field>
        <Field label="Tags (comma-separated)">
          <Input
            value={(page.Tags ?? []).join(", ")}
            onChange={(e) => {
              const arr = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              patch({ Tags: arr.length > 0 ? arr : undefined });
            }}
          />
        </Field>
      </div>
      <div className="flex gap-1 rounded-md bg-sky-100 p-1 dark:bg-sky-950">
        {LAYERS.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => setLayer(l.value)}
            className={cn(
              "flex-1 cursor-pointer rounded px-2 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
              layer === l.value
                ? "bg-sky-700 text-white shadow-xs dark:bg-sky-500 dark:text-stone-950"
                : "text-sky-900 hover:text-sky-700 dark:text-stone-400 dark:hover:text-stone-100",
            )}
          >
            {l.label} ({count(l.value)})
          </button>
        ))}
      </div>
      {layer !== "elements" && (
        <p className="text-[11px] text-stone-400">
          Placed by Position, drawn {layer === "background" ? "behind" : "over"} the content.
          Decorative art with no tooltip or action ignores the cursor.
        </p>
      )}
      <ElementList
        target={{ kind: "page", pageUid: page.uid, list: layer }}
        elements={list}
        dispatch={dispatch}
      />
    </div>
  );
}
