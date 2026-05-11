import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-white/14 bg-white/7 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70",
        className
      )}
      {...props}
    />
  );
}
