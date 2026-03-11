# Students Timetable — Phase 2 Batch 6: Reports + Export Improvements

- **Date:** 2026-03-11
- **Status:** Draft for approval (planning/spec only; no code changes in this run)
- **Scope lock:** Batch 6 only (reports/export improvements)
- **Repo:** `/home/ubuntu/.openclaw/workspace/students-timetable-app`
- **Baseline before Batch 6:** `e355e4bf879896ccd75c5b32657c8b1d58e9bb0b`

## 1) Objective
Ship the strongest safe subset of reporting/export upgrades so users can extract operational outputs directly and clearly:
- export current filtered timetable context
- export by useful operational perspective (group/subgroup, room, instructor)
- print/share a readable operational view
- lightweight summaries without reporting bloat

## 2) Git Status (inspected first)
- `git status --short --branch`:
  - `## master...origin/master`
- Working tree is clean; branch tracks remote.

## 3) Current Implementation Baseline (inspected)

### 3.1 Real data model and derivable entities
- `prisma/schema.prisma`
  - `Course` with many `SessionEntry` rows (course/session model)
  - `AcademicGroup` supports hierarchy with `parentGroupId` (main + subgroup)
  - `Room` has `building/buildingCode/roomNumber/level`
  - `Instructor` linked across courses/sessions
  - `SavedView` supports `surface` = `COURSES | TIMETABLE`

### 3.2 Export/report logic already present
- `src/lib/schedule.ts`
  - canonical schedule transformation via `buildScheduleItems(courses)`
  - ICS bridge via `downloadScheduleCalendar(items, ...)`
  - conflict report helpers (already strengthened in Batch 5)
- `src/lib/ics.ts`
  - ICS generation/download (`buildIcsFromRows`, `downloadIcsFile`)
- `src/app/api/export/calendar/route.ts`
  - server calendar export endpoint (workspace-scope ICS)

### 3.3 Current product surfaces
- `src/app/workspace/dashboard/page.tsx`
  - has **Export calendar** (ICS), currently full dashboard schedule context
  - has useful insight cards (busiest room/instructor/group etc.) but no dedicated downloadable summary output
- `src/app/workspace/timetable/page.tsx`
  - rich filters exist (type/group incl subgroup expansion/delivery/conflict layer)
  - saved views exist
  - computes `filteredItems`
  - **gap:** no export or print actions wired in this page today
- `src/components/workspace/TimetableView.tsx`
  - supports optional `onExportCalendar` prop and shows session counts
  - no explicit print action currently
- `src/app/workspace/courses/page.tsx`
  - strong filter model + saved views
  - **gap:** no filtered export action currently
- `src/app/workspace/groups/page.tsx`, `rooms/page.tsx`, `instructors/page.tsx`
  - management + import flows exist
  - no dedicated report/export flows

## 4) Strongest Safe Subset for Batch 6 (recommended)

### P1 (must ship)
1. **Filtered timetable ICS export**
   - Export exactly currently visible timetable context (`filteredItems`), including selected group/subgroup logic.
2. **Filtered timetable print-friendly output**
   - Explicit print action from timetable surface (honest print path, not fake PDF claim).
3. **Filtered courses CSV export**
   - Export current filtered courses as session-level operational rows.

### P2 (safe add-on in same batch, limited)
4. **Two lightweight summary CSV outputs (not more)**
   - **Room usage summary** (by room, include building when available)
   - **Instructor assignment summary** (session + course load from filtered dataset)

> Group/session summary can be deferred if capacity/risk appears; if included, keep it minimal and derived from same filtered schedule source.

## 5) Out of Scope (hard lock)
- permissions/sharing expansion
- audit/revisions work
- auth/PWA/runtime/install changes
- conflict-engine expansion beyond Batch 5
- Batch 7+ work
- giant reporting wizard
- speculative formats (xlsx/custom/pdf generator)

## 6) Functional + Safety Requirements
- Export scope must be explicit in UI labels.
- If export claims filtered scope, payload must match active filter state exactly.
- No silent omission of key operational context (day/time/type/group/room/instructor where applicable).
- No fake or misleading summaries; only real derivable model data may be exported/reported.
- Print path must be presented honestly as print.
- ICS semantics must remain valid.
- File names must be sensible and scope-aware.
- Mobile-safe controls and desktop-strong usability.

## 7) Required Implementation Order (must follow)
1. inspect current export/report capabilities
2. inspect filter-state + saved-view interactions
3. lock strongest safe subset
4. implement export/report improvements
5. build
6. verify desktop
7. verify mobile where relevant
8. verify exported/printed outputs honestly
9. restart
10. live verification
11. commit
12. push
13. report (include exact commit hash)

## 8) Task Checklist (owner + acceptance criteria)

- [ ] **T1 — Scope freeze + UX labels**
  - **Owner:** Planner
  - **Acceptance:**
    - Final action list is limited to Batch 6 subset only.
    - Labels explicitly communicate scope (e.g., “Export filtered timetable (.ics)”).

- [ ] **T2 — Timetable filtered ICS export wiring**
  - **Owner:** Builder
  - **Acceptance:**
    - Timetable page exposes export action.
    - Exported ICS equals current `filteredItems` scope.
    - Toast confirms exported count/scope.

- [ ] **T3 — Timetable print-friendly workflow**
  - **Owner:** Builder
  - **Acceptance:**
    - Explicit print action exists on timetable surface.
    - Printed result is readable for operations.
    - Mobile + desktop trigger paths are clear.

- [ ] **T4 — Courses filtered CSV export**
  - **Owner:** Builder
  - **Acceptance:**
    - Courses page exports currently filtered dataset only.
    - CSV includes core fields: course code/title, session type/day/time, group, room, instructor, delivery context.
    - Filename and UX indicate filtered scope.

- [ ] **T5 — Lightweight summary CSV exports (room + instructor)**
  - **Owner:** Builder
  - **Acceptance:**
    - Room usage summary export generated from filtered schedule source.
    - Instructor assignment summary export generated from filtered schedule source.
    - Summaries are derivable from real model data only.

- [ ] **T6 — Verification + release sequence discipline**
  - **Owner:** Verifier
  - **Acceptance:**
    - Verification covers:
      1) action rendering,
      2) filtered export truth,
      3) scope correctness,
      4) print readability,
      5) summary correctness,
      6) no obvious visual breakage,
      7) mobile acceptable,
      8) desktop good,
      9) build passes,
      10) production stable.
    - Build occurs before restart; restart only after build passes.
    - Live check completed after restart.
    - Commit + push completed, GitHub and VPS state are synced.
    - Final implementation report includes exact deployed commit hash.

## 9) Batch 6 Acceptance Targets
- Export Group A1 timetable directly from filtered timetable context.
- Export/print current filtered timetable view.
- Produce room-based or instructor-based operational outputs.
- Produce cleaner summary output without external manual rebuilding.

## 10) Relevant Files / Surfaces Identified
- `prisma/schema.prisma`
- `src/lib/schedule.ts`
- `src/lib/ics.ts`
- `src/app/api/export/calendar/route.ts`
- `src/app/workspace/dashboard/page.tsx`
- `src/app/workspace/timetable/page.tsx`
- `src/components/workspace/TimetableView.tsx`
- `src/app/workspace/courses/page.tsx`
- `src/components/workspace/CoursesView.tsx`
- `src/app/workspace/groups/page.tsx`
- `src/app/workspace/rooms/page.tsx`
- `src/app/workspace/instructors/page.tsx`
- `src/types/index.ts`

## 11) Risks / Open Questions
1. **Placement clarity:** keep summary exports in one primary surface (recommend Timetable or Courses only) to avoid duplicate UX.
2. **Summary count discipline:** lock to 2 summaries (room + instructor) unless explicitly approved to add group summary.
3. **Building metadata gaps:** room summary needs explicit fallback when building fields are absent.
4. **Print density:** heavy schedules may need list-mode print defaults for readability.
5. **ICS recurrence policy:** current `COUNT=16` remains; confirm this is still desired for operational use.

## 12) Worker Constraint Reminder
Implement only what is in approved Batch 6 spec; flag gaps instead of inventing scope.
