'use client';

import type { ChangeEventHandler } from 'react';
import { cn } from '@/lib/utils';

type SearchInputProps = {
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  containerClassName?: string;
  className?: string;
  inputClassName?: string;
};

export function SearchInput({ value = '', onChange, placeholder = 'Search…', containerClassName, className, inputClassName }: SearchInputProps) {
  return (
    <div className={cn('relative', containerClassName, className)}>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
        <span className="material-symbols-outlined text-[20px]">search</span>
      </span>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          'h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] pl-12 pr-11 text-sm text-white shadow-[var(--shadow-sm)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:shadow-[var(--shadow-md)]',
          inputClassName
        )}
      />
      {value ? (
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          <span className="material-symbols-outlined text-[18px]">close_small</span>
        </span>
      ) : null}
    </div>
  );
}
