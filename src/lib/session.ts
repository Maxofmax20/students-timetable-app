import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { OTP_PENDING_COOKIE, SESSION_COOKIE } from "./constants";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "change-me-super-secret");

export type SessionPayload = {
  userId: string;
  email: string;
  name?: string | null;
};

export type OtpPurpose = "LOGIN" | "REGISTER_VERIFY" | "PASSWORD_RESET";

export type OtpPendingPayload = {
  userId: string;
  email: string;
  purpose: OtpPurpose;
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySession(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      name: payload.name ? String(payload.name) : null
    };
  } catch {
    return null;
  }
}

export async function createSessionToken(payload: {
  userId: string;
  email: string;
  displayName?: string | null;
}) {
  return signSession({
    userId: payload.userId,
    email: payload.email,
    name: payload.displayName ?? null
  });
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0
  });
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

export async function getServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

export async function getRequestSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

export async function getOtpPendingFromRequest(request: NextRequest) {
  const token = request.cookies.get(OTP_PENDING_COOKIE)?.value;
  return verifyOtpPendingToken(token);
}
