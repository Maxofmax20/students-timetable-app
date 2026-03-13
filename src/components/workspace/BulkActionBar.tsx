'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export type BulkAction = 'delete' | 'export' | 'status-active' | 'status-draft';

interface BulkActionBarProps {
  count: number;
  onAction: (action: BulkAction) => void;
  onClear: () => void;
  loading?: boolean;
  /** Whether to show the status update submenu (Courses only) */
  showStatus?: boolean;
  className?: string;
}

export function BulkActionBar({
  count,
  onAction,
  onClear,
  loading = false,
  showStatus = false,
  className,
}: BulkActionBarProps) {
  const [statusOpen, setStatusOpen] = useState(false);

  if (count === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl",
        "bg-[var(--surface)] border border-[var(--gold)]/30",
        "backdrop-blur-xl animate-panel-pop",
        className
      )}
    >
      {/* Count badge */}
      <span className="flex items-center gap-2 text-sm font-bold text-white pr-3 border-r border-[var(--border)]">
        <span className="w-6 h-6 rounded-full bg-[var(--gold)] text-[var(--gold-fg)] text-xs font-black flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
        selected
      </span>

      {/* Export */}
      <Button
        variant="ghost"
        className="gap-1.5 text-sm"
        onClick={() => onAction('export')}
        disabled={loading}
      >
        <span className="material-symbols-outlined text-[18px]">download</span>
        Export
      </Button>

      {/* Status update (courses only) */}
      {showStatus && (
        <div className="relative">
          <Button
            variant="ghost"
            className="gap-1.5 text-sm"
            onClick={() => setStatusOpen((o) => !o)}
            disabled={loading}
          >
            <span className="material-symbols-outlined text-[18px]">swap_vert</span>
            Set Status
            <span className="material-symbols-outlined text-[14px]">
              {statusOpen ? 'expand_less' : 'expand_more'}
            </span>
          </Button>
          {statusOpen && (
            <div className="absolute bottom-full mb-2 left-0 min-w-[140px] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] py-1 z-10">
              <button
                className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-[var(--surface-2)] transition-colors flex items-center gap-2"
                onClick={() => { onAction('status-active'); setStatusOpen(false); }}
              >
                <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                Active
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-[var(--surface-2)] transition-colors flex items-center gap-2"
                onClick={() => { onAction('status-draft'); setStatusOpen(false); }}
              >
                <span className="w-2 h-2 rounded-full bg-[var(--text-secondary)]" />
                Draft
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete */}
      <Button
        variant="danger"
        className="gap-1.5 text-sm"
        onClick={() => onAction('delete')}
        disabled={loading}
      >
        <span className="material-symbols-outlined text-[18px]">delete</span>
        {loading ? 'Deleting...' : 'Delete'}
      </Button>

      {/* Clear */}
      <Button
        variant="ghost"
        className="text-[var(--text-muted)] hover:text-white text-sm ml-1"
        onClick={onClear}
        disabled={loading}
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </Button>
    </div>
  );
}
