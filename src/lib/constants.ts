export const DAY_CODES = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;
export const DEFAULT_DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'] as const;
export const DAY_LABELS_AR: Record<string, string> = {
  sat: 'السبت',
  sun: 'الأحد',
  mon: 'الإثنين',
  tue: 'الثلاثاء',
  wed: 'الأربعاء',
  thu: 'الخميس',
  fri: 'الجمعة'
};

export const DEFAULT_TIMETABLE = {
  title: 'جدولي الدراسي',
  days: [...DEFAULT_DAYS],
  startMinute: 8 * 60,
  endMinute: 22 * 60,
  snapMinutes: 15,
  allowOverlap: false
};

