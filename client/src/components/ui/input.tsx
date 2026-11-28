import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Text entry sits in a recessed well. The font size stays at 16px on phones so
 * iOS does not zoom the viewport when the field is focused.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[10px] border border-white/10 bg-black/40 px-3 text-base text-foreground shadow-recessed md:h-10 md:text-sm",
          "transition-colors placeholder:text-faint",
          "focus-visible:border-signal/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/15",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
