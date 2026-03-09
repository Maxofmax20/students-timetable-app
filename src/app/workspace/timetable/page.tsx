'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { TimetableView } from '@/components/workspace/TimetableView';
import { useToast } from '@/components/ui/Toast';
import { buildScheduleItems, downloadScheduleCalendar } from '@/lib/schedule';
import type { CourseApiItem, Row } from '@/types';

export const dynamic = 'force-dynamic';

function scheduleItemToRow(item: ReturnType<typeof buildScheduleItems>[number]): Row {
  return {
    id: item.id,
    source: 'real',
    code: item.code,
    course: `${item.course} — ${item.type}`,
    group: item.group,
    instructor: item.instructor,
    room: item.room,
    day: item.day,
    time: item.timeLabel,
    status: 'Active'
  };
}

export default function TimetablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusDay = searchParams?.get('day') || '';
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      window.location.href = '/auth';
    }
  });
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseApiItem[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/courses', { credentials: 'include' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || 'Failed to load timetable');
      }

      setCourses(payload.data?.items || []);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load timetable', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      void load();
    }
  }, [status]);

  const items = useMemo(() => buildScheduleItems(courses), [courses]);
  const rows = useMemo(() => items.map(scheduleItemToRow), [items]);

  const exportCalendar = () => {
    const result = downloadScheduleCalendar(items, 'students-timetable-calendar.ics', 'Students Timetable');
    if (!result.ok) {
      toast('No scheduled sessions are available to export yet.', 'error');
      return;
    }

    toast(`Calendar export downloaded with ${result.count} event${result.count === 1 ? '' : 's'}.`);
  };

  return (
    <AppShell title="Timetable" subtitle="Visualize and resolve scheduling overlaps.">
      <TimetableView
        rows={rows}
        timeMode="24h"
        weekStart="SATURDAY"
        focusDay={focusDay}
        onRowAction={() => router.push('/workspace/courses')}
        onExportCalendar={exportCalendar}
        isLoading={status === 'loading' || loading}
      />
    </AppShell>
  );
}
