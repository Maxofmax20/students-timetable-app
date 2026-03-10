# Spec: Auth UI + OTP interaction bugfix pass

- **Spec ID:** students-timetable-2026-03-10-auth-ui-otp-bugfix
- **Project:** students-timetable
- **Status:** Done
- **Owner:** dev:main
- **Created:** 2026-03-10
- **Last Updated:** 2026-03-10

## 1) Problem Statement
The live auth page still has three concrete UX/interaction defects: field icons overlap placeholder/typed text on mobile, OTP paste only fills one box instead of distributing across the 6-digit split input, and password fields do not offer a reveal/hide toggle while typing.

## 2) Goals
- Fix auth input icon/text overlap consistently across auth fields on desktop and mobile.
- Fix OTP paste so full and partial pastes distribute correctly across split boxes without breaking manual typing or backspace.
- Add a clean password visibility toggle for auth password fields without regressing layout.

## 3) Non-Goals
- No redesign of unrelated pages or broad auth page restyling.
- No PWA/runtime/install changes.
- No backend auth/security redesign unless minimally required for OTP paste wiring.

## 4) Scope
### In Scope
- `src/components/ui/Input.tsx`
- `src/app/auth/page.tsx`
- Targeted auth-only layout/interaction fixes for icon spacing, OTP split input behavior, and password visibility toggle.

### Out of Scope
- Other pages/components outside auth unless a shared input change is required by auth.
- Backend route behavior beyond existing auth UI wiring.

## 5) Constraints & Assumptions
- Tech constraints: production must remain stable; build must pass; runtime remains `students-timetable.service`.
- Time/resource constraints: focused single-pass bugfix only.
- Assumptions: pre-existing unrelated repo changes (`package-lock.json`, `check.cjs`, `get_users.js`) must remain untouched.

## 6) Deliverables
- Minimal code patch for the auth input spacing, OTP paste distribution, and password visibility toggle.
- Verification on live desktop and mobile auth flows.
- One clean bugfix commit pushed to GitHub.

## 7) Acceptance Criteria
- [ ] AC1: Auth field icons no longer overlap placeholder or typed text on login/register/forgot/reset on desktop and mobile.
- [ ] AC2: Pasting a full 6-digit OTP fills all 6 boxes; partial paste fills sequentially from active box; non-digits are ignored.
- [ ] AC3: Manual OTP typing, auto-advance, and backspace still work.
- [ ] AC4: Password reveal/hide toggle works in login, register, and reset password fields without layout regressions.
- [ ] AC5: Production build passes, service restarts cleanly, and live desktop/mobile smoke checks pass.

## 8) Implementation Plan (Task Breakdown)
- [ ] T1 — Fix shared auth input spacing + add password visibility toggle
  - **Owner:** builder worker
  - **Output:** targeted changes in `src/components/ui/Input.tsx` and auth usages as needed
  - **Acceptance Check:** auth inputs render without icon overlap; password eye toggle works on relevant forms
- [ ] T2 — Fix OTP split input paste distribution behavior
  - **Owner:** builder worker
  - **Output:** targeted changes in `src/app/auth/page.tsx`
  - **Acceptance Check:** full/partial paste distributes correctly; manual typing/backspace still work
- [ ] T3 — Verify, build, deploy, and report
  - **Owner:** dev:main
  - **Output:** build/restart/live verification + git commit/push
  - **Acceptance Check:** AC1-AC5 satisfied on live desktop/mobile

## 9) Worker Delegation Notes
- Approved spec path: `specs/students-timetable/2026-03-10-auth-ui-otp-bugfix.md`
- Workers must implement only approved scope.
- Any scope change requires spec update + approval before coding.
- Implement only what is in the approved spec; flag gaps instead of inventing scope.

## 10) Verification & Report
- Build/test commands: `npm run build`
- Verification results:
  - Production build passed.
  - `students-timetable.service` restarted cleanly.
  - Live desktop and mobile auth smoke checks passed for input spacing, OTP typing/paste/backspace, and password visibility toggle.
- Remaining risks/follow-ups: no known blocker; keep future auth field changes aligned with the shared `Input` spacing/toggle behavior.
