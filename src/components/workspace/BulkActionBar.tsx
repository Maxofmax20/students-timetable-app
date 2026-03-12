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
    <div className="rounded-xl border border-[var(--gold)]/30 bg-[var(--surface)] p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[var(--gold-muted)] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--gold)]">
          {selectedCount} selected
        </span>
        {scopeLabel ? <span className="text-xs text-[var(--text-secondary)]">{scopeLabel}</span> : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSelectVisible} disabled={disabled}>Select visible</Button>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={disabled}>Clear</Button>
          {onExport ? <Button variant="secondary" size="sm" onClick={onExport} disabled={disabled}>Export selected CSV</Button> : null}
          {onStatusActive ? <Button variant="secondary" size="sm" onClick={onStatusActive} disabled={disabled}>Set Active</Button> : null}
          {onStatusDraft ? <Button variant="secondary" size="sm" onClick={onStatusDraft} disabled={disabled}>Set Draft</Button> : null}
          {onDelete ? <Button variant="danger" size="sm" onClick={onDelete} disabled={disabled}>Delete selected</Button> : null}
        </div>
      </div>
    </div>
  );
}
