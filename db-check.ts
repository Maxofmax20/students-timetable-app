import { prisma } from "./src/lib/prisma";

async function main() {
  const userId = "cmmgyn4vk0003zcf5b5t3smfh";
  console.log(`Checking DB for userId: ${userId}`);

  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } }
      ]
    },
    include: {
      _count: { select: { courses: true, sessions: true, groups: true, instructors: true, rooms: true } }
    }
  });

  console.log(`Found ${workspaces.length} workspaces:`);
  workspaces.forEach(w => {
    console.log(`- [${w.id}] ${w.title}:`);
    console.log(`  Courses: ${w._count.courses}`);
    console.log(`  Sessions: ${w._count.sessions}`);
    console.log(`  Groups: ${w._count.groups}`);
    console.log(`  Instructors: ${w._count.instructors}`);
    console.log(`  Rooms: ${w._count.rooms}`);
  });
  
  if (workspaces.length > 0) {
    const wsId = workspaces[0].id;
    const sessions = await prisma.sessionEntry.findMany({
      where: { workspaceId: wsId },
      include: { course: true }
    });
    console.log(`\nSample sessions for first workspace:`);
    sessions.forEach(s => {
      console.log(`- ${s.course?.title} on ${s.day} at ${s.startMinute}`);
    });
  }
}

main().finally(() => prisma.$disconnect());
