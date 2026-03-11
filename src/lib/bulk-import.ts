import { ApiError } from '@/lib/workspace-v1';

export type ImportPreviewStatus =
  | 'ready'
  | 'ready_create'
  | 'ready_update'
  | 'duplicate'
  | 'duplicate_skipped'
  | 'invalid'
  | 'conflict'
  | 'imported'
  | 'created'
  | 'updated'
  | 'skipped';

export type ImportPreviewItem = {
  key: string;
  status: ImportPreviewStatus;
  label: string;
  detail?: string;
  sourceRows: number[];
  messages?: string[];
};

export type ImportExecutionMode = 'create_only' | 'update_existing' | 'create_update';

export type ImportPreviewPayload = {
  entity: 'rooms' | 'groups' | 'courses';
  mode: 'preview' | 'import';
  importMode: ImportExecutionMode;
  summary: {
    totalRows: number;
    readyCount: number;
    readyCreateCount: number;
    readyUpdateCount: number;
    invalidCount: number;
    duplicateCount: number;
    conflictCount: number;
    importedCount: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
  };
  items: ImportPreviewItem[];
};

export type ParsedCsv = {
  headers: string[];
  rows: Array<Record<string, string>>;
};

export function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function parseCsvText(csv: string): ParsedCsv {
  const source = csv.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!source.trim()) {
    throw new ApiError(400, 'CSV_EMPTY');
  }

  const rows: string[][] = [];
  let current = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(current.trim());
      current = '';
      continue;
    }

    if (char === '\n' && !inQuotes) {
      currentRow.push(current.trim());
      if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);
      current = '';
      currentRow = [];
      continue;
    }

    current += char;
  }

  currentRow.push(current.trim());
  if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);

  if (!rows.length) {
    throw new ApiError(400, 'CSV_EMPTY');
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map(normalizeCsvHeader);
  if (!headers.some(Boolean)) {
    throw new ApiError(400, 'CSV_HEADERS_REQUIRED');
  }

  const dataRows = rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = row[index]?.trim() || '';
    });
    return record;
  }).filter((record) => Object.values(record).some((value) => value.length > 0));

  return { headers, rows: dataRows };
}

export function getCsvValue(record: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const normalized = normalizeCsvHeader(alias);
    if (normalized in record && record[normalized]) return record[normalized].trim();
  }
  return '';
}

export function parseOptionalPositiveInt(value: string, max: number, errorMessage: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > max) {
    throw new ApiError(400, errorMessage);
  }
  return parsed;
}

export function buildImportSummary(items: ImportPreviewItem[], totalRows: number, mode: 'preview' | 'import'): ImportPreviewPayload['summary'] {
  const readyCreateCount = items.filter((item) => item.status === 'ready_create').length;
  const readyUpdateCount = items.filter((item) => item.status === 'ready_update').length;
  const legacyReadyCount = items.filter((item) => item.status === 'ready').length;
  const readyCount = readyCreateCount + readyUpdateCount + legacyReadyCount;
  const invalidCount = items.filter((item) => item.status === 'invalid').length;
  const duplicateCount = items.filter((item) => item.status === 'duplicate' || item.status === 'duplicate_skipped').length;
  const conflictCount = items.filter((item) => item.status === 'conflict').length;
  const createdCount = mode === 'import' ? items.filter((item) => item.status === 'created').length : 0;
  const updatedCount = mode === 'import' ? items.filter((item) => item.status === 'updated').length : 0;
  const legacyImportedCount = mode === 'import' ? items.filter((item) => item.status === 'imported').length : 0;
  const importedCount = createdCount + updatedCount + legacyImportedCount;
  const skippedCount = mode === 'import'
    ? items.filter((item) => ['invalid', 'duplicate', 'duplicate_skipped', 'conflict', 'skipped'].includes(item.status)).length
    : duplicateCount + invalidCount + conflictCount;

  return {
    totalRows,
    readyCount,
    readyCreateCount,
    readyUpdateCount,
    invalidCount,
    duplicateCount,
    conflictCount,
    importedCount,
    createdCount,
    updatedCount,
    skippedCount
  };
}
