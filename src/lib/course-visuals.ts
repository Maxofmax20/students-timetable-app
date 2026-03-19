const COURSE_TONES = [
  {
    badge: 'border-[var(--gold)]/25 bg-[var(--gold-muted)] text-[var(--gold)]',
    soft: 'border-[var(--gold)]/20 bg-[linear-gradient(135deg,var(--gold-muted),transparent)]',
    line: 'bg-[var(--gold)]'
  },
  {
    badge: 'border-[var(--info)]/25 bg-[var(--info-muted)] text-[var(--info)]',
    soft: 'border-[var(--info)]/20 bg-[linear-gradient(135deg,var(--info-muted),transparent)]',
    line: 'bg-[var(--info)]'
  },
  {
    badge: 'border-[var(--success)]/25 bg-[var(--success-muted)] text-[var(--success)]',
    soft: 'border-[var(--success)]/20 bg-[linear-gradient(135deg,var(--success-muted),transparent)]',
    line: 'bg-[var(--success)]'
  },
  {
    badge: 'border-[var(--warning)]/25 bg-[var(--warning-muted)] text-[var(--warning)]',
    soft: 'border-[var(--warning)]/20 bg-[linear-gradient(135deg,var(--warning-muted),transparent)]',
    line: 'bg-[var(--warning)]'
  },
  {
    badge: 'border-[var(--danger)]/25 bg-[var(--danger-muted)] text-[var(--danger)]',
    soft: 'border-[var(--danger)]/20 bg-[linear-gradient(135deg,var(--danger-muted),transparent)]',
    line: 'bg-[var(--danger)]'
  },
  {
    badge: 'border-[var(--accent)]/25 bg-[var(--accent-muted)] text-[var(--accent)]',
    soft: 'border-[var(--accent)]/20 bg-[linear-gradient(135deg,var(--accent-muted),transparent)]',
    line: 'bg-[var(--accent)]'
  }
] as const;

function hashValue(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getCourseVisualTone(seed?: string | null) {
  if (!seed) return COURSE_TONES[0];
  return COURSE_TONES[hashValue(seed) % COURSE_TONES.length];
}
