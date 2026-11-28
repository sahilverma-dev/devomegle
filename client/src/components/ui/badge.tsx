/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex select-none items-center gap-1.5 whitespace-nowrap rounded-md border font-mono text-[10px] font-medium uppercase leading-none tracking-[0.14em] [&_svg]:h-3 [&_svg]:w-3",
  {
    variants: {
      variant: {
        outline: "border-white/10 bg-white/[0.03] text-muted-foreground",
        solid: "border-transparent bg-primary text-primary-foreground",
        muted: "border-transparent bg-white/[0.07] text-foreground",
        signal: "border-signal/25 bg-signal/10 text-signal",
        danger: "border-danger/25 bg-danger/10 text-danger",
        ok: "border-ok/25 bg-ok/10 text-ok",
      },
      size: {
        sm: "px-1.5 py-1",
        default: "px-2 py-[5px]",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
