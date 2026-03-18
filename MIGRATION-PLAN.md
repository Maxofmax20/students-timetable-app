# MIGRATION-PLAN.md — V1 → V2

## Strategy
Use a **progressive in-place migration** rather than a destructive rewrite. Preserve stable timetable/course/session capabilities, add the missing planning domain, then shift the default UX toward student workflow.

## Phase plan
1. **Audit + docs**
   - Capture current architecture and V2 target decisions.
2. **Backend foundation**
   - Add `AcademicTerm`, `Exam`, `Assignment`, `UserPreference`.
   - Keep legacy tables intact for now.
3. **Frontend IA shift**
   - Navigation becomes: Dashboard, Timetable, Courses, Exams, Tasks, Settings.
   - Resource pages remain accessible but no longer define the core product identity.
4. **Dashboard rebuild**
   - Make daily student workflow the default landing value.
5. **Incremental module rollout**
   - Exams, Tasks, Settings pages + APIs.
   - Later: course details, term switching, quick add, richer mobile agenda.
6. **Legacy cleanup**
   - Remove or isolate timetable-era compatibility logic only after production validation.

## Data migration principles
- Do not remove `Workspace`, `Course`, `SessionEntry`, `AcademicGroup`, `Instructor`, `Room`.
- Add planning entities scoped to `workspaceId` and `userId` where appropriate.
- Introduce active-term semantics so dashboard and planning views can operate with minimal ambiguity.
- Keep registration/auth stable; do not break current user onboarding while domain expansion is in progress.

## Risk management
- Avoid PWA/runtime/install work.
- Avoid deleting legacy tables in the same change that introduces V2 planning entities.
- Keep API response envelopes consistent (`{ ok, data, message }`).
- Prefer additive schema changes first, cleanup second.

## Execution order
1. Schema + types
2. APIs
3. Nav/app shell
4. Dashboard
5. Exams/Tasks/Settings pages
6. Verification checklist
