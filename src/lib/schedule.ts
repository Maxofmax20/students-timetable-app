import type { CourseApiItem } from '@/types';
import { downloadIcsFile, type IcsRow } from '@/lib/ics';
import { formatSessionType, inferLegacySessionType, stripLegacySessionSuffix } from '@/lib/course-sessions';

export const scheduleDayOrder = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

export type ScheduleDay = (typeof scheduleDayOrder)[number];

export type ScheduleItem = {
  id: string;
  courseId: string;
  code: string;
  course: string;
  type: string;
  status: string;
  group: string;
  groupId?: string | null;
  room: string;
  roomId?: string | null;
  instructor: string;
  instructorId?: string | null;
  day: string;
  startMinute: number;
  endMinute: number;
  timeLabel: string;
};

export type ScheduleConflictKind = 'room' | 'instructor' | 'group';

export type ScheduleConflict = {
  kind: ScheduleConflictKind;
  key: string;
  day: string;
  startMinute: number;
  endMinute: number;
  label: string;
  items: ScheduleItem[];
};

export type ScheduleConflictReport = {
  conflicts: ScheduleConflict[];
  conflictMap: Map<string, Set<ScheduleConflictKind>>;
  sessionsWithConflicts: number;
  bucketsByKind: Record<ScheduleConflictKind, number>;
};

export function formatMinute(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}:${`${minutes}`.padStart(2, '0')}`;
}

export function buildScheduleItems(courses: CourseApiItem[]) {
  const items: ScheduleItem[] = courses.flatMap((course) => {
    const normalizedCourseTitle = stripLegacySessionSuffix(course.title);

    return (course.sessions || []).flatMap((session) => {
      if (!session.day || session.startMinute == null || session.endMinute == null || session.endMinute <= session.startMinute) {
        return [];
      }

      const sessionType = formatSessionType(session.type || inferLegacySessionType(course.title, course.code));

      return [{
        id: `${course.id}:${session.id}`,
        courseId: course.id,
        code: course.code,
        course: normalizedCourseTitle,
        type: sessionType,
        status: course.status,
        group: session.group?.code || course.group?.code || '-',
        groupId: session.groupId ?? course.groupId ?? null,
        room: session.room?.code || course.room?.code || '-',
        roomId: session.roomId ?? course.roomId ?? null,
        instructor: session.instructor?.name || course.instructor?.name || '-',
        instructorId: session.instructorId ?? course.instructorId ?? null,
        day: session.day,
        startMinute: session.startMinute,
        endMinute: session.endMinute,
        timeLabel: `${formatMinute(session.startMinute)} → ${formatMinute(session.endMinute)}`
      }];
    });
  });

  items.sort((a, b) => {
    const dayDiff = scheduleDayOrder.indexOf(a.day as ScheduleDay) - scheduleDayOrder.indexOf(b.day as ScheduleDay);
    if (dayDiff !== 0) return dayDiff;
    if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
    return a.course.localeCompare(b.course);
  });

  return items;
}

export function buildCalendarRows(items: ScheduleItem[]): IcsRow[] {
  return items.map((item) => ({
    id: item.id,
    course: item.course,
    group: item.group,
    instructor: item.instructor,
    room: item.room,
    day: item.day,
    time: item.timeLabel
  }));
}

export function downloadScheduleCalendar(items: ScheduleItem[], filename = 'students-timetable.ics', calendarName = 'Students Timetable') {
  const calendarRows = buildCalendarRows(items);
  if (!calendarRows.length) {
    return { ok: false as const, count: 0 };
  }

  downloadIcsFile(calendarRows, filename, calendarName);
  return { ok: true as const, count: calendarRows.length };
}

const overlapKinds: Array<{
  kind: ScheduleConflictKind;
  idOf: (item: ScheduleItem) => string | null;
  labelOf: (item: ScheduleItem) => string;
}> = [
  {
    kind: 'room',
    idOf: (item) => item.roomId || (item.room && item.room !== '-' ? `label:${item.room.toLowerCase()}` : null),
    labelOf: (item) => item.room
  },
  {
    kind: 'instructor',
    idOf: (item) => item.instructorId || (item.instructor && item.instructor !== '-' ? `label:${item.instructor.toLowerCase()}` : null),
    labelOf: (item) => item.instructor
  },
  {
    kind: 'group',
    idOf: (item) => item.groupId || (item.group && item.group !== '-' ? `label:${item.group.toLowerCase()}` : null),
    labelOf: (item) => item.group
  }
];

function overlap(left: ScheduleItem, right: ScheduleItem) {
  return left.startMinute < right.endMinute && right.startMinute < left.endMinute;
}

function compareConflict(a: ScheduleConflict, b: ScheduleConflict) {
  const dayDiff = scheduleDayOrder.indexOf(a.day as ScheduleDay) - scheduleDayOrder.indexOf(b.day as ScheduleDay);
  if (dayDiff !== 0) return dayDiff;
  if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
  if (a.endMinute !== b.endMinute) return a.endMinute - b.endMinute;
  if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
  return a.label.localeCompare(b.label);
}

export function buildScheduleConflictReport(items: ScheduleItem[]): ScheduleConflictReport {
  const conflicts: ScheduleConflict[] = [];
  const conflictMap = new Map<string, Set<ScheduleConflictKind>>();

  for (const item of items) {
    conflictMap.set(item.id, new Set());
  }

  for (const { kind, idOf, labelOf } of overlapKinds) {
    const resourceBuckets = new Map<string, ScheduleItem[]>();

    for (const item of items) {
      const id = idOf(item);
      if (!id) continue;
      const key = `${item.day}:${id}`;
      resourceBuckets.set(key, [...(resourceBuckets.get(key) || []), item]);
    }

    for (const [resourceKey, bucket] of resourceBuckets.entries()) {
      if (bucket.length < 2) continue;
      const sorted = [...bucket].sort((a, b) => {
        if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
        if (a.endMinute !== b.endMinute) return a.endMinute - b.endMinute;
        return a.id.localeCompare(b.id);
      });

      let cluster: ScheduleItem[] = [];
      let clusterEnd = -1;
      let clusterStart = -1;
      let clusterIndex = 0;

      const pushCluster = () => {
        if (cluster.length < 2) {
          cluster = [];
          return;
        }

        const first = cluster[0];
        const key = `${kind}:${first.day}:${resourceKey}:${clusterStart}:${clusterEnd}:${clusterIndex}`;
        conflicts.push({
          kind,
          key,
          day: first.day,
          startMinute: clusterStart,
          endMinute: clusterEnd,
          label: labelOf(first),
          items: [...cluster]
        });

        for (const conflictItem of cluster) {
          conflictMap.get(conflictItem.id)?.add(kind);
        }

        cluster = [];
        clusterIndex += 1;
      };

      for (const entry of sorted) {
        if (!cluster.length) {
          cluster = [entry];
          clusterStart = entry.startMinute;
          clusterEnd = entry.endMinute;
          continue;
        }

        if (entry.startMinute < clusterEnd) {
          cluster.push(entry);
          clusterEnd = Math.max(clusterEnd, entry.endMinute);
          continue;
        }

        pushCluster();
        cluster = [entry];
        clusterStart = entry.startMinute;
        clusterEnd = entry.endMinute;
      }

      pushCluster();
    }
  }

  conflicts.sort(compareConflict);

  const sessionsWithConflicts = [...conflictMap.values()].filter((set) => set.size > 0).length;
  const bucketsByKind: Record<ScheduleConflictKind, number> = {
    room: conflicts.filter((item) => item.kind === 'room').length,
    instructor: conflicts.filter((item) => item.kind === 'instructor').length,
    group: conflicts.filter((item) => item.kind === 'group').length
  };

  return {
    conflicts,
    conflictMap,
    sessionsWithConflicts,
    bucketsByKind
  };
}

export function buildScheduleConflicts(items: ScheduleItem[]) {
  return buildScheduleConflictReport(items).conflicts;
}

export function getScheduleConflictLabels(conflictKinds: Set<ScheduleConflictKind>) {
  const labels: string[] = [];
  if (conflictKinds.has('group')) labels.push('Group clash');
  if (conflictKinds.has('room')) labels.push('Room clash');
  if (conflictKinds.has('instructor')) labels.push('Instructor clash');
  return labels;
}

export function getDayLabel(day: string) {
  return scheduleDayOrder.includes(day as ScheduleDay) ? day : day;
}

export function getOrderedScheduleDays(weekStart: string, focusDay?: string) {
  const weekStartMap: Record<string, ScheduleDay> = {
    SATURDAY: 'Sat',
    SUNDAY: 'Sun',
    MONDAY: 'Mon'
  };

  const normalizedStart = weekStartMap[weekStart] || 'Sat';
  const startIndex = scheduleDayOrder.indexOf(normalizedStart);
  const baseDays = [...scheduleDayOrder.slice(startIndex), ...scheduleDayOrder.slice(0, startIndex)];
  const focusKey = focusDay?.trim().substring(0, 3);

  if (focusKey && baseDays.includes(focusKey as ScheduleDay)) {
    return [focusKey as ScheduleDay, ...baseDays.filter((day) => day !== focusKey)] as ScheduleDay[];
  }

  return baseDays;
}

export function getScheduleBounds(items: ScheduleItem[]) {
  if (!items.length) {
    return {
      startMinute: 8 * 60,
      endMinute: 20 * 60
    };
  }

  const earliest = Math.min(...items.map((item) => item.startMinute));
  const latest = Math.max(...items.map((item) => item.endMinute));

  const roundedStart = Math.floor(earliest / 60) * 60;
  const roundedEnd = Math.ceil(latest / 60) * 60;

  return {
    startMinute: Math.min(8 * 60, roundedStart),
    endMinute: Math.max(20 * 60, roundedEnd)
  };
}

export type TimetableLayoutItem = {
  item: ScheduleItem;
  lane: number;
  lanes: number;
};

export function layoutDayItems(items: ScheduleItem[]) {
  const sorted = [...items].sort((a, b) => {
    if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
    if (a.endMinute !== b.endMinute) return a.endMinute - b.endMinute;
    return a.course.localeCompare(b.course);
  });

  const clusters: ScheduleItem[][] = [];
  let currentCluster: ScheduleItem[] = [];
  let currentClusterEnd = -1;

  for (const item of sorted) {
    if (!currentCluster.length || item.startMinute < currentClusterEnd) {
      currentCluster.push(item);
      currentClusterEnd = Math.max(currentClusterEnd, item.endMinute);
      continue;
    }

    clusters.push(currentCluster);
    currentCluster = [item];
    currentClusterEnd = item.endMinute;
  }

  if (currentCluster.length) {
    clusters.push(currentCluster);
  }

  return clusters.flatMap((cluster) => {
    const laneEndTimes: number[] = [];
    const placements: Array<{ item: ScheduleItem; lane: number }> = [];

    for (const item of cluster) {
      let laneIndex = laneEndTimes.findIndex((endMinute) => endMinute <= item.startMinute);
      if (laneIndex === -1) {
        laneIndex = laneEndTimes.length;
        laneEndTimes.push(item.endMinute);
      } else {
        laneEndTimes[laneIndex] = item.endMinute;
      }

      placements.push({ item, lane: laneIndex });
    }

    const lanes = Math.max(laneEndTimes.length, 1);
    return placements.map((placement) => ({
      item: placement.item,
      lane: placement.lane,
      lanes
    }));
  });
}
