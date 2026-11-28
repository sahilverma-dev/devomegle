import * as React from "react";

import { cn } from "@/lib/utils";

const Kbd = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <kbd
    ref={ref}
    className={cn(
      "inline-flex h-5 min-w-[1.25rem] select-none items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.06] px-1.5 font-mono text-[10px] font-medium leading-none text-muted-foreground",
      "shadow-[inset_0_1px_0_hsl(0_0%_100%/0.08),0_1px_0_hsl(0_0%_0%/0.5)]",
      className
    )}
    {...props}
  />
));
Kbd.displayName = "Kbd";

export { Kbd };
