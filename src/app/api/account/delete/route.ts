import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { clearAuthCookies } from '@/lib/session';
import { requireSession } from '@/lib/workspace-v1';

const deleteSchema = z.object({
  confirm: z.literal('DELETE')
});

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = deleteSchema.parse(await request.json());

    if (body.confirm !== 'DELETE') {
      return NextResponse.json({ ok: false, message: 'DELETE_CONFIRMATION_REQUIRED' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: session.userId } });

    const response = NextResponse.json({ ok: true });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message ?? 'INVALID_DELETE_REQUEST' }, { status: 400 });
    }

    return NextResponse.json({ ok: false, message: 'ACCOUNT_DELETE_FAILED' }, { status: 500 });
  }
}
