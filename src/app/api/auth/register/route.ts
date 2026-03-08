import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { DEFAULT_TIMETABLE } from '@/lib/constants';
import { consumeRateLimit, getClientIp, withRateLimitHeaders } from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(60).optional()
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = consumeRateLimit(`auth:register:${ip}`, 10, 15 * 60 * 1000);

  if (!limit.ok) {
    const response = NextResponse.json({ ok: false, message: 'تم تجاوز عدد المحاولات. حاول لاحقًا.' }, { status: 429 });
    return withRateLimitHeaders(response, limit);
  }

  try {
    const body = schema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      const response = NextResponse.json({ ok: false, message: 'البريد مستخدم بالفعل' }, { status: 409 });
      return withRateLimitHeaders(response, limit);
    }

    const passwordHash = await hashPassword(body.password);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: body.email.toLowerCase(),
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

      return { user };
    });

    const response = NextResponse.json({
      ok: true,
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

    const response = NextResponse.json({ ok: false, message: 'تعذر إنشاء الحساب' }, { status: 500 });
    return withRateLimitHeaders(response, limit);
  }
}
