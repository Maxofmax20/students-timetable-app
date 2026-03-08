import { type ClassValue, clsx } from "clsx";
import type { TimeMode, Row } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function normalizeCode(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32);

  return cleaned || `CRS-${randomInt(100, 999)}`;
}

export function cloneRows(rows: Row[]): Row[] {
  return rows.map((row) => ({ ...row }));
}

export function parseTimeRange(range: string): { startH: number; startM: number; endH: number; endM: number } | null {
  const match = range.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const [, sh, sm, eh, em] = match;
  const startH = Number(sh);
  const startM = Number(sm);
  const endH = Number(eh);
  const endM = Number(em);

  if ([startH, startM, endH, endM].some((value) => Number.isNaN(value))) return null;
  if (startH > 23 || endH > 23 || startM > 59 || endM > 59) return null;

  return { startH, startM, endH, endM };
}

export function toTwelveHour(hour: number, minute: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 || 12;
  return `${normalized.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

export function formatTimeRange(range: string, mode: TimeMode): string {
  if (mode === "24h") return range;

  const parsed = parseTimeRange(range);
  if (!parsed) return range;

  return `${toTwelveHour(parsed.startH, parsed.startM)}-${toTwelveHour(parsed.endH, parsed.endM)}`;
}

export function normalizeDayToIndex(day: string): number | null {
  const map: Record<string, number> = {
    sun: 0, sunday: 0,
    mon: 1, monday: 1,
    tue: 2, tuesday: 2,
    wed: 3, wednesday: 3,
    thu: 4, thursday: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6
  };
  const normalized = day.trim().toLowerCase();
  return map[normalized] ?? null;
}

export function toUiStatus(status: string): Row["status"] {
  const normalized = status.toUpperCase();
  if (normalized.includes("CONFLICT")) return "Conflict";
  if (normalized.includes("DRAFT") || normalized.includes("ARCHIVE")) return "Draft";
  return "Active";
}

export async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function csvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
