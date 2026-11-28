import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  label?: string;
}

/** A thin signal-coloured arc, sized by the caller. */
const Spinner = ({ className, label = "Loading" }: SpinnerProps) => (
  <span
    role="status"
    aria-label={label}
    className={cn(
      "inline-block h-4 w-4 animate-spin rounded-full border-[1.5px] border-white/15 border-t-signal",
      className
    )}
  />
);

export { Spinner };
