export type MemberRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type ShareLinkType = 'PUBLIC' | 'PRIVATE';

export interface TimetableEventDto {
  id: string;
  timetableId: string;
  title: string;
  day: string;
  startMinute: number;
  durationMinutes: number;
  color: string;
  version: number;
  updatedAt?: string;
}

export interface TimetableDto {
  id: string;
  title: string;
  days: string[];
  startMinute: number;
  endMinute: number;
  snapMinutes: number;
  allowOverlap: boolean;
  version: number;
  events: TimetableEventDto[];
}

export interface ShareCreatePayload {
  timetableId: string;
  type: ShareLinkType;
  role: MemberRole;
}
