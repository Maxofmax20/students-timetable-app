export type ThemeChoice = "c" | "a" | "b";
export type ActionLabel = "New" | "Save" | "Undo" | "Redo" | "Share" | "Export" | "Preview" | "Conflicts";
export type RowAction = "Edit" | "Duplicate" | "Delete";
export type MainTab = "Dashboard" | "Timetable" | "Courses" | "Settings";
export type SettingsTab = "Theme" | "Display" | "Timetable" | "Permissions";
export type TimeMode = "24h" | "12h";
export type WeekStartOption = "SATURDAY" | "SUNDAY" | "MONDAY";
export type ConflictPolicy = "WARNING" | "STRICT" | "OFF";
export type InviteRole = "OWNER" | "TEACHER" | "STUDENT" | "VIEWER";
export type PreviewMode = "default" | "desktop" | "tablet" | "mobile" | "public";
export type CreateEntityType = "workspace" | "group" | "instructor" | "course";

export type Row = {
  id: string;
  code?: string;
  source: "real" | "mock";
  course: string;
  courseName?: string; // Standardize name
  group: string;
  instructor: string;
  room: string;
  day: string;
  startTime?: string;
  endTime?: string;
  time: string;
  status: "Active" | "Draft" | "Conflict";
  groupId?: string | null;
  instructorId?: string | null;
  roomId?: string | null;
};

export type RowData = Row;

export type RowUpdatePayload = Partial<Omit<Row, 'id' | 'source'>>;

export type SessionTypeValue = 'LECTURE' | 'SECTION' | 'LAB' | 'ONLINE' | 'HYBRID';

export type SessionApiItem = {
  id: string;
  type?: SessionTypeValue | null;
  day: string;
  startMinute: number;
  endMinute: number;
  groupId?: string | null;
  instructorId?: string | null;
  roomId?: string | null;
  onlinePlatform?: string | null;
  onlineLink?: string | null;
  note?: string | null;
  group?: { id?: string; code?: string | null; name?: string | null } | null;
  instructor?: { id?: string; name?: string | null } | null;
  room?: { id?: string; code?: string | null; name?: string | null } | null;
};

export type CourseApiItem = {
  id: string;
  code: string;
  title: string;
  status: string;
  groupId?: string | null;
  instructorId?: string | null;
  roomId?: string | null;
  group?: { id?: string; code?: string | null; name?: string | null } | null;
  instructor?: { id?: string; name?: string | null } | null;
  room?: { id?: string; code?: string | null; name?: string | null } | null;
  sessions?: SessionApiItem[];
};

export type GroupApiItem = {
  id: string;
  code: string;
  name: string;
  yearLabel?: string | null;
  color?: string | null;
  parentGroupId?: string | null;
  parentGroup?: { id?: string; code?: string | null; name?: string | null } | null;
  childCount?: number;
};

export type InstructorApiItem = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

export type RoomApiItem = {
  id: string;
  code: string;
  name: string;
  capacity?: number | null;
  building?: string | null;
  buildingCode?: string | null;
  roomNumber?: string | null;
  level?: number | null;
};

export type ListPayload<T> = {
  ok?: boolean;
  message?: string;
  data?: {
    workspaceId?: string;
    items?: T[];
  };
};

export type SinglePayload<T> = {
  ok?: boolean;
  message?: string;
  data?: T;
};

export type CourseSessionWritePayload = {
  id?: string;
  type?: SessionTypeValue;
  day?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  groupId?: string | null;
  instructorId?: string | null;
  roomId?: string | null;
  onlinePlatform?: string | null;
  onlineLink?: string | null;
  note?: string | null;
};

export type CourseWritePayload = {
  code?: string;
  title?: string;
  status?: string;
  groupId?: string | null;
  instructorId?: string | null;
  roomId?: string | null;
  day?: string | null;
  time?: string | null;
  sessions?: CourseSessionWritePayload[];
};
