import { useMemo } from "react";
import hljs from "highlight.js/lib/core";
import csharp from "highlight.js/lib/languages/csharp";
import json from "highlight.js/lib/languages/json";
import { cn } from "../../lib/utils";

hljs.registerLanguage("json", json);
hljs.registerLanguage("csharp", csharp);

export type CodeLanguage = "json" | "csharp";

export function CodeBlock({
  code,
  language,
  className,
}: {
  code: string;
  language: CodeLanguage;
  className?: string;
}) {
  const html = useMemo(() => hljs.highlight(code, { language }).value, [code, language]);
  return (
    <pre
      className={cn(
        "max-h-[60vh] overflow-auto rounded-md border border-stone-200 bg-stone-950 p-3 font-mono text-[11px] leading-relaxed dark:border-stone-800",
        className,
      )}
    >
      <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}
