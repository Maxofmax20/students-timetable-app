# Students Timetable — Top Controls Refinement (Courses + Timetable)

## Date
2026-03-11

## Scope
Focused UI refinement for top control areas only on:
- `src/app/workspace/courses/page.tsx`
- `src/app/workspace/timetable/page.tsx`

Out of scope:
- schema/backend changes
- dashboard/unrelated pages
- feature removals
- architecture rewrites

## Problem
Top control sections remain too tall/heavy, with secondary actions competing with primary actions and delaying first visible content, especially on mobile.

## UX Goals
1. Keep primary controls always visible and compact:
   - summary chips
   - one Filters entry
   - one Saved views entry
   - compact current saved-view selector
2. Move secondary controls into on-demand sections:
   - export/reports
   - saved-view management actions
   - reset/clear actions
   - advanced filter controls
3. Reduce current saved-view visual weight from card-like to compact row.
4. Improve action hierarchy so content is reached faster.

## Implementation Plan
### Courses
- Tighten top card spacing/padding.
- Keep compact summary chips + Filters + Saved views in first row.
- Convert current saved-view area to compact inline selector + manage button.
- Move export/reset into a small secondary overflow menu.
- Keep advanced filters and saved-view management in collapsible panels.

### Timetable
- Tighten top card spacing/padding.
- Keep session/clash summary chips + Filters + Saved views in first row.
- Convert current saved-view area to compact inline selector + manage button.
- Move reports/export/reset into a small secondary overflow menu.
- Keep advanced filters and saved-view management in collapsible panels.
- Keep conflict-layer state available but visually lighter.

## Acceptance Criteria
- First-screen top area is shorter on Courses and Timetable.
- Saved views/filter/report/export/reset functionality remains available.
- Secondary actions are visually de-emphasized vs primary actions.
- Mobile readability improves; desktop has no obvious regressions.
- Build passes before service restart.
- Production verification done on desktop + mobile viewports.
