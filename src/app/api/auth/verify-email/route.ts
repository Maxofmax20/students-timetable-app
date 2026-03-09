import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { consumeRateLimit, getClientIp, withRateLimitHeaders } from '@/lib/rate-limit';
import crypto from 'crypto';

const schema = z.object({
  email: z.string().email().max(160),
  code: z.string().length(6)
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = consumeRateLimit(`auth:verify-email:${ip}`, 10, 15 * 60 * 1000);

  if (!limit.ok) {
    return withRateLimitHeaders(
      NextResponse.json({ ok: false, message: 'Too many attempts. Try again later.' }, { status: 429 }),
      limit
    );
  }

  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return withRateLimitHeaders(
        NextResponse.json({ ok: false, message: 'Invalid code' }, { status: 400 }),
        limit
      );
    }

    if (user.emailVerifiedAt) {
      return withRateLimitHeaders(
        NextResponse.json({ ok: true, message: 'Email already verified' }),
        limit
      );
    }

    // Find a valid unexpired code
    const codeHash = crypto.createHash('sha256').update(body.code).digest('hex');
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        email,
        codeHash,
        purpose: 'REGISTER_VERIFY',
        consumedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!otpRecord) {
      return withRateLimitHeaders(
        NextResponse.json({ ok: false, message: 'Invalid or expired code' }, { status: 400 }),
        limit
      );
    }

    // Mark code consumed and verify user email
    await prisma.$transaction([
      prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { consumedAt: new Date() }
      }),
      prisma.user.update({
        where: { email },
        data: { emailVerifiedAt: new Date(), emailVerified: new Date() }
      })
    ]);

    return withRateLimitHeaders(
      NextResponse.json({ ok: true, message: 'Email verified successfully' }),
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
      NextResponse.json({ ok: false, message: 'Verification failed' }, { status: 500 }),
      limit
    );
  }
}
