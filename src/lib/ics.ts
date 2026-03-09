export type IcsRow = {
  id: string;
  course: string;
  group?: string | null;
  instructor?: string | null;
  room?: string | null;
  day?: string | null;
  time?: string | null;
};

const dayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatDateValue(date: Date) {
  const yyyy = date.getUTCFullYear();
  const mm = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getUTCDate()}`.padStart(2, '0');
  const hh = `${date.getUTCHours()}`.padStart(2, '0');
  const mi = `${date.getUTCMinutes()}`.padStart(2, '0');
  const ss = `${date.getUTCSeconds()}`.padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function parseTimeLabel(label: string) {
  const [hours, minutes] = label.trim().split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function parseTimeRange(value?: string | null) {
  if (!value || value === '--') return null;
  const parts = value.split(/→|->|-/).map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const startMinute = parseTimeLabel(parts[0]);
  const endMinute = parseTimeLabel(parts[1]);
  if (startMinute === null || endMinute === null || endMinute <= startMinute) return null;
  return { startMinute, endMinute };
}

function nextWeekdayAnchor(day: string, startMinute: number) {
  const now = new Date();
  const target = dayMap[day] ?? 0;
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  let delta = (target - base.getUTCDay() + 7) % 7;
  const candidate = new Date(base);
  candidate.setUTCDate(candidate.getUTCDate() + delta);
  candidate.setUTCHours(Math.floor(startMinute / 60), startMinute % 60, 0, 0);
  if (candidate <= now) candidate.setUTCDate(candidate.getUTCDate() + 7);
  return candidate;
}

export function buildIcsFromRows(rows: IcsRow[], calendarName = 'Students Timetable') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Students Timetable//Workspace Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(calendarName)}`
  ];

  const stamp = formatDateValue(new Date());

  for (const row of rows) {
    const parsed = parseTimeRange(row.time);
    if (!row.day || !parsed) continue;

    const start = nextWeekdayAnchor(row.day, parsed.startMinute);
    const end = new Date(start.getTime() + (parsed.endMinute - parsed.startMinute) * 60_000);
    const summary = `${row.course}${row.group ? ` (${row.group})` : ''}`;
    const description = [
      row.group ? `Group: ${row.group}` : null,
      row.instructor ? `Instructor: ${row.instructor}` : null,
      row.room ? `Room: ${row.room}` : null
    ].filter(Boolean).join('\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${row.id}@students-timetable`,
      `DTSTAMP:${stamp}`,
      `SUMMARY:${escapeIcs(summary)}`,
      row.room ? `LOCATION:${escapeIcs(row.room)}` : 'LOCATION:',
      description ? `DESCRIPTION:${escapeIcs(description)}` : 'DESCRIPTION:',
      `DTSTART:${formatDateValue(start)}`,
      `DTEND:${formatDateValue(end)}`,
      'RRULE:FREQ=WEEKLY;COUNT=16',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcsFile(rows: IcsRow[], filename = 'students-timetable.ics', calendarName = 'Students Timetable') {
  const text = buildIcsFromRows(rows, calendarName);
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
