import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: 'LEGACY_SHARED_LINK_DISABLED',
      detail: 'Legacy shared links have been retired from the live product.'
    },
    { status: 410 }
  );
}
