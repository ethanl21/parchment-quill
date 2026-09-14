import { cn } from "../../lib/utils";

const fieldClass =
  "w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm shadow-xs outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 font-sans dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:focus:border-amber-400 dark:focus:ring-amber-400";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, "h-8", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(fieldClass, "min-h-16 font-mono text-xs", className)} {...props} />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClass, "h-8 pr-8", className)} {...props} />;
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="block text-xs font-medium text-stone-500 dark:text-stone-400">{label}</span>
      {children}
    </label>
  );
}

export function Num({
  value,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <Input
      type="number"
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? undefined : Number(v));
      }}
      {...props}
    />
  );
}

export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
      <input
        type="checkbox"
        className="h-4 w-4 accent-emerald-700 dark:accent-emerald-500"
        checked={checked ?? false}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function PointRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: { X: number; Y: number };
  onChange: (v: { X: number; Y: number } | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="block text-xs font-medium text-stone-500 dark:text-stone-400">{label}</span>
      <div className="flex gap-1">
        {(["X", "Y"] as const).map((axis) => (
          <Num
            key={axis}
            aria-label={`${label} ${axis}`}
            placeholder={axis}
            value={value?.[axis]}
            onChange={(n) => {
              if (
                n === undefined &&
                (value?.[axis === "X" ? "Y" : "X"] ?? undefined) === undefined
              ) {
                onChange(undefined);
              } else {
                onChange({ X: value?.X ?? 0, Y: value?.Y ?? 0, [axis]: n ?? 0 });
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function PointInput(props: {
  label: string;
  value?: { X: number; Y: number };
  onChange: (v: { X: number; Y: number } | undefined) => void;
}) {
  return <PointRow {...props} />;
}

export function RectInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: { X: number; Y: number; Width: number; Height: number };
  onChange: (v: { X: number; Y: number; Width: number; Height: number } | undefined) => void;
}) {
  const set = (axis: "X" | "Y" | "Width" | "Height") => (n: number | undefined) => {
    if (n === undefined && !value) return onChange(undefined);
    onChange({ X: 0, Y: 0, Width: 0, Height: 0, ...value, [axis]: n ?? 0 });
  };
  return (
    <div className="space-y-1">
      <span className="block text-xs font-medium text-stone-500 dark:text-stone-400">{label}</span>
      <div className="grid grid-cols-4 gap-1">
        {(["X", "Y", "Width", "Height"] as const).map((axis) => (
          <Num
            key={axis}
            aria-label={`${label} ${axis}`}
            placeholder={axis}
            value={value?.[axis]}
            onChange={set(axis)}
          />
        ))}
      </div>
    </div>
  );
}
