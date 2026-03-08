import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { requireSession } from '@/lib/workspace-v1';

const passwordSchema = z.object({
  currentPassword: z.string().max(128).optional().default(''),
  newPassword: z.string().min(8).max(128)
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = passwordSchema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, passwordHash: true }
    });

    if (!user) {
      return NextResponse.json({ ok: false, message: 'USER_NOT_FOUND' }, { status: 404 });
    }

    if (user.passwordHash) {
      const matches = await verifyPassword(body.currentPassword, user.passwordHash);
      if (!matches) {
        return NextResponse.json({ ok: false, message: 'CURRENT_PASSWORD_INVALID' }, { status: 400 });
      }
    }

    const nextHash = await hashPassword(body.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: nextHash }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message ?? 'INVALID_PASSWORD' }, { status: 400 });
    }

    return NextResponse.json({ ok: false, message: 'PASSWORD_UPDATE_FAILED' }, { status: 500 });
  }
}
