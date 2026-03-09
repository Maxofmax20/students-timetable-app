'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type Option = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  keywords?: string;
};

type AppSelectProps = {
  label?: string;
  value?: string | null;
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  helperText?: string;
  errorText?: string;
  compact?: boolean;
  emptyLabel?: string;
  className?: string;
};

export function AppSelect({
  label,
  value,
  options,
  placeholder = 'Select…',
  onChange,
  disabled,
  searchable,
  searchPlaceholder = 'Search…',
  helperText,
  errorText,
  compact,
  emptyLabel = 'No options found.',
  className
}: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  useEffect(() => {
    setMounted(true);
    const updateMode = () => setIsMobile(window.innerWidth < 640);
    updateMode();
    window.addEventListener('resize', updateMode);
    return () => window.removeEventListener('resize', updateMode);
  }, []);

  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => {
      const haystack = [option.label, option.description, option.badge, option.keywords].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open || !triggerRef.current || isMobile) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const margin = 12;
      const width = Math.max(rect.width, 280);
      const left = Math.min(rect.left, window.innerWidth - width - margin);
      const maxTop = window.innerHeight - Math.min(360, window.innerHeight * 0.6) - margin;
      const top = Math.min(rect.bottom + 8, maxTop);
      setPanelStyle({ top, left: Math.max(margin, left), width });
    };

    updatePosition();

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }

      if (!filteredOptions.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % filteredOptions.length);
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + filteredOptions.length) % filteredOptions.length);
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const option = filteredOptions[activeIndex];
        if (option) {
          onChange(option.value);
          setOpen(false);
          setQuery('');
        }
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [activeIndex, filteredOptions, isMobile, onChange, open]);

  useEffect(() => {
    if (!open) return;
    const nextIndex = Math.max(0, filteredOptions.findIndex((option) => option.value === value));
    setActiveIndex(nextIndex === -1 ? 0 : nextIndex);
    if (searchable) {
      window.setTimeout(() => searchRef.current?.focus(), 20);
    }
  }, [filteredOptions, open, searchable, value]);

  const pickOption = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setQuery('');
    triggerRef.current?.focus();
  };

  const renderOptions = () => (
    <div className="max-h-[min(48vh,320px)] overflow-y-auto p-2 sm:max-h-[320px]">
      {filteredOptions.length ? (
        filteredOptions.map((option, index) => {
          const active = option.value === value;
          const highlighted = index === activeIndex;
          return (
            <button
              key={option.value}
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => pickOption(option.value)}
              className={cn(
                'mb-1 flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition-all last:mb-0',
                active
                  ? 'border-[var(--gold)] bg-[var(--gold-muted)] text-white shadow-[var(--shadow-sm)]'
                  : highlighted
                    ? 'border-[var(--border)] bg-[var(--surface)] text-white shadow-[var(--shadow-sm)]'
                    : 'border-transparent bg-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-white'
              )}
              role="option"
              aria-selected={active}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{option.label}</div>
                {option.description ? <div className="mt-1 text-xs text-[var(--text-secondary)]">{option.description}</div> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {option.badge ? (
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gold)]">
                    {option.badge}
                  </span>
                ) : null}
                {active ? <span className="material-symbols-outlined text-[20px] text-[var(--gold)]">check</span> : null}
              </div>
            </button>
          );
        })
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 py-4 text-center text-sm text-[var(--text-secondary)]">
          {emptyLabel}
        </div>
      )}
    </div>
  );

  const renderSearch = () =>
    searchable ? (
      <div className="border-b border-[var(--border)] p-3">
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--focus-ring)]"
        />
      </div>
    ) : null;

  return (
    <div className={cn('space-y-2', className)}>
      {label ? <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</label> : null}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'group w-full rounded-2xl border bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] text-left transition-all outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
          compact ? 'px-3 py-3' : 'px-4 py-3.5',
          errorText ? 'border-[var(--danger)]/60' : 'border-[var(--border)] hover:border-[var(--text-muted)]',
          disabled ? 'cursor-not-allowed opacity-60' : 'shadow-[var(--shadow-sm)] hover:-translate-y-[1px] hover:shadow-[var(--shadow-md)]'
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className={cn('truncate text-sm font-semibold', selected ? 'text-white' : 'text-[var(--text-muted)]')}>
              {selected?.label || placeholder}
            </div>
            {selected?.description ? <div className="mt-1 truncate text-xs text-[var(--text-secondary)]">{selected.description}</div> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {selected?.badge ? (
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gold)]">
                {selected.badge}
              </span>
            ) : null}
            <span className={cn('material-symbols-outlined text-[20px] text-[var(--text-muted)] transition-transform', open && 'rotate-180')}>
              expand_more
            </span>
          </div>
        </div>
      </button>

      {errorText ? <div className="text-[11px] font-semibold text-[var(--danger)]">{errorText}</div> : helperText ? <div className="text-[11px] text-[var(--text-secondary)]">{helperText}</div> : null}

      {mounted && open
        ? createPortal(
            isMobile ? (
              <div className="fixed inset-0 z-[140]">
                <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label={`Close ${label || 'select'}`} onClick={() => setOpen(false)} />
                <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] border border-[var(--border)] bg-[var(--bg-raised)] shadow-[var(--shadow-lg)]">
                  <div className="border-b border-[var(--border)] px-4 pb-4 pt-3">
                    <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--border)]" />
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-black uppercase tracking-[0.14em] text-[var(--gold)]">{label || 'Select option'}</div>
                        <div className="mt-1 text-sm text-[var(--text-secondary)]">Choose one option below.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]"
                        aria-label="Close"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    </div>
                  </div>
                  {renderSearch()}
                  <div id={listId} ref={panelRef} role="listbox" className="pb-[max(1rem,env(safe-area-inset-bottom))]">
                    {renderOptions()}
                  </div>
                </div>
              </div>
            ) : (
              <div
                id={listId}
                ref={panelRef}
                role="listbox"
                className="fixed z-[140] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--bg-raised)] shadow-[var(--shadow-lg)]"
                style={{ top: panelStyle?.top, left: panelStyle?.left, width: panelStyle?.width }}
              >
                {renderSearch()}
                {renderOptions()}
              </div>
            ),
            document.body
          )
        : null}
    </div>
  );
}
