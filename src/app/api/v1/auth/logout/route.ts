import { NextResponse } from "next/server";
import { clearAuthCookies, clearOtpPendingCookie } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  clearOtpPendingCookie(response);
  return response;
}
