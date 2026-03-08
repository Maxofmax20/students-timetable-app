import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/workspace-v1';

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(60)
});

export async function GET(request: NextRequest) {
  const session = await requireSession(request);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      accounts: { select: { provider: true } }
    }
  });

  if (!user) {
    return NextResponse.json({ ok: false, message: 'USER_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? user.name ?? '',
      hasPassword: Boolean(user.passwordHash),
      providers: user.accounts.map((account) => account.provider)
    }
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = profileSchema.parse(await request.json());

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        displayName: body.displayName,
        name: body.displayName
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        name: true
      }
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message ?? 'INVALID_PROFILE' }, { status: 400 });
    }

    return NextResponse.json({ ok: false, message: 'PROFILE_UPDATE_FAILED' }, { status: 500 });
  }
}
