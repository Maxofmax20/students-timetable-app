# TEST-CHECKLIST.md

## Critical flows
- [ ] Auth sign in
- [ ] Auth sign up
- [ ] Forgot/reset password
- [ ] Dashboard loads for authenticated user
- [ ] Timetable loads and existing filters still work
- [ ] Course CRUD still works
- [ ] Exam CRUD works (create/list/edit/delete UI + API implemented)
- [ ] Task CRUD works (create/list/status-update/delete implemented; full edit pass pending)
- [ ] Settings/preferences load and save
- [ ] Mobile navigation works
- [ ] Dark/light mode behavior validated
- [ ] Validation and empty/error states checked

## Regression watchpoints
- [ ] Workspace access gating still enforced
- [ ] Existing course/session data still renders in timetable/dashboard
- [ ] Legacy auth onboarding not broken by planning-domain additions
- [ ] No accidental dependency on risky runtime/PWA features

## Execution notes (2026-03-18)
- Build/type command execution from this session is currently blocked by command allowlist (`exec denied: allowlist miss`).
- Manual static verification completed for updated imports/types in Exams, Tasks, Settings, Providers, and planning API routes.
