import { NextResponse } from 'next/server';

const payload = {
  ok: false,
  message: 'LEGACY_SHARING_DISABLED',
  detail: 'Legacy timetable share links are no longer part of the live workspace product.'
};

export async function GET() {
  return NextResponse.json(payload, { status: 410 });
}

export async function POST() {
  return NextResponse.json(payload, { status: 410 });
}
