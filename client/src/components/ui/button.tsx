/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Buttons read as physical keys: a light top edge, a compressed shadow, and a
 * one pixel of travel on press.
 */
const buttonVariants = cva(
  [
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap",
    "font-medium tracking-[-0.01em]",
    "transition-[transform,background-color,border-color,box-shadow,color,filter] duration-150 ease-out",
    "active:translate-y-[0.5px]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-white to-[#dfe1e5] text-[#0a0a0b] shadow-tactile-primary hover:from-white hover:to-white",
        secondary:
          "border border-white/10 bg-gradient-to-b from-white/[0.09] to-white/[0.03] text-foreground shadow-tactile hover:border-white/20 hover:from-white/[0.14]",
        outline:
          "border border-white/[0.14] bg-transparent text-foreground hover:border-white/25 hover:bg-white/[0.05]",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
        signal:
          "bg-signal text-signal-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.35),0_1px_2px_hsl(0_0%_0%/0.5)] hover:brightness-[1.04]",
        destructive:
          "bg-danger text-danger-foreground shadow-tactile hover:brightness-110",
        destructiveSoft:
          "border border-danger/25 bg-danger/10 text-danger hover:bg-danger/15",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 gap-1.5 rounded-lg px-3 text-[13px]",
        default: "h-11 rounded-[10px] px-4 text-sm md:h-10",
        lg: "h-12 rounded-xl px-6 text-[15px]",
        icon: "h-11 w-11 rounded-[10px] md:h-10 md:w-10",
        iconSm: "h-8 w-8 rounded-lg",
        iconLg: "h-12 w-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
