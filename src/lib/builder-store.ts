import { create } from 'zustand';

export type BuilderTabId = 'timetable' | 'settings' | 'courses' | 'io';

export type DayConfig = {
  id: string;
  name: string;
  shortLabel: string;
  enabled: boolean;
  isOff: boolean;
  order: number;
};

export type Course = {
  id: string;
  name: string;
  group: string;
  instructor?: string;
  location: string;
  dayId: string;
  startTime: string;
  endTime: string;
  color: string;
  notes?: string;
};

export type TimetableStyleId = 'classic-grid' | 'modern-glass' | 'minimal-light' | 'dense-pro';

export type UiSettings = {
  rowHeight: number;
  columnWidth: number;
  showGridLines: boolean;
  showTimeLabels: boolean;
  stickyTimeColumn: boolean;
  stickyDayHeader: boolean;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardColor: string;
  borderRadius: number;
  shadowIntensity: number;
  gridContrast: number;
  mode: 'light' | 'dark' | 'system';
  showInstructor: boolean;
  showLocation: boolean;
  showGroup: boolean;
  density: 'compact' | 'comfortable' | 'dense';
  snapToGrid: boolean;
  autoConflictDetection: boolean;
  autoPlacementSuggestions: boolean;
  keyboardShortcutsEnabled: boolean;
  animationsEnabled: boolean;
  miniMapEnabled: boolean;
  zoomLevel: 5 | 10 | 15 | 30;
};

export type BuilderSnapshot = {
  title: string;
  owner: string | null;
  startTime: string;
  endTime: string;
  intervalMinutes: 5 | 10 | 15 | 20 | 30;
  style: TimetableStyleId;
  days: DayConfig[];
  courses: Course[];
  uiSettings: UiSettings;
};

export type TemplateItem = {
  id: string;
  name: string;
  snapshot: BuilderSnapshot;
};

const STORAGE_KEY = 'ttb:v2:current';
const TEMPLATE_KEY = 'ttb:v2:templates';

const DEFAULT_DAYS: DayConfig[] = [
  { id: 'sat', name: 'Saturday', shortLabel: 'Sat', enabled: true, isOff: false, order: 0 },
  { id: 'sun', name: 'Sunday', shortLabel: 'Sun', enabled: true, isOff: false, order: 1 },
  { id: 'mon', name: 'Monday', shortLabel: 'Mon', enabled: true, isOff: false, order: 2 },
  { id: 'tue', name: 'Tuesday', shortLabel: 'Tue', enabled: true, isOff: false, order: 3 },
  { id: 'wed', name: 'Wednesday', shortLabel: 'Wed', enabled: false, isOff: false, order: 4 },
  { id: 'thu', name: 'Thursday', shortLabel: 'Thu', enabled: true, isOff: false, order: 5 },
  { id: 'fri', name: 'Friday', shortLabel: 'Fri', enabled: false, isOff: true, order: 6 }
];

const DEFAULT_SETTINGS: UiSettings = {
  rowHeight: 52,
  columnWidth: 220,
  showGridLines: true,
  showTimeLabels: true,
  stickyTimeColumn: true,
  stickyDayHeader: true,
  primaryColor: '#2b6cee',
  secondaryColor: '#8b5cf6',
  backgroundColor: '#f6f6f8',
  cardColor: '#ffffff',
  borderRadius: 14,
  shadowIntensity: 0.25,
  gridContrast: 0.2,
  mode: 'light',
  showInstructor: true,
  showLocation: true,
  showGroup: true,
  density: 'comfortable',
  snapToGrid: true,
  autoConflictDetection: true,
  autoPlacementSuggestions: true,
  keyboardShortcutsEnabled: true,
  animationsEnabled: true,
  miniMapEnabled: false,
  zoomLevel: 15
};

function safeId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fallback below
  }

  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultSnapshot(): BuilderSnapshot {
  return {
    title: 'Ground A1 Timetable',
    owner: 'Demos',
    startTime: '08:00',
    endTime: '22:00',
    intervalMinutes: 15,
    style: 'modern-glass',
    days: DEFAULT_DAYS,
    courses: [
      {
        id: safeId(),
        name: 'Electrical Machines & Industrial Electronics (Lec)',
        group: 'A1',
        instructor: '',
        location: 'E412',
        dayId: 'sat',
        startTime: '11:30',
        endTime: '12:45',
        color: '#3b82f6'
      },
      {
        id: safeId(),
        name: 'Mechanical Vibrations (Lec)',
        group: 'A1',
        instructor: '',
        location: 'E428',
        dayId: 'sat',
        startTime: '13:00',
        endTime: '14:15',
        color: '#f59e0b'
      },
      {
        id: safeId(),
        name: 'Robotics Engineering (Lec)',
        group: 'A1',
        instructor: '',
        location: 'E412',
        dayId: 'sun',
        startTime: '09:30',
        endTime: '10:45',
        color: '#8b5cf6'
      },
      {
        id: safeId(),
        name: 'Microprocessors & Applications (Sec)',
        group: 'A1',
        instructor: '',
        location: 'E421',
        dayId: 'sun',
        startTime: '10:45',
        endTime: '11:30',
        color: '#10b981'
      },
      {
        id: safeId(),
        name: 'Microprocessors & Applications (Lab)',
        group: 'A1',
        instructor: '',
        location: 'E226',
        dayId: 'sun',
        startTime: '11:30',
        endTime: '12:00',
        color: '#10b981'
      },
      {
        id: safeId(),
        name: 'Principles of Electrical Engineering (Sec)',
        group: 'A1',
        instructor: '',
        location: 'E420',
        dayId: 'mon',
        startTime: '09:30',
        endTime: '10:45',
        color: '#ef4444'
      },
      {
        id: safeId(),
        name: 'Robotics Engineering (Sec)',
        group: 'A1',
        instructor: '',
        location: 'E420',
        dayId: 'mon',
        startTime: '10:45',
        endTime: '11:30',
        color: '#8b5cf6'
      },
      {
        id: safeId(),
        name: 'Robotics Engineering (Lab)',
        group: 'A1',
        instructor: '',
        location: 'E119',
        dayId: 'mon',
        startTime: '11:30',
        endTime: '12:00',
        color: '#8b5cf6'
      },
      {
        id: safeId(),
        name: 'Microprocessors & Applications (Lec)',
        group: 'A1',
        instructor: '',
        location: 'E428',
        dayId: 'tue',
        startTime: '12:00',
        endTime: '13:15',
        color: '#10b981'
      },
      {
        id: safeId(),
        name: 'Electrical Machines & Industrial Electronics (Sec)',
        group: 'A1',
        instructor: '',
        location: 'E418',
        dayId: 'tue',
        startTime: '13:15',
        endTime: '14:30',
        color: '#3b82f6'
      },
      {
        id: safeId(),
        name: 'Mathematics 4 (Lec)',
        group: 'A1',
        instructor: '',
        location: 'E412',
        dayId: 'thu',
        startTime: '09:30',
        endTime: '10:45',
        color: '#6366f1'
      },
      {
        id: safeId(),
        name: 'Principles of Electrical Engineering (Lec)',
        group: 'A1',
        instructor: '',
        location: 'E428',
        dayId: 'thu',
        startTime: '10:45',
        endTime: '11:30',
        color: '#ef4444'
      },
      {
        id: safeId(),
        name: 'Mechanical Vibrations (Lec)',
        group: 'A1',
        instructor: '',
        location: 'E418',
        dayId: 'thu',
        startTime: '12:00',
        endTime: '12:45',
        color: '#f59e0b'
      },
      {
        id: safeId(),
        name: 'Mechanical Vibrations (Lab)',
        group: 'A1',
        instructor: '',
        location: 'E201',
        dayId: 'thu',
        startTime: '12:45',
        endTime: '13:15',
        color: '#f59e0b'
      },
      {
        id: safeId(),
        name: 'Mathematics 4 (Sec)',
        group: 'A1',
        instructor: '',
        location: 'E418',
        dayId: 'thu',
        startTime: '13:15',
        endTime: '14:30',
        color: '#6366f1'
      }
    ],
    uiSettings: DEFAULT_SETTINGS
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toSnapshot(state: BuilderStore): BuilderSnapshot {
  return {
    title: state.title,
    owner: state.owner,
    startTime: state.startTime,
    endTime: state.endTime,
    intervalMinutes: state.intervalMinutes,
    style: state.style,
    days: clone(state.days),
    courses: clone(state.courses),
    uiSettings: clone(state.uiSettings)
  };
}

function applySnapshot(base: BuilderStore, snapshot: BuilderSnapshot): Partial<BuilderStore> {
  return {
    title: snapshot.title,
    owner: snapshot.owner,
    startTime: snapshot.startTime,
    endTime: snapshot.endTime,
    intervalMinutes: snapshot.intervalMinutes,
    style: snapshot.style,
    days: clone(snapshot.days),
    courses: clone(snapshot.courses),
    uiSettings: clone(snapshot.uiSettings),
    selectedCourseId: null
  };
}

function withHistory(state: BuilderStore, mutation: Partial<BuilderStore>): Partial<BuilderStore> {
  return {
    ...mutation,
    history: [toSnapshot(state), ...state.history].slice(0, 50),
    future: []
  };
}

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function toTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = Math.floor(minutes % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}`;
}

function clampMinutes(minute: number, start: string, end: string): number {
  const min = toMinutes(start);
  const max = toMinutes(end);
  return Math.max(min, Math.min(max, minute));
}

function isTimeLabel(value: unknown): value is string {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
}

function normalizeSnapshot(input: unknown): BuilderSnapshot {
  const fallback = createDefaultSnapshot();

  if (!input || typeof input !== 'object') return fallback;
  const data = input as Partial<BuilderSnapshot>;

  const allowedIntervals = new Set([5, 10, 15, 20, 30]);
  const intervalMinutes = allowedIntervals.has(data.intervalMinutes as number)
    ? (data.intervalMinutes as 5 | 10 | 15 | 20 | 30)
    : fallback.intervalMinutes;

  const allowedStyles = new Set<TimetableStyleId>(['classic-grid', 'modern-glass', 'minimal-light', 'dense-pro']);
  const style = allowedStyles.has(data.style as TimetableStyleId) ? (data.style as TimetableStyleId) : fallback.style;

  const days: DayConfig[] = Array.isArray(data.days)
    ? data.days
        .filter((day): day is DayConfig => Boolean(day && typeof day === 'object'))
        .map((day, index) => ({
          id: typeof day.id === 'string' ? day.id : `day_${safeId().slice(0, 8)}`,
          name: typeof day.name === 'string' ? day.name : `Day ${index + 1}`,
          shortLabel: typeof day.shortLabel === 'string' ? day.shortLabel : (typeof day.name === 'string' ? day.name.slice(0, 3) : `D${index + 1}`),
          enabled: typeof day.enabled === 'boolean' ? day.enabled : true,
          isOff: typeof day.isOff === 'boolean' ? day.isOff : false,
          order: typeof day.order === 'number' ? day.order : index
        }))
    : fallback.days;

  const normalizedDays = days.length
    ? [...days].sort((a, b) => a.order - b.order).map((day, order) => ({ ...day, order }))
    : fallback.days;

  const firstDay = normalizedDays.find((day) => day.enabled)?.id ?? normalizedDays[0].id;

  const courses: Course[] = Array.isArray(data.courses)
    ? data.courses
        .filter((course): course is Course => Boolean(course && typeof course === 'object'))
        .map((course) => ({
          id: typeof course.id === 'string' ? course.id : safeId(),
          name: typeof course.name === 'string' ? course.name : 'New Course',
          group: typeof course.group === 'string' ? course.group : 'A1',
          instructor: typeof course.instructor === 'string' ? course.instructor : '',
          location: typeof course.location === 'string' ? course.location : 'Room 101',
          dayId:
            typeof course.dayId === 'string' && normalizedDays.some((day) => day.id === course.dayId)
              ? course.dayId
              : firstDay,
          startTime: isTimeLabel(course.startTime) ? course.startTime : '09:00',
          endTime: isTimeLabel(course.endTime) ? course.endTime : '10:00',
          color: typeof course.color === 'string' ? course.color : DEFAULT_SETTINGS.primaryColor,
          notes: typeof course.notes === 'string' ? course.notes : ''
        }))
    : fallback.courses;

  const uiSettings: UiSettings = {
    ...DEFAULT_SETTINGS,
    ...(data.uiSettings && typeof data.uiSettings === 'object' ? data.uiSettings : {})
  };

  return {
    title: typeof data.title === 'string' ? data.title : fallback.title,
    owner: typeof data.owner === 'string' || data.owner === null ? data.owner : fallback.owner,
    startTime: isTimeLabel(data.startTime) ? data.startTime : fallback.startTime,
    endTime: isTimeLabel(data.endTime) ? data.endTime : fallback.endTime,
    intervalMinutes,
    style,
    days: normalizedDays,
    courses,
    uiSettings
  };
}

export type BuilderStore = {
  tab: BuilderTabId;
  title: string;
  owner: string | null;
  startTime: string;
  endTime: string;
  intervalMinutes: 5 | 10 | 15 | 20 | 30;
  style: TimetableStyleId;
  days: DayConfig[];
  courses: Course[];
  uiSettings: UiSettings;
  templates: TemplateItem[];
  selectedCourseId: string | null;
  history: BuilderSnapshot[];
  future: BuilderSnapshot[];

  setTab: (tab: BuilderTabId) => void;
  setConfig: (patch: Partial<Pick<BuilderStore, 'title' | 'owner' | 'startTime' | 'endTime' | 'intervalMinutes' | 'style'>>) => void;
  setUiSettings: (patch: Partial<UiSettings>) => void;
  addDay: (dayName: string) => void;
  updateDay: (id: string, patch: Partial<DayConfig>) => void;
  reorderDay: (id: string, direction: 'up' | 'down') => void;
  removeDay: (id: string) => void;

  addCourse: (course?: Partial<Course>) => string;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  moveCourse: (id: string, dayId: string, startTime: string, endTime: string) => void;
  duplicateCourse: (id: string) => void;
  removeCourse: (id: string) => void;
  clearCourses: () => void;
  setSelectedCourse: (id: string | null) => void;

  detectConflicts: (id?: string) => string[];

  undo: () => void;
  redo: () => void;

  hydrate: () => void;
  persist: () => void;
  importSnapshot: (snapshot: BuilderSnapshot) => void;
  saveTemplate: (name: string) => void;
  loadTemplate: (id: string) => void;
  removeTemplate: (id: string) => void;
};

const defaults = createDefaultSnapshot();

export const useBuilderStore = create<BuilderStore>((set, get) => ({
  tab: 'timetable',
  ...defaults,
  templates: [],
  selectedCourseId: null,
  history: [],
  future: [],

  setTab: (tab) => set({ tab }),

  setConfig: (patch) => set((state) => withHistory(state, patch)),

  setUiSettings: (patch) =>
    set((state) => withHistory(state, { uiSettings: { ...state.uiSettings, ...patch } })),

  addDay: (dayName) =>
    set((state) => {
      const id = `day_${safeId().slice(0, 8)}`;
      const next: DayConfig = {
        id,
        name: dayName,
        shortLabel: dayName.slice(0, 3),
        enabled: true,
        isOff: false,
        order: state.days.length
      };

      return withHistory(state, { days: [...state.days, next] });
    }),

  updateDay: (id, patch) =>
    set((state) =>
      withHistory(state, {
        days: state.days.map((day) => (day.id === id ? { ...day, ...patch } : day))
      })
    ),

  reorderDay: (id, direction) =>
    set((state) => {
      const days = [...state.days].sort((a, b) => a.order - b.order);
      const index = days.findIndex((day) => day.id === id);
      if (index < 0) return state;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= days.length) return state;
      const temp = days[index];
      days[index] = days[target];
      days[target] = temp;
      const normalized = days.map((day, order) => ({ ...day, order }));
      return withHistory(state, { days: normalized });
    }),

  removeDay: (id) =>
    set((state) => {
      const remainingDays = state.days.filter((day) => day.id !== id).map((day, order) => ({ ...day, order }));
      const firstDay = remainingDays.find((day) => day.enabled)?.id ?? remainingDays[0]?.id;
      const updatedCourses = state.courses.map((course) =>
        course.dayId === id ? { ...course, dayId: firstDay ?? course.dayId } : course
      );
      return withHistory(state, { days: remainingDays, courses: updatedCourses });
    }),

  addCourse: (course) => {
    const state = get();
    const defaultDay = state.days.find((day) => day.enabled)?.id ?? state.days[0].id;
    const newCourse: Course = {
      id: safeId(),
      name: course?.name ?? 'New Course',
      group: course?.group ?? 'A1',
      instructor: course?.instructor ?? '',
      location: course?.location ?? 'Room 101',
      dayId: course?.dayId ?? defaultDay,
      startTime: course?.startTime ?? '09:00',
      endTime: course?.endTime ?? '10:00',
      color: course?.color ?? state.uiSettings.primaryColor,
      notes: course?.notes
    };

    set((current) => withHistory(current, { courses: [...current.courses, newCourse], selectedCourseId: newCourse.id }));
    return newCourse.id;
  },

  updateCourse: (id, patch) =>
    set((state) =>
      withHistory(state, {
        courses: state.courses.map((course) => (course.id === id ? { ...course, ...patch } : course))
      })
    ),

  moveCourse: (id, dayId, startTime, endTime) =>
    set((state) =>
      withHistory(state, {
        courses: state.courses.map((course) =>
          course.id === id
            ? {
                ...course,
                dayId,
                startTime,
                endTime
              }
            : course
        )
      })
    ),

  duplicateCourse: (id) =>
    set((state) => {
      const source = state.courses.find((course) => course.id === id);
      if (!source) return state;

      const start = clampMinutes(toMinutes(source.startTime) + state.intervalMinutes, state.startTime, state.endTime);
      const duration = Math.max(state.intervalMinutes, toMinutes(source.endTime) - toMinutes(source.startTime));
      const end = clampMinutes(start + duration, state.startTime, state.endTime);

      const nextCourse: Course = {
        ...source,
        id: safeId(),
        name: `${source.name} Copy`,
        startTime: toTimeLabel(start),
        endTime: toTimeLabel(end)
      };

      return withHistory(state, { courses: [...state.courses, nextCourse] });
    }),

  removeCourse: (id) =>
    set((state) => withHistory(state, { courses: state.courses.filter((course) => course.id !== id), selectedCourseId: null })),

  clearCourses: () => set((state) => withHistory(state, { courses: [], selectedCourseId: null })),

  setSelectedCourse: (id) => set({ selectedCourseId: id }),

  detectConflicts: (id) => {
    const { courses } = get();
    const candidates = id ? courses.filter((item) => item.id === id) : courses;
    const conflicts = new Set<string>();

    for (const item of candidates) {
      const startA = toMinutes(item.startTime);
      const endA = toMinutes(item.endTime);
      for (const other of courses) {
        if (other.id === item.id || other.dayId !== item.dayId) continue;
        const startB = toMinutes(other.startTime);
        const endB = toMinutes(other.endTime);
        const overlap = Math.max(startA, startB) < Math.min(endA, endB);
        if (overlap) {
          conflicts.add(item.id);
          conflicts.add(other.id);
        }
      }
    }

    return Array.from(conflicts);
  },

  undo: () =>
    set((state) => {
      if (!state.history.length) return state;
      const [previous, ...rest] = state.history;
      return {
        ...applySnapshot(state, previous),
        history: rest,
        future: [toSnapshot(state), ...state.future].slice(0, 50)
      };
    }),

  redo: () =>
    set((state) => {
      if (!state.future.length) return state;
      const [next, ...rest] = state.future;
      return {
        ...applySnapshot(state, next),
        history: [toSnapshot(state), ...state.history].slice(0, 50),
        future: rest
      };
    }),

  hydrate: () => {
    if (typeof window === 'undefined') return;

    const saved = window.localStorage.getItem(STORAGE_KEY);
    const templates = window.localStorage.getItem(TEMPLATE_KEY);

    if (templates) {
      try {
        const parsedTemplates = JSON.parse(templates) as TemplateItem[];
        set({ templates: Array.isArray(parsedTemplates) ? parsedTemplates : [] });
      } catch {
        set({ templates: [] });
      }
    }

    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as unknown;
      const normalized = normalizeSnapshot(parsed);
      set((state) => ({ ...applySnapshot(state, normalized), history: [], future: [] }));
    } catch {
      // ignore broken local state
    }
  },

  persist: () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSnapshot(get())));
    window.localStorage.setItem(TEMPLATE_KEY, JSON.stringify(get().templates));
  },

  importSnapshot: (snapshot) => set((state) => withHistory(state, applySnapshot(state, snapshot))),

  saveTemplate: (name) =>
    set((state) => {
      const template: TemplateItem = {
        id: safeId(),
        name,
        snapshot: toSnapshot(state)
      };
      const templates = [...state.templates.filter((item) => item.name !== name), template];
      return { templates };
    }),

  loadTemplate: (id) =>
    set((state) => {
      const template = state.templates.find((item) => item.id === id);
      if (!template) return state;
      return withHistory(state, applySnapshot(state, template.snapshot));
    }),

  removeTemplate: (id) => set((state) => ({ templates: state.templates.filter((item) => item.id !== id) }))
}));

export function getSlotTimes(start: string, end: string, interval: number): string[] {
  const startMinute = toMinutes(start);
  const endMinute = toMinutes(end);
  const result: string[] = [];

  for (let minute = startMinute; minute <= endMinute; minute += interval) {
    result.push(toTimeLabel(minute));
  }

  return result;
}

export function timeToMinutes(value: string): number {
  return toMinutes(value);
}

export function minutesToTimeLabel(value: number): string {
  return toTimeLabel(value);
}
