import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';
import { signSession, setSessionCookie } from '@/lib/session';
import { consumeRateLimit, getClientIp, withRateLimitHeaders } from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(128)
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = consumeRateLimit(`auth:login:${ip}`, 20, 15 * 60 * 1000);

  if (!limit.ok) {
    const response = NextResponse.json({ ok: false, message: 'تم تجاوز عدد المحاولات. حاول لاحقًا.' }, { status: 429 });
    return withRateLimitHeaders(response, limit);
  }

  try {
    const body = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });

    if (!user || !user.passwordHash) {
      const response = NextResponse.json({ ok: false, message: 'بيانات الدخول غير صحيحة أو مسجل بـ Google/GitHub' }, { status: 401 });
      return withRateLimitHeaders(response, limit);
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      const response = NextResponse.json({ ok: false, message: 'بيانات الدخول غير صحيحة' }, { status: 401 });
      return withRateLimitHeaders(response, limit);
    }

    const token = await signSession({ userId: user.id, email: user.email, name: user.displayName });
    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      }
    });

    setSessionCookie(response, token);
    return withRateLimitHeaders(response, limit);
  } catch {
    const response = NextResponse.json({ ok: false, message: 'تعذر تسجيل الدخول' }, { status: 500 });
    return withRateLimitHeaders(response, limit);
  }
}
