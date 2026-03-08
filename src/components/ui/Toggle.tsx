import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, label, checked, onCheckedChange, ...props }, ref) => {
    return (
      <button 
        type="button" 
        role="switch"
        aria-checked={checked}
        className={cn("w-toggle-row", className)} 
        onClick={() => onCheckedChange(!checked)}
        ref={ref}
        {...props}
      >
        <span>{label}</span>
        <span className={cn("w-toggle", checked && "on")}>
          <span className="w-toggle-dot" />
        </span>
      </button>
    );
  }
);
Toggle.displayName = "Toggle";

export { Toggle };
