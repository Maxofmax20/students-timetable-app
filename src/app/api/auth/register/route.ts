import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { DEFAULT_TIMETABLE } from '@/lib/constants';
import { consumeRateLimit, getClientIp, withRateLimitHeaders } from '@/lib/rate-limit';
import { sendVerificationEmail } from '@/lib/mailer';
import crypto from 'crypto';

const schema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(60).optional()
});

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = consumeRateLimit(`auth:register:${ip}`, 10, 15 * 60 * 1000);

  if (!limit.ok) {
    const response = NextResponse.json({ ok: false, message: 'Too many attempts. Try again later.' }, { status: 429 });
    return withRateLimitHeaders(response, limit);
  }

  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const response = NextResponse.json({ ok: false, message: 'This email is already registered' }, { status: 409 });
      return withRateLimitHeaders(response, limit);
    }

    const passwordHash = await hashPassword(body.password);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          displayName: body.displayName
        }
      });

      const timetable = await tx.timetable.create({
        data: {
          ownerId: user.id,
          title: DEFAULT_TIMETABLE.title,
          days: DEFAULT_TIMETABLE.days,
          startMinute: DEFAULT_TIMETABLE.startMinute,
          endMinute: DEFAULT_TIMETABLE.endMinute,
          snapMinutes: DEFAULT_TIMETABLE.snapMinutes,
          allowOverlap: DEFAULT_TIMETABLE.allowOverlap
        }
      });

      await tx.timetableMember.create({
        data: {
          timetableId: timetable.id,
          userId: user.id,
          role: 'OWNER'
        }
      });

      // Generate email verification code
      const code = generateCode();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      await tx.otpCode.create({
        data: {
          email,
          codeHash,
          purpose: 'REGISTER_VERIFY',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          userId: user.id
        }
      });

      return { user, code };
    });

    // Send verification email (logs to console if SMTP is not configured)
    await sendVerificationEmail(email, result.code);

    const response = NextResponse.json({
      ok: true,
      requiresVerification: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName
      }
    });

    return withRateLimitHeaders(response, limit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const response = NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
      return withRateLimitHeaders(response, limit);
    }

    const response = NextResponse.json({ ok: false, message: 'Account creation failed' }, { status: 500 });
    return withRateLimitHeaders(response, limit);
  }
}
