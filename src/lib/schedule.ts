import type { CourseApiItem } from '@/types';
import { downloadIcsFile, type IcsRow } from '@/lib/ics';

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

export type ScheduleConflict = {
  kind: 'room' | 'instructor';
  key: string;
  day: string;
  startMinute: number;
  endMinute: number;
  label: string;
  items: ScheduleItem[];
};

function splitCourseTitle(title: string) {
  const [course, type] = title.split(' — ');
  return {
    course: course?.trim() || title,
    type: type?.trim() || 'Session'
  };
}

export function formatMinute(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}:${`${minutes}`.padStart(2, '0')}`;
}

export function buildScheduleItems(courses: CourseApiItem[]) {
  const items: ScheduleItem[] = courses.flatMap((course) => {
    const titleBits = splitCourseTitle(course.title);

    return (course.sessions || []).flatMap((session) => {
      if (!session.day || session.startMinute == null || session.endMinute == null || session.endMinute <= session.startMinute) {
        return [];
      }

      return [{
        id: `${course.id}:${session.id}`,
        courseId: course.id,
        code: course.code,
        course: titleBits.course,
        type: titleBits.type,
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

export function buildScheduleConflicts(items: ScheduleItem[]) {
  const buckets = new Map<string, ScheduleItem[]>();

  for (const item of items) {
    if (item.room && item.room !== '-') {
      const roomKey = `room:${item.day}:${item.startMinute}:${item.endMinute}:${item.room.toLowerCase()}`;
      buckets.set(roomKey, [...(buckets.get(roomKey) || []), item]);
    }

    if (item.instructor && item.instructor !== '-') {
      const instructorKey = `instructor:${item.day}:${item.startMinute}:${item.endMinute}:${item.instructor.toLowerCase()}`;
      buckets.set(instructorKey, [...(buckets.get(instructorKey) || []), item]);
    }
  }

  const conflicts: ScheduleConflict[] = [];

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.length < 2) continue;
    const [kind] = key.split(':');
    const first = bucket[0];
    conflicts.push({
      kind: kind === 'room' ? 'room' : 'instructor',
      key,
      day: first.day,
      startMinute: first.startMinute,
      endMinute: first.endMinute,
      label: kind === 'room' ? first.room : first.instructor,
      items: bucket
    });
  }

  conflicts.sort((a, b) => {
    const dayDiff = scheduleDayOrder.indexOf(a.day as ScheduleDay) - scheduleDayOrder.indexOf(b.day as ScheduleDay);
    if (dayDiff !== 0) return dayDiff;
    return a.startMinute - b.startMinute;
  });

  return conflicts;
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
