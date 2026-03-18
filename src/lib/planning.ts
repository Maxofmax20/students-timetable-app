import { AssignmentPriority, AssignmentStatus, ExamType, Prisma } from '@prisma/client';

export const academicSeasonOptions = ['SPRING', 'SUMMER', 'FALL', 'WINTER'] as const;
export const examTypeOptions = ['QUIZ', 'MIDTERM', 'FINAL', 'PRACTICAL', 'ORAL', 'OTHER'] as const;
export const assignmentPriorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const assignmentStatusOptions = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

export function parseMinuteLabel(label?: string | null) {
  if (!label) return null;
  const [hoursRaw, minutesRaw] = label.trim().split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function minuteToLabel(total?: number | null) {
  if (total == null || !Number.isFinite(total)) return null;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function toAssignmentSortPriority(priority: AssignmentPriority) {
  switch (priority) {
    case 'URGENT': return 4;
    case 'HIGH': return 3;
    case 'MEDIUM': return 2;
    case 'LOW': return 1;
    default: return 0;
  }
}

export const planningCourseSelect = {
  id: true,
  code: true,
  title: true,
  color: true
} satisfies Prisma.CourseSelect;

export const planningTermInclude = {
  _count: { select: { exams: true, assignments: true } }
} satisfies Prisma.AcademicTermInclude;

export const planningExamInclude = {
  course: { select: planningCourseSelect },
  academicTerm: { select: { id: true, name: true, season: true, academicYear: true, isActive: true } }
} satisfies Prisma.ExamInclude;

export const planningAssignmentInclude = {
  course: { select: planningCourseSelect },
  academicTerm: { select: { id: true, name: true, season: true, academicYear: true, isActive: true } }
} satisfies Prisma.AssignmentInclude;

export function normalizeExamType(value?: string | null): ExamType {
  return examTypeOptions.includes((value || '').toUpperCase() as ExamType)
    ? ((value || '').toUpperCase() as ExamType)
    : 'QUIZ';
}

export function normalizeAssignmentPriority(value?: string | null): AssignmentPriority {
  return assignmentPriorityOptions.includes((value || '').toUpperCase() as AssignmentPriority)
    ? ((value || '').toUpperCase() as AssignmentPriority)
    : 'MEDIUM';
}

export function normalizeAssignmentStatus(value?: string | null): AssignmentStatus {
  return assignmentStatusOptions.includes((value || '').toUpperCase() as AssignmentStatus)
    ? ((value || '').toUpperCase() as AssignmentStatus)
    : 'TODO';
}
