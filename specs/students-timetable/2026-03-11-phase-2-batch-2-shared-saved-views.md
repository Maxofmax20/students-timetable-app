# Phase 2 Batch 2 — Shared/Persisted Saved Views (Courses + Timetable)

## Scope
Implement a safe first version of **real persisted saved views** for:
1. Courses page
2. Timetable page

Out of scope: Batch 3+, import upgrades, instructor upgrades, conflict engine expansion, reports/export, permissions/sharing, audit/revisions, auth/PWA/runtime/install changes.

## Current State (inspected)
- Courses has local-only saved views in `localStorage` (`workspace.courses.savedViews.v1`) with create/apply/delete.
- Timetable has no saved views.
- Both pages already maintain explicit UI state objects that can be serialized and restored.

## Persistence Model Decision
Use **database-persisted, user-scoped saved views** (not localStorage) as the safe first shared baseline.

Model:
- `SavedView`
  - `id`
  - `userId`
  - `workspaceId`
  - `surface` (`COURSES` | `TIMETABLE`)
  - `name`
  - `stateJson` (JSON payload of page state)
  - `createdAt`
  - `updatedAt`

Constraints:
- Unique per (`userId`, `workspaceId`, `surface`, `name`) to avoid duplicate names.
- Indexed by (`userId`, `workspaceId`, `surface`, `updatedAt`).
- No destructive migration.

## API Plan (minimal)
Add `/api/v1/saved-views` endpoints:
- `GET` list views for current user + resolved workspace + optional surface
- `POST` create view with name + surface + stateJson

Add `/api/v1/saved-views/[id]` endpoints:
- `PATCH` rename and/or update stateJson
- `DELETE` remove view

Rules:
- Require authenticated session.
- Resolve workspace via existing `getOrCreatePersonalWorkspace` + optional `workspaceId` query/body.
- Enforce ownership by filtering on `id + userId + workspaceId`.
- Keep validation strict with zod.

## UI Plan
### Courses
- Replace localStorage saved views with API-backed saved views.
- Preserve UX: save current view (named), list, apply, delete.
- Add low-risk rename capability inline.
- Show clear current applied saved view badge/state.
- Reset filters should also clear selected applied view marker.

### Timetable
- Add saved views section in controls card.
- Save named view for: selectedTypes, selectedGroupId, deliveryFilter, showConflictLayer.
- List/apply/delete (+rename if low-risk).
- Show current applied view marker.
- Reset view clears current applied marker.

## Task Breakdown
1. **Data model + migration**
   - Add `SavedView` model and `SavedViewSurface` enum.
   - Generate migration (non-destructive).
   - Acceptance: prisma client compiles; migration SQL adds only new enum/table/indexes/constraints.

2. **Saved views API**
   - Implement list/create/update/delete routes.
   - Acceptance: endpoints return `{ok:true}` payloads and enforce user/workspace scoping.

3. **Courses wiring**
   - Remove localStorage dependency.
   - Load and operate saved views via API.
   - Add rename support.
   - Acceptance: create/apply/delete/rename works and survives reload.

4. **Timetable wiring**
   - Add saved views state + API integration.
   - Add save/apply/delete/rename controls.
   - Acceptance: create/apply/delete/rename works and survives reload.

5. **Verification and release**
   - Build passes.
   - Desktop + mobile verification (local + live).
   - Restart service only after successful build.
   - Commit + push.

## Acceptance Criteria
- Persisted DB saved views exist and are user-scoped by workspace and surface.
- Courses: create/apply/delete (+rename implemented) works and persists across reload/session.
- Timetable: create/apply/delete (+rename implemented) works and persists across reload/session.
- No auth/PWA/import/instructor/conflict-engine/reporting scope creep.
- Production remains stable after restart.
