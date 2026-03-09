'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  sm: 'max-w-lg',
  md: 'max-w-2xl',
  lg: 'max-w-4xl'
};

export function Modal({ open, onClose, title, subtitle, children, actions, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-6 sm:py-8">
        <button type="button" className="absolute inset-0 cursor-default" aria-label="Close modal" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'relative flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-[var(--border)] bg-[var(--bg-raised)] shadow-[var(--shadow-lg)] overscroll-contain sm:max-h-[min(88vh,920px)] sm:w-[min(100%,calc(100vw-3rem))] sm:rounded-[32px]',
            sizeClasses[size],
            className
          )}
        >
          <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-raised)]/95 px-4 pb-4 pt-3 backdrop-blur md:px-6 md:py-5">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--border)] sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {title ? <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">{title}</h2> : null}
                {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] transition-all hover:border-[var(--text-muted)] hover:text-white"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-6 md:px-6 md:py-5">{children}</div>

          {actions ? (
            <div className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-[var(--bg-raised)]/98 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:px-6">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{actions}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
