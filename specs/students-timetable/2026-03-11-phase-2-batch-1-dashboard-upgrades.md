# Students Timetable — Phase 2 Batch 1 Dashboard Upgrades (Spec)

- **Date:** 2026-03-11
- **Status:** Approved for implementation
- **Scope Lock:** Phase 2 / Batch 1 only (dashboard upgrades)
- **Repository:** `/home/ubuntu/.openclaw/workspace/students-timetable-app`

## 1) Batch 1 Goal
Ship a safer, real-data dashboard upgrade that is scannable on desktop/mobile and useful for daily scheduling operations, without backend/schema risk.

## 2) Confirmed Current State (baseline)

### 2.1 Current dashboard implementation
- `src/app/workspace/dashboard/page.tsx`
  - Fetches: `/api/v1/courses`, `/api/v1/groups`, `/api/v1/instructors`, `/api/v1/rooms`
  - Uses `buildScheduleItems(courses)` + `buildScheduleConflicts(scheduleItems)`
  - Passes data into `DashboardView`
- `src/components/workspace/DashboardView.tsx`
  - Current cards: courses, conflicts, groups, instructors, rooms
  - Quick actions: New course / Scan integrity / Export calendar
  - Schedule preview: first 4 rows (not truly today/next aware)

### 2.2 Important existing limitations
- “Total Courses” currently uses `rows.length` (session-level rows), not true unique course count.
- No explicit “total sessions” card.
- No explicit missing-data health counters (missing room/instructor/group).
- No “today sessions” and “next upcoming session” logic; only simple preview slice.
- Existing conflict helper is safe but only detects identical time-window overlaps (same day + exact same start/end + same room or instructor key).

## 3) Real Data Surfaces / APIs / Helpers / Schema (approved sources)

### 3.1 API sources (already used, safe)
- `/api/v1/courses` (`src/app/api/v1/courses/route.ts`)
  - Returns courses with nested `sessions[]` including `type`, `day`, `startMinute`, `endMinute`, and optional per-session `group/instructor/room` references.
- `/api/v1/groups` (`src/app/api/v1/groups/route.ts`)
  - Returns groups with hierarchy fields: `parentGroupId`, `parentGroup`, `childCount`.
- `/api/v1/instructors` (`src/app/api/v1/instructors/route.ts`)
- `/api/v1/rooms` (`src/app/api/v1/rooms/route.ts`)
  - Includes structured room fields (`building`, `buildingCode`, `roomNumber`, `level`).

### 3.2 Helper surfaces (safe reuse)
- `src/lib/schedule.ts`
  - `buildScheduleItems(courses)` for canonical session items.
  - `buildScheduleConflicts(items)` for conflict count baseline.
  - `scheduleDayOrder` for deterministic day ordering.
- `src/lib/group-room-model.ts`
  - `groupGroupsByRoot(groups)` for group distribution by root/main group.
  - `groupRoomsByBuilding(rooms)` for room distribution by building.
- `src/lib/course-sessions.ts`
  - `formatSessionType` and type normalization support.

### 3.3 Type/schema surfaces
- `src/types/index.ts`: `CourseApiItem`, `SessionApiItem`, `GroupApiItem`, `RoomApiItem`, `InstructorApiItem`.
- `prisma/schema.prisma`:
  - One course → many `SessionEntry` model is canonical.
  - Group hierarchy is available (`AcademicGroup.parentGroupId`).
  - Structured rooms are available (`buildingCode`, `roomNumber`, `level`).

## 4) Batch 1 Widget Decision (strongest safe set)

## 4.1 Must-ship widgets (safe + high value)
1. **Overview metrics row**
   - Total courses (unique courses)
   - Total sessions
   - Total groups
   - Total rooms
   - Total instructors
2. **Today / Next panel**
   - Today’s sessions list (sorted by start minute)
   - Next upcoming session card (or “none upcoming” empty state)
   - Optional “in progress now” badge if start <= now < end (safe)
3. **Data quality / health panel**
   - Conflict summary count (existing conflict helper)
   - Sessions missing room
   - Sessions missing instructor
   - Sessions missing group
   - Incomplete-data warning line(s)
4. **Actionable panel**
   - Unresolved issues summary (aggregate of conflicts + missing assignments)
   - Quick action buttons (reuse existing New / Conflicts / Export + add safe links)

## 4.2 Safe insights subset for Batch 1 (chosen subset)
Ship compact, low-risk insight chips/cards (no heavy charts required):
- Sessions by type
- Rooms by building
- Groups by root/main group
- Delivery-mode split (physical/online/hybrid)
- Busiest day
- Busiest room
- Busiest instructor
- Most active group

Rationale: all derivable from already-fetched data without schema/API changes.

## 4.3 Workflow/productivity in Batch 1
Ship **safe quick links** only:
- Courses page
- Timetable page
- Groups page
- Rooms page
- Instructors page
- Import entry points that already exist on pages (courses/groups/rooms)

### Explicitly deferred in Batch 1
- **Quick links to saved views:** saved views are local-storage-only in Courses page; no shared/stable dashboard contract yet.
- **Recently imported / recently updated panel:** no clean import-event log surface; avoid fake recency.

## 5) UX/Hierarchy Requirements
Dashboard layout MUST follow:
1. Top-level overview
2. Immediate actionable information (today/next + health)
3. Deeper insights (compact distribution and busiest summaries)
4. Quick actions and links

Constraints:
- Mobile-friendly and desktop-friendly.
- Scannable sections with clear headings.
- Avoid noisy “wall of cards”.

## 6) Functional Requirements (Batch 1 locked)
- **FR-01** Show exact overview counts: courses, sessions, groups, rooms, instructors.
- **FR-02** Use `Course.sessions[]` as canonical session source (real model only).
- **FR-03** Provide today’s sessions list for current day with deterministic sorting.
- **FR-04** Provide next upcoming session from current time context, with safe empty state.
- **FR-05** Show conflict count using existing `buildScheduleConflicts` helper.
- **FR-06** Show missing-room / missing-instructor / missing-group session counts.
- **FR-07** Show unresolved-issues summary from conflict + missing-data counters.
- **FR-08** Provide safe insight subset listed in §4.2.
- **FR-09** Provide quick links/actions from §4.3 without introducing new backend contracts.
- **FR-10** Preserve existing action behavior and non-dashboard pages.
- **FR-11** No PWA/runtime/install code changes.
- **FR-12** No destructive migrations or schema changes.

## 7) Non-Goals (strict)
- No shared saved-views work.
- No import upgrade mode.
- No permissions/sharing changes.
- No audit/revision work.
- No test automation introduction.
- No unrelated page rewrites.
- No reopening old finished batches.

## 8) Implementation Order (must follow exactly)
1. Inspect current dashboard implementation.
2. Inspect current data sources/APIs/helpers.
3. Define safest useful widget set.
4. Implement the new dashboard.
5. Build.
6. Verify on desktop.
7. Verify on mobile.
8. Verify production stability.
9. Commit.
10. Push.
11. Report.

## 9) Concrete Task Checklist (owner + output + acceptance)

- [ ] **T1 — Baseline audit and mapping**
  - **Owner:** Planner/Verifier
  - **Output:** Short mapping of current dashboard + data/helper/schema surfaces.
  - **Acceptance check:** Mapping references concrete files/functions and confirms no schema/API change needed.

- [ ] **T2 — Dashboard view-model definition**
  - **Owner:** Builder
  - **Output:** Derived client-side dashboard analytics model (counts, today/next, quality, insights, quick links metadata).
  - **Acceptance check:** All metrics come from existing fetched data; no fake/guessed values; no backend contract changes.

- [ ] **T3 — UI hierarchy redesign (Batch 1 only)**
  - **Owner:** Builder
  - **Output:** Updated `DashboardView` + page wiring matching 4-level hierarchy.
  - **Acceptance check:** Overview, actionable info, insights, quick actions all present and scannable on mobile/desktop.

- [ ] **T4 — Quality and issue panel integration**
  - **Owner:** Builder
  - **Output:** Conflict + missing assignment counters and unresolved summary panel.
  - **Acceptance check:** Counters are deterministic and match source data.

- [ ] **T5 — Today/next behavior validation hooks**
  - **Owner:** Builder + Verifier
  - **Output:** Deterministic day/time handling (safe local-time implementation in Batch 1) and empty-state handling.
  - **Acceptance check:** Correct behavior before first class, between classes, and after final class.

- [ ] **T6 — Build + live verification + stability gate**
  - **Owner:** Verifier
  - **Output:** Verification notes with desktop/mobile evidence and stability check result.
  - **Acceptance check:** Full checklist in §10 passes; build succeeds before any restart.

- [ ] **T7 — Delivery and sync**
  - **Owner:** Builder
  - **Output:** Commit + push + final batch report using template in §11.
  - **Acceptance check:** Exact commit hash included; GitHub/VPS sync confirmed.

## 10) Required Verification Checklist (must be encoded in acceptance)
1. Dashboard loads correctly.
2. Overview metrics render correctly.
3. Today/next widgets work (if implemented).
4. Quality/conflict widgets work (if implemented).
5. Insights widgets work (if implemented).
6. Quick actions work.
7. Mobile dashboard is usable.
8. Desktop dashboard is usable.
9. Build passes.
10. Production stays stable.

## 11) Final Report Template (mandatory for implementation run)
1. Dashboard upgrades implemented
2. Dashboard widgets/insights added
3. Data sources used
4. Files changed
5. Verification performed
6. Mobile result
7. Desktop result
8. Git status
9. Current branch
10. Commit created (with exact hash)
11. Pushed to GitHub
12. Remaining risks or follow-ups

## 12) Risks / Open Questions
1. **Conflict detection semantics**: helper catches exact-window overlaps only; partial-overlap detection is intentionally deferred to avoid logic risk in Batch 1.
2. **Timezone semantics for today/next**: workspace timezone exists in schema but current page logic is client-local; Batch 1 should document this limitation and keep behavior consistent.
3. **Saved views on dashboard**: not safely portable yet (localStorage on Courses page only), therefore deferred.
4. **Recently imported activity**: no clean import history model; intentionally omitted rather than fabricated.

## 13) Safety/Operations Constraints
- Build before restart; restart only after successful build (plan requirement).
- Do not touch PWA/runtime/install code.
- Do not run destructive migrations.
- Keep GitHub and VPS synchronized after completion.
- Include exact commit hash in batch report.
