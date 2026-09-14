import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors outline-none select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-stone-400 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-amber-800 text-amber-50 hover:bg-amber-700 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400",
        secondary:
          "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900",
        outline:
          "border border-stone-300 bg-transparent hover:border-amber-600 hover:bg-amber-50 hover:text-amber-900 dark:border-stone-700 dark:hover:border-amber-500 dark:hover:bg-amber-950 dark:hover:text-amber-200",
        ghost: "hover:bg-amber-100 hover:text-amber-900 dark:hover:bg-stone-800",
        destructive: "bg-red-700 text-white hover:bg-red-600",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2 text-xs",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
