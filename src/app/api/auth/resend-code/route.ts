import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { consumeRateLimit, getClientIp, withRateLimitHeaders } from '@/lib/rate-limit';
import { sendVerificationEmail } from '@/lib/mailer';
import crypto from 'crypto';

const schema = z.object({
  email: z.string().email().max(160)
});

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = consumeRateLimit(`auth:resend-code:${ip}`, 5, 15 * 60 * 1000);

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

    // Always return success to avoid email enumeration
    if (!user || user.emailVerifiedAt) {
      return withRateLimitHeaders(
        NextResponse.json({ ok: true, message: 'If an unverified account exists, a new code has been sent.' }),
        limit
      );
    }

    // Invalidate previous codes
    await prisma.otpCode.updateMany({
      where: { email, purpose: 'REGISTER_VERIFY', consumedAt: null },
      data: { consumedAt: new Date() }
    });

    // Generate new code
    const code = generateCode();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    await prisma.otpCode.create({
      data: {
        email,
        codeHash,
        purpose: 'REGISTER_VERIFY',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        userId: user.id
      }
    });

    // Send verification email (logs to console if SMTP is not configured)
    await sendVerificationEmail(email, code);

    return withRateLimitHeaders(
      NextResponse.json({ ok: true, message: 'If an unverified account exists, a new code has been sent.' }),
      limit
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withRateLimitHeaders(
        NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 }),
        limit
      );
    }
    console.error('[RESEND_CODE_ERROR]', error);
    return withRateLimitHeaders(
      NextResponse.json({ ok: false, message: 'Failed to resend code' }, { status: 500 }),
      limit
    );
  }
}
