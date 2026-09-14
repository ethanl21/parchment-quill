import { useEffect, useRef, useState } from "react";
import { BookOpenText, FileUp, RotateCcw } from "lucide-react";
import { BookSettings } from "./components/book-settings";
import { PageEditor } from "./components/page-editor";
import { PageList } from "./components/page-list";
import { RightPanel } from "./components/right-panel";
import { ThemeSwitcher } from "./components/theme-switcher";
import { Button } from "./components/ui/button";
import { bookIdOf, importBook, seedDoc } from "./lib/model";
import { loadDoc, saveDoc } from "./lib/storage";
import { useTheme } from "./lib/theme";
import { useBookDoc } from "./state/book-reducer";
import { cn } from "./lib/utils";

declare const __APP_VERSION__: string;

export default function App() {
  const [initial] = useState(() => loadDoc() ?? seedDoc());
  const { doc, dispatch } = useBookDoc(initial);
  const [selectedUid, setSelectedUid] = useState(initial.book.Pages[0]?.uid ?? "");
  const [center, setCenter] = useState<"page" | "book">("page");
  const { preference, setPreference } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveDoc(doc);
  }, [doc]);

  const pageIndex = doc.book.Pages.findIndex((p) => p.uid === selectedUid);
  // The saved selection can go stale after an import or delete; fall back to the first page.
  const page = pageIndex >= 0 ? doc.book.Pages[pageIndex] : doc.book.Pages[0];
  const activeUid = page?.uid ?? "";

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text()) as Record<string, unknown>;
      const next = importBook(raw);
      dispatch({ type: "replace-doc", doc: next });
      setSelectedUid(next.book.Pages[0]?.uid ?? "");
      setCenter("page");
    } catch {
      // bad JSON, keep the current book
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-amber-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-100/60 px-4 py-2 dark:border-amber-900 dark:bg-amber-950/40">
        <h1 className="flex items-center gap-1.5 font-serif text-[17px] font-bold">
          <BookOpenText size={18} className="text-amber-700 dark:text-amber-500" /> Parchment Quill
        </h1>
        <code className="rounded bg-amber-200/60 px-2 py-0.5 font-mono text-xs text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
          {bookIdOf(doc)}
        </code>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[11px] text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {doc.book.Pages.length} page{doc.book.Pages.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeSwitcher value={preference} onChange={setPreference} />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <FileUp size={14} /> Import JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              dispatch({ type: "replace-doc", doc: seedDoc() });
              setCenter("page");
            }}
          >
            <RotateCcw size={14} /> Example
          </Button>
        </div>
      </header>

      {/* Three columns on desktop: page list, page/book editor, preview and export. */}
      <main className="mx-auto grid min-h-0 w-full max-w-7xl flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[220px_minmax(0,1fr)_400px] lg:overflow-hidden">
        <aside className="rounded-lg border border-stone-200 bg-white p-2.5 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain dark:border-stone-800 dark:bg-stone-900">
          <PageList
            pages={doc.book.Pages}
            selectedUid={activeUid}
            dispatch={dispatch}
            onSelect={(uid) => {
              setSelectedUid(uid);
              setCenter("page");
            }}
          />
        </aside>

        <section className="min-h-0 min-w-0 rounded-lg border border-stone-200 bg-white p-3 lg:overflow-y-auto lg:overscroll-contain dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-3 flex gap-1 rounded-md bg-stone-100 p-1 dark:bg-stone-800">
            {(["page", "book"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCenter(t)}
                className={cn(
                  "flex-1 cursor-pointer rounded px-2 py-1 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-stone-400",
                  center === t
                    ? "bg-amber-100 text-amber-900 shadow-xs dark:bg-amber-950 dark:text-amber-200"
                    : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100",
                )}
              >
                {t === "page" ? `Page: ${page?.Id ?? "?"}` : "Book settings"}
              </button>
            ))}
          </div>
          {/* Center tab: the page editor, or book settings when the book has no pages. */}
          {center === "page" && page ? (
            <PageEditor key={page.uid} page={page} dispatch={dispatch} />
          ) : (
            <BookSettings doc={doc} dispatch={dispatch} />
          )}
        </section>

        <aside className="flex min-w-0 flex-col rounded-lg border border-stone-200 bg-white p-3 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain dark:border-stone-800 dark:bg-stone-900">
          <RightPanel doc={doc} selectedUid={activeUid} />
        </aside>
      </main>

      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-amber-200 bg-amber-100/60 px-4 py-2 text-[11px] text-stone-500 dark:border-amber-900 dark:bg-amber-950/40 dark:text-stone-400">
        <span>
          Book content exports as Content Patcher JSON or SMAPI C#. Wire it up per{" "}
          <a
            className="text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-700 dark:text-emerald-300"
            href="https://floogen.github.io/Parchment/getting-started/first-book/"
            target="_blank"
            rel="noreferrer"
          >
            Your first book
          </a>
          . Drafts autosave in this browser.
        </span>
        <span className="shrink-0 font-mono">v{__APP_VERSION__}</span>
      </footer>
    </div>
  );
}
