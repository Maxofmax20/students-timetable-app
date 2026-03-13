'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type SearchInputProps = {
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  containerClassName?: string;
  className?: string;
  inputClassName?: string;
  onClear?: () => void;
};

export function SearchInput({
  value = '',
  onChange,
  placeholder = 'Search…',
  containerClassName,
  className,
  inputClassName,
  onClear
}: SearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const clearValue = () => {
    if (onClear) {
      onClear();
      inputRef.current?.focus();
      return;
    }

    const input = inputRef.current;
    if (!input) return;

    const prototype = Object.getPrototypeOf(input);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor?.set?.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  };

  return (
    <div className={cn('relative min-w-0', containerClassName, className)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-[var(--text-muted)]">
        <span className="material-symbols-outlined text-[20px]">search</span>
      </div>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          'h-11 w-full rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] px-3.5 text-sm font-medium text-white shadow-[var(--shadow-sm)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--focus-ring)] focus:shadow-[var(--shadow-md)]',
          '[&::-webkit-search-decoration]:appearance-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none',
          inputClassName
        )}
        style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
      />
      {value ? (
        <button
          type="button"
          onClick={clearValue}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] transition-all hover:border-[var(--text-muted)] hover:text-white"
          aria-label="Clear search"
        >
          <span className="material-symbols-outlined text-[18px]">close_small</span>
        </button>
      ) : null}
    </div>
  );
}
