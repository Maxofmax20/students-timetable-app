import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      message: 'LEGACY_SHARED_LINK_DISABLED',
      detail: 'This shared timetable link belongs to a deprecated sharing system and is no longer available.'
    },
    { status: 410 }
  );
}
