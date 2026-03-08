import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, containerClassName, id, ...props }, ref) => {
    const inputId = id || React.useId();
    
    return (
      <div className={cn("grid gap-1.5", containerClassName)}>
        {label && <label htmlFor={inputId}>{label}</label>}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full rounded-md border border-[var(--line)] bg-[linear-gradient(180deg,#111111,#1a1a1a)] px-3.5 py-3 text-[var(--text)] transition-colors focus:border-[var(--gold)] focus:outline-none focus:ring-4 focus:ring-[#d4af373d]",
            error && "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[#e146463d]",
            className
          )}
          {...props}
        />
        {error && <span className="text-sm text-[var(--danger)]">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
