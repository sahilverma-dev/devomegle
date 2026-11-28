import * as React from "react";

import { cn } from "@/lib/utils";

interface TooltipProps {
  label: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

/**
 * Lightweight tooltip: no portal, no dependency. It reveals on hover and on
 * keyboard focus, and it is hidden from assistive technology because the
 * trigger already carries its own accessible name.
 */
const Tooltip = ({ label, children, side = "top", className }: TooltipProps) => (
  <span className={cn("group/tt relative inline-flex", className)}>
    {children}
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#16171a] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground opacity-0 shadow-float transition-opacity duration-150",
        "group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
        side === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"
      )}
    >
      {label}
    </span>
  </span>
);

export { Tooltip };
