import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import {
  clearSessionCookie,
  createOtpPendingToken,
  setOtpPendingCookie
} from "@/lib/session";
import { generateOtpCode, hashOtpCode, otpExpiresAt, sendOtpEmail } from "@/lib/otp";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ ok: false, message: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    const validPassword = await verifyPassword(body.password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ ok: false, message: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    const code = generateOtpCode();
    await prisma.otpCode.create({
      data: {
        userId: user.id,
        email,
        codeHash: hashOtpCode(code),
        purpose: "LOGIN",
        expiresAt: otpExpiresAt(10)
      }
    });

    const sendResult = await sendOtpEmail(email, code, "LOGIN");

    const pendingToken = await createOtpPendingToken({
      userId: user.id,
      email,
      purpose: "LOGIN"
    });

    const response = NextResponse.json({
      ok: true,
      requiresOtp: true,
      otpChannel: sendResult.channel,
      otpPreview: code
    });

    clearSessionCookie(response);
    setOtpPendingCookie(response, pendingToken);

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }

    return NextResponse.json({ ok: false, message: "LOGIN_FAILED" }, { status: 500 });
  }
}
