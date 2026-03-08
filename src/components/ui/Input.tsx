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
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && !hideLabel && (
          <label 
            htmlFor={inputId} 
            className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1"
          >
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--text-muted)] text-[20px] group-focus-within:text-[var(--gold)] transition-colors">
              {icon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "w-full bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] py-3 text-sm text-[var(--text)] transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed",
              icon ? "pl-11 pr-4" : "px-4",
              error && "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[10px] font-bold text-[var(--danger)] uppercase tracking-wider ml-1 mt-0.5">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-[10px] text-[var(--text-muted)] font-medium ml-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
