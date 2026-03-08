import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { OTP_PENDING_COOKIE, SESSION_COOKIE } from "./constants";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "change-me-super-secret");

export type OtpPurpose = "LOGIN" | "REGISTER_VERIFY" | "PASSWORD_RESET";

export type OtpPendingPayload = {
  userId: string;
  email: string;
  purpose: OtpPurpose;
};

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0
  });
}

export function clearAuthCookies(response: NextResponse) {
  clearSessionCookie(response);

  const cookieNames = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
    'next-auth.callback-url',
    '__Secure-next-auth.callback-url'
  ];

  for (const name of cookieNames) {
    response.cookies.set(name, '', {
      httpOnly: name.includes('token'),
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 0
    });
  }
}

export async function createOtpPendingToken(payload: OtpPendingPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function verifyOtpPendingToken(token?: string | null): Promise<OtpPendingPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const purpose = String(payload.purpose) as OtpPurpose;
    if (!["LOGIN", "REGISTER_VERIFY", "PASSWORD_RESET"].includes(purpose)) {
      return null;
    }

    return {
      userId: String(payload.userId),
      email: String(payload.email),
      purpose
    };
  } catch {
    return null;
  }
}

export function setOtpPendingCookie(response: NextResponse, token: string) {
  response.cookies.set(OTP_PENDING_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 15
  });
}

export function clearOtpPendingCookie(response: NextResponse) {
  response.cookies.set(OTP_PENDING_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0
  });
}

export async function getOtpPendingFromRequest(request: NextRequest) {
  const token = request.cookies.get(OTP_PENDING_COOKIE)?.value;
  return verifyOtpPendingToken(token);
}
