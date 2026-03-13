# Spec: Default-collapsed grouped sections on Rooms + Groups

- **Spec ID:** students-timetable-2026-03-10-default-collapsed-grouped-sections
- **Project:** students-timetable
- **Status:** Done
- **Owner:** dev:main
- **Created:** 2026-03-10
- **Last Updated:** 2026-03-10

## 1) Problem Statement
Grouped sections on the Rooms and Groups pages already support collapse/expand, but they currently render expanded by default. The requested UX is the opposite: sections should start collapsed by default while preserving search clarity and current interaction behavior.

## 2) Goals
- Rooms building sections start collapsed by default.
- Groups root-group sections start collapsed by default.
- Search auto-expands matching sections so results are never hidden.
- Preserve current grouped UI, CRUD access, and mobile/desktop usability.

## 3) Non-Goals
- No schema/API/routing/auth changes.
- No unrelated page redesign.
- No extra feature work.

## 4) Scope
### In Scope
- `src/app/workspace/groups/page.tsx`
- `src/app/workspace/rooms/page.tsx`

### Out of Scope
- all other files unless needed for reporting/spec update

## 5) Acceptance Criteria
- [ ] AC1: Room sections are collapsed by default.
- [ ] AC2: Group sections are collapsed by default.
- [ ] AC3: Search auto-expands matching sections.
- [ ] AC4: Expand/collapse still works on desktop and mobile.
- [ ] AC5: Build passes and production remains stable.

## 6) Verification & Report
- Build/test commands:
  - `npm run build`
  - `sudo systemctl restart students-timetable.service`
- Verification results:
  - Rooms building sections now render collapsed by default.
  - Groups root-group sections now render collapsed by default.
  - Search auto-expands matching sections so results are never hidden.
  - Desktop and mobile verification passed for collapse/expand behavior, visible count badges, and reachability of create/edit controls after expanding.
  - Production build passed and `students-timetable.service` restarted cleanly.
- Remaining risks/follow-ups:
  - Collapse state still resets on full reload, which is intentional for this narrow pass to keep state simple and predictable.
