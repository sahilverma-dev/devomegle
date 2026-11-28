import * as React from "react";

import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "font-mono text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-muted-foreground",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
