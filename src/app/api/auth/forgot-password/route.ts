import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { consumeRateLimit, getClientIp, withRateLimitHeaders } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/mailer';
import crypto from 'crypto';

const schema = z.object({
  email: z.string().email().max(160)
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = consumeRateLimit(`auth:forgot-pwd:${ip}`, 5, 15 * 60 * 1000);

  if (!limit.ok) {
    return withRateLimitHeaders(
      NextResponse.json({ ok: false, message: 'Too many attempts. Try again later.' }, { status: 429 }),
      limit
    );
  }

  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase();

    // Always return success to avoid email enumeration
    const successResponse = () => withRateLimitHeaders(
      NextResponse.json({ ok: true, message: 'If an account exists with this email, a password reset link has been sent.' }),
      limit
    );

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return successResponse();
    }

    // Invalidate previous reset tokens
    await prisma.otpCode.updateMany({
      where: { email, purpose: 'PASSWORD_RESET', consumedAt: null },
      data: { consumedAt: new Date() }
    });

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const codeHash = crypto.createHash('sha256').update(token).digest('hex');

    await prisma.otpCode.create({
      data: {
        email,
        codeHash,
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        userId: user.id
      }
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/auth?mode=reset&token=${token}`;

    // Send reset email (logs to console if SMTP is not configured)
    await sendPasswordResetEmail(email, resetUrl);

    return successResponse();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withRateLimitHeaders(
        NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 }),
        limit
      );
    }
    return withRateLimitHeaders(
      NextResponse.json({ ok: false, message: 'Request failed' }, { status: 500 }),
      limit
    );
  }
}
