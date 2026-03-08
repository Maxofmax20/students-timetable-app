import React from 'react';
import { cn } from '@/lib/utils';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export function SearchInput({ className, containerClassName, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative flex-1 max-w-md", containerClassName)}>
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xl pointer-events-none">
        search
      </span>
      <input
        type="text"
        className={cn(
          "w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-md)] pl-10 pr-10 py-2 text-sm text-[var(--text)] transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]",
          className
        )}
        {...props}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-3)] px-1.5 font-sans text-[10px] font-medium text-[var(--text-muted)] opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>
    </div>
  );
}
