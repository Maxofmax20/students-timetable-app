import * as React from "react";
import { cn, toUiStatus } from "@/lib/utils";
import type { Row } from "@/types";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "danger" | "warning";
  status?: string; // Optional: auto-maps from raw DB status to UI status
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", status, children, ...props }, ref) => {
    
    // Auto-resolve workspace status badge styling if status string provided
    let autoClass = "";
    let displayValue = children;
    
    if (status && !children) {
      const uiStatus = toUiStatus(status);
      displayValue = uiStatus;
      autoClass = `w-status ${uiStatus.toLowerCase()}`;
    }

    return (
      <span
        ref={ref}
        className={cn(
          autoClass || "inline-flex items-center rounded-md border border-[var(--line)] px-2.5 py-1 text-xs font-semibold",
          {
            "bg-[#111] text-[var(--muted)]": variant === "default" && !autoClass,
            "border-[var(--ok)] text-[var(--ok)]": variant === "success" && !autoClass,
            "border-[var(--danger)] text-white bg-[#e146464d]": variant === "danger" && !autoClass,
            "border-[var(--gold)] text-[var(--gold-soft)]": variant === "warning" && !autoClass,
          },
          className
        )}
        {...props}
      >
        {displayValue}
      </span>
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
