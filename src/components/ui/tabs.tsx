import { Tabs } from "@base-ui/react/tabs";
import { cn } from "../../lib/utils";

export function UnderlineTabs({
  value,
  onValueChange,
  tabs,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  tabs: { value: string; label: React.ReactNode }[];
  className?: string;
}) {
  return (
    <Tabs.Root value={value} onValueChange={(v) => onValueChange(v as string)}>
      <Tabs.List
        className={cn("flex gap-1 border-b border-stone-200 dark:border-stone-800", className)}
      >
        {tabs.map((t) => (
          <Tabs.Tab
            key={t.value}
            value={t.value}
            className="cursor-pointer rounded-t-md px-3 py-1.5 text-sm text-stone-500 outline-none hover:text-stone-900 data-active-tab:text-amber-900 data-active-tab:shadow-[inset_0_-2px_0_0_var(--color-amber-700)] focus-visible:ring-2 focus-visible:ring-stone-400 dark:text-stone-400 dark:hover:text-stone-100 dark:data-active-tab:text-amber-200 dark:data-active-tab:shadow-[inset_0_-2px_0_0_var(--color-amber-500)]"
          >
            {t.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
