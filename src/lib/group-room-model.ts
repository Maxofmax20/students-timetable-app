import type { GroupApiItem, RoomApiItem } from '@/types';

export function normalizeGroupCode(code?: string | null) {
  return (code || '').trim().toUpperCase();
}

export function inferParentGroupCode(code?: string | null) {
  const normalized = normalizeGroupCode(code);
  const match = normalized.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return match[1];
}

export function isSubgroupCode(code?: string | null) {
  return Boolean(inferParentGroupCode(code));
}

export function groupKindLabel(group?: Pick<GroupApiItem, 'code' | 'parentGroupId'> | null) {
  return group?.parentGroupId ? 'Subgroup' : 'Main group';
}

export function groupHierarchyPath(group: Pick<GroupApiItem, 'code' | 'parentGroupId' | 'parentGroup'>) {
  const parentCode = group.parentGroup?.code;
  return parentCode ? `${parentCode} → ${group.code}` : group.code;
}

export function sortGroupsForDisplay(groups: GroupApiItem[]) {
  const byCode = new Map(groups.map((group) => [normalizeGroupCode(group.code), group]));
  return [...groups].sort((left, right) => {
    const leftParent = left.parentGroup?.code || inferParentGroupCode(left.code) || left.code;
    const rightParent = right.parentGroup?.code || inferParentGroupCode(right.code) || right.code;
    const parentCompare = leftParent.localeCompare(rightParent);
    if (parentCompare !== 0) return parentCompare;
    if (!!left.parentGroupId !== !!right.parentGroupId) return left.parentGroupId ? 1 : -1;
    const codeCompare = left.code.localeCompare(right.code, undefined, { numeric: true });
    if (codeCompare !== 0) return codeCompare;
    return (left.name || '').localeCompare(right.name || '');
  }).map((group) => ({
    ...group,
    parentGroup: group.parentGroup || (inferParentGroupCode(group.code) ? byCode.get(inferParentGroupCode(group.code)!) ?? null : null)
  }));
}

export function parseRoomCode(code?: string | null) {
  const normalized = (code || '').trim().toUpperCase();
  const compact = normalized.replace(/\s+/g, '');
  const match = compact.match(/^([A-Z]+)-?(\d{1,4})$/);
  if (!match) return null;
  return {
    buildingCode: match[1],
    roomNumber: match[2],
    code: `${match[1]}${match[2]}`,
    level: deriveRoomLevel(match[2])
  };
}

export function deriveRoomLevel(roomNumber?: string | null) {
  const numeric = Number.parseInt((roomNumber || '').trim(), 10);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  if (numeric < 200) return 0;
  return Math.floor(numeric / 100) - 1;
}

export function formatRoomLevel(level?: number | null) {
  if (level == null) return 'Unknown level';
  return `Level ${level}`;
}

export function normalizeRoomFields(input: {
  code?: string | null;
  buildingCode?: string | null;
  roomNumber?: string | null;
  level?: number | null;
}) {
  const explicitBuilding = (input.buildingCode || '').trim().toUpperCase();
  const explicitRoomNumber = (input.roomNumber || '').trim();

  if (explicitBuilding && explicitRoomNumber) {
    return {
      code: `${explicitBuilding}${explicitRoomNumber}`,
      buildingCode: explicitBuilding,
      roomNumber: explicitRoomNumber,
      level: deriveRoomLevel(explicitRoomNumber)
    };
  }

  const parsed = parseRoomCode(input.code);
  if (parsed) return parsed;

  return {
    code: (input.code || '').trim(),
    buildingCode: explicitBuilding || null,
    roomNumber: explicitRoomNumber || null,
    level: input.level ?? deriveRoomLevel(explicitRoomNumber)
  };
}

export function roomDisplaySummary(room?: Pick<RoomApiItem, 'code' | 'building' | 'buildingCode' | 'roomNumber' | 'level'> | null) {
  if (!room) return 'Room unassigned';
  const parts = [
    room.buildingCode ? `Building ${room.buildingCode}` : null,
    room.roomNumber ? `Room ${room.roomNumber}` : null,
    formatRoomLevel(room.level),
    room.building || null
  ].filter(Boolean);
  return parts.length ? parts.join(' • ') : room.code;
}
