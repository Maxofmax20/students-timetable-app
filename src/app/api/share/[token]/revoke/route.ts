import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestSession } from '@/lib/session';

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const { token } = await context.params;
  const link = await prisma.shareLink.findUnique({ where: { token }, include: { timetable: true } });

  if (!link) {
    return NextResponse.json({ ok: false, message: 'الرابط غير موجود' }, { status: 404 });
  }

  const canRevoke = link.timetable.ownerId === session.userId;
  if (!canRevoke) {
    return NextResponse.json({ ok: false, message: 'لا توجد صلاحية' }, { status: 403 });
  }

  await prisma.shareLink.update({ where: { id: link.id }, data: { revoked: true } });

  return NextResponse.json({ ok: true });
}
