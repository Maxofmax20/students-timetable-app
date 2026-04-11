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
    <div className={cn(
      variant === "action" 
        ? "flex p-1.5 gap-1.5 bg-[var(--surface-2)] rounded-[20px] overflow-x-auto hide-scrollbar w-full snap-x snap-mandatory items-center" 
        : "flex gap-6 border-b border-[var(--border)] overflow-x-auto hide-scrollbar w-full snap-x snap-mandatory px-2 sm:px-0",
      className
    )}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement<TabProps>(child)) return null;
        return React.cloneElement(child, {
          active: child.props.value === value,
          onClick: () => onValueChange(child.props.value),
          variant
        } as Partial<TabProps>);
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
        "snap-start shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]",
        variant === "action" 
          ? cn("flex-1 min-w-max whitespace-nowrap px-5 py-2.5 text-sm font-bold rounded-2xl transition-all select-none", 
               active ? "bg-[var(--surface)] text-[var(--gold)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--border)]" : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface-3)]/40") 
          : cn("whitespace-nowrap py-4 text-sm font-bold border-b-2 transition-colors relative -mb-[1px] select-none", 
               active ? "border-[var(--gold)] text-[var(--gold)]" : "border-transparent text-[var(--text-secondary)] hover:text-white hover:border-[var(--border)]"),
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
