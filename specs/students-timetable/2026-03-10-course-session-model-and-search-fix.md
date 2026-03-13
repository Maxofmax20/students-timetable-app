# Spec: Search bar fix + course/session model correction

- **Spec ID:** students-timetable-2026-03-10-course-session-model-and-search-fix
- **Project:** students-timetable
- **Status:** Done
- **Owner:** dev:main
- **Created:** 2026-03-10
- **Last Updated:** 2026-03-10

## 1) Problem Statement
Two connected production problems need a controlled fix. First, the shared resource-page search bar UI is visually broken on desktop and mobile. Second, the current course product model is wrong in practice: users create separate course rows for lecture/section/lab variants instead of creating one course with multiple sessions. The schema already contains `SessionEntry`, but the production API, course page mapping, and create/edit UX still operate like a single-session course editor, which is producing duplicated course rows in live data.

## 2) Goals
- Fix the shared resource-page search bar so it renders cleanly on desktop and mobile.
- Correct the product model so one course owns multiple sessions.
- Support session types: Lecture, Section, Lab, Online, Hybrid.
- Rebuild course create/edit UX around multi-session entry.
- Safely migrate existing duplicated course rows into one course with many sessions.
- Preserve production stability and timetable/export behavior.

## 3) Non-Goals
- No PWA/runtime/install work.
- No unrelated page redesign outside the affected search input and course/session flows.
- No destructive migration that drops data without deterministic remapping.
- No auth/backend redesign outside course/session API wiring.

## 4) Scope
### In Scope
- `src/components/ui/SearchInput.tsx`
- `src/app/workspace/{groups,instructors,rooms,courses,timetable}/...` as needed for affected UI/data mapping
- `src/components/workspace/CoursesView.tsx`
- `src/components/workspace/EditCourseModal.tsx`
- `src/app/api/v1/courses/route.ts`
- `src/app/api/v1/courses/[id]/route.ts`
- `src/lib/schedule.ts`
- `src/types/index.ts`
- `prisma/schema.prisma`
- new Prisma migration + controlled one-off course consolidation script

### Out of Scope
- Unrelated workspace pages/features
- PWA/runtime/install code
- New collaboration/sharing features

## 5) Constraints & Assumptions
- Tech constraints: live production uses PostgreSQL + Prisma + `students-timetable.service`.
- Safety constraints: migration must be additive-first and deterministic; no destructive guessing.
- Repo constraints: pre-existing unrelated working tree changes (`package-lock.json`, `check.cjs`, `get_users.js`) must remain untouched.
- Product assumption: current duplicate records (`ROBO-LEC`, `ROBO-SEC`, `ROBO-LAB`, etc.) represent one logical course with multiple sessions.

## 6) Deliverables
- Shared search bar UI fix.
- Updated schema/API/types for multi-session courses.
- Course create/edit UI rebuilt around multiple sessions.
- Migration SQL for new session fields.
- Idempotent consolidation script for existing duplicated course rows.
- Verified production deploy with build + live/data verification.

## 7) Acceptance Criteria
- [ ] AC1: Resource-page search bars render correctly on desktop and mobile.
- [ ] AC2: Course/session schema supports one course with many typed sessions including online/hybrid metadata.
- [ ] AC3: Existing duplicated live courses are consolidated safely into single courses with multiple sessions.
- [ ] AC4: Course create/edit flow supports adding, editing, removing, and duplicating multiple sessions in one course.
- [ ] AC5: Timetable/export mapping still renders all sessions correctly after migration.
- [ ] AC6: Production build passes, migration is applied, service restarts cleanly, and VPS/GitHub stay synced.

## 8) Implementation Plan (Task Breakdown)
- [ ] T1 — Product/schema analysis and migration design
  - **Owner:** dev:main
  - **Output:** confirmed live model diagnosis + safe migration plan
  - **Acceptance Check:** identify current wrong model, target model, and exact migration strategy before code changes
- [ ] T2 — Fix shared search input UI
  - **Owner:** dev:main
  - **Output:** targeted `SearchInput` update validated on mobile/desktop behavior
  - **Acceptance Check:** search field no longer visually breaks in resource-page layouts
- [ ] T3 — Add session typing schema + API support
  - **Owner:** dev:main
  - **Output:** Prisma schema/migration, API payload support for `sessions[]`, backward-compatible single-session fallback
  - **Acceptance Check:** create/edit/list APIs support one course with many sessions
- [ ] T4 — Consolidate existing duplicate course rows
  - **Owner:** dev:main
  - **Output:** deterministic migration script executed against live data
  - **Acceptance Check:** duplicate logical courses become single courses with multiple sessions; no session data lost
- [ ] T5 — Rebuild course UX around multi-session editing
  - **Owner:** dev:main
  - **Output:** updated course page + modal for multi-session create/edit/duplicate
  - **Acceptance Check:** one course can be edited with multiple sessions in one flow
- [ ] T6 — Timetable/export verification
  - **Owner:** dev:main
  - **Output:** verified mapping after migration
  - **Acceptance Check:** all sessions still appear correctly in timetable/export data
- [ ] T7 — Build, deploy, verify, report
  - **Owner:** dev:main
  - **Output:** production-safe deploy + commit/push + final report
  - **Acceptance Check:** AC1-AC6 satisfied

## 9) Worker Delegation Notes
- Approved spec path: `specs/students-timetable/2026-03-10-course-session-model-and-search-fix.md`
- Implement only approved scope; flag gaps instead of inventing scope.
- If migration risk increases during implementation, pause and patch the spec before widening scope.

## 10) Verification & Report
- Build/test commands:
  - `npx prisma migrate deploy --schema prisma/schema.prisma`
  - `npx prisma generate --schema prisma/schema.prisma`
  - `node scripts/merge-course-sessions.mjs --dry-run`
  - `node scripts/merge-course-sessions.mjs`
  - `npm run build`
- Verification results:
  - Production-safe Prisma client regeneration succeeded.
  - Build passed before restart.
  - Deterministic merge script dry-run and apply were both idempotent no-ops against the current live data at deploy time.
  - Local authenticated verification on a separate app instance passed for desktop/mobile search spacing, create-course modal multi-session UI, create→patch→delete multi-session API round-trip, and one-row course list behavior.
  - Live authenticated verification passed for the same desktop/mobile checks after restarting `students-timetable.service`.
- Remaining risks/follow-ups: existing unrelated working-tree files remain outside this change set; if future course imports create new suffixed duplicates, run the deterministic merge script again after review.
