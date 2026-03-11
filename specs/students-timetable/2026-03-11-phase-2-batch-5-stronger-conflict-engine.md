# Students Timetable — Phase 2 Batch 5: Stronger Conflict Engine (Spec)

- **Date:** 2026-03-11
- **Status:** Draft for approval (planning only)
- **Scope Lock:** Phase 2 / Batch 5 only — stronger conflict engine
- **Repository:** `/home/ubuntu/.openclaw/workspace/students-timetable-app`
- **Baseline Before Batch 5:** Batch 4 accepted on commit `6b6d5b96d6172575b654d4e71bbaaa759898be2e`

## 1) Batch 5 Goal
Strengthen timetable conflict detection so overlap-aware collisions are detected consistently (not only exact same time windows), and expose the stronger results in existing conflict surfaces (timetable + dashboard + conflict scan) without touching auth/PWA/runtime/install or unrelated product areas.

## 2) Current Baseline (inspected)

### 2.1 Existing conflict logic (helpers)
- `src/lib/schedule.ts`
  - `buildScheduleConflicts(items)` currently buckets by exact key:
    - `kind + day + startMinute + endMinute + resource`
  - Detects room/instructor conflicts only when start and end are both identical.
  - **Gap:** misses partial overlaps (e.g., 10:00–11:00 vs 10:30–11:30).

### 2.2 Existing conflict logic (timetable page)
- `src/app/workspace/timetable/page.tsx`
  - `computeConflictMap(items)` uses pairwise overlap rule:
    - `left.startMinute < right.endMinute && right.startMinute < left.endMinute`
  - Detects **group + room + instructor** clashes using IDs.
  - **Strength:** already catches partial overlaps.
  - **Gap:** logic is page-local and diverges from shared helper behavior.

### 2.3 Existing conflict logic (legacy workspace page)
- `src/app/workspace/WorkspacePageClient.tsx`
  - `scanConflicts(rows)` keys by `day + exact time string + room/instructor`.
  - Marks row `status = "Conflict"` only for exact-window duplicates.
  - **Gap:** exact-time only and string-key based.

### 2.4 Conflict-related UI/API surfaces
- `src/app/workspace/dashboard/page.tsx`
  - Uses `buildScheduleConflicts(scheduleItems)` for quality/conflict count and scan toast.
- `src/app/workspace/timetable/page.tsx`
  - Shows per-session `conflictTypes`/`conflictCount` from local overlap detector.
- `src/components/workspace/TimetableView.tsx`
  - Renders conflict badges/layer from computed conflict metadata.
- `src/components/workspace/SettingsView.tsx`
  - Conflict policy UI exists (`WARNING | STRICT | OFF`), but enforcement is not centralized in a conflict engine.
- `src/app/api/v1/workspaces/[id]/route.ts`, `src/app/api/v1/workspaces/route.ts`
  - Persist/load `conflictMode` setting.

### 2.5 Data model surfaces relevant to conflict engine
- `prisma/schema.prisma`
  - `SessionEntry`: `workspaceId`, `courseId`, `groupId?`, `instructorId?`, `roomId?`, `day`, `startMinute`, `endMinute`, `type`.
  - Existing indexes:
    - `@@index([workspaceId, day, startMinute])`
    - `@@index([workspaceId, roomId, day, startMinute])`
    - `@@index([workspaceId, instructorId, day, startMinute])`
  - No DB-level overlap constraints (application-layer conflict detection is required).

## 3) In Scope (strict)
1. Define and implement one shared overlap-aware conflict engine contract for schedule/session data.
2. Unify dashboard conflict counts and timetable conflict reporting on the shared engine.
3. Include group collisions in engine outputs where the consumer needs them (timetable), while keeping dashboard metrics stable and explicit.
4. Add deterministic tests for overlap semantics and edge boundaries.

## 4) Out of Scope (strict)
- Auth flows, OTP, login/register, session management.
- PWA/runtime/install/service worker/deployment scripts.
- Import conflict semantics (`src/app/api/v1/import/**`).
- Batch 6+ features, reporting, permissions, revisions, sharing changes.
- Broad UI redesign unrelated to conflict clarity.
- DB schema migration unless absolutely required (not expected for Batch 5).

## 5) Functional Requirements (Batch 5)
- **FR-01:** Conflict detection MUST treat overlaps as interval intersections on same day/resource (not only exact start/end matches).
- **FR-02:** Overlap rule MUST be consistent everywhere conflict counts are shown in Phase 2 surfaces.
- **FR-03:** Conflict detection MUST support at least `room`, `instructor`, and `group` conflict dimensions.
- **FR-04:** Adjacent sessions where `endMinute === next.startMinute` MUST NOT be treated as conflict.
- **FR-05:** Consumers MUST be able to request conflict summaries suitable for:
  - dashboard count summaries,
  - timetable per-session badges/types.
- **FR-06:** Existing workspace conflict policy values (`WARNING|STRICT|OFF`) MUST remain backward-compatible; Batch 5 focuses on stronger detection, not full strict-write enforcement.

## 6) Proposed Technical Direction (strongest safe subset)
1. Extract/upgrade shared helper(s) in `src/lib/schedule.ts` to become canonical overlap engine.
2. Keep canonical output typed and deterministic (sorted, stable keys).
3. Refactor `dashboard/page.tsx` and `timetable/page.tsx` to consume shared engine instead of mixed local logic.
4. Decide treatment of `WorkspacePageClient.tsx` (legacy surface):
   - either align to shared engine now (preferred if low-risk),
   - or explicitly mark deferred with a known-gap note if touching it risks Batch 5 scope.
5. Preserve current UI semantics (badges/toasts), only changing the underlying conflict truth to overlap-aware.

## 7) Edge Cases to lock in
- Partial overlap (A starts inside B).
- Full containment (A fully wraps B).
- Exact match windows.
- Boundary-touch only (no overlap).
- Missing resource IDs (room/instructor/group absent) should not produce false positives for that dimension.
- Cross-day sessions are out of model scope (current model is single-day session rows).

## 8) Concrete Task Checklist (owner + acceptance criteria)

- [ ] **T1 — Conflict contract freeze (design doc + test matrix)**
  - **Owner:** Planner/Verifier
  - **Acceptance criteria:**
    - Shared overlap formula and per-dimension rules documented.
    - Expected outputs defined for dashboard and timetable consumers.
    - Edge-case matrix approved (including boundary-touch behavior).

- [ ] **T2 — Shared engine implementation in `src/lib/schedule.ts`**
  - **Owner:** Builder
  - **Acceptance criteria:**
    - Shared helper returns overlap-aware conflict results for room/instructor/group.
    - Stable deterministic ordering and keys are documented and covered by tests.
    - Existing exports used by non-conflict features remain backward compatible or safely migrated.

- [ ] **T3 — Dashboard integration migration**
  - **Owner:** Builder
  - **Acceptance criteria:**
    - `src/app/workspace/dashboard/page.tsx` conflict counts/scan use shared overlap-aware engine.
    - Dashboard conflict count increases only where genuine overlaps exist (no regression on non-overlaps).

- [ ] **T4 — Timetable integration migration**
  - **Owner:** Builder
  - **Acceptance criteria:**
    - `src/app/workspace/timetable/page.tsx` no longer relies on divergent local conflict logic.
    - Per-session conflict badges/types still render correctly with shared engine outputs.
    - Group/room/instructor conflict labels remain clear and accurate.

- [ ] **T5 — Legacy workspace conflict handling decision**
  - **Owner:** Planner + Builder
  - **Acceptance criteria:**
    - `WorkspacePageClient.tsx` either:
      - migrated to shared overlap engine, **or**
      - explicitly deferred with rationale and tracked follow-up note.
    - No silent semantic mismatch left undocumented.

- [ ] **T6 — Verification gate (Batch 5 only)**
  - **Owner:** Verifier
  - **Acceptance criteria:**
    - Automated coverage exists for overlap edge cases.
    - Manual check confirms dashboard and timetable report consistent conflict truth.
    - `npm run build` passes.
    - No auth/PWA/runtime/install files changed.

## 9) Acceptance Checklist (Batch 5 done when all true)
- [ ] AC1: Partial overlaps are detected for room/instructor/group dimensions.
- [ ] AC2: Dashboard and timetable conflict counts are semantically aligned.
- [ ] AC3: Boundary-touch sessions (end==start) are not marked as conflicts.
- [ ] AC4: Deterministic tests cover key overlap cases.
- [ ] AC5: Scope stayed within conflict engine only (no auth/PWA/runtime/install expansion).

## 10) Risks / Open Questions
1. **Legacy surface ownership:** Is `WorkspacePageClient.tsx` still an active user surface in production for conflict scans, or mainly transitional?
2. **Conflict counting semantics:** For dashboard KPI, should we count conflict buckets, involved sessions, or both (currently bucket-like behavior exists in helper)?
3. **Group conflict in dashboard:** include now for parity, or keep dashboard at room+instructor only and document that intentionally?
4. **STRICT policy coupling:** Batch 5 does not enforce strict write-blocking yet; confirm this remains deferred to avoid scope creep.

## 11) Worker Constraint Reminder
Implement only what is in this approved Batch 5 spec; flag gaps instead of inventing scope.
