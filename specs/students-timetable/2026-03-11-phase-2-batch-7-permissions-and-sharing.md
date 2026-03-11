# Students Timetable — Phase 2 Batch 7 Spec: Permissions and Sharing

- Date: 2026-03-11
- Status: Draft (planning only; no implementation in this run)
- Scope lock: Batch 7 only (permissions + sharing)
- Baseline before Batch 7: `852eb558632afe085f7c63ee647c71e98df522f1`

## 1) Git status (inspected first)
- Command: `git status --short --branch`
- Result at planning time:
  - `## master...origin/master`
  - `?? specs/students-timetable/2026-03-11-phase-2-batch-7-permissions-and-sharing.md`
- Interpretation: branch is tracking origin/master and this spec file is currently untracked.

## 2) Current baseline findings (relevant to Batch 7)

### 2.1 Auth/workspace/member model
- `src/lib/workspace-v1.ts`
  - `requireSession()` enforces authenticated API access.
  - `getMembershipRole()` resolves workspace owner as `OWNER`; otherwise reads `workspaceMember.role`.
  - `requireWorkspaceRole()` already gives server-side role gating by workspace.
- `prisma/schema.prisma`
  - Current workspace role enum: `OWNER | TEACHER | STUDENT | VIEWER`.
  - Workspace collaboration models exist: `Workspace`, `WorkspaceMember`, `WorkspaceShareLink`.

### 2.2 Permission-related APIs (server-side today)
- Read/list across surfaces generally allow: `OWNER|TEACHER|STUDENT|VIEWER`.
- Writes (create/update/delete) for courses/groups/rooms/instructors and imports are generally restricted to: `OWNER|TEACHER`.
- Workspace update/delete: owner-only (`/api/v1/workspaces/[id]`).
- **Gap:** no active member-management API for workspace members (add by email, role change, remove) under `/api/v1/workspaces/[id]/members`.

### 2.3 Sharing state today
- Legacy timetable share routes are disabled (`/api/share*` return 410).
- `WorkspaceShareLink` exists in DB but no active first-class UI/API flow for practical member sharing in live workspace experience.

### 2.4 UI/routes behavior today
- Active routed workspace pages are:
  - `/workspace/dashboard`
  - `/workspace/timetable`
  - `/workspace/courses`
  - `/workspace/groups`
  - `/workspace/rooms`
  - `/workspace/instructors`
- These pages do not consistently expose role context or role-aware disabled/hide behavior; they primarily rely on backend denial on forbidden writes.
- Sidebar has no collaboration/member-management destination.

### 2.5 Saved views ownership behavior (current truth)
- `SavedView` model is user-owned (`userId` + `workspaceId` + `surface` + `name` unique).
- `/api/v1/saved-views` returns only current user’s views.
- `/api/v1/saved-views/[id]` patch/delete works only for saved views owned by current user in workspace.
- This is personal-per-user behavior, not shared workspace views.

## 3) Batch 7 decisions (safe subset)

### 3.1 Product role model for Batch 7
Adopt product-facing role vocabulary:
- Owner
- Editor
- Viewer

Safe mapping from current enum:
- `OWNER` -> Owner
- `TEACHER` -> Editor
- `VIEWER` -> Viewer
- `STUDENT` -> Viewer-equivalent for Batch 7 permissions (non-escalating mapping)

Rationale: minimal schema risk and no accidental privilege escalation.

### 3.2 Sharing/member-management model for Batch 7
Implement safest practical first version:
- Existing-user add/share by email (must already have account)
- Role assignment (Editor/Viewer; owner assignment not via simple add)
- Member list management (list/update/remove)
- No complex invite-token flow in Batch 7 unless trivially already implemented (it is not in active product routes)

### 3.3 Saved views rule for Batch 7
Keep saved views personal per user:
- Owner/Editor/Viewer can create personal saved views.
- Only creator can update/delete own saved views.
- No workspace-shared saved views in Batch 7.

## 4) Batch 7 permission matrix

| Surface | Owner | Editor | Viewer |
|---|---|---|---|
| Courses | CRUD | CRUD | Read-only |
| Timetable/session edits | CRUD | CRUD | Read-only |
| Groups | CRUD | CRUD | Read-only |
| Rooms | CRUD | CRUD | Read-only |
| Instructors | CRUD | CRUD | Read-only |
| Imports (courses/groups/rooms/instructors) | Allow | Allow | Block |
| Saved views (personal) | Own CRUD | Own CRUD | Own CRUD |
| Dashboard write shortcuts | Allow | Allow | Block |
| Member management/sharing | Allow | Block | Block |
| Workspace settings/delete | Allow | Block | Block |

## 5) Implementation order (must match execution plan)
1. Inspect current workspace/member/auth model
2. Define safest role + sharing model
3. Implement server-side permission guards
4. Implement role-aware UI behavior
5. Implement member management / sharing surface
6. Wire restrictions across product surfaces
7. Build
8. Verify desktop
9. Verify mobile where relevant
10. Verify production stability
11. Commit
12. Push
13. Report with exact commit hash

## 6) Concrete task checklist (owner + acceptance criteria)

- [ ] **T1 — Finalize role mapping and policy contract**
  - Owner: Planner
  - Acceptance criteria:
    - Owner/Editor/Viewer policy finalized in code-facing doc.
    - `STUDENT` mapped safely to Viewer-equivalent behavior for Batch 7.
    - No scope beyond permissions/sharing.

- [ ] **T2 — Central server permission guard layer**
  - Owner: Builder
  - Acceptance criteria:
    - Shared permission helper(s) used across courses/timetable/groups/rooms/instructors/imports/workspace/member APIs.
    - Forbidden writes return 403 consistently.
    - No surface depends on UI-only protection.

- [ ] **T3 — Member management API (existing-user share by email)**
  - Owner: Builder
  - Acceptance criteria:
    - Owner can list members.
    - Owner can add existing registered user by email with Editor/Viewer role.
    - Owner can change non-owner member role and remove non-owner member.
    - Editors/Viewers cannot access mutating member-management actions.
    - Duplicate member and unknown-email handling is explicit and safe.

- [ ] **T4 — Role-aware UI behavior (intentional read-only UX)**
  - Owner: Builder
  - Acceptance criteria:
    - Current role is visible in workspace UI.
    - Viewer sees clear read-only state and unavailable actions are hidden/disabled with explanation.
    - Editor sees operational UI without owner-only management actions.
    - Desktop and mobile interaction patterns remain usable.

- [ ] **T5 — Permission wiring across required product surfaces**
  - Owner: Builder
  - Acceptance criteria:
    - Courses, Timetable, Groups, Rooms, Instructors, Imports, Dashboard actions respect matrix.
    - Viewer blocked from all write/import operations in API and UI.
    - Saved view ownership semantics remain personal and consistent.

- [ ] **T6 — Verification + release discipline for Batch 7**
  - Owner: Verifier
  - Acceptance criteria:
    - Verification covers all required checks:
      1) owner/admin full management surface,
      2) editor allowed data operations,
      3) viewer blocked writes,
      4) blocked actions enforced server-side,
      5) read-only UI clear,
      6) sharing/member flow works,
      7) roles display correctly,
      8) imports blocked for restricted role,
      9) saved-view ownership behavior correct,
      10) mobile acceptable,
      11) desktop good,
      12) build passes,
      13) production stable.
    - Build passes before any restart.
    - Restart only after successful build.
    - Commit + push complete, GitHub and VPS synced.
    - Final report includes exact commit hash.

## 7) Relevant files/surfaces inspected
- Schema/auth/permission core:
  - `prisma/schema.prisma`
  - `src/lib/workspace-v1.ts`
  - `src/lib/permissions.ts` (legacy timetable role helper)
- Workspace + domain APIs:
  - `src/app/api/v1/workspaces/route.ts`
  - `src/app/api/v1/workspaces/[id]/route.ts`
  - `src/app/api/v1/courses/route.ts`
  - `src/app/api/v1/courses/[id]/route.ts`
  - `src/app/api/v1/groups/route.ts`
  - `src/app/api/v1/groups/[id]/route.ts`
  - `src/app/api/v1/rooms/route.ts`
  - `src/app/api/v1/rooms/[id]/route.ts`
  - `src/app/api/v1/instructors/route.ts`
  - `src/app/api/v1/instructors/[id]/route.ts`
  - `src/app/api/v1/import/courses/route.ts`
  - `src/app/api/v1/import/groups/route.ts`
  - `src/app/api/v1/import/rooms/route.ts`
  - `src/app/api/v1/import/instructors/route.ts`
  - `src/app/api/v1/saved-views/route.ts`
  - `src/app/api/v1/saved-views/[id]/route.ts`
- UI/routes:
  - `src/app/workspace/page.tsx`
  - `src/app/workspace/dashboard/page.tsx`
  - `src/app/workspace/timetable/page.tsx`
  - `src/app/workspace/courses/page.tsx`
  - `src/app/workspace/groups/page.tsx`
  - `src/app/workspace/rooms/page.tsx`
  - `src/app/workspace/instructors/page.tsx`
  - `src/components/layout/Sidebar.tsx`
- Legacy sharing/off-path references:
  - `src/app/api/share/route.ts`
  - `src/app/api/share/[token]/route.ts`
  - `src/app/workspace/WorkspacePageClient.tsx` (legacy/non-canonical for routed workspace)

## 8) Risks / open questions (Batch 7 only)
1. Whether to physically rename DB enum values now (`TEACHER/STUDENT` -> `EDITOR/VIEWER`) or keep DB enum and map in app. **Recommended for Batch 7:** keep enum, map in app to minimize migration risk.
2. Owner transfer semantics are high-risk (escalation/lockout potential). **Recommended for Batch 7:** no silent transfer; if needed, explicit guarded flow only, otherwise defer.
3. Existing-user-only sharing means no invite for non-registered emails. This is an intentional safety limitation for Batch 7.
4. Need consistent role-aware UX across multiple independent pages; shared role context/hook is preferred to avoid drift.
5. Clarify whether any dashboard quick action currently performs writes directly and must be role-gated explicitly in UI.
