# Students Timetable — Phase 2 Batch 8 Spec: Audit and Revisions

- Date: 2026-03-11
- Status: Draft (planning only; no implementation in this run)
- Scope lock: Batch 8 only (audit + revisions)
- Baseline before Batch 8: `f66ba0c607de36e2d8fdf9e4f286e658ad6e84e5`

## 1) Git status (inspected first)
- Command: `git status --short --branch`
- Result at planning time:
  - `## master...origin/master`
- Interpretation: clean working tree, branch tracking origin/master.

## 2) Current baseline findings relevant to Batch 8

### 2.1 Existing revision/history support (real state)
- `AuditLog` currently exists in schema but is tied to legacy `Timetable` (`userId`, `timetableId`, `action`, `payload`, `createdAt`).
- Current active use of `AuditLog` is only for builder snapshot save (`BUILDER_SNAPSHOT_SAVE`) in legacy timetable endpoints:
  - `src/app/api/builder/snapshot/route.ts`
  - `src/app/api/workspace/all-data/route.ts`
- Workspace v1 domain APIs (courses/groups/rooms/instructors/imports/sharing) currently do **not** write audit entries.
- `WorkspaceRevision` model exists (`workspaceId`, `createdById`, `label`, `snapshot`, `createdAt`) but has no active API/UI usage in workspace routes.

### 2.2 Mutation surfaces to cover (high-value)
- Courses:
  - create: `src/app/api/v1/courses/route.ts` (POST)
  - update/delete: `src/app/api/v1/courses/[id]/route.ts` (PATCH/DELETE)
  - session mutations happen via course create/update flows (sessionEntry create/delete+create)
- Groups:
  - create: `src/app/api/v1/groups/route.ts` (POST)
  - update/delete/hierarchy change: `src/app/api/v1/groups/[id]/route.ts` (PATCH/DELETE)
- Rooms:
  - create: `src/app/api/v1/rooms/route.ts` (POST)
  - update/delete: `src/app/api/v1/rooms/[id]/route.ts` (PATCH/DELETE)
- Instructors:
  - create: `src/app/api/v1/instructors/route.ts` (POST)
  - update/delete: `src/app/api/v1/instructors/[id]/route.ts` (PATCH/DELETE)
- Imports:
  - courses/groups/rooms/instructors import endpoints under `src/app/api/v1/import/*/route.ts`
  - preview/import mode already returns summaries but nothing persisted as workspace audit history
- Sharing/permissions:
  - member add/list: `src/app/api/v1/workspaces/[id]/members/route.ts`
  - member role update/remove: `src/app/api/v1/workspaces/[id]/members/[memberId]/route.ts`

### 2.3 Permission surfaces (Batch 7 baseline to preserve)
- Permission helpers:
  - `src/lib/workspace-v1.ts` (`requireWorkspaceRole`)
  - `src/lib/workspace-access.ts` (Owner/Editor/Viewer behavior mapping)
- Existing write gates: Owner/Teacher (product Owner/Editor)
- Existing owner-only sharing/member management: owner access helper already enforced in member routes
- Batch 8 must align with this baseline; no permission redesign.

### 2.4 UI surfaces available for history visibility
- Sidebar currently lacks a history destination:
  - `src/components/layout/Sidebar.tsx`
- Good safe target surfaces:
  - New workspace page `/workspace/history` for global audit timeline
  - Optional entity-level drill-down action from list/detail pages if low risk

## 3) Batch 8 design decision: strongest safe subset

### 3.1 Data model (minimal, explicit)
Add a dedicated workspace audit table instead of overloading legacy `AuditLog`:
- Proposed model: `WorkspaceAuditEntry`
- Fields (safe minimum):
  - `id`
  - `workspaceId`
  - `actorUserId` (nullable for system actions)
  - `entityType` (COURSE/GROUP/ROOM/INSTRUCTOR/IMPORT/MEMBERSHIP)
  - `entityId` (nullable for import batch-level events)
  - `actionType` (CREATE/UPDATE/DELETE/IMPORT_APPLIED/MEMBER_ADDED/MEMBER_ROLE_CHANGED/MEMBER_REMOVED/etc.)
  - `summary` (short non-technical text)
  - `beforeJson` (nullable, minimal selected fields only)
  - `afterJson` (nullable, minimal selected fields only)
  - `metadataJson` (counts, import mode, affected IDs count, etc.)
  - `createdAt`
- Indexes: `(workspaceId, createdAt desc)`, `(workspaceId, entityType, entityId, createdAt desc)`

Keep `WorkspaceRevision` and use it for narrow restore-capable snapshots only (see 3.3).

### 3.2 Audit capture policy
- Capture audit entries for:
  1) Courses CRUD + session changes summary
  2) Groups CRUD + parent/hierarchy change
  3) Rooms CRUD
  4) Instructors CRUD
  5) Imports applied (not preview) with summary counts + mode + actor
  6) Sharing/member add/remove/role change
- Saved views: exclude from Batch 8 first version (low operational value, high noise risk).
- Payload minimization:
  - only include safe functional fields (codes, names, status, day/time/session counts, role changes)
  - never include secrets/tokens/password hashes/OTP/auth payloads.

### 3.3 Revision/restore model (limited, honest, safe)
- Primary deliverable is strong audit visibility.
- Limited restore in Batch 8 only for narrow, explicit subset:
  - `COURSE_DELETE` -> restore deleted course with its deleted sessions snapshot
  - `GROUP_DELETE` -> restore only if no conflicting code and parent still valid
  - `ROOM_DELETE` and `INSTRUCTOR_DELETE` -> restore if unique constraints still allow
- No broad “restore entire workspace” and no import-wide rollback in Batch 8.
- Each restore action must:
  - validate safety/conflict preconditions
  - return explicit failure reason if not restorable
  - create new audit entry (`RESTORE_SUCCESS`/`RESTORE_FAILED_ATTEMPT` as appropriate)
- If safe restore implementation becomes risky, ship without restore UI and keep audit-only with explicit limitation.

### 3.4 UX plan
- Add `/workspace/history` page with:
  - reverse-chronological timeline
  - filter chips: entity type + action + actor + date range (basic)
  - human-readable summary + timestamp + actor name/email
  - expandable details for before/after diff summary (not raw JSON dump by default)
- Entity-level entry point:
  - link from row actions (courses/groups/rooms/instructors) to pre-filtered history view.
- Mobile-safe requirements:
  - compact cards, no dense tables as primary surface
  - filter drawer/sheet behavior on small screens.

### 3.5 Permission behavior for history/revisions (Batch 7 aligned)
- Owner: full history visibility + restore actions where supported.
- Editor: history visibility for operational entities (courses/groups/rooms/instructors/import summaries), no restore.
- Viewer: no history access in Batch 8 first version (recommended to avoid accidental data exposure/noise).
- Member management audit entries visible according to above matrix; no inconsistent rule exceptions.

## 4) Implementation order (must be followed)
1. inspect current revision/history-related support
2. define the safest audit + revision model
3. implement audit logging for the strongest safe mutation set
4. implement history UI / visibility
5. implement limited restore/revert only if safely possible
6. wire permission behavior
7. build
8. verify desktop
9. verify mobile where relevant
10. verify production stability
11. commit
12. push
13. report

## 5) Concrete task checklist (owner + acceptance criteria)

- [ ] **T1 — Finalize Batch 8 audit/revision contract**
  - Owner: Planner
  - Acceptance criteria:
    - Scope explicitly limited to Batch 8 audit + revisions.
    - Event coverage list frozen (courses/groups/rooms/instructors/imports/membership).
    - Restore subset explicitly limited and honest.

- [ ] **T2 — Add minimal workspace audit schema + migration**
  - Owner: Builder
  - Acceptance criteria:
    - New workspace audit model exists with required fields and indexes.
    - Migration is minimal and does not alter auth/permission architecture.
    - No sensitive auth fields stored in audit model.

- [ ] **T3 — Shared audit writer utility with payload redaction/minimization**
  - Owner: Builder
  - Acceptance criteria:
    - Reusable audit logging helper created for workspace mutations.
    - Helper enforces field allowlist and strips sensitive keys.
    - Audit writes are transaction-safe with mutation where feasible.

- [ ] **T4 — Wire audit logging for core entity mutations**
  - Owner: Builder
  - Acceptance criteria:
    - Course/group/room/instructor create/update/delete all emit audit entries.
    - Course session changes are summarized (added/removed/changed counts and key time/day deltas).
    - Actor attribution (`actorUserId`) is correct for all covered mutations.

- [ ] **T5 — Wire import and sharing/permission audit events**
  - Owner: Builder
  - Acceptance criteria:
    - Import preview does not write audit entries.
    - Import apply writes one concise summary entry per request with affected counts and mode.
    - Member added/removed/role-changed actions write audit entries with actor + target + role delta.

- [ ] **T6 — History API + workspace history UI**
  - Owner: Builder
  - Acceptance criteria:
    - New history API supports pagination + basic filters.
    - `/workspace/history` is discoverable from sidebar and renders timeline clearly.
    - Desktop and mobile layouts remain usable and non-noisy.

- [ ] **T7 — Limited safe restore (only if safety checks pass)**
  - Owner: Builder
  - Acceptance criteria:
    - Restore implemented only for explicitly approved delete events.
    - Restore checks uniqueness/foreign-key constraints before applying.
    - Success/failure path is explicit to user; no fake rollback claims.
    - Every restore action writes corresponding audit entry.

- [ ] **T8 — Permission wiring for history and restore**
  - Owner: Builder
  - Acceptance criteria:
    - Owner full history + restore (supported entities only).
    - Editor history-visible, restore-blocked.
    - Viewer history blocked in API and UI for Batch 8.
    - Behavior matches Batch 7 permissions consistently.

- [ ] **T9 — Verification and release discipline**
  - Owner: Verifier
  - Acceptance criteria:
    - Important actions create audit/history entries.
    - Actor attribution is correct.
    - History UI renders correctly.
    - Permission rules for history visibility are correct.
    - Restore/revert works correctly if implemented.
    - Import-related audit visibility works if included.
    - No obvious visual breakage.
    - Mobile behavior acceptable.
    - Desktop behavior good.
    - Build passes before restart.
    - Production remains stable after deployment.
    - GitHub and VPS synced.
    - Final report includes exact commit hash.

## 6) Risks / open questions (Batch 8 only)
1. Whether to reuse `WorkspaceRevision` vs add a dedicated `WorkspaceAuditEntry` table. Recommendation: add dedicated audit table; keep revisions for narrow restore snapshots.
2. Restore safety for hierarchy-dependent entities (groups) can be fragile when parent/context changed; may need “cannot restore due to conflicts” behavior.
3. Import rollback is intentionally out of scope for Batch 8 first version; only import summary audit visibility is in scope.
4. Viewer access to history is a product/privacy tradeoff; recommended default for Batch 8 is no viewer history to reduce exposure risk.
5. Existing legacy `AuditLog` (timetable/builder) and new workspace audit can coexist; avoid accidental coupling/misreporting across systems.
