'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { ImportExecutionMode, ImportPreviewPayload, ImportPreviewStatus } from '@/lib/bulk-import';

type CsvImportModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  endpoint: string;
  templateFilename: string;
  templateCsv: string;
  helpLines: string[];
  onImported?: (result: ImportPreviewPayload) => Promise<void> | void;
};

const IMPORT_MODES: Array<{ value: ImportExecutionMode; label: string; description: string }> = [
  { value: 'create_only', label: 'Create only', description: 'Create missing records only. Existing records are skipped.' },
  { value: 'update_existing', label: 'Update existing', description: 'Only update existing records. New records are skipped.' },
  { value: 'create_update', label: 'Create + update', description: 'Create missing records and safely update existing records.' }
];

function statusTone(status: ImportPreviewStatus) {
  if (['ready', 'ready_create', 'ready_update', 'created', 'updated', 'imported'].includes(status)) {
    return 'border border-[var(--success)]/20 bg-[var(--success-muted)] text-[var(--success)]';
  }
  if (['duplicate', 'duplicate_skipped', 'skipped'].includes(status)) {
    return 'border border-[var(--warning)]/20 bg-[var(--warning-muted)] text-[var(--warning)]';
  }
  if (status === 'conflict') {
    return 'border border-[var(--danger)]/25 bg-[var(--danger-muted)] text-[var(--danger)]';
  }
  return 'border border-[var(--danger)]/20 bg-[var(--danger-muted)] text-[var(--danger)]';
}

export function CsvImportModal({
  open,
  onClose,
  title,
  subtitle,
  endpoint,
  templateFilename,
  templateCsv,
  helpLines,
  onImported
}: CsvImportModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<ImportPreviewPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [importMode, setImportMode] = useState<ImportExecutionMode>('create_only');

  const entityLabel = useMemo(() => {
    if (!preview?.entity) return 'rows';
    if (preview.entity === 'rooms') return 'room';
    if (preview.entity === 'groups') return 'group';
    if (preview.entity === 'instructors') return 'instructor';
    return 'course';
  }, [preview]);

  useEffect(() => {
    if (!open) {
      setCsvText('');
      setPreview(null);
      setLoading(false);
      setImportMode('create_only');
    }
  }, [open]);

  const handleTemplateDownload = () => {
    const blob = new Blob([templateCsv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = templateFilename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setPreview(null);
    event.target.value = '';
  };

  const runRequest = async (mode: 'preview' | 'import') => {
    if (!csvText.trim()) {
      toast('Paste CSV content or upload a CSV file first.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csv: csvText, mode, importMode })
      });
      const result = await response.json();
      if (!response.ok || !result?.ok || !result?.data) {
        throw new Error(result?.message || `${mode === 'preview' ? 'Preview' : 'Import'} failed`);
      }

      setPreview(result.data as ImportPreviewPayload);
      if (mode === 'preview') {
        toast('Import preview ready');
      } else {
        const importedCount = result.data.summary.importedCount;
        const importedEntity = result.data.entity === 'rooms' ? 'room' : result.data.entity === 'groups' ? 'group' : 'course';
        toast(`Applied ${importedCount} ${importedEntity}${importedCount === 1 ? '' : 's'}`);
        await onImported?.(result.data as ImportPreviewPayload);
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Import request failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="lg"
      actions={
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="secondary" onClick={handleTemplateDownload} className="gap-2">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Template CSV
          </Button>
          <Button variant="primary" onClick={() => void runRequest('preview')} disabled={loading} className="gap-2">
            <span className="material-symbols-outlined text-[18px]">preview</span>
            {loading ? 'Working…' : 'Preview Import'}
          </Button>
          <Button
            variant="primary"
            onClick={() => void runRequest('import')}
            disabled={loading || !preview || preview.summary.readyCount === 0 || preview.mode === 'import'}
            className="gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            Confirm Import
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Import mode</div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {IMPORT_MODES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => { setImportMode(option.value); setPreview(null); }}
                className={`rounded-[16px] border p-3 text-left transition-colors ${importMode === option.value ? 'border-[var(--gold)] bg-[var(--gold-muted)]' : 'border-[var(--border)] bg-[var(--bg-raised)] hover:bg-[var(--surface-2)]'}`}
              >
                <div className="text-sm font-bold text-white">{option.label}</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">CSV upload or paste</div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Upload a CSV file or paste raw CSV text. Preview is always required before import.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelect} />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Upload CSV
              </Button>
              <Button variant="ghost" onClick={() => setCsvText(templateCsv)}>Load sample CSV</Button>
            </div>
          </div>

          <textarea
            value={csvText}
            onChange={(event) => {
              setCsvText(event.target.value);
              setPreview(null);
            }}
            placeholder="Paste CSV content here…"
            className="mt-4 min-h-[220px] w-full rounded-[20px] border border-[var(--border)] bg-[var(--bg-raised)] px-4 py-3 font-mono text-sm text-white outline-none transition-all focus:border-[var(--gold)]/40 focus:ring-4 focus:ring-[var(--gold)]/10"
          />
        </div>

        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Format help</div>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
            {helpLines.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {preview ? (
          <div className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Preview results</div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Review what will be created, updated, skipped, or blocked before confirmation.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                {preview.summary.totalRows} CSV row{preview.summary.totalRows === 1 ? '' : 's'}
              </span>
              <span className="rounded-full border border-[var(--success)]/20 bg-[var(--success-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--success)]">
                {preview.summary.readyCreateCount} ready create
              </span>
              <span className="rounded-full border border-[var(--info)]/20 bg-[var(--info-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--info)]">
                {preview.summary.readyUpdateCount} ready update
              </span>
              <span className="rounded-full border border-[var(--warning)]/20 bg-[var(--warning-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--warning)]">
                {preview.summary.duplicateCount} duplicate/skip
              </span>
              <span className="rounded-full border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--danger)]">
                {preview.summary.invalidCount + preview.summary.conflictCount} invalid/conflict
              </span>
              {preview.mode === 'import' ? (
                <span className="rounded-full border border-[var(--success)]/20 bg-[var(--success-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--success)]">
                  {preview.summary.importedCount} applied {entityLabel}{preview.summary.importedCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>

            <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
              {preview.items.map((item) => (
                <div key={item.key} className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-raised)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white">{item.label}</div>
                      {item.detail ? <div className="mt-1 text-sm text-[var(--text-secondary)]">{item.detail}</div> : null}
                      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        Source row{item.sourceRows.length === 1 ? '' : 's'}: {item.sourceRows.join(', ')}
                      </div>
                      {item.messages?.length ? (
                        <ul className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
                          {item.messages.map((message) => (
                            <li key={message}>• {message}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusTone(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
