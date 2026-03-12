# Students Timetable — Batch C Bulk Actions (Strict Scope)

Date: 2026-03-12  
Scope owner: Batch C planner (this spec)  
Baseline accepted before Batch C: `0b4621b14f8901670a1713369ca025c663b05405`

## 1) Batch C Goal (strict)
Deliver a **safe, high-value first version** of bulk operations for entity lists.

In scope (Batch C only):
- multi-select
- bulk delete (with explicit confirmation)
- bulk export
- bulk status update **only where clearly useful**

Primary targets:
- courses
- rooms
- groups
- instructors

Out of scope:
- Batch D+
- unrelated feature work
- PWA/runtime/install redesign
- non-bulk redesigns

---

## 2) Current implementation surfaces inspected

### A) List pages (current UI patterns)
- `src/app/workspace/courses/page.tsx`
  - Already has rich filters + filtered CSV export + row-level Edit/Duplicate/Delete.
  - Uses `CoursesView` / `DataTable` (no multi-select today).
- `src/app/workspace/rooms/page.tsx`
  - Card/section UI grouped by building, row-level edit/delete, and section delete.
- `src/app/workspace/groups/page.tsx`
  - Hierarchical section UI (main + subgroups), row-level edit/delete, and section delete.
- `src/app/workspace/instructors/page.tsx`
  - Table + mobile cards, assignment filter chips, row-level edit/delete.

### B) Shared table/view layer
- `src/components/workspace/CoursesView.tsx`
- `src/components/workspace/DataTable.tsx`
- `src/types/index.ts` (`RowAction` currently only `Edit | Duplicate | Delete`)

### C) APIs (current capability)
- Courses: `src/app/api/v1/courses/route.ts`, `src/app/api/v1/courses/[id]/route.ts`
- Rooms: `src/app/api/v1/rooms/route.ts`, `src/app/api/v1/rooms/[id]/route.ts`
- Groups: `src/app/api/v1/groups/route.ts`, `src/app/api/v1/groups/[id]/route.ts`
- Instructors: `src/app/api/v1/instructors/route.ts`, `src/app/api/v1/instructors/[id]/route.ts`

Observation: APIs are single-entity mutation endpoints today (no bulk endpoints yet), with workspace-role checks and audit logging already in place.

---

## 3) Strongest safe subset recommendation (Batch C v1)

Given current architecture and safety constraints, implement this subset first:

1. **Unified selection model + bulk action bar** on all 4 target pages.
2. **Bulk delete** on all 4 pages with explicit typed/checkbox confirmation and count preview.
3. **Bulk export CSV** on all 4 pages, exporting selected rows (or filtered set when none selected, if explicitly chosen).
4. **Bulk status update only for courses** (`ACTIVE` / `DRAFT`) because courses already expose status and status-driven filtering.

Not recommended in Batch C v1:
- Bulk status for rooms/groups/instructors (no strong existing status model; adds confusing semantics/risk).

---

## 4) UX and safety rules for Batch C

1. Destructive actions require explicit confirmation:
   - modal includes entity count + sample names/codes
   - explicit confirmation control (checkbox or typed phrase)
   - clear irreversible warning copy
2. Mobile usability:
   - selection affordance visible on cards
   - sticky bottom action bar on mobile
   - tap targets remain >= 40px
3. Count/state correctness:
   - selected count, filtered count, and total count must stay accurate after search/filter/pagination changes
   - after mutation: clear invalid selections and refresh list deterministically
4. Avoid destructive confusion:
   - disable destructive actions for viewers
   - disable bulk actions while requests in flight
   - show partial failure summary when some items fail

---

## 5) Proposed technical approach (Batch C only)

### A) API additions (bulk endpoints)
Create per-entity bulk endpoints under `/api/v1/*/bulk`:
- `POST /api/v1/courses/bulk`
- `POST /api/v1/rooms/bulk`
- `POST /api/v1/groups/bulk`
- `POST /api/v1/instructors/bulk`

Action payload model (tight):
- `{ action: 'delete', ids: string[] }` for all entities
- `{ action: 'status', ids: string[], status: 'ACTIVE' | 'DRAFT' }` for courses only

Requirements:
- workspace ownership/role validation identical to existing single-item endpoints
- transactional behavior where safe; otherwise return structured `successIds`/`failed` details
- audit entry per affected entity (preserve current audit integrity)

### B) Frontend selection system
- Add reusable selection hook/state pattern used by all four pages:
  - select row
  - select all visible
  - clear selection
  - preserve selection only for rows still present in filtered dataset
- Add bulk action toolbar component:
  - shows selected count
  - exposes allowed actions by surface and role

### C) Export behavior
- Selected export default:
  - if selection > 0: export selected only
  - if selection = 0: export current filtered set after explicit user choice
- Include predictable filenames with date and scope tag.

### D) Failure handling
- For partial failures, show:
  - total requested
  - succeeded
  - failed with first N reasons
- Do not silently drop failures.

---

## 6) Concrete task checklist (owner + acceptance criteria)

### T1 — Bulk action contract + endpoint scaffolding
**Owner:** Backend worker  
**Acceptance criteria:**
- Bulk endpoints added for courses/rooms/groups/instructors with strict zod schemas.
- Role/access checks match existing single-item behavior.
- Invalid IDs/workspace mismatches rejected safely.

### T2 — Bulk delete backend for all 4 entities
**Owner:** Backend worker  
**Acceptance criteria:**
- `action=delete` works for courses, rooms, groups, instructors.
- Returns deterministic result shape (`ok`, totals, failures).
- Audit logs created for every successfully deleted entity.

### T3 — Bulk status backend for courses only
**Owner:** Backend worker  
**Acceptance criteria:**
- `action=status` implemented only for courses.
- Allowed statuses limited to existing safe set (`ACTIVE`, `DRAFT`).
- Updated rows are reflected correctly in subsequent GET/list calls.

### T4 — Shared selection + bulk action UI primitives
**Owner:** Frontend worker  
**Acceptance criteria:**
- Reusable multi-select state integrated without breaking existing row actions.
- Desktop and mobile both support select individual + select visible + clear.
- Bulk action bar appears only when selection exists.

### T5 — Courses bulk UX wiring
**Owner:** Frontend worker  
**Acceptance criteria:**
- Courses page supports bulk delete, bulk export, bulk status update.
- Confirmation modal required before delete/status apply.
- Filter/search state and selected-count state remain correct after operations.

### T6 — Rooms/groups/instructors bulk UX wiring
**Owner:** Frontend worker  
**Acceptance criteria:**
- Each page supports bulk delete + bulk export (no status action).
- Existing section-level delete flows remain functional and not conflated with row multi-select.
- Viewer mode keeps bulk mutation actions disabled.

### T7 — QA + verification pass for Batch C
**Owner:** QA/Verifier worker  
**Acceptance criteria:**
- Mobile + desktop checks completed for all four surfaces.
- Explicit confirmation required for every destructive bulk path.
- Partial-failure handling validated (simulated conflict/failure cases).
- Final report clearly states shipped subset and deferred items.

---

## 7) Risks and open questions

1. **Group delete constraints:** groups with children can fail delete (`GROUP_HAS_CHILDREN`); bulk delete must surface per-item failures cleanly.
2. **Referential delete behavior:** room/instructor/group deletes can unassign linked session/course references; UX copy must state impact in bulk mode.
3. **Section delete vs row multi-select overlap:** avoid mixed mental model by clearly separating “section actions” and “selected rows actions”.
4. **Large selection performance:** selecting many rows should avoid O(n²) state churn and duplicate network calls.
5. **Export scope clarity:** must make it explicit whether export is selected rows or filtered rows to avoid accidental data omissions.

---

## 8) Definition of done (Batch C)
Batch C is complete when:
- Multi-select is available on courses, rooms, groups, instructors.
- Bulk delete is shipped on all 4 with explicit confirmation and safe feedback.
- Bulk export is shipped on all 4 with clear scope semantics.
- Bulk status update is shipped for courses only.
- Counts/UI state are correct on mobile and desktop.
- No scope creep beyond Batch C bulk actions.
