# Students Timetable — Top Toolbar Refinement Pass 2 (Courses + Timetable)

## Scope
Only refine the **top toolbar strip** on:
1. `src/app/workspace/courses/page.tsx`
2. `src/app/workspace/timetable/page.tsx`

Out of scope: backend/schema/API behavior changes, unrelated pages, table/body content redesign.

## Problems to solve
- Toolbar controls still feel scattered.
- Some icon-only actions are unclear.
- Secondary actions compete visually with primary actions.
- Saved-view selector feels detached from toolbar grouping.

## UX intent
- Keep toolbar compact (no added height/heavy chrome).
- Make one cohesive command strip with clear rhythm.
- Keep Filters + Saved views as primary.
- Make Export/Reports/Reset/Conflict clearer but secondary.
- Improve icon clarity and consistency across both pages.

## Planned implementation

### A) Shared toolbar structure (both pages)
- Split top strip into three compact groups:
  1. status chips,
  2. primary actions,
  3. secondary actions.
- Add subtle grouped containers (`rounded-xl`, border, muted background) for primary and secondary action clusters to reduce visual scatter.
- Keep wrapped behavior on small screens while preserving tight spacing.

### B) Saved view integration (both pages)
- Place current saved-view selector in same toolbar system, directly under action clusters.
- Add compact left icon marker in selector row label area (visual tie to saved views).
- Keep width constrained for compactness and avoid pushing other controls.

### C) Courses toolbar refinements
- Export button: icon `file_download` + always-visible label `Export CSV`.
- Reset button: icon `filter_alt_off` + label `Reset` visible at all sizes.
- Saved views button: icon upgraded to `bookmarks` for stronger meaning.
- Align action spacing and button paddings to consistent compact rhythm.

### D) Timetable toolbar refinements
- Conflict toggle: icon `crisis_alert` and explicit compact labels (`Conflicts on/off`) on all sizes.
- Reports toggle: icon `assessment` + label `Reports` visible at all sizes.
- Reset: icon `filter_alt_off` + label visible on all sizes.
- Saved views button: `bookmarks` icon for consistency with Courses.

### E) Styling consistency
- Standardize top-toolbar button class tokens (gap/padding/icon size/text tone) for both pages.
- Keep chips and action containers visually balanced without increasing vertical density.

## Acceptance criteria
- Courses and Timetable top strips feel like one intentional toolbar system.
- Primary actions are visually dominant over secondary actions.
- Export/Reports/Conflict/Reset actions are understandable at a glance on mobile and desktop.
- Saved-view selector feels integrated (not detached).
- No reintroduction of More menu pattern.
- No taller/heavier toolbar regression.
- Build passes and production remains stable after restart.
