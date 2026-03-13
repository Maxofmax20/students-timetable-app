import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  icon?: string;
  hideLabel?: boolean;
  passwordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    label,
    error,
    helperText,
    containerClassName,
    icon,
    hideLabel,
    id,
    type,
    passwordToggle = false,
    style,
    ...props
  }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const canTogglePassword = passwordToggle && type === "password";
    const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
    const inputType = canTogglePassword ? (isPasswordVisible ? "text" : "password") : type;

    return (
      <div className={cn("flex flex-col gap-2", containerClassName)}>
        {label && !hideLabel && (
          <label htmlFor={inputId} className="ml-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {label}
          </label>
        )}
        <div className="group relative">
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-[20px] text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--gold)]">
              <span className="material-symbols-outlined">{icon}</span>
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            type={inputType}
            className={cn(
              "w-full rounded-2xl border bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] px-4 py-3.5 text-sm font-medium text-[var(--text)] shadow-[var(--shadow-sm)] transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] focus:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-50",
              "border-[var(--border)]",
              error && "border-[var(--danger)]/60 focus:border-[var(--danger)] focus:ring-[var(--danger)]/20",
              className
            )}
            style={{
              ...style,
              ...(icon ? { paddingLeft: '3.75rem' } : null),
              ...(canTogglePassword ? { paddingRight: '3.75rem' } : null),
            }}
            {...props}
          />
          {canTogglePassword && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setIsPasswordVisible((visible) => !visible)}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl text-[var(--text-muted)] transition-colors hover:text-[var(--gold)] focus:outline-none focus:text-[var(--gold)]"
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              aria-pressed={isPasswordVisible}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isPasswordVisible ? "visibility_off" : "visibility"}
              </span>
            </button>
          )}
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
