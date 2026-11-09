import { Braces } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  markOnly?: boolean;
}

export const Logo = ({ className, markOnly = false }: LogoProps) => {
  return (
    <div className={cn("flex select-none items-center gap-2.5", className)}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br from-primary/90 to-fuchsia-500/80 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.7)]">
        <span className="absolute inset-0 rounded-xl bg-primary/30 blur-md" />
        <Braces className="relative h-5 w-5 text-primary-foreground" strokeWidth={2.6} />
      </span>
      {!markOnly && (
        <span className="font-mono text-lg font-semibold tracking-tight">
          <span className="text-foreground">Dev</span>
          <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
            Omegle
          </span>
        </span>
      )}
    </div>
  );
};
