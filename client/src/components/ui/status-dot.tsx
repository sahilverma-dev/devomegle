import { cn } from "@/lib/utils";

type StatusTone = "live" | "pending" | "offline" | "danger";

const TONES: Record<StatusTone, string> = {
  live: "bg-ok shadow-[0_0_0_3px_hsl(var(--ok)/0.14)]",
  pending: "bg-warn shadow-[0_0_0_3px_hsl(var(--warn)/0.12)]",
  offline: "bg-white/25",
  danger: "bg-danger shadow-[0_0_0_3px_hsl(var(--destructive)/0.14)]",
};

interface StatusDotProps {
  tone?: StatusTone;
  pulse?: boolean;
  className?: string;
}

const StatusDot = ({ tone = "live", pulse, className }: StatusDotProps) => (
  <span className={cn("relative inline-flex h-1.5 w-1.5", className)}>
    {pulse && (
      <span
        className={cn(
          "absolute inset-0 animate-ping rounded-full opacity-60",
          TONES[tone]
        )}
      />
    )}
    <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", TONES[tone])} />
  </span>
);

export { StatusDot };
export type { StatusTone };
