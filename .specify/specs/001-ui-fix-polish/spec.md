# Feature Specification: UI Fix & Polish

**Feature Branch**: `001-ui-fix-polish`  
**Created**: 2026-03-08  
**Status**: Draft  
**Input**: User description: "Scan the full project and make a fix/complete plan for the full UI — functions that don't do anything, all UI that needs to upgrade/change/polish."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Wire Entity CRUD Pages (Priority: P1)

The Groups, Instructors, and Rooms standalone management pages (`/workspace/groups`, `/workspace/instructors`, `/workspace/rooms`) currently display data tables but every button (New, Edit, Delete) is a dead stub with no `onClick` handler. A user visiting any of these pages has zero ability to interact.

**Why this priority**: These pages were built as dedicated entity managers and are the primary navigation targets on the sidebar. Without functional buttons, 3 entire routes are unusable.

**Independent Test**: Navigate to `/workspace/groups`, click "New Group", fill the form, submit, and see the new group appear in the table. Click Edit pencil on a row, modify the name, save, and see it updated. Click Delete trash icon, confirm, and see it removed.

**Acceptance Scenarios**:

1. **Given** a user is on `/workspace/groups`, **When** they click "New Group", **Then** a modal opens with code/name inputs, and submitting calls `POST /api/v1/groups`.
2. **Given** a group row exists, **When** the user clicks the edit icon, **Then** a modal opens pre-filled with current values, and saving calls `PATCH /api/v1/groups/:id`.
3. **Given** a group row exists, **When** the user clicks the delete icon, **Then** a confirmation dialog appears, and confirming calls `DELETE /api/v1/groups/:id` and removes the row.
4. **Given** a user is on `/workspace/instructors`, **When** they click "Add Instructor", **Then** a modal opens with name/email/phone inputs, and submitting calls `POST /api/v1/instructors`.
5. **Given** an instructor row exists, **When** the user clicks edit, **Then** a pre-filled modal appears, and saving calls `PATCH /api/v1/instructors/:id`.
6. **Given** a user is on `/workspace/rooms`, **When** they click "Add Room", **Then** a modal opens with code/name inputs, and submitting calls `POST /api/v1/rooms`.

---

### User Story 2 — Replace window.prompt with In-App Modals (Priority: P1)

Nine different user interactions in the workspace currently use ugly native browser `window.prompt()` and `window.confirm()` dialogs. These break the visual design, don't work well on mobile, and feel unprofessional.

**Why this priority**: These dialogs are the primary course-editing UX. Every edit, duplicate, or delete action triggers them. This directly impacts the core daily workflow.

**Independent Test**: Click "Edit" on any course row, and instead of a browser prompt appearing, a styled in-app modal opens with proper inputs. Same for editing time, room, full editor, and delete confirmation.

**Acceptance Scenarios**:

1. **Given** a course row exists, **When** the user clicks Edit → Edit title, **Then** a custom Modal opens with a text input pre-filled with the current title.
2. **Given** a modal is open for editing time, **When** the user selects a day and time range, **Then** the DaySelector and TimePicker components are used instead of `window.prompt`.
3. **Given** a course row exists, **When** the user clicks Delete, **Then** a styled confirmation dialog appears with Cancel/Delete buttons instead of `window.confirm`.
4. **Given** the "Open full edit" action is triggered, **When** the modal opens, **Then** it contains inputs for title, code, status, group, instructor, and room — all using our existing Select and Input components.

---

### User Story 3 — Wire Account Page Buttons (Priority: P2)

The Account page (`/account`) has 6 buttons that do nothing: Save Changes, Update Password, Enable 2FA, Upload Avatar, Request Export, and Delete Account.

**Why this priority**: Account management is essential for user trust and retention. The page exists and looks good but is completely non-functional.

**Independent Test**: Navigate to `/account`, change the display name, click "Save Changes", refresh the page, and see the new name persisted.

**Acceptance Scenarios**:

1. **Given** a user edits their display name, **When** they click "Save Changes", **Then** the name is updated via API and a toast confirms.
2. **Given** a user clicks "Request Export", **When** the system processes, **Then** a JSON file downloads containing all their workspaces and courses.
3. **Given** a user clicks "Delete Account", **When** they confirm, **Then** their account is permanently removed and they're redirected to `/auth`.

---

### User Story 4 — Remove Dead Code & Legacy Routes (Priority: P2)

The project contains 11 pieces of dead code: `/builder` redirect, `/editor` redirect, empty `builder/` components folder, 22KB unused `builder-store.ts`, unused `SvgLogo` function, and 3 legacy auth API routes replaced by NextAuth.

**Why this priority**: Dead code increases bundle size, confuses developers, and creates maintenance burden.

**Independent Test**: Run `npm run build` and verify zero TypeScript errors. Navigate to `/builder` and `/editor` and verify appropriate behavior (either 404 or clean redirect).

**Acceptance Scenarios**:

1. **Given** the dead code is removed, **When** `npm run build` runs, **Then** it completes with zero errors and warnings.
2. **Given** `/builder` is visited, **When** the page loads, **Then** the user sees a 404 or is redirected to `/workspace`.

---

### User Story 5 — Complete SettingsView Sections (Priority: P2)

The inline Settings tab (`SettingsView.tsx`) is missing three sections that were promised: Theme selector, Permissions management, and Data management (export all, import, checkpoints).

**Why this priority**: Settings was split from the old modal overlay, but the new view only has 2 of the planned 4+ sections.

**Independent Test**: Navigate to Settings tab, see Theme selector with 3 theme cards. See Permissions section to set default invite role. See Data section with Export and Checkpoint buttons.

**Acceptance Scenarios**:

1. **Given** a user opens Settings tab, **When** they see the Theme section, **Then** 3 theme cards (Midnight Pro, Classic Light, Glass Neon) are displayed and clicking one changes the theme.
2. **Given** a user sees the Permissions section, **When** they select a default invite role, **Then** the role is saved.
3. **Given** a user sees the Data section, **When** they click "Export All", **Then** a JSON file downloads. When they click "Create Checkpoint", **Then** a localStorage checkpoint is saved.

---

### User Story 6 — Delete Old Settings Modal Overlay (Priority: P2)

Lines 1926-2009 in `workspace/page.tsx` contain the old settings modal overlay that uses legacy `.w-settings-overlay`, `.w-settings-panel`, `.w-action-tabs`, `.w-theme-grid` CSS classes. This overlay duplicates functionality now available in the inline SettingsView tab.

**Why this priority**: Two competing settings UIs confuse the user and waste screen real estate.

**Independent Test**: After deletion, clicking the gear icon in the header should switch to the Settings tab rather than opening a modal overlay.

**Acceptance Scenarios**:

1. **Given** the old settings modal is removed, **When** the user clicks the settings gear icon, **Then** the main tab switches to "Settings" and the SettingsView renders inline.
2. **Given** the old settings modal is removed, **When** `npm run build` runs, **Then** it completes with zero errors.

---

### User Story 7 — Fix TypeScript Type Safety (Priority: P2)

Three view components (`DashboardView`, `CoursesView`, `SettingsView`) use `props: any` instead of proper TypeScript interfaces.

**Why this priority**: `any` types bypass all type checking, allowing silent breakage.

**Independent Test**: Run `npm run build` with strict type checking. All three components should have properly typed prop interfaces.

**Acceptance Scenarios**:

1. **Given** proper interfaces are defined, **When** a parent passes a wrong prop type, **Then** TypeScript reports a compile error.

---

### User Story 8 — Polish TimetableView & CoursesView (Priority: P3)

TimetableView has a dead "Export ICS" button and a view mode toggle that does nothing. CoursesView lacks any search/filter bar.

**Why this priority**: Core views need to be usable, but these are enhancements on top of working features.

**Independent Test**: Click "Export ICS" in TimetableView and verify a `.ics` file downloads. Type in the CoursesView search bar and verify rows are filtered.

**Acceptance Scenarios**:

1. **Given** courses exist, **When** the user clicks "Export ICS" in TimetableView, **Then** a `.ics` file downloads.
2. **Given** the CoursesView has a search bar, **When** the user types "Math", **Then** only courses matching "Math" are shown.

---

### User Story 9 — Add Keyboard Shortcuts & Accessibility (Priority: P3)

The command palette shows an ESC badge but doesn't close on ESC. No Cmd+K shortcut opens it. Icon-only buttons lack `aria-label` attributes.

**Why this priority**: Polish and accessibility improvements that enhance but don't block core workflows.

**Independent Test**: Press Cmd+K anywhere in the workspace and verify the command palette opens. Press ESC to close it. Tab through command palette items. Verify screen readers announce icon button purposes.

**Acceptance Scenarios**:

1. **Given** the user is on any workspace page, **When** they press Cmd+K (or Ctrl+K), **Then** the command palette opens.
2. **Given** the command palette is open, **When** the user presses ESC, **Then** it closes.
3. **Given** icon-only buttons exist, **When** a screen reader reads them, **Then** each has a descriptive `aria-label`.

---

### User Story 10 — Polish Landing Page & Share Page (Priority: P3)

Landing page lacks mobile hamburger menu and footer links point to `#`. The shared timetable page at `/s/[token]` uses old white/slate styling.

**Why this priority**: External-facing polish. Important for perception but doesn't affect core app functionality.

**Independent Test**: View landing page at 375px width and verify a hamburger menu appears. Click it and verify navigation links appear. Visit `/s/test-token` and verify it matches the dark theme.

**Acceptance Scenarios**:

1. **Given** the landing page is viewed on mobile, **When** the user taps the hamburger icon, **Then** a slide-out navigation drawer appears.
2. **Given** the share page is visited, **When** it renders, **Then** it uses the dark design system tokens (not slate/white).

---

### Edge Cases

- What happens when an API call fails during entity CRUD (network error, 400, 500)?
- What happens when a user tries to delete the last workspace?
- What happens when an entity has dependent foreign keys (e.g., deleting a group with courses assigned)?
- What happens when the command palette search returns zero results?
- How does the CoursesView search handle special characters or very long queries?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST wire all 9 entity management buttons (3 pages × 3 buttons) to their respective API endpoints.
- **FR-002**: System MUST replace all 9 `window.prompt()`/`window.confirm()` calls with custom in-app Modal dialogs.
- **FR-003**: System MUST wire all 6 Account page buttons to backend APIs or show "coming soon" states.
- **FR-004**: System MUST remove all 11 dead code artifacts (legacy routes, unused files, empty directories).
- **FR-005**: System MUST replace all `any` typed props with proper TypeScript interfaces.
- **FR-006**: System MUST add Theme selector, Permissions section, and Data management section to `SettingsView.tsx`.
- **FR-007**: System MUST delete the old settings modal overlay (lines 1926-2009) and redirect its trigger to the Settings tab.
- **FR-008**: System MUST wire the TimetableView "Export ICS" button to download a `.ics` file.
- **FR-009**: System MUST add a search/filter bar to `CoursesView.tsx`.
- **FR-010**: System MUST add Cmd+K keyboard shortcut to open the command palette.
- **FR-011**: System MUST close the command palette on ESC key press.
- **FR-012**: System MUST add `aria-label` attributes to all icon-only buttons.
- **FR-013**: System MUST add a mobile hamburger menu to the landing page.
- **FR-014**: System MUST redesign the `/s/[token]` share page with the dark theme design system.
- **FR-015**: System MUST modernize the create entity modals to use the new design system tokens.
- **FR-016**: System MUST show toast notifications for all API successes and failures during CRUD operations.

### Key Entities

- **Course**: Title, code, status, day, time, group, instructor, room — the primary scheduling unit.
- **Group**: Code, name — student cohort assignment.
- **Instructor**: Name, email, phone — teaching staff.
- **Room**: Code, name — physical location.
- **Workspace**: Title — top-level organizational container.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every button on every page triggers a meaningful action (zero dead buttons).
- **SC-002**: `npm run build` passes with zero TypeScript errors and zero `any` types in component props.
- **SC-003**: All CRUD operations on Groups, Instructors, and Rooms pages complete successfully via API.
- **SC-004**: Zero `window.prompt()` or `window.confirm()` calls remain in the codebase.
- **SC-005**: The project contains zero legacy redirect pages or unused files.
- **SC-006**: The command palette opens on Cmd+K and closes on ESC.
- **SC-007**: The landing page is fully navigable on a 375px-wide viewport.
