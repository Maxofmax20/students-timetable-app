# Spec: Preferences route fix + collapsible grouped sections

- **Spec ID:** students-timetable-2026-03-10-preferences-route-and-collapsible-grouped-sections
- **Project:** students-timetable
- **Status:** Done
- **Owner:** dev:main
- **Created:** 2026-03-10
- **Last Updated:** 2026-03-10

## 1) Problem Statement
Two narrow production issues remain: the profile dropdown "Preferences" item routes to the wrong destination, and the newly grouped Rooms/Groups pages need one-tap collapse/expand behavior without breaking search or CRUD flows.

## 2) Goals
- Fix the "Preferences" dropdown item so it opens the actual settings surface.
- Add clear, fast collapse/expand behavior to grouped Rooms and Groups sections.
- Preserve search, CRUD flows, mobile usability, desktop usability, and current architecture.

## 3) Non-Goals
- No PWA/runtime/install work.
- No schema changes.
- No redesign of unrelated pages.
- No reopening prior architecture migrations.

## 4) Scope
### In Scope
- `src/components/layout/Header.tsx`
- `src/app/workspace/groups/page.tsx`
- `src/app/workspace/rooms/page.tsx`
- small helper/spec updates as needed

### Out of Scope
- auth flows
- course/session architecture changes
- unrelated pages/routes

## 5) Constraints & Assumptions
- Current stable live repo/path remains `/home/ubuntu/.openclaw/workspace/students-timetable-app`.
- The real existing settings surface is `/account`.
- Grouped sections stay expanded by default unless a user collapses them.
- Search should auto-show visible matches and avoid hidden-match confusion.

## 6) Deliverables
- Fixed Preferences route.
- Collapsible grouped sections on Rooms and Groups pages.
- Verified live search + CRUD compatibility on desktop/mobile.
- Clean build, deploy, commit, and push.

## 7) Acceptance Criteria
- [ ] AC1: Preferences no longer routes to Timetable and opens the correct settings surface.
- [ ] AC2: Rooms grouped sections collapse/expand with one tap/click on the header.
- [ ] AC3: Groups grouped sections collapse/expand with one tap/click on the header/main card area.
- [ ] AC4: Search remains correct and does not hide matches confusingly.
- [ ] AC5: Create/edit/delete flows remain usable.
- [ ] AC6: Mobile and desktop verification pass.
- [ ] AC7: Build passes, production stays stable, and VPS/GitHub stay synced.

## 8) Implementation Plan (Task Breakdown)
- [ ] T1 — Fix Preferences dropdown routing
- [ ] T2 — Add collapsible grouped Rooms sections
- [ ] T3 — Add collapsible grouped Groups sections
- [ ] T4 — Verify search + CRUD + mobile/desktop live behavior
- [ ] T5 — Build, deploy, commit, push

## 9) Worker Delegation Notes
- Implement only approved scope; flag gaps instead of inventing scope.

## 10) Verification & Report
- Build/test commands:
  - `npm run build`
  - `sudo systemctl restart students-timetable.service`
- Verification results:
  - Preferences route now lands on `/account` instead of `/workspace?tab=Settings` / Timetable.
  - Live desktop + mobile verification passed for Preferences routing.
  - Live desktop + mobile verification passed for Rooms and Groups collapse/expand behavior.
  - Search remained correct with grouped/collapsed sections (`A1`, `A`, `B2`, `E226`, `226`, `E`).
  - Matching sections remain visible during search and hidden-match confusion is avoided by forcing visible search sections open.
  - Live authenticated API create/edit/delete verification passed for temporary group and room records, and live browser verification confirmed grouped edit/delete controls and delete safeguard modal behavior remain accessible.
  - Production build passed and `students-timetable.service` restarted cleanly.
- Remaining risks/follow-ups:
  - Collapse state currently persists only for the current page lifetime, not across full reloads. That keeps the UX simple and avoids overcomplicating state storage for this narrow pass.
