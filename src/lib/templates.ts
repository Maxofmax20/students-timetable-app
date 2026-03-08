import { nanoid } from 'nanoid';
import { DEFAULT_TIMETABLE } from '@/lib/constants';
import { TimetableDto, TimetableEventDto } from '@/types/timetable';

export type TemplatePresetId = 'university' | 'ramadan' | 'exam' | 'work';

export const TEMPLATE_PRESETS: Record<TemplatePresetId, {
  title: string;
  days: string[];
  startMinute: number;
  endMinute: number;
  snapMinutes: 5 | 10 | 15 | 20 | 30 | 60;
  allowOverlap: boolean;
}> = {
  university: {
    title: 'جدول الجامعة',
    days: ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'],
    startMinute: 8 * 60,
    endMinute: 18 * 60,
    snapMinutes: 60,
    allowOverlap: false
  },
  ramadan: {
    title: 'جدول رمضان',
    days: ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'],
    startMinute: 9 * 60,
    endMinute: 23 * 60,
    snapMinutes: 30,
    allowOverlap: false
  },
  exam: {
    title: 'جدول الامتحانات',
    days: ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'],
    startMinute: 9 * 60,
    endMinute: 18 * 60,
    snapMinutes: 30,
    allowOverlap: false
  },
  work: {
    title: 'جدول العمل',
    days: ['sun', 'mon', 'tue', 'wed', 'thu'],
    startMinute: 9 * 60,
    endMinute: 17 * 60,
    snapMinutes: 30,
    allowOverlap: false
  }
};

export type CustomTemplate = {
  id: string;
  name: string;
  data: {
    timetable: TimetableDto;
    events: TimetableEventDto[];
  };
};

const STORAGE_KEY = 'students_timetable_custom_templates_v1';

export function loadCustomTemplates(): CustomTemplate[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CustomTemplate[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveCustomTemplate(name: string, timetable: TimetableDto, events: TimetableEventDto[]): CustomTemplate[] {
  if (typeof window === 'undefined') return [];
  const existing = loadCustomTemplates();
  const next: CustomTemplate[] = [
    ...existing.filter((template) => template.name !== name),
    {
      id: nanoid(),
      name,
      data: {
        timetable: {
          ...timetable,
          // ensure we only store scalar config here, events separately
          events: []
        },
        events: events.map((event) => ({ ...event }))
      }
    }
  ];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function findTemplateByName(name: string): CustomTemplate | undefined {
  const templates = loadCustomTemplates();
  return templates.find((template) => template.name === name);
}

export function defaultTimetableFromPreset(id: TemplatePresetId): TimetableDto {
  const preset = TEMPLATE_PRESETS[id];
  return {
    ...DEFAULT_TIMETABLE,
    title: preset.title,
    days: [...preset.days],
    startMinute: preset.startMinute,
    endMinute: preset.endMinute,
    snapMinutes: preset.snapMinutes,
    allowOverlap: preset.allowOverlap,
    id: 'guest-local',
    version: 1,
    events: []
  };
}
