import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "LEGACY_V1_AUTH_DISABLED",
      detail: "Use /auth with the canonical credentials-based sign-in flow."
    },
    { status: 410 }
  );
}
