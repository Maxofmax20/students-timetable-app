import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  icon?: string;
  hideLabel?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, containerClassName, icon, hideLabel, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div className={cn("flex flex-col gap-2", containerClassName)}>
        {label && !hideLabel && (
          <label htmlFor={inputId} className="ml-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {label}
          </label>
        )}
        <div className="group relative">
          {icon && (
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--gold)]">
              {icon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "w-full rounded-2xl border bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] py-3.5 text-sm font-medium text-[var(--text)] shadow-[var(--shadow-sm)] transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] focus:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-50",
              icon ? "border-[var(--border)] pl-11 pr-4" : "border-[var(--border)] px-4",
              error && "border-[var(--danger)]/60 focus:border-[var(--danger)] focus:ring-[var(--danger)]/20",
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="ml-1 text-[11px] font-semibold text-[var(--danger)]">{error}</p>
        ) : helperText ? (
          <p className="ml-1 text-[11px] text-[var(--text-secondary)]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
