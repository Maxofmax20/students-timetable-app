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
  group: string;
  instructor: string;
  room: string;
  day: string;
  time: string;
  status: "Active" | "Draft" | "Conflict";
  groupId?: string | null;
  instructorId?: string | null;
  roomId?: string | null;
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
};

export type GroupApiItem = {
  id: string;
  code: string;
  name: string;
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

export type CourseWritePayload = {
  code?: string;
  title?: string;
  status?: string;
  groupId?: string | null;
  instructorId?: string | null;
  roomId?: string | null;
};
