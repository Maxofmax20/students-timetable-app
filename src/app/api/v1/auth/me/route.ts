import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      message: "LEGACY_V1_AUTH_DISABLED",
      detail: "Use the canonical NextAuth session endpoint instead of the retired v1 auth API."
    },
    { status: 410 }
  );
}
