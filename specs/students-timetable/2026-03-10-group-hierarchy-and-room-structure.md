# Spec: Group hierarchy + structured rooms

- **Spec ID:** students-timetable-2026-03-10-group-hierarchy-and-room-structure
- **Project:** students-timetable
- **Status:** Done
- **Owner:** dev:main
- **Created:** 2026-03-10
- **Last Updated:** 2026-03-10

## 1) Problem Statement
Students Timetable currently models academic groups and rooms too flatly for the university’s real scheduling needs. Groups are stored as independent rows with no parent/child relationship, so `A` and `A1` are just unrelated entries instead of a main group with subgroups. Rooms are also stored as flat full codes plus an optional free-text building field, so structured building letter, room number, and derived floor/level are not available for smarter display and assignment. These limitations already affect production data and the course/session assignment UX.

## 2) Goals
- Upgrade groups to support main-group / subgroup hierarchy.
- Upgrade rooms to support structured building code, room number, and derived level/floor.
- Keep course/session assignment compatible with the new models.
- Migrate existing live data deterministically and safely.
- Preserve production stability and avoid unrelated redesign.

## 3) Non-Goals
- No PWA/runtime/install changes.
- No unrelated workspace redesign.
- No destructive migration without deterministic mapping.
- No timetable architecture rewrite outside compatibility updates.

## 4) Scope
### In Scope
- `prisma/schema.prisma`
- new Prisma migration(s)
- `scripts/` migration/normalization helpers
- `src/app/api/v1/groups/route.ts`
- `src/app/api/v1/groups/[id]/route.ts`
- `src/app/api/v1/rooms/route.ts`
- `src/app/api/v1/rooms/[id]/route.ts`
- `src/app/workspace/groups/page.tsx`
- `src/app/workspace/rooms/page.tsx`
- `src/components/workspace/EditCourseModal.tsx`
- `src/types/index.ts`
- timetable/course compatibility helpers as needed

### Out of Scope
- PWA/runtime/install code
- unrelated pages/features
- non-group/non-room academic model changes

## 5) Constraints & Assumptions
- Live production path remains `/home/ubuntu/.openclaw/workspace/students-timetable-app`.
- Runtime remains `students-timetable.service`.
- Existing unrelated working-tree changes (`package-lock.json`, `check.cjs`, `get_users.js`) must remain untouched.
- Current live data already contains group codes like `A` and `A1`, and room codes like `E119`, `E201`, `E412`.

## 6) Deliverables
- Hierarchical group support in schema, API, and UI.
- Structured room support in schema, API, and UI.
- Deterministic migration helpers for existing live group/room data.
- Updated assignment UX so sessions can target parent groups or subgroup rows cleanly and room metadata is clearer.
- Verified build, deploy, live checks, and one coherent commit.

## 7) Acceptance Criteria
- [ ] AC1: Groups support parent/main-group hierarchy via explicit relation (or equivalent deterministic hierarchy field).
- [ ] AC2: Existing live groups are normalized safely so subgroup rows like `A1` link to parent `A` when the parent exists.
- [ ] AC3: Rooms support structured building code + room number, with floor/level derivable from room number.
- [ ] AC4: Existing live rooms like `E119`, `E201`, `E226`, `E412` are normalized safely into structured room fields.
- [ ] AC5: Group/room resource pages support the new structure without unrelated redesign.
- [ ] AC6: Course/session assignment still works and exposes clearer grouped/room metadata.
- [ ] AC7: Timetable/session compatibility remains intact after migration.
- [ ] AC8: Build passes, service restarts cleanly, live desktop/mobile verification passes, and GitHub/VPS stay synced.

## 8) Implementation Plan (Task Breakdown)
- [ ] T1 — Analyze live schema/data and define deterministic migration rules
  - **Owner:** dev:main
  - **Acceptance Check:** current broken limitations + exact migration strategy documented before coding
- [ ] T2 — Implement hierarchical groups
  - **Owner:** dev:main
  - **Acceptance Check:** schema/API/UI support parent/main groups and subgroup rows
- [ ] T3 — Implement structured rooms
  - **Owner:** dev:main
  - **Acceptance Check:** schema/API/UI support building code + room number + derived level context
- [ ] T4 — Normalize live data safely
  - **Owner:** dev:main
  - **Acceptance Check:** existing groups/rooms mapped deterministically without data loss
- [ ] T5 — Update assignment/timetable compatibility
  - **Owner:** dev:main
  - **Acceptance Check:** course/session assignment and timetable surfaces remain correct
- [ ] T6 — Build, deploy, verify, report
  - **Owner:** dev:main
  - **Acceptance Check:** AC1-AC8 satisfied

## 9) Worker Delegation Notes
- Approved spec path: `specs/students-timetable/2026-03-10-group-hierarchy-and-room-structure.md`
- Implement only approved scope; flag gaps instead of inventing scope.
- If migration risk changes materially, pause and update the spec before widening scope.

## 10) Verification & Report
- Build/test commands:
  - `npx prisma generate --schema prisma/schema.prisma`
  - `npm run build`
  - `npx prisma migrate deploy --schema prisma/schema.prisma`
  - `node scripts/normalize-groups-and-rooms.mjs --dry-run`
  - `node scripts/normalize-groups-and-rooms.mjs`
- Verification results:
  - Schema/API/UI compile passed after the final room-level correction.
  - Safety-gate room-level mapping was verified against the explicit university ranges: `119 -> 0`, `199 -> 0`, `200 -> 1`, `299 -> 1`, `300 -> 2`, `399 -> 2`, `400 -> 3`, `499 -> 3`, `500 -> 4`, `599 -> 4`, `600 -> 5`, `699 -> 5`.
  - Explicit post-normalization room examples were verified in production data: `E119 => (E, 119, level 0)`, `E226 => (E, 226, level 1)`, `E412 => (E, 412, level 3)`.
  - Group hierarchy rule was verified two ways:
    - real production data: `A1` now links to parent `A` and existing session assignments still resolve
    - transaction-scoped proof fixture (rolled back): `A2/A3 -> A` and `B1/B2/B3 -> B`
  - Deterministic normalization safety gate passed: repeat dry-runs were identical no-op outputs after normalization.
  - Live browser verification passed on desktop and mobile for groups page hierarchy rendering, rooms page structured room rendering, course modal opening, and timetable label compatibility.
  - Live authenticated API verification passed for create/edit/delete of temporary parent+child groups, structured rooms, and a temporary course session assigned to the subgroup + room.
  - Production build passed, `students-timetable.service` restarted cleanly, and live site remained stable.
- Remaining risks/follow-ups:
  - Current production group dataset is small (`A`, `A1`, `UX051`), so the explicit `A2/A3/B1/B2/B3` proof relied on a transaction-scoped deterministic fixture rather than existing live rows.
  - Room numbers above the currently documented university ranges continue the numeric derivation pattern; if the institution wants hard clamping beyond `600-699`, that can be added later without changing the current live dataset.
