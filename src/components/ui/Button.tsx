import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "ghost" | "danger" | "nav" | "quick";
  size?: "default" | "sm" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base styles for standard buttons
          variant !== "nav" && variant !== "quick" ? "btn" : "",
          
          // Workspace-specific variations
          variant === "nav" && "builder-tab",
          variant === "quick" && "quick-btn",
          
          // Standard variants from globals.css & workspace.css
          {
            "primary": variant === "primary",
            "secondary": variant === "secondary",
            "ghost": variant === "ghost",
            "danger": variant === "danger",
            "w-icon-btn": size === "icon",
          },
          className
        )}
        {...props}
      >
        {isLoading ? <span className="material-symbols-outlined animate-spin" style={{ animation: "spin 1s linear infinite" }}>sync</span> : children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
