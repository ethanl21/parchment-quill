import { useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, Download, OctagonX } from "lucide-react";
import { Preview } from "./preview";
import { UnderlineTabs } from "./ui/tabs";
import { Button } from "./ui/button";
import { CodeBlock } from "./ui/code-block";
import { toCSharp } from "../lib/export-csharp";
import { toExportObject } from "../lib/model";
import { downloadFile } from "../lib/storage";
import { validateDoc } from "../lib/validate";
import type { Doc } from "../types/parchment";

export function RightPanel({ doc, selectedUid }: { doc: Doc; selectedUid: string }) {
  const [tab, setTab] = useState("preview");
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => JSON.stringify(toExportObject(doc), null, 2), [doc]);
  const csharp = useMemo(() => toCSharp(doc), [doc]);
  const issues = useMemo(() => validateDoc(doc), [doc]);
  const errors = issues.filter((i) => i.level === "error");
  const hasErrors = errors.length > 0;

  const exports = {
    json: {
      text: json,
      file: `${doc.slug || "book"}.json`,
      mime: "application/json",
      language: "json" as const,
    },
    csharp: {
      text: csharp,
      file: `${doc.slug || "Book"}.cs`,
      mime: "text/plain",
      language: "csharp" as const,
    },
  };
  const active = tab === "json" ? exports.json : exports.csharp;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(active.text);
      setCopied(true);
      // Reset the "Copied" label after 1.5s.
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked, download still works
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="shrink-0">
        <UnderlineTabs
          value={tab}
          onValueChange={setTab}
          tabs={[
            { value: "preview", label: "Preview" },
            { value: "json", label: "JSON" },
            { value: "csharp", label: "C#" },
          ]}
        />
      </div>
      {tab === "preview" && (
        <Preview
          pages={doc.book.Pages}
          selectedUid={selectedUid}
          single={doc.book.Layout.IsSinglePage}
        />
      )}
      {tab !== "preview" && (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          {/* Export actions. */}
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadFile(active.file, active.text, active.mime)}
            >
              <Download size={14} /> {active.file}
            </Button>
          </div>
          <CodeBlock
            code={active.text}
            language={active.language}
            className="min-h-0 flex-1 lg:h-full lg:max-h-full"
          />
        </div>
      )}
      {/* Validation issues: red when there are errors, amber when only suggestions. */}
      {issues.length > 0 && (
        <div
          className={
            hasErrors
              ? "mt-auto shrink-0 space-y-1 rounded-md border border-red-200 bg-red-50 p-2 dark:border-red-900 dark:bg-red-950/40"
              : "mt-auto shrink-0 space-y-1 rounded-md border border-amber-200 bg-amber-50 p-2 dark:border-amber-900 dark:bg-amber-500/10"
          }
        >
          <p
            className={
              hasErrors
                ? "text-xs font-semibold text-red-800 dark:text-red-200"
                : "text-xs font-semibold text-amber-800 dark:text-amber-200"
            }
          >
            {hasErrors
              ? `${errors.length} problem${errors.length === 1 ? "" : "s"}`
              : "Suggestions"}{" "}
            (exports still work, Parchment logs what it skips)
          </p>
          <ul className="space-y-0.5">
            {issues.map((issue, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-xs text-stone-600 dark:text-stone-300"
              >
                {issue.level === "error" ? (
                  <OctagonX size={13} className="mt-0.5 shrink-0 text-red-700" />
                ) : (
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-600" />
                )}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
