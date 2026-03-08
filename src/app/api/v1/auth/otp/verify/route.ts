import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  clearOtpPendingCookie,
  createSessionToken,
  getOtpPendingFromRequest,
  setSessionCookie
} from "@/lib/session";
import { verifyOtpCode } from "@/lib/otp";

const schema = z.object({
  code: z.string().regex(/^\d{6}$/),
  email: z.string().email().optional(),
  purpose: z.enum(["LOGIN", "REGISTER_VERIFY", "PASSWORD_RESET"]).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const pending = await getOtpPendingFromRequest(request);

    const purpose = pending?.purpose ?? body.purpose ?? "LOGIN";
    const email = (pending?.email ?? body.email ?? "").toLowerCase();

    if (!email) {
      return NextResponse.json({ ok: false, message: "EMAIL_REQUIRED" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ ok: false, message: "USER_NOT_FOUND" }, { status: 404 });
    }

    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        email,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!otpRecord || !verifyOtpCode(body.code, otpRecord.codeHash)) {
      return NextResponse.json({ ok: false, message: "INVALID_OTP" }, { status: 401 });
    }

    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() }
    });

    if (purpose === "REGISTER_VERIFY") {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() }
      });
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      displayName: user.displayName
    });

    const response = NextResponse.json({ ok: true, authenticated: true });
    clearOtpPendingCookie(response);
    setSessionCookie(response, token);

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }

    return NextResponse.json({ ok: false, message: "OTP_VERIFY_FAILED" }, { status: 500 });
  }
}
