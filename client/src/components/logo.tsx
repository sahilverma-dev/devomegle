import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  markClassName?: string;
}

/**
 * The mark is a pair of brackets facing each other with a live node between
 * them: two developers, one room.
 */
const Logo = ({ className, showWordmark = true, markClassName }: LogoProps) => (
  <span className={cn("inline-flex select-none items-center gap-2.5", className)}>
    <span
      className={cn(
        "relative grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-white/[0.12] bg-gradient-to-b from-white/[0.13] to-white/[0.02] shadow-tactile",
        markClassName
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="h-[18px] w-[18px]"
      >
        <path
          d="M9.25 7 4.5 12l4.75 5"
          stroke="hsl(var(--signal))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.75 7 19.5 12l-4.75 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="1.15" fill="hsl(var(--signal))" />
      </svg>
      <span className="absolute -right-[2px] -top-[2px] h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_7px_hsl(var(--signal)/0.9)]" />
    </span>
    {showWordmark && (
      <span className="text-[15px] font-semibold leading-none tracking-[-0.025em] text-foreground">
        devomegle
      </span>
    )}
  </span>
);

export default Logo;
