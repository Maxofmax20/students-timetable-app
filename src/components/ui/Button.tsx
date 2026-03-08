import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "ghost-danger" | "soft-gold";
  size?: "sm" | "md" | "lg" | "icon" | "full";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-gradient-to-br from-[var(--gold)] to-[var(--gold-hover)] text-[var(--gold-fg)] border-none shadow-[var(--shadow-glow)] hover:brightness-110",
      secondary: "bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-3)] hover:border-[var(--text-muted)]",
      ghost: "bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
      danger: "bg-[var(--danger)] text-white border-none hover:brightness-110",
      "ghost-danger": "bg-transparent text-[var(--danger)] border-transparent hover:bg-[var(--danger-muted)]",
      "soft-gold": "bg-[var(--gold-muted)] text-[var(--gold)] border-[var(--gold)]/20 hover:bg-[var(--gold)]/20"
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5",
      icon: "h-10 w-10 p-0 items-center justify-center",
      full: "h-10 w-full px-4 text-sm justify-center"
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center font-semibold rounded-[var(--radius-md)] border transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
