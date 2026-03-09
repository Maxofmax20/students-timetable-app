'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardView } from '@/components/workspace/DashboardView';
import { useToast } from '@/components/ui/Toast';
import { buildScheduleConflicts, buildScheduleItems, downloadScheduleCalendar } from '@/lib/schedule';
import type { ActionLabel, CourseApiItem, GroupApiItem, InstructorApiItem, RoomApiItem, Row } from '@/types';

export const dynamic = 'force-dynamic';

type DashboardStats = {
  groups: number;
  instructors: number;
  rooms: number;
};

function scheduleItemToRow(item: ReturnType<typeof buildScheduleItems>[number]): Row {
  return {
    id: item.id,
    source: 'real',
    code: item.code,
    course: item.course,
    group: item.group,
    instructor: item.instructor,
    room: item.room,
    day: item.day,
    time: item.timeLabel,
    status: 'Active'
  };
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
  const [stats, setStats] = useState<DashboardStats>({ groups: 0, instructors: 0, rooms: 0 });

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
        groups: groupsResponse.ok && groupsPayload?.ok ? groupsPayload.data?.items?.length || 0 : 0,
        instructors: instructorsResponse.ok && instructorsPayload?.ok ? instructorsPayload.data?.items?.length || 0 : 0,
        rooms: roomsResponse.ok && roomsPayload?.ok ? roomsPayload.data?.items?.length || 0 : 0
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
  const rows = useMemo(() => scheduleItems.map(scheduleItemToRow), [scheduleItems]);
  const conflicts = useMemo(() => buildScheduleConflicts(scheduleItems), [scheduleItems]);

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
        router.push('/workspace/timetable');
        break;
      default:
        break;
    }
  };

  return (
    <AppShell title="Overview" subtitle="Manage your workspace and monitor university scheduling health.">
      <DashboardView
        rows={rows}
        conflictsCount={conflicts.length}
        groupsCount={stats.groups}
        instructorsCount={stats.instructors}
        roomsCount={stats.rooms}
        onAction={handleAction}
        onPreviewSelect={(row) => router.push(`/workspace/timetable?day=${encodeURIComponent(row.day)}`)}
        isLoading={status === 'loading' || loading}
      />
    </AppShell>
  );
}
