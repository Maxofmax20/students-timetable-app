# Spec: Students Timetable — Batch 3 Bulk Import

- **Spec ID:** students-timetable-2026-03-11-batch-3-bulk-import
- **Project:** students-timetable
- **Status:** Approved
- **Owner:** main assistant
- **Created:** 2026-03-11
- **Last Updated:** 2026-03-11

## 1) Problem Statement
Students Timetable now has stable resource pages and a corrected course/session model, but data entry is still too manual for real production use. Batch 3 must add safe, production-appropriate CSV import workflows for Rooms and Groups, and preferably Courses + Sessions, without destabilizing the live app or silently damaging workspace data.

## 2) Goals
- Add a real CSV import workflow for Rooms with validation, preview, confirmation, and explicit duplicate handling.
- Add a real CSV import workflow for Groups with validation, preview, confirmation, and safe hierarchy inference.
- Add a CSV import workflow for Courses + Sessions if it can be shipped safely in the same batch using the existing one-course-many-sessions model.
- Keep imports create-only and non-destructive by default.
- Make import UX understandable from the product surface with templates/help, preview counts, error lists, and confirm-before-write behavior.

## 3) Non-Goals
- README/docs batch work.
- Auth changes.
- PWA/runtime/install/service-worker changes.
- Reopening unrelated architecture work.
- Destructive sync/replace imports.
- Silent overwrite or mutation of existing production rows.

## 4) Scope
### In Scope
- Import entry points on Rooms, Groups, and Courses pages.
- CSV template/help inside the product for Rooms and Groups, and for Courses if implemented.
- Preview + confirm import workflow.
- Validation + duplicate/conflict reporting.
- Create-only persistence behavior for valid, non-duplicate rows.
- Safe course/session CSV import if it can be delivered without schema changes or risky inference.

### Out of Scope
- Bulk import for instructors.
- Replace/update import modes.
- Hidden or background imports without preview.
- Automatic correction of malformed user data beyond explicit normalization rules already present for room/group/course models.

## 5) Constraints & Assumptions
- Tech constraints:
  - Canonical live repo/path is `/home/ubuntu/.openclaw/workspace/students-timetable-app`.
  - Production runtime is systemd service `students-timetable.service`.
  - Existing uniqueness is by workspace + code for Rooms, Groups, and Courses.
  - Existing course API already supports `Course -> SessionEntry[]`, which is the safe basis for course import.
- Time/resource constraints:
  - Rooms import first, Groups second, Courses + Sessions third if safe.
  - No schema changes unless absolutely unavoidable.
- Assumptions:
  - Duplicate strategy will be explicit create-only import: duplicates are previewed/reported and skipped, never overwritten.
  - Courses import can safely use one-row-per-session CSV grouped by course code/title if all linked entities resolve cleanly.

## 6) Deliverables
- Rooms CSV import with preview/confirm UX.
- Groups CSV import with preview/confirm UX.
- Courses + Sessions CSV import if safely delivered; otherwise an honest partial/deferred outcome.
- Validation summary, duplicate summary, and error feedback for each implemented import flow.
- Template/help affordances inside the product for at least Rooms and Groups.

## 7) Acceptance Criteria
- [ ] AC1: Rooms CSV import works from the Rooms page and supports buildingCode, roomNumber, derived level, code/full code, optional building name, and optional capacity.
- [ ] AC2: Rooms import rejects malformed structured rows, reports duplicates explicitly, and never silently overwrites an existing room.
- [ ] AC3: Groups CSV import works from the Groups page and safely creates main-group/subgroup hierarchy using the existing parentGroup model.
- [ ] AC4: Groups import does not create orphan subgroup links, does not silently merge unrelated groups, and reports duplicates explicitly.
- [ ] AC5: Each implemented import flow provides preview counts (valid / invalid / duplicate), validation feedback, and a confirmation step before writes.
- [ ] AC6: Imported Rooms and Groups appear correctly in the existing UI after import.
- [ ] AC7: Courses + Sessions CSV import is implemented if safe using the existing one-course-many-sessions model; if not safely shippable, the final report explicitly says so.
- [ ] AC8: Desktop usability is good and mobile basic usability is acceptable for the implemented import flows.
- [ ] AC9: `npm run build` passes and production remains stable after deployment.

## 8) Implementation Plan (Task Breakdown)
- [ ] T1 — Inspect current data/API/page structure and lock the safest import insertion points.
  - **Owner:** main assistant
  - **Output:** Batch 3 approved spec + page/API targets
  - **Acceptance Check:** import work remains fenced to Rooms, Groups, Courses surfaces and their import endpoints
- [ ] T2 — Implement reusable CSV parsing/preview infrastructure and Rooms import.
  - **Owner:** main assistant
  - **Output:** import helpers/components/routes + Rooms import UX/API
  - **Acceptance Check:** Rooms preview, validation, duplicate reporting, and create-only import all work
- [ ] T3 — Implement Groups import with safe parent inference.
  - **Owner:** main assistant
  - **Output:** Groups import UX/API using explicit hierarchy rules
  - **Acceptance Check:** main groups and subgroups import safely without orphan links or silent merges
- [ ] T4 — Implement Courses + Sessions import only if it stays production-safe.
  - **Owner:** main assistant
  - **Output:** course/session import UX/API or explicit deferral
  - **Acceptance Check:** if shipped, grouped course creation with multiple sessions works and validates linked entities safely
- [ ] T5 — Verify, build, deploy, and report honestly.
  - **Owner:** main assistant
  - **Output:** verification report + commit/push/deploy status
  - **Acceptance Check:** AC1–AC9 are checked honestly and the repo/GitHub/VPS are synced

## 9) Worker Delegation Notes
- Approved spec path: `/home/ubuntu/.openclaw/workspace/students-timetable-app/specs/students-timetable/2026-03-11-batch-3-bulk-import.md`
- Implement only approved scope.
- Any scope change requires spec update + approval.
- Do not use `/home/ubuntu/timetable` for production work.
- Do not touch auth, docs batch, or PWA/runtime/install code.

## 10) Verification & Report
- Build/test commands:
  - `npm run build`
- Verification results:
  - Pending
- Remaining risks/follow-ups:
  - Courses + Sessions import may be deferred if linked-entity resolution or UX safety is not good enough within this batch.
