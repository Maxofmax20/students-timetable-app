"use client";
import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
}

export function DropdownMenu({ trigger, children, align = 'right' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div className={`absolute z-50 mt-2 w-56 rounded-xl shadow-lg bg-[linear-gradient(180deg,var(--surface-2),var(--surface))] ring-1 ring-[#ffffff15] overflow-hidden transition-all origin-top-right ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <div className="py-1" role="menu" aria-orientation="vertical" onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, onClick, icon, danger }: { children: ReactNode; onClick?: () => void; icon?: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-[#ffffff10] transition-colors ${danger ? 'text-[var(--danger)] hover:bg-[var(--danger)]/10' : 'text-[var(--text)]'}`}
      role="menuitem"
    >
      {icon && <span className="material-symbols-outlined text-[18px] opacity-70">{icon}</span>}
      {children}
    </button>
  );
}
