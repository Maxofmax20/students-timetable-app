import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "ghost-danger" | "soft-gold";
  size?: "sm" | "md" | "lg" | "icon" | "full";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", isLoading, children, disabled, type, ...props }, ref) => {
    const variants = {
      primary: "border-[var(--gold-hover)] bg-[var(--gold)] text-[var(--gold-fg)] shadow-[var(--shadow-glow)] hover:bg-[var(--gold-hover)] hover:shadow-[var(--shadow-md)]",
      secondary: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] shadow-[var(--shadow-sm)] hover:border-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:shadow-[var(--shadow-md)]",
      ghost: "border-transparent bg-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
      danger: "border-[var(--danger)] bg-[var(--danger)] text-white shadow-[var(--shadow-sm)] hover:brightness-110 hover:shadow-[var(--shadow-md)]",
      "ghost-danger": "border-transparent bg-transparent text-[var(--danger)] hover:border-[var(--danger)]/20 hover:bg-[var(--danger-muted)]",
      "soft-gold": "border-[var(--gold)]/25 bg-[var(--gold-muted)] text-[var(--gold)] shadow-[var(--shadow-sm)] hover:bg-[var(--gold)]/20"
    };

    const sizes = {
      sm: "h-9 px-3.5 text-xs gap-1.5",
      md: "h-11 px-4.5 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5",
      icon: "h-11 w-11 p-0 items-center justify-center",
      full: "h-11 w-full px-4 text-sm justify-center"
    };

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center rounded-xl border font-bold tracking-[0.01em] transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
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
