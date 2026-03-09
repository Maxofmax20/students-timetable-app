import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WorkspacePage() {
  const userAgent = (await headers()).get('user-agent') || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

  redirect(isMobile ? '/workspace/timetable' : '/workspace/dashboard');
}
