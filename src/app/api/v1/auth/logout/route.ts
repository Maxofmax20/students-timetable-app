import { NextResponse } from "next/server";
import { clearOtpPendingCookie, clearSessionCookie } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  clearOtpPendingCookie(response);
  return response;
}
