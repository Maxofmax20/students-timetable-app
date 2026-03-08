import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "AUTH_REQUIRED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      emailVerifiedAt: true,
      createdAt: true
    }
  });

  if (!user) {
    return NextResponse.json({ ok: false, message: "USER_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user });
}
