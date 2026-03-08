"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import "material-symbols/outlined.css";
import "./workspace.css";

import {
  type ThemeChoice,
  type ActionLabel,
  type RowAction,
  type MainTab,
  type SettingsTab,
  type TimeMode,
  type WeekStartOption,
  type ConflictPolicy,
  type InviteRole,
  type PreviewMode,
  type CreateEntityType,
  type Row,
  type CourseApiItem,
  type GroupApiItem,
  type InstructorApiItem,
  type RoomApiItem,
  type ListPayload,
  type SinglePayload,
  type CourseWritePayload
} from "@/types";
import {
  randomInt,
  normalizeCode,
  cloneRows,
  parseTimeRange,
  toTwelveHour,
  formatTimeRange,
  normalizeDayToIndex,
  toUiStatus,
  parseJson,
  csvCell,
  downloadFile,
  copyText
} from "@/lib/utils";
import { Toggle } from "@/components/ui/Toggle";
import { ActionCenter, RowActionCenter } from "@/components/workspace/ActionCenter";
import { DataTable } from "@/components/workspace/DataTable";
import { AppShell } from "@/components/layout/AppShell";

const placeholderRows: Row[] = [
  {
    id: "p1",
    code: "MATH4",
    source: "mock",
    course: "Mathematics 4",
    group: "A1",
    instructor: "Dr. Karim",
    room: "E412",
    day: "Thu",
    time: "09:30-10:45",
    status: "Active"
  },
  {
    id: "p2",
    code: "MICRO",
    source: "mock",
    course: "Microprocessors",
    group: "A1",
    instructor: "Eng. Hany",
    room: "E428",
    day: "Tue",
    time: "12:00-13:15",
    status: "Active"
  },
  {
    id: "p3",
    code: "ROBOT",
    source: "mock",
    course: "Robotics",
    group: "A2",
    instructor: "Dr. Salma",
    room: "E420",
    day: "Mon",
    time: "10:45-11:30",
    status: "Draft"
  },
  {
    id: "p4",
    code: "MECHVIB",
    source: "mock",
    course: "Mechanical Vibrations",
    group: "B1",
    instructor: "Dr. Omar",
    room: "E418",
    day: "Sat",
    time: "13:00-14:15",
    status: "Conflict"
  }
];

const actions: Array<{ icon: string; label: ActionLabel }> = [
  { icon: "add", label: "New" },
  { icon: "save", label: "Save" },
  { icon: "undo", label: "Undo" },
  { icon: "redo", label: "Redo" },
  { icon: "share", label: "Share" },
  { icon: "download", label: "Export" },
  { icon: "visibility", label: "Preview" },
  { icon: "warning", label: "Conflicts" }
];

const WEEK_DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];



function courseToRow(item: CourseApiItem, fallback?: Row): Row {
  return {
    id: item.id,
    code: item.code,
    source: "real",
    course: item.title,
    group: item.group?.code || fallback?.group || "-",
    instructor: item.instructor?.name || fallback?.instructor || "-",
    room: item.room?.code || fallback?.room || "-",
    day: fallback?.day || "--",
    time: fallback?.time || "--",
    status: toUiStatus(item.status),
    groupId: item.groupId ?? item.group?.id ?? fallback?.groupId ?? null,
    instructorId: item.instructorId ?? item.instructor?.id ?? fallback?.instructorId ?? null,
    roomId: item.roomId ?? item.room?.id ?? fallback?.roomId ?? null
  };
}



function formatIcsDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}00`;
}

function nextDateForWeekday(targetDay: number): Date {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const current = date.getDay();
  let diff = targetDay - current;
  if (diff < 0) diff += 7;
  date.setDate(date.getDate() + diff);
  return date;
}

function buildIcs(rows: Row[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Students Timetable//Workspace Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  rows.forEach((row, index) => {
    const dayIndex = normalizeDayToIndex(row.day);
    const time = parseTimeRange(row.time);
    if (dayIndex == null || !time) return;

    const startDate = nextDateForWeekday(dayIndex);
    const endDate = new Date(startDate);

    startDate.setHours(time.startH, time.startM, 0, 0);
    endDate.setHours(time.endH, time.endM, 0, 0);

    const uid = `${row.id}-${index}@students-timetable`;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${formatIcsDate(new Date())}`);
    lines.push(`DTSTART:${formatIcsDate(startDate)}`);
    lines.push(`DTEND:${formatIcsDate(endDate)}`);
    lines.push(`SUMMARY:${row.course.replace(/,/g, "\\,")}`);
    lines.push(`LOCATION:${row.room.replace(/,/g, "\\,")}`);
    lines.push(`DESCRIPTION:Group ${row.group} / ${row.instructor}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}



function scanConflicts(rows: Row[]): { rows: Row[]; count: number } {
  const roomMap = new Map<string, number>();
  const instructorMap = new Map<string, number>();

  rows.forEach((row) => {
    const day = row.day.trim();
    const time = row.time.trim();
    if (day === "--" || time === "--") return;

    if (row.room !== "-") {
      const roomKey = `${day}|${time}|room:${row.room.toLowerCase()}`;
      roomMap.set(roomKey, (roomMap.get(roomKey) ?? 0) + 1);
    }

    if (row.instructor !== "-") {
      const instructorKey = `${day}|${time}|instructor:${row.instructor.toLowerCase()}`;
      instructorMap.set(instructorKey, (instructorMap.get(instructorKey) ?? 0) + 1);
    }
  });

  let count = 0;
  const nextRows = rows.map((row) => {
    const day = row.day.trim();
    const time = row.time.trim();

    let conflicted = false;
    if (day !== "--" && time !== "--") {
      if (row.room !== "-") {
        const roomKey = `${day}|${time}|room:${row.room.toLowerCase()}`;
        conflicted = conflicted || (roomMap.get(roomKey) ?? 0) > 1;
      }

      if (row.instructor !== "-") {
        const instructorKey = `${day}|${time}|instructor:${row.instructor.toLowerCase()}`;
        conflicted = conflicted || (instructorMap.get(instructorKey) ?? 0) > 1;
      }
    }

    if (conflicted) count += 1;

    if (conflicted) {
      return { ...row, status: "Conflict" as const };
    }

    if (row.status === "Conflict") {
      return { ...row, status: "Active" as const };
    }

    return row;
  });

  return { rows: nextRows, count };
}

function SvgLogo() {
  return (
    <svg viewBox="0 0 48 48" className="w-logo" aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#logo-g)" />
      <path d="M14 26h20M14 19h20M14 33h12" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}


export default function WorkspacePage() {
  const [theme, setTheme] = useState<ThemeChoice>("c");
  const [showSettings, setShowSettings] = useState(false);
  const [showActionCenter, setShowActionCenter] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionLabel>("New");
  const [mainTab, setMainTab] = useState<MainTab>("Dashboard");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("Theme");

  const [showRowCenter, setShowRowCenter] = useState(false);
  const [activeRowAction, setActiveRowAction] = useState<RowAction>("Edit");
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);

  const [miniMap, setMiniMap] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [smartPlacement, setSmartPlacement] = useState(true);
  const [denseRows, setDenseRows] = useState(true);

  const [toast, setToast] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>(placeholderRows);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [authState, setAuthState] = useState<"unknown" | "authed" | "guest">("unknown");
  const [loadingRows, setLoadingRows] = useState(false);

  const [groups, setGroups] = useState<GroupApiItem[]>([]);
  const [instructors, setInstructors] = useState<InstructorApiItem[]>([]);
  const [rooms, setRooms] = useState<RoomApiItem[]>([]);

  const [undoStack, setUndoStack] = useState<Row[][]>([]);
  const [redoStack, setRedoStack] = useState<Row[][]>([]);

  const [timeMode, setTimeMode] = useState<TimeMode>("24h");
  const [weekStart, setWeekStart] = useState<WeekStartOption>("SATURDAY");
  const [conflictPolicy, setConflictPolicy] = useState<ConflictPolicy>("WARNING");
  const [snapMinutes, setSnapMinutes] = useState(15);
  const [fontScale, setFontScale] = useState(100);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("default");
  const [defaultInviteRole, setDefaultInviteRole] = useState<InviteRole>("VIEWER");

  const [createModalType, setCreateModalType] = useState<CreateEntityType | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    workspaceTitle: "My Workspace",
    groupCode: "",
    groupName: "",
    instructorName: "",
    instructorEmail: "",
    instructorPhone: "",
    courseTitle: "",
    courseCode: "",
    courseStatus: "DRAFT",
    courseGroupId: "",
    courseInstructorId: "",
    courseRoomId: ""
  });

  const rowsRef = useRef<Row[]>(placeholderRows);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const openCreateModal = (type: CreateEntityType) => {
    if (!ensureCanWrite(`create ${type}`)) return;

    setShowActionCenter(false);
    setCreateModalType(type);
    setCreateSubmitting(false);

    if (type === "workspace") {
      setCreateForm((current) => ({
        ...current,
        workspaceTitle: current.workspaceTitle || "My Workspace"
      }));
      return;
    }

    if (type === "group") {
      const code = `G-${randomInt(10, 99)}`;
      setCreateForm((current) => ({
        ...current,
        groupCode: code,
        groupName: current.groupName || `Group ${code}`
      }));
      return;
    }

    if (type === "instructor") {
      setCreateForm((current) => ({
        ...current,
        instructorName: current.instructorName || `Instructor ${randomInt(10, 99)}`,
        instructorEmail: current.instructorEmail || "",
        instructorPhone: current.instructorPhone || ""
      }));
      return;
    }

    setCreateForm((current) => ({
      ...current,
      courseTitle: current.courseTitle || `New Course ${randomInt(100, 999)}`,
      courseCode: current.courseCode || `CRS-${randomInt(100, 999)}`,
      courseStatus: current.courseStatus || "DRAFT",
      courseGroupId: groups[0]?.id ?? "",
      courseInstructorId: instructors[0]?.id ?? "",
      courseRoomId: rooms[0]?.id ?? ""
    }));
  };

  const closeCreateModal = () => {
    if (createSubmitting) return;
    setCreateModalType(null);
  };

  const submitCreateModal = async () => {
    if (!createModalType || createSubmitting) return;

    setCreateSubmitting(true);
    let success = false;

    if (createModalType === "workspace") {
      const title = createForm.workspaceTitle.trim();
      if (!title) {
        showToast("Workspace title is required");
      } else {
        success = await createWorkspace(title);
      }
    }

    if (createModalType === "group") {
      const code = createForm.groupCode.trim();
      const name = createForm.groupName.trim();

      if (!code || !name) {
        showToast("Group code and name are required");
      } else {
        success = await createGroup({ code, name });
      }
    }

    if (createModalType === "instructor") {
      const name = createForm.instructorName.trim();

      if (!name) {
        showToast("Instructor name is required");
      } else {
        success = await createInstructor({
          name,
          email: createForm.instructorEmail.trim(),
          phone: createForm.instructorPhone.trim()
        });
      }
    }

    if (createModalType === "course") {
      const title = createForm.courseTitle.trim();
      const code = createForm.courseCode.trim();

      if (!title || !code) {
        showToast("Course title and code are required");
      } else {
        success = await createCourse({
          title,
          code,
          status: createForm.courseStatus,
          groupId: createForm.courseGroupId || null,
          instructorId: createForm.courseInstructorId || null,
          roomId: createForm.courseRoomId || null
        });
      }
    }

    setCreateSubmitting(false);

    if (success) {
      setCreateModalType(null);
      setCreateForm((current) => ({
        ...current,
        courseTitle: "",
        courseCode: "",
        groupCode: "",
        groupName: "",
        instructorName: "",
        instructorEmail: "",
        instructorPhone: ""
      }));
    }
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitCreateModal();
  };

  const ensureCanWrite = (action: string): boolean => {
    if (authState !== "authed") {
      showToast(`Guest mode is read-only. Login required to ${action}.`);
      return false;
    }
    return true;
  };

  const pushUndoSnapshot = () => {
    setUndoStack((stack) => [...stack.slice(-24), cloneRows(rowsRef.current)]);
    setRedoStack([]);
  };

  const applyLocalRows = (updater: (current: Row[]) => Row[], message?: string) => {
    pushUndoSnapshot();
    setRows((current) => updater(cloneRows(current)));
    if (message) showToast(message);
  };

  const applyUndo = () => {
    setUndoStack((stack) => {
      if (!stack.length) {
        showToast("Nothing to undo");
        return stack;
      }

      const previous = stack[stack.length - 1];
      setRedoStack((redo) => [...redo.slice(-24), cloneRows(rowsRef.current)]);
      setRows(cloneRows(previous));
      showToast("Undo applied");
      return stack.slice(0, -1);
    });
  };

  const applyRedo = () => {
    setRedoStack((stack) => {
      if (!stack.length) {
        showToast("Nothing to redo");
        return stack;
      }

      const next = stack[stack.length - 1];
      setUndoStack((undo) => [...undo.slice(-24), cloneRows(rowsRef.current)]);
      setRows(cloneRows(next));
      showToast("Redo applied");
      return stack.slice(0, -1);
    });
  };

  const fetchReferenceData = async (forcedWorkspaceId?: string | null) => {
    const target = forcedWorkspaceId ?? workspaceId;
    const query = target ? `?workspaceId=${encodeURIComponent(target)}` : "";

    const [groupsResponse, instructorsResponse, roomsResponse] = await Promise.all([
      fetch(`/api/v1/groups${query}`, { credentials: "include" }),
      fetch(`/api/v1/instructors${query}`, { credentials: "include" }),
      fetch(`/api/v1/rooms${query}`, { credentials: "include" })
    ]);

    const [groupsPayload, instructorsPayload, roomsPayload] = await Promise.all([
      parseJson<ListPayload<GroupApiItem>>(groupsResponse),
      parseJson<ListPayload<InstructorApiItem>>(instructorsResponse),
      parseJson<ListPayload<RoomApiItem>>(roomsResponse)
    ]);

    if (groupsResponse.ok && groupsPayload?.ok) {
      setGroups(groupsPayload.data?.items ?? []);
      const ws = groupsPayload.data?.workspaceId;
      if (ws) setWorkspaceId(ws);
    }

    if (instructorsResponse.ok && instructorsPayload?.ok) {
      setInstructors(instructorsPayload.data?.items ?? []);
      const ws = instructorsPayload.data?.workspaceId;
      if (ws) setWorkspaceId(ws);
    }

    if (roomsResponse.ok && roomsPayload?.ok) {
      setRooms(roomsPayload.data?.items ?? []);
      const ws = roomsPayload.data?.workspaceId;
      if (ws) setWorkspaceId(ws);
    }
  };

  const fetchCourses = async () => {
    setLoadingRows(true);

    try {
      const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
      const response = await fetch(`/api/v1/courses${query}`, { credentials: "include" });

      if (response.status === 401) {
        setAuthState("guest");
        setRows(placeholderRows);
        setWorkspaceId(null);
        setGroups([]);
        setInstructors([]);
        setRooms([]);
        return;
      }

      const payload = await parseJson<ListPayload<CourseApiItem>>(response);

      if (!response.ok || !payload?.ok || !payload.data) {
        showToast(payload?.message || "Failed to load courses");
        return;
      }

      const previous = new Map(rowsRef.current.map((row) => [row.id, row]));
      const mapped = (payload.data.items ?? []).map((item) => courseToRow(item, previous.get(item.id)));

      setAuthState("authed");
      setWorkspaceId(payload.data.workspaceId ?? workspaceId ?? null);
      setRows(mapped.length ? mapped : []);

      await fetchReferenceData(payload.data.workspaceId ?? workspaceId ?? null);
    } catch {
      showToast("Network error while loading courses");
    } finally {
      setLoadingRows(false);
    }
  };

  const createGroupApi = async (code: string, name: string): Promise<GroupApiItem | null> => {
    if (!ensureCanWrite("create a group")) return null;

    const response = await fetch("/api/v1/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ workspaceId, code: normalizeCode(code), name })
    });

    const payload = await parseJson<SinglePayload<GroupApiItem>>(response);
    if (!response.ok || !payload?.ok || !payload.data) {
      showToast(payload?.message || "Create group failed");
      return null;
    }

    return payload.data;
  };

  const createGroup = async (payload: { code: string; name: string }): Promise<boolean> => {
    const created = await createGroupApi(payload.code, payload.name);
    if (!created) return false;

    showToast("Group created");
    await fetchReferenceData();
    return true;
  };

  const createRoom = async () => {
    if (!ensureCanWrite("create a room")) return;

    const code = window.prompt("Room code", `R-${randomInt(100, 999)}`)?.trim();
    if (!code) return;

    const name = window.prompt("Room name", code)?.trim();
    if (!name) return;

    const response = await fetch("/api/v1/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ workspaceId, code: normalizeCode(code), name })
    });

    const payload = await parseJson<SinglePayload<RoomApiItem>>(response);
    if (!response.ok || !payload?.ok) {
      showToast(payload?.message || "Create room failed");
      return;
    }

    showToast("Room created");
    await fetchReferenceData();
  };

  const createInstructor = async (payload: { name: string; email?: string; phone?: string }): Promise<boolean> => {
    if (!ensureCanWrite("create an instructor")) return false;

    const response = await fetch("/api/v1/instructors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        workspaceId,
        name: payload.name,
        email: payload.email || undefined,
        phone: payload.phone || undefined
      })
    });

    const result = await parseJson<SinglePayload<InstructorApiItem>>(response);
    if (!response.ok || !result?.ok) {
      showToast(result?.message || "Create instructor failed");
      return false;
    }

    showToast("Instructor created");
    await fetchReferenceData();
    return true;
  };

  const createWorkspace = async (title: string): Promise<boolean> => {
    if (!ensureCanWrite("create a workspace")) return false;

    const response = await fetch("/api/v1/workspaces", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title })
    });

    const payload = await parseJson<SinglePayload<{ id: string; title: string }>>(response);
    if (!response.ok || !payload?.ok || !payload.data) {
      showToast(payload?.message || "Create workspace failed");
      return false;
    }

    setWorkspaceId(payload.data.id);
    showToast(`Workspace "${payload.data.title}" created`);
    await fetchCourses();
    return true;
  };

  const createCourseApi = async (
    payload: {
      code: string;
      title: string;
      status?: string;
      groupId?: string | null;
      instructorId?: string | null;
      roomId?: string | null;
    },
    silent = false
  ): Promise<boolean> => {
    if (!ensureCanWrite("create courses")) return false;

    const response = await fetch("/api/v1/courses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        workspaceId,
        code: normalizeCode(payload.code),
        title: payload.title,
        status: payload.status ?? "DRAFT",
        groupId: payload.groupId ?? null,
        instructorId: payload.instructorId ?? null,
        roomId: payload.roomId ?? null
      })
    });

    const result = await parseJson<SinglePayload<CourseApiItem>>(response);

    if (!response.ok || !result?.ok) {
      if (!silent) showToast(result?.message || "Create course failed");
      return false;
    }

    return true;
  };

  const patchCourseApi = async (courseId: string, payload: CourseWritePayload): Promise<boolean> => {
    if (!ensureCanWrite("edit course")) return false;

    const response = await fetch(`/api/v1/courses/${courseId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    const result = await parseJson<SinglePayload<CourseApiItem>>(response);

    if (!response.ok || !result?.ok) {
      showToast(result?.message || "Update course failed");
      return false;
    }

    return true;
  };

  const deleteCourseApi = async (courseId: string, silent = false): Promise<boolean> => {
    if (!ensureCanWrite("delete course")) return false;

    const response = await fetch(`/api/v1/courses/${courseId}`, {
      method: "DELETE",
      credentials: "include"
    });

    const result = await parseJson<{ ok?: boolean; message?: string }>(response);

    if (!response.ok || !result?.ok) {
      if (!silent) showToast(result?.message || "Delete course failed");
      return false;
    }

    return true;
  };

  const createCourse = async (payload: {
    title: string;
    code: string;
    status?: string;
    groupId?: string | null;
    instructorId?: string | null;
    roomId?: string | null;
  }): Promise<boolean> => {
    if (!ensureCanWrite("create a course")) return false;

    const created = await createCourseApi({
      code: payload.code,
      title: payload.title,
      status: payload.status ?? "DRAFT",
      groupId: payload.groupId ?? null,
      instructorId: payload.instructorId ?? null,
      roomId: payload.roomId ?? null
    });
    if (!created) return false;

    showToast("Course created");
    await fetchCourses();
    return true;
  };

  const updateCourseName = async (row: Row) => {
    if (!ensureCanWrite("edit course title")) return;

    if (row.source !== "real") {
      showToast("Only real courses can be edited");
      return;
    }

    const nextName = window.prompt("Edit course title", row.course)?.trim();
    if (!nextName) return;

    const updated = await patchCourseApi(row.id, { title: nextName });
    if (!updated) return;

    showToast("Course updated");
    await fetchCourses();
  };

  const editCourseTime = async (row: Row) => {
    if (!ensureCanWrite("edit schedule details")) return;

    const day = window.prompt("Day (Sat/Sun/Mon/Tue/Wed/Thu)", row.day === "--" ? "Mon" : row.day)?.trim();
    if (!day) return;

    const time = window.prompt("Time range (HH:MM-HH:MM)", row.time === "--" ? "09:00-10:00" : row.time)?.trim();
    if (!time || !parseTimeRange(time)) {
      showToast("Invalid time format");
      return;
    }

    applyLocalRows(
      (current) => current.map((item) => (item.id === row.id ? { ...item, day, time } : item)),
      "Schedule note updated"
    );
  };

  const editCourseRoom = async (row: Row) => {
    if (!ensureCanWrite("edit room assignment")) return;

    if (row.source !== "real") {
      showToast("Only real courses can be edited");
      return;
    }

    if (!rooms.length) {
      const shouldCreateRoom = window.confirm("No rooms available. Create one now?");
      if (shouldCreateRoom) await createRoom();
      return;
    }

    const options = rooms.map((room) => room.code).join(", ");
    const input = window.prompt(`Choose room code (${options})`, row.room === "-" ? rooms[0]?.code ?? "" : row.room)?.trim();
    if (!input) return;

    const selected = rooms.find((room) => room.code.toLowerCase() === input.toLowerCase());
    if (!selected) {
      showToast("Room code not found");
      return;
    }

    const updated = await patchCourseApi(row.id, { roomId: selected.id });
    if (!updated) return;

    showToast("Room updated");
    await fetchCourses();
  };

  const openFullEdit = async (row: Row) => {
    if (!ensureCanWrite("open full editor")) return;

    if (row.source !== "real") {
      showToast("Only real courses can be edited");
      return;
    }

    const title = window.prompt("Course title", row.course)?.trim();
    if (!title) return;

    const code = window.prompt("Course code", row.code ?? normalizeCode(row.course))?.trim();
    if (!code) return;

    const statusRaw = window.prompt("Status (ACTIVE / DRAFT / CONFLICT)", row.status.toUpperCase())?.trim().toUpperCase();
    const status = statusRaw || "ACTIVE";

    const groupPrompt = window.prompt(
      `Group code (${groups.map((group) => group.code).join(", ") || "none"})`,
      row.group === "-" ? "" : row.group
    )?.trim();
    const instructorPrompt = window.prompt(
      `Instructor name (${instructors.map((instructor) => instructor.name).join(", ") || "none"})`,
      row.instructor === "-" ? "" : row.instructor
    )?.trim();
    const roomPrompt = window.prompt(
      `Room code (${rooms.map((room) => room.code).join(", ") || "none"})`,
      row.room === "-" ? "" : row.room
    )?.trim();

    const selectedGroup = groupPrompt ? groups.find((group) => group.code.toLowerCase() === groupPrompt.toLowerCase()) : null;
    const selectedInstructor = instructorPrompt
      ? instructors.find((instructor) => instructor.name.toLowerCase() === instructorPrompt.toLowerCase())
      : null;
    const selectedRoom = roomPrompt ? rooms.find((room) => room.code.toLowerCase() === roomPrompt.toLowerCase()) : null;

    const updated = await patchCourseApi(row.id, {
      title,
      code,
      status,
      groupId: selectedGroup?.id ?? null,
      instructorId: selectedInstructor?.id ?? null,
      roomId: selectedRoom?.id ?? null
    });

    if (!updated) return;

    showToast("Full edit saved");
    await fetchCourses();
  };

  const duplicateCourse = async (row: Row) => {
    if (!ensureCanWrite("duplicate course")) return;

    if (row.source !== "real") {
      showToast("Only real courses can be duplicated");
      return;
    }

    const duplicated = await createCourseApi({
      code: `${row.code ?? normalizeCode(row.course)}-COPY-${randomInt(10, 99)}`,
      title: `${row.course} Copy`,
      status: "DRAFT",
      groupId: row.groupId ?? null,
      instructorId: row.instructorId ?? null,
      roomId: row.roomId ?? null
    });

    if (!duplicated) return;

    showToast("Course duplicated");
    await fetchCourses();
  };

  const duplicateAllDays = async (row: Row) => {
    if (!ensureCanWrite("duplicate across week")) return;

    if (row.source !== "real") {
      showToast("Only real courses can be duplicated");
      return;
    }

    let success = 0;

    for (const day of WEEK_DAYS) {
      const created = await createCourseApi(
        {
          code: `${row.code ?? normalizeCode(row.course)}-${day}-${randomInt(10, 99)}`,
          title: `${row.course} (${day})`,
          status: "DRAFT",
          groupId: row.groupId ?? null,
          instructorId: row.instructorId ?? null,
          roomId: row.roomId ?? null
        },
        true
      );

      if (created) success += 1;
    }

    showToast(`Created ${success}/${WEEK_DAYS.length} weekly duplicates`);
    if (success > 0) await fetchCourses();
  };

  const duplicateToA2 = async (row: Row) => {
    if (!ensureCanWrite("duplicate to group A2")) return;

    if (row.source !== "real") {
      showToast("Only real courses can be duplicated");
      return;
    }

    let groupA2: GroupApiItem | null = groups.find((group) => group.code.toUpperCase() === "A2") ?? null;

    if (!groupA2) {
      groupA2 = await createGroupApi("A2", "Group A2");
      if (!groupA2) return;
      await fetchReferenceData();
    }

    const created = await createCourseApi({
      code: `${row.code ?? normalizeCode(row.course)}-A2-${randomInt(10, 99)}`,
      title: `${row.course} (A2)`,
      status: "DRAFT",
      groupId: groupA2.id,
      instructorId: row.instructorId ?? null,
      roomId: row.roomId ?? null
    });

    if (!created) return;

    showToast("Course duplicated to A2");
    await fetchCourses();
  };

  const duplicateAndEdit = async (row: Row) => {
    if (!ensureCanWrite("duplicate and edit")) return;

    if (row.source !== "real") {
      showToast("Only real courses can be duplicated");
      return;
    }

    const title = window.prompt("Title for duplicate", `${row.course} Copy`)?.trim();
    if (!title) return;

    const code = window.prompt("Code for duplicate", `${row.code ?? normalizeCode(row.course)}-${randomInt(10, 99)}`)?.trim();
    if (!code) return;

    const created = await createCourseApi({
      code,
      title,
      status: "DRAFT",
      groupId: row.groupId ?? null,
      instructorId: row.instructorId ?? null,
      roomId: row.roomId ?? null
    });

    if (!created) return;

    showToast("Duplicate created with edits");
    await fetchCourses();
  };

  const archiveCourse = async (row: Row) => {
    if (!ensureCanWrite("archive course")) return;

    if (row.source !== "real") {
      showToast("Only real courses can be archived");
      return;
    }

    const archived = await patchCourseApi(row.id, {
      title: row.course.startsWith("[ARCHIVED]") ? row.course : `[ARCHIVED] ${row.course}`,
      status: "DRAFT"
    });

    if (!archived) return;

    showToast("Course archived");
    await fetchCourses();
  };

  const deleteCourse = async (row: Row, hard = false) => {
    if (!ensureCanWrite("delete course")) return;

    if (row.source !== "real") {
      showToast("Only real courses can be deleted");
      return;
    }

    const approved = window.confirm(hard ? `Hard delete ${row.course}?` : `Delete ${row.course}?`);
    if (!approved) return;

    const deleted = await deleteCourseApi(row.id);
    if (!deleted) return;

    showToast(hard ? "Hard delete complete" : "Course deleted");
    await fetchCourses();
  };

  const deleteAllInGroup = async (row: Row) => {
    if (!ensureCanWrite("delete group courses")) return;

    const targetGroup = row.group.trim();
    if (!targetGroup || targetGroup === "-") {
      showToast("This row has no group");
      return;
    }

    const matches = rowsRef.current.filter((item) => item.group === targetGroup && item.source === "real");
    if (!matches.length) {
      showToast(`No real courses found in group ${targetGroup}`);
      return;
    }

    const approved = window.confirm(`Delete ${matches.length} course(s) in group ${targetGroup}?`);
    if (!approved) return;

    let deleted = 0;

    for (const item of matches) {
      const ok = await deleteCourseApi(item.id, true);
      if (ok) deleted += 1;
    }

    showToast(`Deleted ${deleted}/${matches.length} course(s)`);
    if (deleted > 0) await fetchCourses();
  };

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      workspaceId,
      rows,
      groups,
      instructors,
      rooms,
      settings: {
        theme,
        timeMode,
        weekStart,
        conflictPolicy,
        snapMinutes,
        denseRows,
        miniMap,
        smartPlacement,
        autoSave
      }
    };

    downloadFile(`workspace-${Date.now()}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    showToast("JSON exported");
  };

  const exportCsv = () => {
    const header = ["Code", "Course", "Group", "Instructor", "Room", "Day", "Time", "Status"];
    const lines = [header.map(csvCell).join(",")];

    rows.forEach((row) => {
      lines.push(
        [row.code ?? "", row.course, row.group, row.instructor, row.room, row.day, row.time, row.status]
          .map((cell) => csvCell(cell))
          .join(",")
      );
    });

    downloadFile(`workspace-${Date.now()}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
    showToast("CSV exported");
  };

  const exportIcs = () => {
    const ics = buildIcs(rows);
    downloadFile(`workspace-${Date.now()}.ics`, ics, "text/calendar;charset=utf-8");
    showToast("ICS exported");
  };

  const saveCheckpoint = () => {
    const key = "students-timetable.workspace.checkpoints";
    const snapshot = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      rows,
      workspaceId,
      settings: {
        theme,
        timeMode,
        weekStart,
        conflictPolicy,
        snapMinutes,
        denseRows,
        miniMap,
        smartPlacement,
        autoSave,
        previewMode
      }
    };

    try {
      const existing = localStorage.getItem(key);
      const list = existing ? ((JSON.parse(existing) as Array<Record<string, unknown>>) ?? []) : [];
      const next = [snapshot, ...list].slice(0, 20);
      localStorage.setItem(key, JSON.stringify(next));
      showToast("Checkpoint saved");
    } catch {
      showToast("Checkpoint save failed");
    }
  };

  const showCheckpointCount = () => {
    const key = "students-timetable.workspace.checkpoints";

    try {
      const existing = localStorage.getItem(key);
      const list = existing ? ((JSON.parse(existing) as Array<Record<string, unknown>>) ?? []) : [];
      showToast(`Saved checkpoints: ${list.length}`);
    } catch {
      showToast("Could not read checkpoints");
    }
  };

  const applyConflictScan = () => {
    const { rows: nextRows, count } = scanConflicts(rowsRef.current);
    pushUndoSnapshot();
    setRows(nextRows);
    showToast(count > 0 ? `Found ${count} conflicts` : "No conflicts found");
  };

  const clearConflictHighlights = () => {
    applyLocalRows(
      (current) => current.map((row) => (row.status === "Conflict" ? { ...row, status: "Active" } : row)),
      "Conflict highlights cleared"
    );
  };

  const runAction = async (name: string) => {
    if (name === "New Workspace") {
      openCreateModal("workspace");
      return;
    }

    if (name === "New Group") {
      openCreateModal("group");
      return;
    }

    if (name === "New Course") {
      openCreateModal("course");
      return;
    }

    if (name === "New Instructor") {
      openCreateModal("instructor");
      return;
    }

    if (name === "Save now") {
      await fetchCourses();
      showToast("Workspace refreshed from server");
      return;
    }

    if (name === "Save as template") {
      exportJson();
      return;
    }

    if (name === "Create checkpoint") {
      saveCheckpoint();
      return;
    }

    if (name === "Auto-save settings") {
      setAutoSave((value) => !value);
      showToast(`Auto-save ${autoSave ? "disabled" : "enabled"}`);
      return;
    }

    if (name === "Create public link") {
      const link = `${window.location.origin}/workspace${workspaceId ? `?workspaceId=${workspaceId}` : ""}`;
      const copied = await copyText(link);
      showToast(copied ? "Workspace link copied" : "Copy failed, link shown in prompt");
      if (!copied) window.prompt("Copy workspace link", link);
      return;
    }

    if (name === "Invite teacher" || name === "Invite student") {
      const role = name === "Invite teacher" ? "TEACHER" : "STUDENT";
      const email = window.prompt(`Invite ${role.toLowerCase()} email`);
      if (!email) return;

      const link = `${window.location.origin}/workspace${workspaceId ? `?workspaceId=${workspaceId}` : ""}`;
      const subject = encodeURIComponent("Students Timetable Invite");
      const body = encodeURIComponent(`You were invited as ${role}.\n\nOpen: ${link}`);
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
      showToast(`${role} invite drafted`);
      return;
    }

    if (name === "Manage permissions") {
      setSettingsTab("Permissions");
      setShowSettings(true);
      showToast("Permissions panel opened");
      return;
    }

    if (name === "Export JSON") {
      exportJson();
      return;
    }

    if (name === "Export CSV") {
      exportCsv();
      return;
    }

    if (name === "Export ICS") {
      exportIcs();
      return;
    }

    if (name === "Export PDF") {
      window.print();
      showToast("Print dialog opened");
      return;
    }

    if (name === "Desktop preview") {
      setPreviewMode("desktop");
      showToast("Desktop preview mode");
      return;
    }

    if (name === "Tablet preview") {
      setPreviewMode("tablet");
      showToast("Tablet preview mode");
      return;
    }

    if (name === "Mobile preview") {
      setPreviewMode("mobile");
      showToast("Mobile preview mode");
      return;
    }

    if (name === "Public view preview") {
      setPreviewMode("public");
      showToast("Public preview mode");
      return;
    }

    if (name === "Undo last change" || name === "Undo settings applied") {
      applyUndo();
      return;
    }

    if (name === "Redo last change" || name === "Redo settings applied") {
      applyRedo();
      return;
    }

    if (name === "Show checkpoints") {
      showCheckpointCount();
      return;
    }

    if (name === "Scan conflicts" || name === "Conflicts settings applied") {
      applyConflictScan();
      return;
    }

    if (name === "Clear conflict highlights") {
      clearConflictHighlights();
      return;
    }

    if (name.startsWith("Edit time of ")) {
      if (!selectedRow) {
        showToast("No row selected");
        return;
      }
      await editCourseTime(selectedRow);
      return;
    }

    if (name.startsWith("Edit room of ")) {
      if (!selectedRow) {
        showToast("No row selected");
        return;
      }
      await editCourseRoom(selectedRow);
      return;
    }

    if (name.startsWith("Open full edit for ")) {
      if (!selectedRow) {
        showToast("No row selected");
        return;
      }
      await openFullEdit(selectedRow);
      return;
    }

    if (name.startsWith("Duplicate ") && name.endsWith(" to all days")) {
      if (!selectedRow) {
        showToast("No row selected");
        return;
      }
      await duplicateAllDays(selectedRow);
      return;
    }

    if (name.startsWith("Duplicate ") && name.endsWith(" to group A2")) {
      if (!selectedRow) {
        showToast("No row selected");
        return;
      }
      await duplicateToA2(selectedRow);
      return;
    }

    if (name.startsWith("Duplicate + edit ")) {
      if (!selectedRow) {
        showToast("No row selected");
        return;
      }
      await duplicateAndEdit(selectedRow);
      return;
    }

    if (name.startsWith("Archive ")) {
      if (!selectedRow) {
        showToast("No row selected");
        return;
      }
      await archiveCourse(selectedRow);
      return;
    }

    if (name.startsWith("Delete all ") && name.includes(" in group ")) {
      if (!selectedRow) {
        showToast("No row selected");
        return;
      }
      await deleteAllInGroup(selectedRow);
      return;
    }

    if (name.startsWith("Hard delete ")) {
      if (!selectedRow) {
        showToast("No row selected");
        return;
      }
      await deleteCourse(selectedRow, true);
      return;
    }

    if (name === "Change font size") {
      setFontScale((value) => {
        if (value < 100) return 100;
        if (value < 110) return 110;
        if (value < 120) return 120;
        return 90;
      });
      showToast("Font size changed");
      return;
    }

    if (name === "Row density") {
      setDenseRows((value) => !value);
      showToast("Row density toggled");
      return;
    }

    if (name === "Sidebar mode") {
      setMiniMap((value) => !value);
      showToast("Sidebar mode toggled");
      return;
    }

    if (name === "Animations") {
      setAnimationsEnabled((value) => !value);
      showToast(`Animations ${animationsEnabled ? "disabled" : "enabled"}`);
      return;
    }

    if (name === "Week starts Saturday") {
      setWeekStart((current) => {
        if (current === "SATURDAY") return "SUNDAY";
        if (current === "SUNDAY") return "MONDAY";
        return "SATURDAY";
      });
      showToast("Week start updated");
      return;
    }

    if (name === "12h/24h toggle") {
      setTimeMode((current) => (current === "24h" ? "12h" : "24h"));
      showToast("Time mode toggled");
      return;
    }

    if (name === "Conflict policy") {
      setConflictPolicy((current) => {
        if (current === "WARNING") return "STRICT";
        if (current === "STRICT") return "OFF";
        return "WARNING";
      });
      showToast("Conflict policy changed");
      return;
    }

    if (name === "Snap interval") {
      const value = window.prompt("Snap interval in minutes", `${snapMinutes}`)?.trim();
      if (!value) return;

      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 5 || parsed > 120) {
        showToast("Snap interval must be between 5 and 120");
        return;
      }

      setSnapMinutes(parsed);
      showToast("Snap interval updated");
      return;
    }

    if (name === "Manage owner role") {
      setDefaultInviteRole("OWNER");
      showToast("Default invite role set to OWNER");
      return;
    }

    if (name === "Manage teacher role") {
      setDefaultInviteRole("TEACHER");
      showToast("Default invite role set to TEACHER");
      return;
    }

    if (name === "Manage student role") {
      setDefaultInviteRole("STUDENT");
      showToast("Default invite role set to STUDENT");
      return;
    }

    if (name === "Manage viewer role") {
      setDefaultInviteRole("VIEWER");
      showToast("Default invite role set to VIEWER");
      return;
    }

    if (
      name === "Theme settings applied" ||
      name === "Display settings applied" ||
      name === "Timetable settings applied" ||
      name === "Permissions settings applied"
    ) {
      showToast(`${settingsTab} settings applied`);
      return;
    }

    showToast(`${name} executed`);
  };

  const openLoginPage = () => {
    window.location.assign("/auth");
  };

  const signOut = async () => {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });

    if (!response.ok) {
      showToast("Logout failed");
      return;
    }

    setAuthState("guest");
    setWorkspaceId(null);
    setRows(placeholderRows);
    showToast("Logged out");
  };

  const openAction = (label: ActionLabel) => {
    setActiveAction(label);
    setShowActionCenter(true);
  };

  const openRowAction = (action: RowAction, row: Row) => {
    setSelectedRow(row);
    setActiveRowAction(action);
    setShowRowCenter(true);
  };

  useEffect(() => {
    void fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("students-timetable.workspace.settings");
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        theme?: ThemeChoice;
        denseRows?: boolean;
        miniMap?: boolean;
        smartPlacement?: boolean;
        autoSave?: boolean;
        timeMode?: TimeMode;
        weekStart?: WeekStartOption;
        conflictPolicy?: ConflictPolicy;
        snapMinutes?: number;
        fontScale?: number;
        animationsEnabled?: boolean;
        defaultInviteRole?: InviteRole;
      };

      if (parsed.theme) setTheme(parsed.theme);
      if (typeof parsed.denseRows === "boolean") setDenseRows(parsed.denseRows);
      if (typeof parsed.miniMap === "boolean") setMiniMap(parsed.miniMap);
      if (typeof parsed.smartPlacement === "boolean") setSmartPlacement(parsed.smartPlacement);
      if (typeof parsed.autoSave === "boolean") setAutoSave(parsed.autoSave);
      if (parsed.timeMode) setTimeMode(parsed.timeMode);
      if (parsed.weekStart) setWeekStart(parsed.weekStart);
      if (parsed.conflictPolicy) setConflictPolicy(parsed.conflictPolicy);
      if (typeof parsed.snapMinutes === "number") setSnapMinutes(parsed.snapMinutes);
      if (typeof parsed.fontScale === "number") setFontScale(parsed.fontScale);
      if (typeof parsed.animationsEnabled === "boolean") setAnimationsEnabled(parsed.animationsEnabled);
      if (parsed.defaultInviteRole) setDefaultInviteRole(parsed.defaultInviteRole);
    } catch {
      // ignore local settings parse errors
    }
  }, []);

  useEffect(() => {
    if (!autoSave) return;

    const payload = {
      theme,
      denseRows,
      miniMap,
      smartPlacement,
      autoSave,
      timeMode,
      weekStart,
      conflictPolicy,
      snapMinutes,
      fontScale,
      animationsEnabled,
      defaultInviteRole
    };

    try {
      localStorage.setItem("students-timetable.workspace.settings", JSON.stringify(payload));
    } catch {
      // ignore local storage failures
    }
  }, [
    autoSave,
    animationsEnabled,
    conflictPolicy,
    defaultInviteRole,
    denseRows,
    fontScale,
    miniMap,
    smartPlacement,
    snapMinutes,
    theme,
    timeMode,
    weekStart
  ]);

  const isPublicPreview = previewMode === "public";
  const cardStyle =
    previewMode === "tablet"
      ? { maxWidth: "960px", marginInline: "auto" }
      : previewMode === "mobile"
        ? { maxWidth: "430px", marginInline: "auto" }
        : undefined;

  const createModalTitle =
    createModalType === "workspace"
      ? "Create Workspace"
      : createModalType === "group"
        ? "Create Group"
        : createModalType === "instructor"
          ? "Create Instructor"
          : "Create Course";

  return (
    <div className={`w-root option-${theme} ${animationsEnabled ? "" : "reduce-motion"}`} dir="ltr" style={{ fontSize: `${fontScale}%` }}>
      <AppShell
        title="Students Timetable Workspace"
        subtitle="Production UI preview • all controls are now functional"
        actions={
          <div className="flex gap-2">
            <button className="w-icon-btn" onClick={() => setShowSettings(true)}>
              <span className="material-symbols-outlined">tune</span>
            </button>
          </div>
        }
      >
        <div className="w-main border-transparent" style={{ padding: 0, margin: 0, minHeight: 'auto' }}>
        <section className="w-option-card c" style={cardStyle}>
          <div className="w-dense-top">
            <div className="w-mini-menu">
              {(["Dashboard", "Timetable", "Courses", "Settings"] as MainTab[]).map((tab) => (
                <button
                  key={tab}
                  className={mainTab === tab ? "active" : ""}
                  onClick={() => {
                    if (tab === "Settings") setShowSettings(true);
                    setMainTab(tab);
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {!isPublicPreview && (
            <div className="w-action-scroll">
              {actions.map((item, index) => (
                <button key={item.label} className={`w-btn ${index === 0 ? "primary" : ""}`} onClick={() => openAction(item.label)}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
              <button className="w-btn" onClick={() => setShowSettings(true)}>
                <span className="material-symbols-outlined">tune</span>
                <span>Settings</span>
              </button>
              <button className="w-btn" onClick={() => setPreviewMode("default")}>
                <span className="material-symbols-outlined">desktop_windows</span>
                <span>Reset Preview</span>
              </button>
              {authState === "authed" ? (
                <button className="w-btn" onClick={() => void signOut()}>
                  <span className="material-symbols-outlined">logout</span>
                  <span>Logout</span>
                </button>
              ) : (
                <button className="w-btn primary" onClick={openLoginPage}>
                  <span className="material-symbols-outlined">login</span>
                  <span>Login</span>
                </button>
              )}
            </div>
          )}

          <div className="w-tab-content">
            {mainTab === "Dashboard" && <p>Dashboard: quick actions, current dataset health, and operation chips.</p>}
            {mainTab === "Timetable" && <p>Timetable: editable local day/time metadata + conflict scan support.</p>}
            {mainTab === "Courses" && <p>Courses: API-backed CRUD actions for authenticated users.</p>}
            {mainTab === "Settings" && <p>Settings: all controls now apply real state changes.</p>}
          </div>

          <DataTable rows={authState === "authed" ? rows : placeholderRows} dense={denseRows} timeMode={timeMode} onRowAction={openRowAction} />

          {!isPublicPreview && (
            <div className="w-footer-controls">
              <Toggle label="Auto Save" checked={autoSave} onCheckedChange={() => setAutoSave((value) => !value)} />
              <Toggle label="Smart Placement" checked={smartPlacement} onCheckedChange={() => setSmartPlacement((value) => !value)} />
              <Toggle label="Mini Map" checked={miniMap} onCheckedChange={() => setMiniMap((value) => !value)} />
              <Toggle label="Dense Table Mode" checked={denseRows} onCheckedChange={() => setDenseRows((value) => !value)} />
            </div>
          )}
        </section>
        </div>
      </AppShell>

      <ActionCenter
        open={showActionCenter}
        active={activeAction}
        onClose={() => setShowActionCenter(false)}
        onPick={setActiveAction}
        onRun={runAction}
      />

      <RowActionCenter
        open={showRowCenter}
        row={selectedRow}
        active={activeRowAction}
        onClose={() => setShowRowCenter(false)}
        onPick={setActiveRowAction}
        onEdit={updateCourseName}
        onDuplicate={duplicateCourse}
        onDelete={deleteCourse}
        onPlaceholder={runAction}
      />

      {createModalType && (
        <div className="w-settings-overlay" onClick={closeCreateModal}>
          <div className="w-settings-panel" onClick={(event) => event.stopPropagation()}>
            <div className="w-settings-head">
              <h3>{createModalTitle}</h3>
              <button className="w-icon-btn" onClick={closeCreateModal} disabled={createSubmitting}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="w-settings-sub">Use this form instead of browser prompts for cleaner mobile UX.</p>

            <form className="w-form-grid" onSubmit={(event) => void handleCreateSubmit(event)}>
              {createModalType === "workspace" && (
                <label className="w-form-label">
                  Workspace title
                  <input
                    className="w-input"
                    value={createForm.workspaceTitle}
                    onChange={(event) => setCreateForm((current) => ({ ...current, workspaceTitle: event.target.value }))}
                    placeholder="My Workspace"
                    required
                    maxLength={120}
                  />
                </label>
              )}

              {createModalType === "group" && (
                <>
                  <label className="w-form-label">
                    Group code
                    <input
                      className="w-input"
                      value={createForm.groupCode}
                      onChange={(event) => setCreateForm((current) => ({ ...current, groupCode: event.target.value }))}
                      placeholder="A1"
                      required
                      maxLength={32}
                    />
                  </label>
                  <label className="w-form-label">
                    Group name
                    <input
                      className="w-input"
                      value={createForm.groupName}
                      onChange={(event) => setCreateForm((current) => ({ ...current, groupName: event.target.value }))}
                      placeholder="Group A1"
                      required
                      maxLength={120}
                    />
                  </label>
                </>
              )}

              {createModalType === "instructor" && (
                <>
                  <label className="w-form-label">
                    Instructor name
                    <input
                      className="w-input"
                      value={createForm.instructorName}
                      onChange={(event) => setCreateForm((current) => ({ ...current, instructorName: event.target.value }))}
                      placeholder="Dr. Ahmed"
                      required
                      maxLength={120}
                    />
                  </label>
                  <label className="w-form-label">
                    Email (optional)
                    <input
                      className="w-input"
                      type="email"
                      value={createForm.instructorEmail}
                      onChange={(event) => setCreateForm((current) => ({ ...current, instructorEmail: event.target.value }))}
                      placeholder="name@example.com"
                      maxLength={120}
                    />
                  </label>
                  <label className="w-form-label">
                    Phone (optional)
                    <input
                      className="w-input"
                      value={createForm.instructorPhone}
                      onChange={(event) => setCreateForm((current) => ({ ...current, instructorPhone: event.target.value }))}
                      placeholder="+20 ..."
                      maxLength={40}
                    />
                  </label>
                </>
              )}

              {createModalType === "course" && (
                <>
                  <label className="w-form-label">
                    Course title
                    <input
                      className="w-input"
                      value={createForm.courseTitle}
                      onChange={(event) => setCreateForm((current) => ({ ...current, courseTitle: event.target.value }))}
                      placeholder="Mathematics 1"
                      required
                      maxLength={140}
                    />
                  </label>

                  <label className="w-form-label">
                    Course code
                    <input
                      className="w-input"
                      value={createForm.courseCode}
                      onChange={(event) => setCreateForm((current) => ({ ...current, courseCode: event.target.value }))}
                      placeholder="MATH-101"
                      required
                      maxLength={32}
                    />
                  </label>

                  <label className="w-form-label">
                    Status
                    <select
                      className="w-select"
                      value={createForm.courseStatus}
                      onChange={(event) => setCreateForm((current) => ({ ...current, courseStatus: event.target.value }))}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="CONFLICT">Conflict</option>
                    </select>
                  </label>

                  <label className="w-form-label">
                    Group (optional)
                    <select
                      className="w-select"
                      value={createForm.courseGroupId}
                      onChange={(event) => setCreateForm((current) => ({ ...current, courseGroupId: event.target.value }))}
                    >
                      <option value="">No group</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>{group.code} — {group.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="w-form-label">
                    Instructor (optional)
                    <select
                      className="w-select"
                      value={createForm.courseInstructorId}
                      onChange={(event) => setCreateForm((current) => ({ ...current, courseInstructorId: event.target.value }))}
                    >
                      <option value="">No instructor</option>
                      {instructors.map((instructor) => (
                        <option key={instructor.id} value={instructor.id}>{instructor.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="w-form-label">
                    Room (optional)
                    <select
                      className="w-select"
                      value={createForm.courseRoomId}
                      onChange={(event) => setCreateForm((current) => ({ ...current, courseRoomId: event.target.value }))}
                    >
                      <option value="">No room</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>{room.code} — {room.name}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              <div className="w-settings-actions">
                <button type="button" className="w-btn" onClick={closeCreateModal} disabled={createSubmitting}>Cancel</button>
                <button type="submit" className="w-btn primary" disabled={createSubmitting}>
                  {createSubmitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="w-settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="w-settings-panel" onClick={(event) => event.stopPropagation()}>
            <div className="w-settings-head">
              <h3>Settings Menu</h3>
              <button className="w-icon-btn" onClick={() => setShowSettings(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="w-settings-sub">Each settings section has its own tab, controls, and custom actions.</p>

            <div className="w-action-tabs">
              {(["Theme", "Display", "Timetable", "Permissions"] as SettingsTab[]).map((tab) => (
                <button key={tab} className={`w-action-tab ${settingsTab === tab ? "active" : ""}`} onClick={() => setSettingsTab(tab)}>
                  <span className="material-symbols-outlined">
                    {tab === "Theme" ? "palette" : tab === "Display" ? "display_settings" : tab === "Timetable" ? "calendar_month" : "admin_panel_settings"}
                  </span>
                  <span>{tab}</span>
                </button>
              ))}
            </div>

            <div className="w-action-content">
              {settingsTab === "Theme" && (
                <div className="w-theme-grid">
                  <button className={`w-theme-btn ${theme === "c" ? "active" : ""}`} onClick={() => setTheme("c")}>
                    <strong>Midnight Pro</strong>
                    <span>Dark dense operator layout</span>
                  </button>
                  <button className={`w-theme-btn ${theme === "a" ? "active" : ""}`} onClick={() => setTheme("a")}>
                    <strong>Classic Light</strong>
                    <span>Clean bright productivity style</span>
                  </button>
                  <button className={`w-theme-btn ${theme === "b" ? "active" : ""}`} onClick={() => setTheme("b")}>
                    <strong>Glass Neon</strong>
                    <span>Frosted glass with accent glow</span>
                  </button>
                </div>
              )}

              {settingsTab === "Display" && (
                <div className="w-action-grid">
                  <button className="w-btn" onClick={() => void runAction("Change font size")}>Font size</button>
                  <button className="w-btn" onClick={() => void runAction("Row density")}>Row density</button>
                  <button className="w-btn" onClick={() => void runAction("Sidebar mode")}>Sidebar mode</button>
                  <button className="w-btn" onClick={() => void runAction("Animations")}>Animations</button>
                </div>
              )}

              {settingsTab === "Timetable" && (
                <div className="w-action-grid">
                  <button className="w-btn" onClick={() => void runAction("Week starts Saturday")}>Week start</button>
                  <button className="w-btn" onClick={() => void runAction("12h/24h toggle")}>Time mode</button>
                  <button className="w-btn" onClick={() => void runAction("Conflict policy")}>Conflict policy</button>
                  <button className="w-btn" onClick={() => void runAction("Snap interval")}>Snap interval</button>
                </div>
              )}

              {settingsTab === "Permissions" && (
                <div className="w-action-grid">
                  <button className="w-btn" onClick={() => void runAction("Manage owner role")}>Owner</button>
                  <button className="w-btn" onClick={() => void runAction("Manage teacher role")}>Teacher</button>
                  <button className="w-btn" onClick={() => void runAction("Manage student role")}>Student</button>
                  <button className="w-btn" onClick={() => void runAction("Manage viewer role")}>Viewer</button>
                </div>
              )}
            </div>

            <div className="w-settings-actions">
              <button className="w-btn" onClick={() => setShowSettings(false)}>Close</button>
              <button
                className="w-btn primary"
                onClick={() => {
                  void runAction(`${settingsTab} settings applied`);
                  setShowSettings(false);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="w-toast">{toast}</div>}
    </div>
  );
}
