import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import type { BookAction } from "../state/book-reducer";
import type { PageData } from "../types/parchment";

/** Left rail: selectable page rows with reorder/duplicate/delete controls. */
export function PageList({
  pages,
  selectedUid,
  onSelect,
  dispatch,
}: {
  pages: PageData[];
  selectedUid: string;
  onSelect: (uid: string) => void;
  dispatch: React.Dispatch<BookAction>;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          Pages ({pages.length})
        </h2>
        <Button size="sm" variant="outline" onClick={() => dispatch({ type: "add-page" })}>
          <Plus size={14} /> Page
        </Button>
      </div>
      {pages.map((page, i) => (
        <div
          key={page.uid}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(page.uid)}
          onKeyDown={(e) => e.key === "Enter" && onSelect(page.uid)}
          className={cn(
            "group cursor-pointer rounded-md border px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-stone-400",
            page.uid === selectedUid
              ? "border-amber-700 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/40"
              : "border-stone-200 hover:border-stone-400 dark:border-stone-800 dark:hover:border-stone-600",
          )}
        >
          <div className="flex items-center gap-1">
            <span className="w-6 shrink-0 font-mono text-xs text-amber-700 dark:text-amber-500">
              {i}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold">
              {page.Id || "(no id)"}
            </span>
            <span className="hidden gap-0.5 group-hover:flex">
              {/* Row actions are hover-only; stopPropagation keeps them from also selecting the page. */}
              <button
                type="button"
                aria-label="Move page up"
                className="cursor-pointer rounded p-0.5 hover:bg-stone-200 dark:hover:bg-stone-700"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: "move-page", uid: page.uid, dir: -1 });
                }}
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                aria-label="Move page down"
                className="cursor-pointer rounded p-0.5 hover:bg-stone-200 dark:hover:bg-stone-700"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: "move-page", uid: page.uid, dir: 1 });
                }}
              >
                <ArrowDown size={13} />
              </button>
              <button
                type="button"
                aria-label="Duplicate page"
                className="cursor-pointer rounded p-0.5 hover:bg-stone-200 dark:hover:bg-stone-700"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: "duplicate-page", uid: page.uid });
                }}
              >
                <Copy size={13} />
              </button>
              <button
                type="button"
                aria-label="Delete page"
                className="cursor-pointer rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-950"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: "delete-page", uid: page.uid });
                }}
              >
                <Trash2 size={13} />
              </button>
            </span>
          </div>
          {page.ChapterId && (
            <p className="truncate pl-6 font-mono text-[11px] text-sky-700 dark:text-sky-300">
              ch: {page.ChapterId}
            </p>
          )}
        </div>
      ))}
      <p className="text-[11px] text-stone-400">
        Pages 0-1 are the first spread, 2-3 the next, unless chapters regroup them.
      </p>
    </div>
  );
}
