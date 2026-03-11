'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardView, type DashboardLinkItem, type DashboardStatItem } from '@/components/workspace/DashboardView';
import { useToast } from '@/components/ui/Toast';
import { buildScheduleConflicts, buildScheduleItems, downloadScheduleCalendar, scheduleDayOrder, type ScheduleItem } from '@/lib/schedule';
import { groupGroupsByRoot, groupRoomsByBuilding } from '@/lib/group-room-model';
import type { ActionLabel, CourseApiItem, GroupApiItem, InstructorApiItem, RoomApiItem } from '@/types';

export const dynamic = 'force-dynamic';

type DashboardStats = {
  groups: GroupApiItem[];
  instructors: InstructorApiItem[];
  rooms: RoomApiItem[];
};

const weekdayMap: Record<number, (typeof scheduleDayOrder)[number]> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat'
};

function getCurrentDayAndMinute(now = new Date()) {
  return {
    day: weekdayMap[now.getDay()] || 'Sat',
    minute: now.getHours() * 60 + now.getMinutes()
  };
}

function findNextSession(items: ScheduleItem[], nowDay: string, nowMinute: number) {
  if (!items.length) return null;
  const nowDayIndex = scheduleDayOrder.indexOf(nowDay as (typeof scheduleDayOrder)[number]);
  if (nowDayIndex === -1) return null;

  for (let offset = 0; offset < scheduleDayOrder.length; offset += 1) {
    const day = scheduleDayOrder[(nowDayIndex + offset) % scheduleDayOrder.length];
    const dayItems = items.filter((item) => item.day === day).sort((a, b) => a.startMinute - b.startMinute);

    const candidate = dayItems.find((item) => {
      if (offset === 0) return item.endMinute > nowMinute;
      return true;
    });

    if (candidate) return candidate;
  }

  return null;
}

export default function WorkspaceDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      window.location.href = '/auth';
    }
  });

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseApiItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ groups: [], instructors: [], rooms: [] });

  const load = async () => {
    setLoading(true);
    try {
      const [coursesResponse, groupsResponse, instructorsResponse, roomsResponse] = await Promise.all([
        fetch('/api/v1/courses', { credentials: 'include' }),
        fetch('/api/v1/groups', { credentials: 'include' }),
        fetch('/api/v1/instructors', { credentials: 'include' }),
        fetch('/api/v1/rooms', { credentials: 'include' })
      ]);

      const [coursesPayload, groupsPayload, instructorsPayload, roomsPayload] = await Promise.all([
        coursesResponse.json(),
        groupsResponse.json(),
        instructorsResponse.json(),
        roomsResponse.json()
      ]);

      if (!coursesResponse.ok || !coursesPayload?.ok) {
        throw new Error(coursesPayload?.message || 'Failed to load dashboard');
      }

      setCourses(coursesPayload.data?.items || []);
      setStats({
        groups: groupsResponse.ok && groupsPayload?.ok ? groupsPayload.data?.items || [] : [],
        instructors: instructorsResponse.ok && instructorsPayload?.ok ? instructorsPayload.data?.items || [] : [],
        rooms: roomsResponse.ok && roomsPayload?.ok ? roomsPayload.data?.items || [] : []
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      void load();
    }
  }, [status]);

  const scheduleItems = useMemo(() => buildScheduleItems(courses), [courses]);
  const conflicts = useMemo(() => buildScheduleConflicts(scheduleItems), [scheduleItems]);

  const dashboardModel = useMemo(() => {
    const totalCourses = courses.length;
    const totalSessions = scheduleItems.length;

    const now = getCurrentDayAndMinute();
    const todaySessions = scheduleItems
      .filter((item) => item.day === now.day)
      .sort((a, b) => a.startMinute - b.startMinute);

    const nextSession = findNextSession(scheduleItems, now.day, now.minute);

    const missingRoomCount = scheduleItems.filter((item) => !item.roomId && item.room === '-').length;
    const missingInstructorCount = scheduleItems.filter((item) => !item.instructorId && item.instructor === '-').length;
    const missingGroupCount = scheduleItems.filter((item) => !item.groupId && item.group === '-').length;
    const unresolvedCount = conflicts.length + missingRoomCount + missingInstructorCount + missingGroupCount;

    const sessionsByType = Array.from(
      scheduleItems.reduce((acc, item) => {
        acc.set(item.type, (acc.get(item.type) || 0) + 1);
        return acc;
      }, new Map<string, number>())
    ).sort((a, b) => b[1] - a[1]);

    const roomsByBuilding = groupRoomsByBuilding(stats.rooms)
      .map((section) => ({ label: section.buildingCode, value: section.rooms.length }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const groupsByRoot = groupGroupsByRoot(stats.groups)
      .map((section) => ({ label: section.rootCode, value: section.items.length }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const deliverySplit = scheduleItems.reduce(
      (acc, item) => {
        const normalized = item.type.toUpperCase();
        if (normalized === 'ONLINE') acc.online += 1;
        else if (normalized === 'HYBRID') acc.hybrid += 1;
        else acc.physical += 1;
        return acc;
      },
      { physical: 0, online: 0, hybrid: 0 }
    );

    const busiestDay = Array.from(
      scheduleItems.reduce((acc, item) => {
        acc.set(item.day, (acc.get(item.day) || 0) + 1);
        return acc;
      }, new Map<string, number>())
    ).sort((a, b) => b[1] - a[1])[0] || null;

    const busiestRoom = Array.from(
      scheduleItems
        .filter((item) => item.room && item.room !== '-')
        .reduce((acc, item) => {
          acc.set(item.room, (acc.get(item.room) || 0) + 1);
          return acc;
        }, new Map<string, number>())
    ).sort((a, b) => b[1] - a[1])[0] || null;

    const busiestInstructor = Array.from(
      scheduleItems
        .filter((item) => item.instructor && item.instructor !== '-')
        .reduce((acc, item) => {
          acc.set(item.instructor, (acc.get(item.instructor) || 0) + 1);
          return acc;
        }, new Map<string, number>())
    ).sort((a, b) => b[1] - a[1])[0] || null;

    const mostActiveGroup = Array.from(
      scheduleItems
        .filter((item) => item.group && item.group !== '-')
        .reduce((acc, item) => {
          acc.set(item.group, (acc.get(item.group) || 0) + 1);
          return acc;
        }, new Map<string, number>())
    ).sort((a, b) => b[1] - a[1])[0] || null;

    const overviewStats: DashboardStatItem[] = [
      { label: 'Total Courses', value: totalCourses, icon: 'menu_book', tone: 'neutral' },
      { label: 'Total Sessions', value: totalSessions, icon: 'calendar_view_week', tone: 'neutral' },
      { label: 'Groups', value: stats.groups.length, icon: 'groups', tone: 'neutral' },
      { label: 'Rooms', value: stats.rooms.length, icon: 'meeting_room', tone: 'neutral' },
      { label: 'Instructors', value: stats.instructors.length, icon: 'school', tone: 'neutral' }
    ];

    const quickLinks: DashboardLinkItem[] = [
      { label: 'Courses', href: '/workspace/courses' },
      { label: 'Timetable', href: '/workspace/timetable' },
      { label: 'Groups', href: '/workspace/groups' },
      { label: 'Rooms', href: '/workspace/rooms' },
      { label: 'Instructors', href: '/workspace/instructors' },
      { label: 'Import courses', href: '/workspace/courses' },
      { label: 'Import groups', href: '/workspace/groups' },
      { label: 'Import rooms', href: '/workspace/rooms' }
    ];

    return {
      now,
      overviewStats,
      todaySessions,
      nextSession,
      quality: {
        conflicts: conflicts.length,
        missingRoomCount,
        missingInstructorCount,
        missingGroupCount,
        unresolvedCount
      },
      insights: {
        sessionsByType,
        roomsByBuilding,
        groupsByRoot,
        deliverySplit,
        busiestDay,
        busiestRoom,
        busiestInstructor,
        mostActiveGroup
      },
      quickLinks
    };
  }, [courses, scheduleItems, conflicts, stats]);

  const exportCalendar = () => {
    const result = downloadScheduleCalendar(scheduleItems, 'students-timetable-calendar.ics', 'Students Timetable');
    if (!result.ok) {
      toast('No scheduled sessions are available to export yet.', 'error');
      return;
    }

    toast(`Calendar export downloaded with ${result.count} scheduled event${result.count === 1 ? '' : 's'}.`);
  };

  const scanIntegrity = () => {
    if (!scheduleItems.length) {
      toast('No scheduled sessions to scan yet.', 'error');
      return;
    }

    if (!conflicts.length) {
      toast('No room or instructor conflicts found.');
      return;
    }

    toast(`Found ${conflicts.length} timetable overlap${conflicts.length === 1 ? '' : 's'}.`, 'error');
  };

  const handleAction = (actionName: ActionLabel) => {
    switch (actionName) {
      case 'New':
        router.push('/workspace/courses?create=1');
        break;
      case 'Conflicts':
        scanIntegrity();
        break;
      case 'Export':
        exportCalendar();
        break;
      default:
        break;
    }
  };

  return (
    <AppShell title="Overview" subtitle="Manage your workspace and monitor university scheduling health.">
      <DashboardView
        model={dashboardModel}
        onAction={handleAction}
        onSelectSession={(item) => router.push(`/workspace/timetable?day=${encodeURIComponent(item.day)}`)}
        isLoading={status === 'loading' || loading}
      />
    </AppShell>
  );
}
