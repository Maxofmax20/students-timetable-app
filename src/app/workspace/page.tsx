import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const TAB_ROUTE_MAP: Record<string, string> = {
  dashboard: '/workspace/dashboard',
  timetable: '/workspace/timetable',
  courses: '/workspace/courses',
  groups: '/workspace/groups',
  instructors: '/workspace/instructors',
  rooms: '/workspace/rooms',
  history: '/workspace/history',
  sharing: '/workspace/sharing'
};

export default async function WorkspacePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userAgent = (await headers()).get('user-agent') || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const tabValue = Array.isArray(resolvedSearchParams.tab) ? resolvedSearchParams.tab[0] : resolvedSearchParams.tab;
  const normalizedTab = (tabValue || '').trim().toLowerCase();
  const targetPath = TAB_ROUTE_MAP[normalizedTab] || (isMobile ? '/workspace/timetable' : '/workspace/dashboard');

  const nextParams = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(resolvedSearchParams)) {
    if (key === 'tab') continue;
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        if (value != null) nextParams.append(key, value);
      }
    } else if (rawValue != null) {
      nextParams.set(key, rawValue);
    }
  }

  redirect(nextParams.toString() ? `${targetPath}?${nextParams.toString()}` : targetPath);
}
