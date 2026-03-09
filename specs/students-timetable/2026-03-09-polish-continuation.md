# Students Timetable UI/Product Polish Continuation

**Spec Date:** 2026-03-09
**Location:** students-timetable-app/specs/students-timetable/2026-03-09-polish-continuation.md
**Owner:** planner (primary), dev:main (implementation)

## Context
This spec resumes the UI/product-polish pass for Students Timetable focused on the workspace (courses, groups, instructors, rooms, settings, account UI). Previous work established a design direction; this continues the effort and addresses a build-blocker due to a symbol import mismatch.

## Task List & Details

### [T1] Restore Build Health (Import Fix)
- **Description:** Resolve import mismatch of a non-existent symbol from `EditCourseModal` in `WorkspacePageClient.tsx`.
- **Owner:** dev:main
- **Expected Output:** Build completes without import errors; app launches locally.
- **Acceptance:** No TypeScript or runtime import errors related to `EditCourseModal` or its types.

### [T2] Polish Create/Edit Course Modal
- **Description:** Refine Create/Edit Course modal for visual polish, error clarity, and phone ergonomics. Ensure all fields use the latest custom-styled app-native controls.
- **Owner:** dev:main
- **Expected Output:** Modal layout is visually cohesive on desktop/mobile; controls use custom components; error messaging and sticky actions work on smaller screens.
- **Acceptance:**
  - Modal works on desktop and mobile (tested via browser tools).
  - Button, select, and time pickers are unified (see UI components in `src/components/ui`).
  - Save/cancel buttons stay visible on mobile scroll.

### [T3] Custom App-native Controls Pass
- **Description:** Replace any usage of default HTML `<button>`, `<select>`, etc. in workspace flows (Courses, Groups, Instructors, Rooms, Settings, Account) with custom UI kit components (`Button`, `AppSelect`, `TimePicker`, etc.).
- **Owner:** dev:main
- **Expected Output:** All interactive controls are visually consistent and themed.
- **Acceptance:** No platform-default controls appear in these areas; visual inspection matches design system.

### [T4] Consistency & Ergonomics Review
- **Description:** Quick visual and layout consistency pass—menus, tabs, submenus, modals, and profile/account dropdowns. Ensure alignment, hover effects, and shadow usage are unified.
- **Owner:** dev:main
- **Expected Output:** Layout and style discrepancies in key workspace sections are resolved.
- **Acceptance:** Visible checklist of resolved items; before/after screen caps recommended.

### [T5] Verification, Build & Live Check
- **Description:** Full build/test run after changes. Manual smoke-test in dev mode for all affected areas.
- **Owner:** dev:main
- **Expected Output:** Project builds and starts; all affected UI flows can be exercised end-to-end.
- **Acceptance:** App builds; can create/edit course, navigate subpages; no visual regressions or broken flows.

## Scope Gaps/Exclusions
- No API/backend changes unless essential for modal flow.
- Analytics/telemetry not included in this pass.
- Advanced accessibility review is not in scope (visual/keyboard only).

## Acceptance Criteria Summary (Per Task)
| ID   | Acceptance Criteria                                                      |
|------|--------------------------------------------------------------------------|
| T1   | No build/import errors; Compile & run passes                             |
| T2   | Modal visually polished; All controls use UI kit; Works on mobile        |
| T3   | No platform-default buttons/selects in key flows                         |
| T4   | Consistent visual polish across menus/subpages; Fixes documented         |
| T5   | Full build/test/manual check-out; No visual/broken flow regressions      |

---

## Deliverables
- Spec (this file)
- Patch(es) as per above task list

---
**Update:** Created for 2026-03-09 continuation – prior specs were absent/missing; this serves as the actionable reference.