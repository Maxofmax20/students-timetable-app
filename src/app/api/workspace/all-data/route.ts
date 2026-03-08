import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/workspace-v1";

async function getOrCreateWorkspaceTimetable(userId: string) {
  const existing = await prisma.timetable.findFirst({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }]
    },
    include: {
      events: { orderBy: [{ day: "asc" }, { startMinute: "asc" }] }
    }
  });

  if (existing) return existing;

  return prisma.timetable.create({
    data: {
      ownerId: userId,
      title: "جدولي الدراسي",
      days: ["sat", "sun", "mon", "tue", "wed", "thu", "fri"],
      startMinute: 8 * 60,
      endMinute: 22 * 60,
      snapMinutes: 15,
      allowOverlap: false,
      members: {
        create: {
          userId,
          role: "OWNER"
        }
      }
    },
    include: {
      events: { orderBy: [{ day: "asc" }, { startMinute: "asc" }] }
    }
  });
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request);

  const timetable = await getOrCreateWorkspaceTimetable(session.userId);

  const latestBuilderSnapshot = await prisma.auditLog.findFirst({
    where: {
      timetableId: timetable.id,
      action: "BUILDER_SNAPSHOT_SAVE"
    },
    orderBy: { createdAt: "desc" }
  });

  const shareLinks = await prisma.shareLink.findMany({
    where: { timetableId: timetable.id },
    orderBy: { createdAt: "desc" }
  });

  const origin = request.nextUrl.origin;

  return NextResponse.json({
    ok: true,
    workspace: {
      timetable,
      events: timetable.events,
      builderSnapshot: latestBuilderSnapshot?.payload ?? null,
      shareLinks: shareLinks.map((item) => ({
        ...item,
        url: `${origin}/s/${item.token}`
      }))
    }
  });
}
