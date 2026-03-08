import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { generateOtpCode, hashOtpCode, otpExpiresAt, sendOtpEmail } from "@/lib/otp";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(80).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ ok: false, message: "EMAIL_ALREADY_EXISTS" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(body.password),
        displayName: body.displayName ?? null
      }
    });

    const code = generateOtpCode();
    await prisma.otpCode.create({
      data: {
        userId: user.id,
        email,
        codeHash: hashOtpCode(code),
        purpose: "REGISTER_VERIFY",
        expiresAt: otpExpiresAt(10)
      }
    });

    const sendResult = await sendOtpEmail(email, code, "REGISTER_VERIFY");

    return NextResponse.json({
      ok: true,
      requiresOtp: true,
      otpChannel: sendResult.channel,
      // For dev preview only (remove in production hardening)
      otpPreview: code
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }

    return NextResponse.json({ ok: false, message: "REGISTER_FAILED" }, { status: 500 });
  }
}
