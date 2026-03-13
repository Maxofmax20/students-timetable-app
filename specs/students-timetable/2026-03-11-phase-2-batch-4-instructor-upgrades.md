# Students Timetable — Phase 2 Batch 4: Instructor Upgrades (Spec)

- **Date:** 2026-03-11
- **Status:** Draft for approval (planning only)
- **Scope Lock:** Phase 2 / Batch 4 only — instructor upgrades
- **Repository:** `/home/ubuntu/.openclaw/workspace/students-timetable-app`

## 1) Batch 4 Goal
Upgrade instructor management to be safer for real operations (clean records, clearer assignment impact, better instructor-centric visibility) **without** changing auth/runtime/PWA/install surfaces and without broadening into later-batch work.

## 2) Baseline Confirmed Before Batch 4
- Accepted baseline commit before this batch: `a1946791e3cab52c69296482bf5a5bf3e5669477`.
- Current branch inspected in live repo is clean (see delivery note in report).
- Instructor CRUD exists and is functional, but still “directory basic”:
  - List/create/update/delete instructor records.
  - Name/email/phone fields in UI.
  - No explicit duplicate guardrails.
  - No assignment-impact summary before delete.
  - No instructor workload snapshot in instructor page.

## 3) Confirmed Current Instructor Surfaces (inspected)

### 3.1 Data model (Prisma)
- `prisma/schema.prisma`
  - `Instructor` model: `id`, `workspaceId`, `name`, `email?`, `phone?`, `color?`, timestamps.
  - Relations: `Course.instructorId` and `SessionEntry.instructorId` (`onDelete: SetNull` by relation fields).
  - No uniqueness constraint on instructor email or normalized name at DB layer.

### 3.2 Instructor API surfaces
- `src/app/api/v1/instructors/route.ts`
  - `GET`: list instructors by workspace.
  - `POST`: create instructor (OWNER/TEACHER only), minimal validation.
- `src/app/api/v1/instructors/[id]/route.ts`
  - `PATCH`: update instructor fields.
  - `DELETE`: hard delete instructor record.
  - Current delete flow does not return pre-delete impact summary.

### 3.3 Instructor UI surface
- `src/app/workspace/instructors/page.tsx`
  - Faculty directory table (name/contact/actions), search, create/edit/delete modals.
  - Delete confirmation text warns assignments are cleared, but no real counts shown.
  - UI does not expose color field although model/API can store it.

### 3.4 Instructor-dependent product flows (must remain compatible)
- `src/components/workspace/EditCourseModal.tsx`
  - Session-level instructor assignment uses instructor options list.
- `src/app/api/v1/courses/route.ts` (+ `[id]/route.ts`)
  - Validates `instructorId` belongs to same workspace.
- `src/app/api/v1/import/courses/route.ts`
  - Resolves instructors by email first, then by exact name; ambiguous same-name case throws `AMBIGUOUS_INSTRUCTOR`.
- `src/lib/schedule.ts`
  - Conflict detection includes instructor overlap buckets.

## 4) Batch 4 In-Scope (locked)
1. **Instructor data quality guardrails**
   - Prevent obvious duplicates at API level for create/update (strong safe subset: duplicate email if present; optional normalized-name duplicate warning/error policy decided explicitly).
2. **Instructor assignment impact visibility**
   - Expose per-instructor usage counts (linked courses, linked sessions, active conflicts if cheaply derivable) for management and safe deletion decisions.
3. **Safer instructor deletion flow**
   - Add pre-delete impact summary endpoint/response and UI confirmation with real counts before destructive action.
4. **Instructor page UX uplift (instructor-only)**
   - Add assignment/load columns and small clarity improvements specific to instructors.

## 5) Explicit Out of Scope (strict)
- Auth changes.
- PWA/runtime/install/service worker work.
- Cross-cutting redesign of courses/timetable pages.
- Batch 5+ features or roadmap items.
- Broad conflict-engine rewrite.
- Non-instructor import overhauls.

## 6) Requirements (Batch 4)
- **FR-01:** Instructor create/update must block unsafe duplicates according to approved rule set.
- **FR-02:** Instructor list API must provide instructor management metadata needed by instructor page (at minimum linked course/session counts; optional conflict count if safe).
- **FR-03:** Instructor delete flow must provide explicit impact summary before removal.
- **FR-04:** Instructor page must show assignment impact data and use it in delete confirmation.
- **FR-05:** Existing course/session assignment workflows must continue working unchanged.
- **FR-06:** No schema breakage; additive-only change strategy preferred.

## 7) Technical Approach (strongest safe subset)
- Keep schema changes optional and minimal. Prefer API/service-layer guards first.
- Implement aggregate counts with bounded Prisma queries scoped to workspace.
- Keep delete semantics as current (`SetNull` behavior) but make impact explicit before user confirms delete.
- If conflict counts are expensive/risky, defer them and ship only course/session usage counts in Batch 4.

## 8) Concrete Task Checklist (owner + acceptance per task)

- [ ] **T1 — Instructor surface audit lock + contract definition**
  - **Owner:** Planner/Verifier
  - **Output:** Finalized API/UI contract for duplicate rules + impact counters.
  - **Acceptance criteria:**
    - Duplicate policy documented exactly (email/name behavior).
    - Counter definitions documented exactly (what is counted, scoped by workspace).

- [ ] **T2 — API guardrails for instructor duplicates**
  - **Owner:** Builder
  - **Output:** Updates in instructor create/update API validation paths.
  - **Acceptance criteria:**
    - Create rejects duplicate email (case-insensitive trim) within same workspace when email present.
    - Update rejects changing to email already used by another instructor in same workspace.
    - Error messages are stable and surfaced cleanly in UI.

- [ ] **T3 — Instructor usage/impact metadata in API**
  - **Owner:** Builder
  - **Output:** Instructor list/detail payload enriched with usage counts.
  - **Acceptance criteria:**
    - Each instructor includes `courseCount` and `sessionCount` (workspace-scoped).
    - Response remains backward compatible for existing consumers.
    - Query cost remains acceptable for normal workspace sizes.

- [ ] **T4 — Safer delete preflight + confirmation UX**
  - **Owner:** Builder
  - **Output:** Pre-delete impact check and updated delete modal in instructors page.
  - **Acceptance criteria:**
    - Delete modal shows real linked-course/session counts for selected instructor.
    - User confirms deletion with clear “assignments will be unassigned” wording.
    - Post-delete behavior still leaves courses/sessions intact with instructor cleared.

- [ ] **T5 — Instructor page operational uplift**
  - **Owner:** Builder
  - **Output:** Instructors table includes assignment visibility (and optional color if approved).
  - **Acceptance criteria:**
    - Directory shows at least name, contact, linked courses, linked sessions.
    - Search/filter remains functional.
    - Mobile and desktop layouts remain usable.

- [ ] **T6 — Verification + release gate for Batch 4 only**
  - **Owner:** Verifier
  - **Output:** Build and focused QA evidence for instructor surfaces + dependent assignment flows.
  - **Acceptance criteria:**
    - `npm run build` passes.
    - Instructor CRUD + duplicate guards + delete impact verified.
    - Course session assignment still works with instructors.

## 9) Acceptance Checklist (Batch 4 done when all true)
- [ ] AC1: Duplicate instructor creation/update is safely blocked per approved policy.
- [ ] AC2: Instructor list shows real usage counts per instructor.
- [ ] AC3: Delete flow shows pre-delete impact and remains safe/explicit.
- [ ] AC4: Instructor page UX is improved for operational use without non-instructor scope creep.
- [ ] AC5: No auth/PWA/runtime/install changes were introduced.
- [ ] AC6: Build passes and production behavior remains stable.

## 10) Risks / Open Questions (must resolve before implementation)
1. **Name duplicate policy:** should identical normalized names be blocked, warned, or allowed? (important for legitimate same-name instructors)
2. **Conflict count in Batch 4:** include instructor conflict metric now, or defer to avoid heavier query/logic coupling?
3. **Color field exposure:** should instructor color be included in Batch 4 UI, or defer to avoid visual-scope expansion?
4. **Delete preflight contract shape:** new dedicated endpoint vs list payload with counts only — choose the simpler safe path.

## 11) Worker Constraint Reminder
Implement only what is in this approved Batch 4 spec; flag gaps instead of inventing scope.
