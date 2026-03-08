import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "LEGACY_V1_AUTH_DISABLED",
      detail: "The old OTP send flow has been retired from the live product."
    },
    { status: 410 }
  );
}
