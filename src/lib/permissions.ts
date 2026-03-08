import { MemberRole } from '@prisma/client';

export function canEdit(role: MemberRole | null | undefined) {
  return role === 'OWNER' || role === 'EDITOR';
}

export function canView(role: MemberRole | null | undefined) {
  return role === 'OWNER' || role === 'EDITOR' || role === 'VIEWER';
}
