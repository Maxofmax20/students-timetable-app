import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  options: { label: string; value: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, containerClassName, id, options, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id ?? generatedId;
    
    return (
      <div className={cn("grid gap-1.5", containerClassName)}>
        {label && <label htmlFor={selectId}>{label}</label>}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "appearance-none w-full rounded-md border border-[var(--line)] bg-[linear-gradient(180deg,#111111,#1a1a1a)] px-3.5 py-3 pr-10 text-[var(--text)] transition-colors focus:border-[var(--gold)] focus:outline-none focus:ring-4 focus:ring-[#d4af373d]",
              error && "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[#e146463d]",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--muted)]">
            <span className="material-symbols-outlined text-xl">expand_more</span>
          </div>
        </div>
        {error && <span className="text-sm text-[var(--danger)]">{error}</span>}
      </div>
    );
  }
);
Select.displayName = "Select";
