import { WorkspaceRole } from "@prisma/client";
import { ApiError, getMembershipRole, requireWorkspaceRole } from "@/lib/workspace-v1";

export const WORKSPACE_READ_ROLES: WorkspaceRole[] = [
  WorkspaceRole.OWNER,
  WorkspaceRole.TEACHER,
  WorkspaceRole.STUDENT,
  WorkspaceRole.VIEWER
];

export const WORKSPACE_WRITE_ROLES: WorkspaceRole[] = [WorkspaceRole.OWNER, WorkspaceRole.TEACHER];

export type ProductRole = "OWNER" | "EDITOR" | "VIEWER";

export function toProductRole(role: WorkspaceRole): ProductRole {
  if (role === WorkspaceRole.OWNER) return "OWNER";
  if (role === WorkspaceRole.TEACHER) return "EDITOR";
  return "VIEWER";
}

export function buildWorkspaceAccess(role: WorkspaceRole) {
  const productRole = toProductRole(role);
  return {
    role,
    productRole,
    canRead: true,
    canWrite: productRole !== "VIEWER",
    canImport: productRole !== "VIEWER",
    canManageMembers: productRole === "OWNER"
  };
}

export async function requireWorkspaceReadAccess(userId: string, workspaceId: string) {
  const role = await requireWorkspaceRole(userId, workspaceId, WORKSPACE_READ_ROLES);
  return buildWorkspaceAccess(role);
}

export async function requireWorkspaceWriteAccess(userId: string, workspaceId: string) {
  const role = await requireWorkspaceRole(userId, workspaceId, WORKSPACE_WRITE_ROLES);
  return buildWorkspaceAccess(role);
}

export async function requireWorkspaceOwnerAccess(userId: string, workspaceId: string) {
  const role = await requireWorkspaceRole(userId, workspaceId, [WorkspaceRole.OWNER]);
  return buildWorkspaceAccess(role);
}

export async function getWorkspaceAccessOrThrow(userId: string, workspaceId: string) {
  const role = await getMembershipRole(userId, workspaceId);
  if (!role) throw new ApiError(403, "FORBIDDEN");
  return buildWorkspaceAccess(role);
}
