import * as React from "react";


interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, onMenuClick, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--surface-1)]/80 backdrop-blur-md px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <button 
          className="lg:hidden text-[var(--muted)] hover:text-[var(--text)] transition-colors flex items-center justify-center rounded-md p-1.5 hover:bg-[var(--surface-2)]"
          onClick={onMenuClick}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        
        <div className="flex flex-col justify-center">
          <h1 className="text-lg sm:text-xl font-bold text-[var(--text)] leading-tight">{title}</h1>
          {subtitle && (
            <h2 className="text-xs sm:text-sm text-[var(--gold-soft)] truncate max-w-[180px] sm:max-w-md">
              {subtitle}
            </h2>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
