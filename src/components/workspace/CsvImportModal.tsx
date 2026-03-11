'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { ImportPreviewPayload } from '@/lib/bulk-import';

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

  useEffect(() => {
    if (!open) {
      setCsvText('');
      setPreview(null);
      setLoading(false);
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
        body: JSON.stringify({ csv: csvText, mode })
      });
      const result = await response.json();
      if (!response.ok || !result?.ok || !result?.data) {
        throw new Error(result?.message || `${mode === 'preview' ? 'Preview' : 'Import'} failed`);
      }

      setPreview(result.data as ImportPreviewPayload);
      if (mode === 'preview') {
        toast('Import preview ready');
      } else {
        toast(`Imported ${result.data.summary.importedCount} ${result.data.entity}`);
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
        <div className="rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">CSV input</div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Upload a CSV file or paste raw CSV text. Preview is always required before import.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelect} />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Upload CSV
              </Button>
              <Button variant="ghost" onClick={() => setCsvText(templateCsv)}>Load sample</Button>
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
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                {preview.summary.totalRows} CSV row{preview.summary.totalRows === 1 ? '' : 's'}
              </span>
              <span className="rounded-full border border-[var(--success)]/20 bg-[var(--success-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--success)]">
                {preview.mode === 'import' ? preview.summary.importedCount : preview.summary.readyCount} {preview.mode === 'import' ? 'imported' : 'ready'}
              </span>
              <span className="rounded-full border border-[var(--warning)]/20 bg-[var(--warning-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--warning)]">
                {preview.summary.duplicateCount} duplicate{preview.summary.duplicateCount === 1 ? '' : 's'}
              </span>
              <span className="rounded-full border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--danger)]">
                {preview.summary.invalidCount} invalid
              </span>
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
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                      item.status === 'ready' || item.status === 'imported'
                        ? 'border border-[var(--success)]/20 bg-[var(--success-muted)] text-[var(--success)]'
                        : item.status === 'duplicate'
                          ? 'border border-[var(--warning)]/20 bg-[var(--warning-muted)] text-[var(--warning)]'
                          : 'border border-[var(--danger)]/20 bg-[var(--danger-muted)] text-[var(--danger)]'
                    }`}>
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
