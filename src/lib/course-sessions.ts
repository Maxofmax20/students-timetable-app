export const SESSION_TYPE_VALUES = ['LECTURE', 'SECTION', 'LAB', 'ONLINE', 'HYBRID'] as const;

export type SessionTypeValue = (typeof SESSION_TYPE_VALUES)[number];

export const SESSION_TYPE_LABELS: Record<SessionTypeValue, string> = {
  LECTURE: 'Lecture',
  SECTION: 'Section',
  LAB: 'Lab',
  ONLINE: 'Online',
  HYBRID: 'Hybrid'
};

export const SESSION_TYPE_OPTIONS = SESSION_TYPE_VALUES.map((value) => ({
  value,
  label: SESSION_TYPE_LABELS[value],
  description:
    value === 'LECTURE'
      ? 'Main teaching block'
      : value === 'SECTION'
        ? 'Smaller discussion or practice section'
        : value === 'LAB'
          ? 'Hands-on lab or practical session'
          : value === 'ONLINE'
            ? 'Virtual-only delivery'
            : 'Mixed physical and online delivery'
}));

const SESSION_SUFFIX_PATTERN = /\s+[—-]\s+(lecture|lec\d*|section|sec|lab|online|hybrid)$/i;
const SESSION_CODE_SUFFIX_PATTERN = /-(lecture|lec\d*|section|sec|lab|online|hybrid)$/i;

export function stripLegacySessionSuffix(title: string) {
  return title.replace(SESSION_SUFFIX_PATTERN, '').trim();
}

export function stripLegacyCodeSuffix(code: string) {
  return code.replace(SESSION_CODE_SUFFIX_PATTERN, '').trim();
}

export function inferSessionType(value?: string | null): SessionTypeValue {
  const source = (value || '').trim().toLowerCase();
  if (!source) return 'LECTURE';
  if (/(^|\b)(section|sec)(\b|$)/.test(source)) return 'SECTION';
  if (/(^|\b)lab(\b|$)/.test(source)) return 'LAB';
  if (/(^|\b)online(\b|$)/.test(source)) return 'ONLINE';
  if (/(^|\b)hybrid(\b|$)/.test(source)) return 'HYBRID';
  return 'LECTURE';
}

export function inferLegacySessionType(title?: string | null, code?: string | null): SessionTypeValue {
  return inferSessionType(title) === 'LECTURE' ? inferSessionType(code) : inferSessionType(title);
}

export function normalizeCourseIdentity(title: string, code: string) {
  return {
    title: stripLegacySessionSuffix(title),
    code: stripLegacyCodeSuffix(code)
  };
}

export function formatSessionType(type?: string | null) {
  if (!type) return SESSION_TYPE_LABELS.LECTURE;
  const normalized = type.toUpperCase() as SessionTypeValue;
  return SESSION_TYPE_LABELS[normalized] || SESSION_TYPE_LABELS[inferSessionType(type)];
}

export function sessionSupportsOnline(type?: string | null) {
  const normalized = (type || 'LECTURE').toUpperCase();
  return normalized === 'ONLINE' || normalized === 'HYBRID';
}

export function sessionSupportsRoom(type?: string | null) {
  const normalized = (type || 'LECTURE').toUpperCase();
  return normalized !== 'ONLINE';
}
