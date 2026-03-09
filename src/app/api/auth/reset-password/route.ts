import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { consumeRateLimit, getClientIp, withRateLimitHeaders } from '@/lib/rate-limit';
import crypto from 'crypto';

const schema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(8).max(128)
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = consumeRateLimit(`auth:reset-pwd:${ip}`, 10, 15 * 60 * 1000);

  if (!limit.ok) {
    return withRateLimitHeaders(
      NextResponse.json({ ok: false, message: 'Too many attempts. Try again later.' }, { status: 429 }),
      limit
    );
  }

  try {
    const body = schema.parse(await request.json());
    const tokenHash = crypto.createHash('sha256').update(body.token).digest('hex');

    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        codeHash: tokenHash,
        purpose: 'PASSWORD_RESET',
        consumedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!otpRecord) {
      return withRateLimitHeaders(
        NextResponse.json({ ok: false, message: 'Invalid or expired reset link' }, { status: 400 }),
        limit
      );
    }

    const passwordHash = await hashPassword(body.password);

    await prisma.$transaction([
      prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { consumedAt: new Date() }
      }),
      prisma.user.update({
        where: { email: otpRecord.email },
        data: { passwordHash }
      })
    ]);

    return withRateLimitHeaders(
      NextResponse.json({ ok: true, message: 'Password reset successfully' }),
      limit
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withRateLimitHeaders(
        NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 }),
        limit
      );
    }
    return withRateLimitHeaders(
      NextResponse.json({ ok: false, message: 'Password reset failed' }, { status: 500 }),
      limit
    );
  }
}
