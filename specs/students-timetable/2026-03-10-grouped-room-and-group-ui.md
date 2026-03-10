# Spec: Grouped Rooms + Groups UI organization

- **Spec ID:** students-timetable-2026-03-10-grouped-room-and-group-ui
- **Project:** students-timetable
- **Status:** Done
- **Owner:** dev:main
- **Created:** 2026-03-10
- **Last Updated:** 2026-03-10

## 1) Problem Statement
Rooms and Groups are now modeled correctly, but the resource pages still present them too flatly. Users need the UI to reflect real university structure so scanning is easier and list chaos is reduced.

## 2) Goals
- Group Rooms visually by building letter.
- Group Groups visually by main/root group.
- Preserve search, create/edit/delete, mobile usability, and desktop usability.
- Avoid changing the underlying architecture unless a tiny safe support helper is required.

## 3) Non-Goals
- No PWA/runtime/install work.
- No unrelated page redesign.
- No architecture rollback or data-model changes.
- No search behavior regressions.

## 4) Scope
### In Scope
- `src/app/workspace/groups/page.tsx`
- `src/app/workspace/rooms/page.tsx`
- `src/lib/group-room-model.ts`
- small helper/spec updates as needed

### Out of Scope
- schema changes
- API changes unless strictly needed
- unrelated workspace pages

## 5) Constraints & Assumptions
- Canonical live repo path remains `/home/ubuntu/.openclaw/workspace/students-timetable-app`.
- Existing unrelated working-tree changes (`package-lock.json`, `check.cjs`, `get_users.js`) must remain untouched.
- Current group hierarchy and structured room model are already correct and must remain intact.

## 6) Deliverables
- Grouped Groups page with one visible section per root/main group.
- Grouped Rooms page with one visible section per building letter.
- Search-compatible grouped rendering.
- Production-safe build, live verification, commit, and push.

## 7) Acceptance Criteria
- [ ] AC1: Rooms page renders one grouped section per building letter with room-count badge.
- [ ] AC2: Groups page renders one grouped section per main/root group with subgroup count.
- [ ] AC3: Search still works sensibly inside grouped sections.
- [ ] AC4: Create/edit/delete flows remain intact.
- [ ] AC5: Mobile and desktop remain clear and usable.
- [ ] AC6: Production build passes, live verification passes, and VPS/GitHub stay synced.

## 8) Implementation Plan (Task Breakdown)
- [ ] T1 — Add grouping helpers for root groups/buildings
- [ ] T2 — Rebuild Groups page list into grouped sections
- [ ] T3 — Rebuild Rooms page list into grouped sections
- [ ] T4 — Verify search + CRUD usability on desktop/mobile
- [ ] T5 — Build, deploy, verify, commit, push

## 9) Worker Delegation Notes
- Implement only approved scope; flag gaps instead of inventing scope.

## 10) Verification & Report
- Build/test commands:
  - `npm run build`
  - `sudo systemctl restart students-timetable.service`
- Verification results:
  - Production build passed.
  - Live desktop and mobile verification passed for grouped Groups and grouped Rooms UI.
  - Search remained functional after grouping (`A1`, `E226`, `226`, `E`).
  - Create flows still open correctly for both pages.
  - Existing edit/delete affordances remain present inside grouped sections.
- Remaining risks/follow-ups:
  - Current grouping is expanded by default for fastest scanning. If the dataset grows significantly later, optional collapsible sections can be added without changing the underlying architecture.
