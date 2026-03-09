"use client";

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
}

export function DropdownMenu({ trigger, children, align = 'right' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const width = 248;
      const margin = 12;
      const left = align === 'right' ? rect.right - width : rect.left;
      setStyle({
        top: rect.bottom + 10,
        left: Math.max(margin, Math.min(left, window.innerWidth - width - margin))
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    updatePosition();
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [align, isOpen]);

  return (
    <>
      <div ref={triggerRef} className="inline-flex" onClick={() => setIsOpen((current) => !current)}>
        {trigger}
      </div>

      {mounted && isOpen && style
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[145] w-[248px] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--bg-raised),var(--surface))] shadow-[var(--shadow-lg)]"
              style={style}
              role="menu"
              aria-orientation="vertical"
              onClick={() => setIsOpen(false)}
            >
              <div className="py-2">{children}</div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export function DropdownItem({ children, onClick, icon, danger }: { children: ReactNode; onClick?: () => void; icon?: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition-all',
        danger ? 'text-[var(--danger)] hover:bg-[var(--danger)]/10' : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
      )}
      role="menuitem"
    >
      {icon && <span className="material-symbols-outlined text-[18px] opacity-70">{icon}</span>}
      {children}
    </button>
  );
}
