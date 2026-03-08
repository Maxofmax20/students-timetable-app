import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "LEGACY_V1_AUTH_DISABLED",
      detail: "Use /auth to create a credentials account for the live product."
    },
    { status: 410 }
  );
}
