import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "../lib/utils";
import type { ThemePreference } from "../lib/theme";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeSwitcher({
  value,
  onChange,
}: {
  value: ThemePreference;
  onChange: (v: ThemePreference) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Color theme"
      className="flex gap-0.5 rounded-md bg-stone-100 p-0.5 dark:bg-stone-800"
    >
      {OPTIONS.map(({ value: v, label, Icon }) => (
        <button
          key={v}
          type="button"
          title={`${label} theme`}
          aria-label={`${label} theme`}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "cursor-pointer rounded px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-stone-400",
            value === v
              ? "bg-white text-stone-900 shadow-xs dark:bg-stone-950 dark:text-stone-100"
              : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100",
          )}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}
