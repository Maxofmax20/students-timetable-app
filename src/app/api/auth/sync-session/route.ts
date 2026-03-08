import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "LEGACY_SESSION_SYNC_DISABLED",
      detail: "The live product now relies on NextAuth as the canonical session model."
    },
    { status: 410 }
  );
}
