import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface BrowserProps {
  children: ReactNode;
  className?: string;
}

export function Browser({ children, className }: BrowserProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-fd-background overflow-hidden shadow-lg",
        className
      )}
    >
      <div className="flex items-center px-4 py-2.5 border-b border-border bg-fd-muted/30">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-fd-foreground/20 border border-border" />
          <div className="w-3 h-3 rounded-full bg-fd-foreground/20 border border-border" />
          <div className="w-3 h-3 rounded-full bg-fd-foreground/20 border border-border" />
        </div>
      </div>

      <div className="bg-fd-background">{children}</div>
    </div>
  );
}
