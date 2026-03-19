# TEST-CHECKLIST.md

## Critical flows
- [~] Auth sign in
  - Verified: not directly re-tested in this pass; auth/session guards remain on dashboard, timetable, courses, exams, tasks, and settings pages.
  - Status: deferred runtime QA; no auth code changed in this pass.
- [~] Auth sign up
  - Verified: not directly re-tested in this pass.
  - Status: deferred runtime QA; no signup flow changes in this pass.
- [~] Forgot/reset password
  - Verified: not directly re-tested in this pass.
  - Status: deferred runtime QA; no reset flow changes in this pass.
- [x] Dashboard loads for authenticated user
  - Verified: code path + build green.
  - Confirmed: dashboard fetches courses/terms/exams/assignments and deep-links into timetable, exams, tasks, and course hub.
- [x] Timetable loads and existing filters still work
  - Verified: build green + code QA on `/workspace/timetable` and `TimetableView`.
  - Confirmed: focus-day deep links (`?day=`), saved views, filter panels, export actions, and clash layer remain wired.
  - Fixed: timetable page now passes loading state into `TimetableView`.
  - Fixed: focused-day UI state now stays synchronized with the `?day=` URL param, and invalid `day` params are intentionally cleaned.
- [x] Course CRUD still works
  - Verified: build green + code QA on `/workspace/courses` create/edit/duplicate/delete handlers.
  - Confirmed: row View/Edit/Duplicate/Delete flows all resolve intentionally.
  - Fixed: `?create=1` is now cleaned from URL after opening create flow; invalid `?course=` is now cleaned with an explicit toast instead of silently failing.
- [x] Exam CRUD works
  - Verified: build green + code QA on create/list/edit/delete flow.
  - Confirmed: linked-course deep links filter the page and feed the create/edit form context.
  - Fixed: invalid `?course=` is now cleaned intentionally; form reset preserves linked-course context; changing the course filter now also updates quick-add course context when not editing.
- [x] Task CRUD works
  - Verified: build green + code QA on create/list/edit/status-update/delete flow.
  - Confirmed: linked-course deep links filter the board and feed the form context.
  - Fixed: deleting the currently edited task now resets the form; invalid `?course=` is now cleaned intentionally; form reset preserves linked-course context; changing the course filter now also updates quick-add course context when not editing.
- [x] Settings/preferences load and save
  - Verified: build green + code QA on preferences API wiring and client hydration.
  - Confirmed: theme + reduceMotion hydrate through `Providers`; week start and timetable view preferences affect timetable behavior.
- [~] Mobile navigation works
  - Verified: code-level sanity pass only.
  - Confirmed: timetable day focus, course hub side panel layout, and tasks/exams stacked layouts are mobile-oriented.
  - Status: browser-runtime visual QA deferred because interactive browser runtime was unavailable during this pass.
- [~] Dark/light mode behavior validated
  - Verified: code-level sanity pass only.
  - Confirmed: theme tokens, provider hydration, and settings save path are wired.
  - Status: visual runtime confirmation deferred because interactive browser runtime was unavailable during this pass.
- [x] Validation and empty/error states checked
  - Verified: build green + code QA.
  - Fixed: invalid course deep-link states for courses/exams/tasks now resolve intentionally instead of failing silently.
  - Confirmed: empty course hub, linked exams/tasks empties, focused timetable day empty state, and module error toasts are present.

## Regression watchpoints
- [x] Workspace access gating still enforced
  - Confirmed: viewer-mode checks remain in courses/timetable shared flows; write actions still gate on access.
- [x] Existing course/session data still renders in timetable/dashboard
  - Confirmed: dashboard and timetable still derive from course/session data via schedule helpers.
- [~] Legacy auth onboarding not broken by planning-domain additions
  - Verified: no new pass changes touched onboarding code.
  - Status: deferred end-to-end runtime auth QA.
- [x] No accidental dependency on risky runtime/PWA features
  - Confirmed: this pass stayed within app-router/UI/API/data flow work only.

## Execution notes (2026-03-19)
- `npm run build` passes after the QA/cohesion fixes in this pass.
- Shared `RowAction` support is aligned for `View / Edit / Duplicate / Delete`; `RowActionCenter` is updated but still intentionally not mounted anywhere in current `src/`.
- Browser-based interactive visual QA was limited in this pass because the browser runtime was unavailable; code/build QA and navigation/state regression fixes were completed anyway.
