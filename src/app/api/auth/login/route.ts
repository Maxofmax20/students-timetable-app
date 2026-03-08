import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: 'LEGACY_LOGIN_DISABLED',
      detail: 'Use /auth with NextAuth credentials or OAuth to sign in to the live product.'
    },
    { status: 410 }
  );
}
