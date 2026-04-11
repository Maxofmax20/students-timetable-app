import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/workspace-v1";

async function getTimetableData(userId: string) {
  // 1. Try to find a modern Workspace first
  const workspace = await prisma.workspace.findFirst({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }]
    },
    include: {
      sessions: {
        include: {
          course: true,
          room: true,
          instructor: true,
          group: true
        },
        orderBy: [{ day: "asc" }, { startMinute: "asc" }]
      }
    }
  });

  if (workspace && workspace.sessions.length > 0) {
    console.log(`[getTimetableData] Found modern workspace: ${workspace.id} with ${workspace.sessions.length} sessions`);
    // Map modern Workspace sessions to legacy Timetable format for the bot
    return {
      id: workspace.id,
      title: workspace.title,
      days: ["sat", "sun", "mon", "tue", "wed", "thu", "fri"],
      startMinute: 8 * 60,
      endMinute: 22 * 60,
      snapMinutes: workspace.snapMinutes,
      allowOverlap: false,
      version: 2,
      events: workspace.sessions.map(s => ({
        id: s.id,
        timetableId: workspace.id,
        title: s.course.title + (s.room ? ` (${s.room.code})` : ""),
        day: s.day,
        startMinute: s.startMinute,
        durationMinutes: s.endMinute - s.startMinute,
        color: s.course.color || "#4f46e5",
        version: 1,
        type: s.type,
        instructor: s.instructor?.name || null,
        location: s.room?.name || s.room?.code || null,
        updatedAt: s.updatedAt.toISOString()
      }))
    };
  }

  console.log(`[getTimetableData] No modern workspace sessions found, falling back to legacy`);
  // 2. Fallback to legacy Timetable model
  const legacy = await prisma.timetable.findFirst({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }]
    },
    include: {
      events: { orderBy: [{ day: "asc" }, { startMinute: "asc" }] }
    }
  });

  if (legacy) {
    return {
      ...legacy,
      events: legacy.events.map(e => {
        const raw = (e.type || 'Lecture').toLowerCase();
        const mapped = raw.charAt(0).toUpperCase() + raw.slice(1);
        return { ...e, type: mapped };
      })
    };
  }

  // 3. Create default if nothing found
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
  try {
    const session = await requireSession(request);
    console.log(`[AllData] Fetching for userId: ${session.userId}`);
    
    const timetable = await getTimetableData(session.userId);
    console.log(`[AllData] Found timetable: ${timetable.id}, events: ${timetable.events?.length || 0}`);

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

    const origin = new URL(request.url).origin;

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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
