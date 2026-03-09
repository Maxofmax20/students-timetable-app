'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { TimetableView } from '@/components/workspace/TimetableView';
import { useToast } from '@/components/ui/Toast';
import { buildScheduleItems, downloadScheduleCalendar } from '@/lib/schedule';
import type { CourseApiItem } from '@/types';

export const dynamic = 'force-dynamic';

export default function TimetablePage() {
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
  const [weekStart, setWeekStart] = useState('SATURDAY');

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/courses', { credentials: 'include' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || 'Failed to load timetable');
      }

      setCourses(payload.data?.items || []);

      const workspaceId = payload.data?.workspaceId;
      if (workspaceId) {
        const workspaceResponse = await fetch(`/api/v1/workspaces/${workspaceId}`, { credentials: 'include' });
        const workspacePayload = await workspaceResponse.json().catch(() => null);
        if (workspaceResponse.ok && workspacePayload?.ok && workspacePayload?.data?.weekStart) {
          setWeekStart(workspacePayload.data.weekStart);
        }
      }
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
        items={items}
        weekStart={weekStart}
        focusDay={focusDay}
        onExportCalendar={exportCalendar}
        isLoading={status === 'loading' || loading}
      />
    </AppShell>
  );
}
