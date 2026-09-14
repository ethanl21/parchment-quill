import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronRight } from "lucide-react";

export function AdvancedSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible.Root className="rounded-md border border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-500/10">
      <Collapsible.Trigger className="group flex w-full cursor-pointer items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-violet-800 outline-none hover:text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-400 dark:text-violet-300 dark:hover:text-violet-200">
        <ChevronRight size={14} className="transition-transform group-data-panel-open:rotate-90" />
        {title ?? "Advanced"}
      </Collapsible.Trigger>
      <Collapsible.Panel className="space-y-2 px-2.5 pb-2.5">{children}</Collapsible.Panel>
    </Collapsible.Root>
  );
}
