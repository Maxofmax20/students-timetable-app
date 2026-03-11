# Students Timetable — Filter/Control Hierarchy Cleanup (Courses + Timetable)

## Date
2026-03-11

## Scope
Narrow UI-only cleanup pass for top control/filter hierarchy on:
- `workspace/courses`
- `workspace/timetable`

Out of scope:
- schema/backend changes
- feature removals
- major layout architecture rewrites
- unrelated pages

## Problem Summary
Courses and Timetable currently render too many controls at once (full filter grids, saved-view editor, and export/actions all expanded), creating high visual density and poor first-screen readability on mobile.

## UX Targets
1. Keep only high-priority controls always visible (search/main saved-view chooser, Filters toggle, Export toggle).
2. Move advanced controls into collapsed/secondary areas.
3. Keep active filters visible but compact (chips + clear reset).
4. Reduce saved views visual weight while preserving apply/save/rename/delete.
5. Make export/actions visually secondary and non-competing.

## Implementation Plan

### Courses page
- Add compact control header with:
  - always-visible summary chips (visible count + active filter count)
  - **Filters** toggle button
  - **Saved views** compact strip (select + quick save/open panel)
  - **Export** secondary action button
- Move full filter grid into a collapsible panel (closed by default).
- Move saved-view create/manage UI into a collapsible panel (closed by default).
- Keep active filter chips visible in compact row; include one-tap reset.
- Keep import/export/new functionality unchanged.

### Timetable page
- Add compact top control bar with:
  - visible sessions/conflict summary chips
  - **Filters** toggle
  - **Saved views** compact strip + manage panel
  - **Reports & export** collapsible panel
- Move session type toggles + group/delivery/conflict toggles into collapsible filter panel.
- Keep active filter chips visible and compact with reset action.
- Preserve all existing export/report actions and saved-view actions.

### Dashboard
- No changes unless needed for tiny visual consistency dependency (expected: none).

## Acceptance Criteria
- Top control area is visibly shorter on first load for both pages.
- Mobile first-screen shows core page content sooner with fewer expanded controls.
- Filter behavior and results are unchanged.
- Saved views apply/save/rename/delete still work.
- Export/actions still work.
- No visual regressions in desktop layouts.
- Build passes.
- Production service restarted only after successful build.

## Task Breakdown
1. Refactor Courses controls into compact + collapsible sections.
2. Refactor Timetable controls into compact + collapsible sections.
3. Keep state wiring/handlers unchanged where possible.
4. Build and fix any compile issues.
5. Restart service and verify desktop/mobile on production.
6. Commit and push.