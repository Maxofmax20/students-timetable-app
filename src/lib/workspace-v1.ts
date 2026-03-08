import { NextRequest } from "next/server";
import { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRequestSession } from "@/lib/session";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireSession(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    throw new ApiError(401, "AUTH_REQUIRED");
  }
  return session;
}

export async function getMembershipRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true }
  });

  if (!workspace) {
    throw new ApiError(404, "WORKSPACE_NOT_FOUND");
  }

  if (workspace.ownerId === userId) {
    return WorkspaceRole.OWNER;
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true }
  });

  return member?.role ?? null;
}

export async function requireWorkspaceRole(
  userId: string,
  workspaceId: string,
  allowedRoles: WorkspaceRole[]
): Promise<WorkspaceRole> {
  const role = await getMembershipRole(userId, workspaceId);
  if (!role || !allowedRoles.includes(role)) {
    throw new ApiError(403, "FORBIDDEN");
  }
  return role;
}

export async function getOrCreatePersonalWorkspace(userId: string) {
  const existing = await prisma.workspace.findFirst({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }]
    },
    orderBy: { createdAt: "asc" }
  });

  if (existing) return existing;

  return prisma.workspace.create({
    data: {
      ownerId: userId,
      title: "My Workspace",
      locale: "en",
      weekStart: "SATURDAY",
      timeFormat: "BOTH",
      conflictMode: "WARNING",
      members: {
        create: {
          userId,
          role: "OWNER"
        }
      }
    }
  });
}
