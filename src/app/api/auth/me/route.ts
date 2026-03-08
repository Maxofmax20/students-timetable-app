import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: true, user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, displayName: true }
  });

  return NextResponse.json({ ok: true, user });
}
