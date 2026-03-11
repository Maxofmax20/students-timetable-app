# Students Timetable UI Polish Pass — 2026-03-11

## Scope
Tightly scoped polish pass for already-shipped surfaces only:
1. Account
2. History
3. Sharing / Members
4. Rooms
5. Instructors
6. Groups
7. Dashboard
8. Courses
9. Timetable
10. Shared toast behavior (only as needed for these pages)

No schema changes, no backend architecture changes, no new product features.

## Goals
- Improve mobile readability and scanning density, especially for Timetable/Courses/History/Groups.
- Clarify action hierarchy, especially destructive actions.
- Improve consistency in cards/chips/section spacing and empty-state quality.
- Improve long-text truncation/readability for labels/emails/names.
- Keep visual language (dark + gold + rounded cards + existing style).

## Plan (implementation-only items)

### A) Shared polish primitives
- Add small reusable utility classes in `globals.css` for:
  - lighter page section shell rhythm
  - compact/friendly chips
  - safe truncation helper
- Keep this utility-only (no design-system rewrite).

### B) Toast refinement (narrow)
- Slightly lift mobile toast container from bottom safe area and reduce visual weight.
- Slightly faster success/info dismissal while preserving warning/error visibility.
- Keep existing API and behavior semantics unchanged.

### C) Page-specific polishing

#### 1) Account (`src/app/account/page.tsx`)
- Improve vertical rhythm and section separation.
- Make destructive area clearer and visually safer (weaker surrounding noise, stronger warning focus).
- Improve action stack behavior on small screens and long email handling.

#### 2) History (`src/app/workspace/history/page.tsx`)
- Reduce item heaviness and increase scanability of actor/action/entity/time.
- De-emphasize repetitive restore actions and tighten mobile spacing.
- Improve line wrapping and truncation for long summary/actor values.

#### 3) Sharing (`src/app/workspace/sharing/page.tsx`)
- Improve add-member form hierarchy and card rhythm.
- Improve member card readability/action layout on mobile.
- Better long email truncation while preserving full title via `title` attributes.

#### 4) Rooms (`src/app/workspace/rooms/page.tsx`)
- Slightly lighten grouped section visuals and room-card density.
- Reduce “Delete section” visual aggression and improve separation from normal actions.
- Improve long text wrapping for room summaries/names.

#### 5) Instructors (`src/app/workspace/instructors/page.tsx`)
- Refine mobile card/table rhythm and action button hierarchy.
- Improve details side-panel readability density and chip consistency.

#### 6) Groups (`src/app/workspace/groups/page.tsx`)
- Improve grouped section scanability and reduce repeated section heaviness.
- Tone down section delete action while keeping explicit danger intent.
- Improve subgroup summary readability and card spacing.

#### 7) Dashboard (`src/components/workspace/DashboardView.tsx`)
- Tighten mobile density and card rhythm for quick scanning.
- Improve metric readability and action center button hierarchy.
- Better truncation behavior for long insight labels.

#### 8) Courses (`src/app/workspace/courses/page.tsx`)
- Reduce filter/saved-view visual heaviness on mobile.
- Improve chip/button spacing and course action rhythm.
- Keep functionality identical.

#### 9) Timetable (`src/app/workspace/timetable/page.tsx`)
- Reduce filter-control density and improve stacked mobile layout.
- Improve saved-view/action spacing and export action hierarchy.
- Keep timetable architecture unchanged.

## Acceptance Criteria
- Build passes.
- No feature behavior regressions in listed pages.
- Mobile (narrow viewport) has visibly better spacing, wrapping, and action hierarchy on heavy pages.
- Destructive actions are still clear but less visually dominant.
- Long text handling is improved on targeted surfaces.
- Toasts feel lighter/less blocking without suppressing critical feedback.
- Production service restarted only after successful build.
- Real desktop + mobile verification completed on deployed site.

## Verification Checklist
- Desktop + mobile pass on deployed production:
  - `/account`
  - `/workspace/history`
  - `/workspace/sharing`
  - `/workspace/rooms`
  - `/workspace/instructors`
  - `/workspace/groups`
  - `/workspace/dashboard`
  - `/workspace/courses`
  - `/workspace/timetable`
- Validate: action hierarchy, scanning density, truncation, empty states, and no obvious regressions.
