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
      primary:
        "border-[var(--gold-hover)] bg-[linear-gradient(180deg,var(--gold),var(--gold-hover))] text-[var(--gold-fg)] shadow-[var(--shadow-glow)] hover:-translate-y-[1px] hover:shadow-[var(--shadow-md)] focus-visible:ring-[var(--focus-ring)]",
      secondary:
        "border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-2),var(--surface-3))] text-[var(--text)] shadow-[var(--shadow-sm)] hover:border-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:-translate-y-[1px] hover:shadow-[var(--shadow-md)] focus-visible:ring-[var(--focus-ring)]",
      ghost:
        "border-transparent bg-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:ring-[var(--focus-ring)]",
      danger:
        "border-[var(--danger)] bg-[linear-gradient(180deg,var(--danger),color-mix(in srgb,var(--danger) 84%,black))] text-white shadow-[var(--shadow-sm)] hover:-translate-y-[1px] hover:brightness-110 hover:shadow-[var(--shadow-md)] focus-visible:ring-[var(--danger)]/20",
      "ghost-danger":
        "border-transparent bg-transparent text-[var(--danger)] hover:border-[var(--danger)]/20 hover:bg-[var(--danger-muted)] focus-visible:ring-[var(--danger)]/20",
      "soft-gold":
        "border-[var(--gold)]/25 bg-[var(--gold-muted)] text-[var(--gold)] shadow-[var(--shadow-sm)] hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/20 focus-visible:ring-[var(--focus-ring)]"
    } as const;

    const sizes = {
      sm: "h-9 px-3.5 text-xs gap-1.5 rounded-xl",
      md: "h-11 px-4.5 text-sm gap-2 rounded-2xl",
      lg: "h-12 px-6 text-base gap-2.5 rounded-2xl",
      icon: "h-11 w-11 p-0 items-center justify-center rounded-2xl",
      full: "h-11 w-full px-4 text-sm justify-center rounded-2xl"
    } as const;

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        disabled={disabled || isLoading}
        className={cn(
          "relative inline-flex items-center justify-center border font-bold tracking-[0.01em] transition-all duration-200 ease-out outline-none focus-visible:ring-4 active:translate-y-px active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 disabled:active:translate-y-0 disabled:active:scale-100",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="-ml-1 mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
