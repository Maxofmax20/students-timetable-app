import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  variant?: "builder" | "action";
}

export function Tabs({ value, onValueChange, children, className, variant = "builder" }: TabsProps) {
  return (
    <div className={cn(variant === "action" ? "w-action-tabs" : "builder-tabs", className)}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement<TabProps>(child)) return null;
        return React.cloneElement(child, {
          active: child.props.value === value,
          onClick: () => onValueChange(child.props.value),
          variant
        } as any);
      })}
    </div>
  );
}

export interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  active?: boolean;
  variant?: "builder" | "action";
}

export function Tab({ value, active, variant, children, className, onClick, ...props }: TabProps) {
  return (
    <button
      className={cn(
        variant === "action" ? "w-action-tab" : "builder-tab",
        active && "active",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
