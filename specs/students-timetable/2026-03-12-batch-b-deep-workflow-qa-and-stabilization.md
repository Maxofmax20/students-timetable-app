# Students Timetable — Batch B Deep Workflow QA + Stabilization

Date: 2026-03-12  
Scope owner: Batch B planner (this spec)  
Baseline: Batch A accepted on `51c0ae9b5f8f8bb6dd7de438af9f734e7590f9fd`

## 1) Batch B Goal (strict)
Run **real behavior-focused QA** on highest-risk production workflows, then apply **narrow/safe bug fixes only** for defects found in those workflows.

This batch is limited to:
- workflow verification + defect triage
- targeted stabilization fixes
- honest pass/fail reporting

Not in scope:
- Batch C+ feature work
- broad refactors
- PWA/runtime/install redesign
- broad auth redesign

---

## 2) Current implementation surfaces (workflow-critical)

### A. Core CRUD + scheduling domain
- `src/app/workspace/courses/page.tsx`
- `src/app/workspace/groups/page.tsx`
- `src/app/workspace/rooms/page.tsx`
- `src/app/workspace/instructors/page.tsx`
- `src/components/workspace/EditCourseModal.tsx`
- `src/components/workspace/TimetableView.tsx`
- `src/lib/schedule.ts`

### B. Server APIs for domain mutation/read
- `src/app/api/v1/courses/route.ts`
- `src/app/api/v1/courses/[id]/route.ts`
- `src/app/api/v1/groups/route.ts`
- `src/app/api/v1/groups/[id]/route.ts`
- `src/app/api/v1/rooms/route.ts`
- `src/app/api/v1/rooms/[id]/route.ts`
- `src/app/api/v1/instructors/route.ts`
- `src/app/api/v1/instructors/[id]/route.ts`

### C. Saved views / sharing / history / restore
- `src/app/api/v1/saved-views/route.ts`
- `src/app/api/v1/saved-views/[id]/route.ts`
- `src/app/workspace/courses/page.tsx` (saved view UX)
- `src/app/workspace/timetable/page.tsx` (saved view UX)
- `src/app/workspace/sharing/page.tsx`
- `src/app/api/v1/workspaces/[id]/members/route.ts`
- `src/app/api/v1/workspaces/[id]/members/[memberId]/route.ts`
- `src/app/workspace/history/page.tsx`
- `src/app/api/v1/workspaces/[id]/history/route.ts`
- `src/app/api/v1/workspaces/[id]/history/restore/route.ts`

### D. Import/export paths
- `src/app/api/v1/import/courses/route.ts`
- `src/app/api/v1/import/groups/route.ts`
- `src/app/api/v1/import/rooms/route.ts`
- `src/app/api/v1/import/instructors/route.ts`
- `src/app/api/export/calendar/route.ts`
- `src/app/workspace/courses/page.tsx` (filtered CSV export)
- `src/app/workspace/timetable/page.tsx` (filtered ICS + summary exports)

---

## 3) Highest-risk / highest-value workflow matrix for Batch B

Priority 0 (must run first):
1. **Course lifecycle:** create → edit (sessions/time/room/instructor) → duplicate → delete
2. **History + restore:** delete course/room/instructor → restore
3. **Sharing permissions:** owner/editor/viewer behavior for writes and restricted actions

Priority 1:
4. Room create/edit/delete + **section delete**
5. Group create/edit/delete + **section delete**
6. Instructor create/edit/delete/import
7. Saved views (courses + timetable): create/apply/rename/delete

Priority 2:
8. Export flows (courses CSV, timetable ICS, calendar export endpoint)
9. Import flows (courses/groups/rooms/instructors preview+apply)
10. Timetable interactions (filters, conflicts layer, view modes, session detail open)

---

## 4) Batch B execution strategy (strongest safe subset)

Given matrix size, Batch B should execute in this order:
- Wave 1: Priority 0 end-to-end across owner/editor/viewer accounts
- Wave 2: Priority 1 entity CRUD + saved views + imports
- Wave 3: Priority 2 exports + timetable interaction regressions

If time-constrained, ship Wave 1 + selected Wave 2 first, then report remainder explicitly as pending.

---

## 5) Task checklist (owner + acceptance criteria)

## T1 — Prepare QA dataset and role accounts
**Owner:** QA/Stabilization worker  
**Acceptance criteria:**
- Dedicated workspace exists with realistic linked data (courses, groups incl. subgroups, rooms incl. multiple building sections, instructors).
- Three users confirmed: owner, editor(teacher), viewer.
- Baseline snapshot of counts captured before destructive tests.

## T2 — Course lifecycle deep QA
**Owner:** QA/Stabilization worker  
**Acceptance criteria:**
- Verified with real API-backed data: create, full edit, duplicate, delete.
- Multi-session course edit validated (session type/day/time/links).
- Any failures logged with exact repro steps, expected vs actual, and affected endpoint/UI.
- For each confirmed bug, narrow fix PR/commit prepared (no broad refactor).

## T3 — Room workflows (incl. section delete)
**Owner:** QA/Stabilization worker  
**Acceptance criteria:**
- Create/edit/delete room works with structured fields (building code + room number + derived level).
- Section delete removes all rooms in chosen building section and reports failures clearly.
- Post-delete assignment behavior verified (sessions become unassigned, no crash).

## T4 — Group workflows (incl. section delete)
**Owner:** QA/Stabilization worker  
**Acceptance criteria:**
- Create/edit/delete of main groups and subgroups validated.
- Parent-child protections validated (cannot delete parent with children directly).
- Section delete workflow (children then root) works or defects are documented with repro.

## T5 — Instructor workflows + import
**Owner:** QA/Stabilization worker  
**Acceptance criteria:**
- Create/edit/delete instructor verified.
- CSV import preview and import modes validated (`create_only`, `update_existing`, `create_update`).
- Ambiguous/missing identifiers handled safely (no silent destructive overwrite).

## T6 — Saved views (courses + timetable)
**Owner:** QA/Stabilization worker  
**Acceptance criteria:**
- Create/apply/rename/delete verified on both surfaces.
- Saved state rehydrates correctly for filters/toggles.
- Active-view UX remains consistent after deletion/rename.

## T7 — History and restore
**Owner:** QA/Stabilization worker  
**Acceptance criteria:**
- History list correctly scoped by role.
- Restore tested for supported entities (course/room/instructor) from DELETE entries.
- Unsupported restore paths fail with clear message and no partial writes.

## T8 — Sharing owner/editor/viewer
**Owner:** QA/Stabilization worker  
**Acceptance criteria:**
- Owner can add/update/remove members.
- Editor and viewer restrictions enforced in UI + API (no privilege bypass).
- Role label mismatch risks (TEACHER/VIEWER/STUDENT mapping) are explicitly tested and documented.

## T9 — Export and import sanity pass
**Owner:** QA/Stabilization worker  
**Acceptance criteria:**
- Export outputs generated and open successfully (CSV/ICS/print path).
- Import preview/apply for courses/groups/rooms/instructors validated on mixed valid/invalid rows.
- No data corruption from repeated import runs.

## T10 — Timetable interactions regression pass
**Owner:** QA/Stabilization worker  
**Acceptance criteria:**
- Grid/list toggles, mobile-day behavior, session details modal, and conflict layer validated.
- Filter combinations and saved view apply/reset do not produce stale/inconsistent board state.
- Any rendering/state bugs documented with deterministic steps.

## T11 — Stabilization fixes + final report
**Owner:** Stabilization implementer + verifier  
**Acceptance criteria:**
- Only bugs discovered in T2–T10 are fixed.
- Each fix is minimal, scoped, and mapped to a failing scenario.
- Final Batch B report includes: Passed, Failed, Fixed, Deferred (with reason/risk).

---

## 6) Explicit risks/open questions to track during Batch B
1. **Role-model mismatch risk:** API stores workspace role enums while UI surfaces OWNER/EDITOR/VIEWER product labels; must verify no privilege confusion.
2. **Section delete loop robustness:** room/group section deletes run per-item deletes; partial failure handling must be validated.
3. **Restore coverage gap:** restore currently supports only selected entity types; ensure UX communicates unsupported cases.
4. **Saved view ownership scope:** saved views are user-owned; verify expected behavior under shared workspace collaboration.
5. **Import safety under ambiguous instructor/group mapping:** must never apply unsafe updates silently.

---

## 7) Definition of done for Batch B
Batch B is complete only when:
- Highest-priority workflows are executed end-to-end against real behavior.
- Real defects are either fixed narrowly or documented as deferred with rationale.
- Pass/fail is reported honestly per workflow.
- No scope creep into Batch C+.
