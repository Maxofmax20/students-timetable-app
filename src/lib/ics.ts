import { TimetableDto, TimetableEventDto } from '@/types/timetable';
import { DAY_CODES } from '@/lib/constants';

const DAY_TO_JS_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
};

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function nextDateForDay(base: Date, dayCode: string): Date {
  const targetDow = DAY_TO_JS_INDEX[dayCode] ?? base.getDay();
  const currentDow = base.getDay();
  const diff = (targetDow - currentDow + 7) % 7;
  const result = new Date(base.getTime());
  result.setDate(base.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function buildDateTimeString(base: Date, minuteOfDay: number): string {
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  const date = new Date(base.getTime());
  date.setHours(hours, minutes, 0, 0);

  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());

  // Local-time representation without explicit TZ; calendar apps treat it as local.
  return `${year}${month}${day}T${hh}${mm}00`;
}

export function timetableToICS(timetable: TimetableDto, events: TimetableEventDto[]): string {
  const now = new Date();

  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudentsTimetable//Timetable//AR',
    'CALSCALE:GREGORIAN'
  ];

  const body: string[] = [];

  const enabledDays = new Set(timetable.days.filter((day) => (DAY_CODES as readonly string[]).includes(day)));

  for (const event of events) {
    if (!enabledDays.has(event.day)) continue;

    const baseDate = nextDateForDay(now, event.day);
    const dtstart = buildDateTimeString(baseDate, event.startMinute);
    const dtend = buildDateTimeString(baseDate, event.startMinute + event.durationMinutes);

    const lines = [
      'BEGIN:VEVENT',
      `UID:${event.id}@students-timetable`,
      `SUMMARY:${escapeText(event.title || timetable.title || 'محاضرة')}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      'END:VEVENT'
    ];

    body.push(...lines);
  }

  const footer = ['END:VCALENDAR'];

  return [...header, ...body, ...footer].join('\r\n');
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
