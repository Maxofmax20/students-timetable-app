import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOtpPendingFromRequest } from "@/lib/session";
import { generateOtpCode, hashOtpCode, otpExpiresAt, sendOtpEmail } from "@/lib/otp";

const schema = z.object({
  email: z.string().email().optional(),
  purpose: z.enum(["LOGIN", "REGISTER_VERIFY", "PASSWORD_RESET"]).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json().catch(() => ({})));
    const pending = await getOtpPendingFromRequest(request);

    const purpose = pending?.purpose ?? body.purpose ?? "LOGIN";
    const email = (pending?.email ?? body.email ?? "").toLowerCase();

    if (!email) {
      return NextResponse.json({ ok: false, message: "EMAIL_REQUIRED" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ ok: false, message: "USER_NOT_FOUND" }, { status: 404 });
    }

    const code = generateOtpCode();
    await prisma.otpCode.create({
      data: {
        userId: user.id,
        email,
        codeHash: hashOtpCode(code),
        purpose,
        expiresAt: otpExpiresAt(10)
      }
    });

    const sendResult = await sendOtpEmail(email, code, purpose);

    return NextResponse.json({
      ok: true,
      purpose,
      otpChannel: sendResult.channel,
      otpPreview: code
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }

    return NextResponse.json({ ok: false, message: "OTP_SEND_FAILED" }, { status: 500 });
  }
}
