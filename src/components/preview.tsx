import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import type { ElementData, PageData } from "../types/parchment";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { ItemSprite } from "./item-sprite";

interface Ctx {
  pageNumber: number;
}

function ActionTooltip({ actions, children }: { actions: string[]; children: React.ReactNode }) {
  if (actions.length === 0) return <>{children}</>;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger delay={200} render={<div />}>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={6}>
          <Tooltip.Popup className="z-50 max-w-52 rounded-md bg-stone-900 px-2 py-1 font-mono text-[10px] break-all text-stone-50 shadow-lg dark:bg-stone-100 dark:text-stone-900">
            → {actions.join(" · ")}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function ConditionWrap({ el, children }: { el: ElementData; children: React.ReactNode }) {
  if (!el.Condition) return <>{children}</>;
  return (
    <div className="opacity-70" title={`Condition: ${el.Condition}`}>
      {children}
      <span className="block font-mono text-[10px] leading-tight text-amber-700">
        if: {el.Condition}
      </span>
    </div>
  );
}

function lines(text: string) {
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line}
    </span>
  ));
}

const ALIGN_CLASS = { Center: "text-center", Right: "text-right" } as const;

// A grid shows its Source template, its manual children, or placeholder cells.
function gridCells(el: ElementData): ElementData[] {
  if (el.Source) return el.Source.Template ? [el.Source.Template] : [];
  return el.Children ?? [];
}

const PLACEHOLDER_COLUMNS = 4;
const MAX_PLACEHOLDERS = 8;

function spreadLabel(
  safeStart: number,
  spreadRight: PageData | undefined,
  total: number,
  left: PageData,
  chapterOf: (p: PageData) => string | undefined,
  chapterNumber: (p: PageData) => number,
): string {
  const range = spreadRight ? `Page ${safeStart + 1}-${safeStart + 2}` : `Page ${safeStart + 1}`;
  const chapter = chapterOf(left)
    ? ` · "${left.Id}" is #${chapterNumber(left)} in its chapter`
    : "";
  return `${range} of ${total}${chapter}`;
}

/** Renders one element as read-only preview markup. */
function PreviewElement({ el, ctx }: { el: ElementData; ctx: Ctx }) {
  const align = ALIGN_CLASS[el.Alignment as keyof typeof ALIGN_CLASS] ?? "text-left";
  // Preview renders at half game scale, so halve the margins.
  const indent = { marginLeft: (el.MarginLeft ?? 0) / 2, marginRight: (el.MarginRight ?? 0) / 2 };
  let body: React.ReactNode = null;
  switch (el.Type) {
    // Text blocks.
    case "Title":
      body = (
        <p className={cn("font-serif text-2xl font-bold text-stone-900", align)}>
          {el.Text ? lines(el.Text) : <em className="text-stone-300">Title</em>}
        </p>
      );
      break;
    case "Heading":
      body = (
        <p className={cn("text-base font-bold text-stone-900", align)}>
          {el.Text ? lines(el.Text) : <em className="text-stone-300">Heading</em>}
        </p>
      );
      break;
    case "Paragraph":
      body = (
        <p className={cn("text-[13px] leading-snug text-stone-800", align)}>
          {el.Text ? lines(el.Text) : <em className="text-stone-300">Paragraph</em>}
        </p>
      );
      break;
    // Media and decoration.
    case "Image":
      body = (
        <div className={cn(align)}>
          {el.ItemId ? (
            <ItemSprite key={el.ItemId} itemId={el.ItemId} scale={el.Scale} />
          ) : (
            <div className="inline-block rounded border border-dashed border-stone-400 bg-stone-100 px-3 py-2 text-center">
              <p className="font-mono text-[11px] text-stone-500">
                {el.TexturePath?.split("/").pop() ?? "Image"}
              </p>
            </div>
          )}
          {el.Text && <p className="text-[11px] text-stone-600">{el.Text}</p>}
        </div>
      );
      break;
    case "Divider":
      body = (
        <hr
          className="border-stone-400"
          style={{ borderTopWidth: Math.max(1, el.Thickness ?? 1) }}
        />
      );
      break;
    case "Panel":
      body = (
        <div className="rounded-md border-2 border-stone-500 bg-[#fffdf4] p-2">
          {el.TexturePath && (
            <p className="mb-1 font-mono text-[10px] text-stone-400">
              {el.TexturePath.split("/").pop()}
            </p>
          )}
          <div className="space-y-1.5">
            {(el.Children ?? []).map((c) => (
              <PreviewElement key={c.uid} el={c} ctx={ctx} />
            ))}
            {(el.Children ?? []).length === 0 && (
              <p className="text-[11px] text-stone-300 italic">Empty panel</p>
            )}
          </div>
        </div>
      );
      break;
    case "Banner":
      body = (
        <div className={cn(align)}>
          <span className="inline-block rounded-full border border-amber-700 bg-amber-100 px-4 py-0.5 text-[13px] font-semibold text-amber-900">
            {el.Text || "Banner"}
          </span>
        </div>
      );
      break;
    // Interactive, numbering, and grids.
    case "Button":
      body = (
        <div className={cn(align)}>
          <span className="inline-block cursor-default rounded border-b-2 border-stone-500 bg-stone-200 px-3 py-1 text-[13px] font-medium text-stone-900">
            {el.Text || "Button"}
          </span>
        </div>
      );
      break;
    case "PageNumber": {
      const text = (el.Format ?? "{0}").replace("{0}", String(ctx.pageNumber));
      body = <p className={cn("font-mono text-xs text-stone-500", align)}>{text}</p>;
      break;
    }
    case "Grid": {
      const kids = gridCells(el);
      body = (
        <div>
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${el.Columns ?? PLACEHOLDER_COLUMNS}, minmax(0, 1fr))`,
            }}
          >
            {kids.length > 0
              ? kids.map((c) => (
                  <div key={c.uid} className="rounded border border-stone-300 bg-white/60 p-1">
                    <PreviewElement el={c} ctx={ctx} />
                  </div>
                ))
              : // Empty grid: show capped placeholder cells so the layout stays visible.
                Array.from({
                  length: Math.min(el.Columns ?? PLACEHOLDER_COLUMNS, MAX_PLACEHOLDERS),
                }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded border border-dashed border-stone-300 p-2 text-center font-mono text-[10px] text-stone-300"
                  >
                    cell
                  </div>
                ))}
          </div>
          {el.Source && (
            <p className="mt-0.5 font-mono text-[10px] text-stone-400">
              Source: {el.Source.ItemQuery ?? "ALL_ITEMS (O)"} × template
            </p>
          )}
        </div>
      );
      break;
    }
    case "Input":
      body = (
        <div className={cn(align)}>
          <input
            disabled
            placeholder={el.Placeholder ?? el.InputId ?? "Type..."}
            className="w-full rounded border border-stone-400 bg-white px-2 py-1 text-[13px]"
          />
        </div>
      );
      break;
  }
  return (
    <div style={indent}>
      <ActionTooltip
        actions={[el.Action, ...(el.Actions ?? [])].filter((a): a is string => Boolean(a))}
      >
        <ConditionWrap el={el}>{body}</ConditionWrap>
      </ActionTooltip>
      {(el.DisplayName || el.Description) && (
        <p className="font-mono text-[10px] text-stone-400" title={el.Description}>
          ⓘ {el.DisplayName ?? el.Description}
        </p>
      )}
    </div>
  );
}

function PreviewPage({
  page,
  pageNumber,
  chapterLabel,
  className,
}: {
  page: PageData;
  pageNumber: number;
  chapterLabel?: string;
  className?: string;
}) {
  const ctx = { pageNumber };
  return (
    <div
      className={cn(
        "flex min-h-72 w-full flex-col bg-[#f7f0d8] p-3 shadow-[inset_0_0_30px_rgba(120,90,40,0.15)]",
        className,
      )}
    >
      <p className="mb-1 flex justify-between font-mono text-[10px] text-stone-400">
        <span>{page.Id}</span>
        <span>
          p.{pageNumber}
          {chapterLabel ? ` · ${chapterLabel}` : ""}
        </span>
      </p>
      <div className="space-y-2">
        {page.Elements.map((el) => (
          <PreviewElement key={el.uid} el={el} ctx={ctx} />
        ))}
        {page.Elements.length === 0 && <p className="text-xs text-stone-300 italic">Empty page</p>}
      </div>
    </div>
  );
}

export function Preview({
  pages,
  selectedUid,
  single,
}: {
  pages: PageData[];
  selectedUid: string;
  single?: boolean;
}) {
  const index = Math.max(
    0,
    pages.findIndex((p) => p.uid === selectedUid),
  );
  if (pages.length === 0)
    return (
      <p className="text-sm text-stone-400 dark:text-stone-500">
        No pages yet. Add one with the Page button in the page list.
      </p>
    );
  // Keyed on selection: flipping through the preview is local state, but
  // picking a page in the list re-anchors the spread to that page.
  return <SpreadPreview key={selectedUid} pages={pages} startIndex={index} single={single} />;
}

function SpreadPreview({
  pages,
  startIndex,
  single,
}: {
  pages: PageData[];
  startIndex: number;
  single?: boolean;
}) {
  const [start, setStart] = useState(startIndex);
  const chapterOf = (page: PageData) => page.ChapterId;
  const chapterNumber = (page: PageData) => {
    if (!page.ChapterId) return 0;
    return pages.filter((p) => p.ChapterId === page.ChapterId).indexOf(page) + 1;
  };
  // Single-page mode shows 1 page, spread mode shows 2.
  const perSpread = single ? 1 : 2;
  const safeStart = Math.min(start, Math.max(0, pages.length - 1));
  const spread = pages.slice(safeStart, safeStart + perSpread);
  const [spreadLeft, spreadRight] = spread;
  if (!spreadLeft) return null;
  const maxStart = Math.max(0, pages.length - perSpread);
  return (
    <div className="space-y-1.5">
      <div className="flex overflow-hidden rounded-[4px] ring-1 ring-stone-900/25">
        <div className="min-w-0 flex-1">
          <PreviewPage
            page={spreadLeft}
            pageNumber={safeStart + 1}
            chapterLabel={chapterOf(spreadLeft)}
            className={spreadRight ? "rounded-l-[4px]" : "rounded-[4px]"}
          />
        </div>
        {spreadRight && (
          <>
            <div
              aria-hidden
              className="w-3 shrink-0 bg-[#e4d5ac] shadow-[inset_7px_0_10px_-7px_rgba(60,40,10,0.6),inset_-7px_0_10px_-7px_rgba(60,40,10,0.6)]"
            />
            <div className="min-w-0 flex-1">
              <PreviewPage
                page={spreadRight}
                pageNumber={safeStart + 2}
                chapterLabel={chapterOf(spreadRight)}
                className="rounded-r-[4px]"
              />
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Previous page"
          disabled={safeStart <= 0}
          onClick={() => setStart((s) => Math.max(0, s - 1))}
          className="h-6 w-6"
        >
          <ChevronLeft size={14} />
        </Button>
        <p className="flex-1 text-center font-mono text-[10px] text-stone-400 dark:text-stone-500">
          {spreadLabel(safeStart, spreadRight, pages.length, spreadLeft, chapterOf, chapterNumber)}
        </p>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Next page"
          disabled={safeStart >= maxStart}
          onClick={() => setStart((s) => Math.min(maxStart, s + 1))}
          className="h-6 w-6"
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
