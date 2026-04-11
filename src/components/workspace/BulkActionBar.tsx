import { Button } from '@/components/ui/Button';

type BulkActionBarProps = {
  selectedCount: number;
  onSelectVisible: () => void;
  onClear: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onStatusDraft?: () => void;
  onStatusActive?: () => void;
  disabled?: boolean;
  scopeLabel?: string;
};

export function BulkActionBar({
  selectedCount,
  onSelectVisible,
  onClear,
  onDelete,
  onExport,
  onStatusDraft,
  onStatusActive,
  disabled,
  scopeLabel
}: BulkActionBarProps) {
  return (
    <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--surface)] p-2">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar snap-x snap-mandatory items-center pb-1 -mb-1">
        <span className="snap-start shrink-0 min-w-max rounded-full bg-[var(--gold-muted)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[var(--gold)]">
          {selectedCount} selected
        </span>
        {scopeLabel ? <span className="snap-start shrink-0 min-w-max text-xs text-[var(--text-secondary)] px-1">{scopeLabel}</span> : null}
        <div className="ml-auto flex gap-2 items-center">
          <Button variant="ghost" size="sm" onClick={onSelectVisible} disabled={disabled} className="snap-start shrink-0 min-w-max">Select visible</Button>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={disabled} className="snap-start shrink-0 min-w-max">Clear</Button>
          {onExport ? <Button variant="secondary" size="sm" onClick={onExport} disabled={disabled} className="snap-start shrink-0 min-w-max">Export selected CSV</Button> : null}
          {onStatusActive ? <Button variant="secondary" size="sm" onClick={onStatusActive} disabled={disabled} className="snap-start shrink-0 min-w-max">Set Active</Button> : null}
          {onStatusDraft ? <Button variant="secondary" size="sm" onClick={onStatusDraft} disabled={disabled} className="snap-start shrink-0 min-w-max">Set Draft</Button> : null}
          {onDelete ? <Button variant="danger" size="sm" onClick={onDelete} disabled={disabled} className="snap-start shrink-0 min-w-max">Delete selected</Button> : null}
        </div>
      </div>
    </div>
  );
}
