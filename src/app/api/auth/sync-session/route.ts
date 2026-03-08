import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { signSession, setSessionCookie } from "@/lib/session";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "AUTH_REQUIRED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, displayName: true }
  });

  if (!user) {
    return NextResponse.json({ ok: false, message: "USER_NOT_FOUND" }, { status: 404 });
  }

  const token = await signSession({
    userId: user.id,
    email: user.email,
    name: user.displayName ?? null
  });

  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, token);
  return response;
}
