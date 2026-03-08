import { NextResponse } from "next/server";

const LEGACY_COOKIE_NAMES = [
  'stt_session',
  'stt_otp_pending',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url'
];

export function clearAuthCookies(response: NextResponse) {
  for (const name of LEGACY_COOKIE_NAMES) {
    response.cookies.set(name, '', {
      httpOnly: name.includes('token') || name.startsWith('stt_'),
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 0
    });
  }
}
