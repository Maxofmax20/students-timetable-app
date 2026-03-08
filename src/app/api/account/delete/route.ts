import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestSession } from '@/lib/session';
import { clearSessionCookie } from '@/lib/session';

export async function DELETE(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: 'AUTH_REQUIRED' }, { status: 401 });
  }

  await prisma.user.delete({ where: { id: session.userId } });

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
