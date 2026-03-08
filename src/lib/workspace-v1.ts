import { NextRequest } from "next/server";
import { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRequestSession } from "@/lib/session";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireSession(request: NextRequest) {
  // 1. Try NextAuth session first (OAuth users)
  const nextAuthSession = await getServerSession(authOptions);
  if (nextAuthSession?.user?.id) {
    return {
      userId: nextAuthSession.user.id,
      email: nextAuthSession.user.email ?? "",
      name: nextAuthSession.user.name ?? null,
    };
  }

  // 2. Fall back to legacy JWT cookie (existing credential users)
  const legacySession = await getRequestSession(request);
  if (legacySession) return legacySession;

  throw new ApiError(401, "AUTH_REQUIRED");
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
