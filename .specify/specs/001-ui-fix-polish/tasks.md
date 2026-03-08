# Tasks: UI Fix & Polish

**Input**: Design documents from `.specify/specs/001-ui-fix-polish/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Cleanup — Dead Code Removal (US4)

**Goal**: Remove all unused files, legacy routes, and dead code artifacts to reduce confusion and bundle size.

**Independent Test**: Run `npm run build` — must pass with zero errors after cleanup.

- [x] T001 [P] [US4] Delete directory `src/app/builder/` (legacy redirect stub)
- [x] T002 [P] [US4] Delete directory `src/app/editor/` (legacy redirect stub)
- [x] T003 [P] [US4] Delete directory `src/components/builder/` (empty directory)
- [x] T004 [P] [US4] Delete file `src/lib/builder-store.ts` (22KB unused store)
- [x] T005 [P] [US4] Verify and delete `src/components/AuthDrawer.tsx` if unused
- [x] T006 [P] [US4] Verify and delete `src/components/ThemeToggle.tsx` if unused
- [x] T007 [US4] Remove unused `SvgLogo` function from `src/app/workspace/page.tsx` (lines 250-263)
- [x] T008 [US4] Run `npm run build` to verify zero errors after cleanup

**Checkpoint**: All dead code removed. Build passes.

---

## Phase 2: TypeScript Fixes (US7)

**Goal**: Replace all `any` types with proper TypeScript interfaces.

- [x] T009 [P] [US7] Create interface `DashboardViewProps` in `src/components/workspace/DashboardView.tsx` replacing `any`
- [x] T010 [P] [US7] Create interface `CoursesViewProps` in `src/components/workspace/CoursesView.tsx` replacing `any`
- [x] T011 [P] [US7] Create interface `SettingsViewProps` in `src/components/workspace/SettingsView.tsx` replacing `any`
- [ ] T012 [US7] Run `npm run build` to verify type safety

**Checkpoint**: All component props properly typed. Build passes.

---

## Phase 3: Wire Entity CRUD Pages (US1) 🎯 MVP

**Goal**: Make Groups, Instructors, and Rooms management pages fully functional with modal-based CRUD.

**Independent Test**: Navigate to each entity page, create a new entity via modal, edit an existing one, and delete one.

### Implementation for Groups Page
- [x] T013 [US1] Add `useState` hooks for modal state, form data, and loading in `src/app/workspace/groups/page.tsx`
- [x] T014 [US1] Implement Create modal with code/name inputs, wired to `POST /api/v1/groups`
- [x] T015 [US1] Implement Edit modal with pre-filled code/name inputs, wired to `PATCH /api/v1/groups/:id`
- [x] T016 [US1] Implement Delete confirmation dialog, wired to `DELETE /api/v1/groups/:id`
- [x] T017 [US1] Add toast notifications for success/failure

### Implementation for Instructors Page
- [x] T018 [US1] Add modal state and CRUD wiring in `src/app/workspace/instructors/page.tsx`
- [x] T019 [US1] Implement Create modal with name/email/phone inputs → `POST /api/v1/instructors`
- [x] T020 [US1] Implement Edit modal → `PATCH /api/v1/instructors/:id`
- [x] T021 [US1] Implement Delete confirmation → `DELETE /api/v1/instructors/:id`

### Implementation for Rooms Page
- [x] T022 [US1] Add modal state and CRUD wiring in `src/app/workspace/rooms/page.tsx`
- [x] T023 [US1] Implement Create modal with code/name inputs → `POST /api/v1/rooms`
- [x] T024 [US1] Implement Edit modal → `PATCH /api/v1/rooms/:id`
- [x] T025 [US1] Implement Delete confirmation → `DELETE /api/v1/rooms/:id`

**Checkpoint**: All 3 entity pages have working Create, Edit, Delete flows.

---

## Phase 4: Replace `window.prompt` with Modals (US2)

**Goal**: Eliminate all 9 browser-native dialog calls with styled in-app modals.

- [x] T026 [US2] Create a reusable `EditCourseModal` component in `src/components/workspace/EditCourseModal.tsx` with inputs for title, code, status, group, instructor, room, day, time
- [x] T027 [US2] Replace `updateCourseName` (line 801) — open EditCourseModal with title-only mode
- [x] T028 [US2] Replace `editCourseTime` (lines 814-817) — open EditCourseModal with day/time pickers (DaySelector + TimePicker)
- [x] T029 [US2] Replace `editCourseRoom` (line 844) — open EditCourseModal with room selector
- [x] T030 [US2] Replace `openFullEdit` (lines 868-888) — open EditCourseModal in full mode
- [x] T031 [US2] Replace `duplicateAndEdit` (lines 1003-1007) — open EditCourseModal in duplicate mode
- [x] T032 [US2] Replace `deleteCourse` confirm (line 1051) and `deleteAllInGroup` confirm (line 1076) with styled confirmation modals
- [x] T033 [US2] Replace `createRoom` prompts (lines 621-625) with a Create Room modal
- [x] T034 [US2] Replace snap interval prompt (line 1473) — already replaced in SettingsView

**Checkpoint**: Zero `window.prompt` or `window.confirm` calls remain.

---

## Phase 5: Complete SettingsView & Remove Old Overlay (US5, US6)

**Goal**: Add missing sections to SettingsView and delete the legacy settings modal.

- [ ] T035 [US5] Add Theme selector section (3 theme cards) to `src/components/workspace/SettingsView.tsx`
- [ ] T036 [US5] Add Permissions section (default invite role dropdown) to SettingsView
- [ ] T037 [US5] Add Data management section (Export JSON, Export CSV, Create Checkpoint, Show Checkpoints) to SettingsView
- [ ] T038 [US6] Delete old settings modal overlay (lines 1926-2009 in `workspace/page.tsx`)
- [ ] T039 [US6] Redirect `setShowSettings(true)` calls to `setMainTab("Settings")` instead

**Checkpoint**: Settings tab is feature-complete. Old modal is gone.

---

## Phase 6: Wire Account Page (US3)

**Goal**: Connect Account page buttons to backend APIs.

- [ ] T040 [US3] Wire "Save Changes" button to update user profile (name) via API or NextAuth session update
- [ ] T041 [US3] Wire "Request Export" button to call `/api/account/export` endpoint and download JSON
- [ ] T042 [US3] Wire "Delete Account" button with confirmation dialog calling `/api/account/delete`

**Checkpoint**: Account page is functional.

---

## Phase 7: Polish Views (US8)

**Goal**: Fix TimetableView dead buttons and add CoursesView search.

- [ ] T043 [US8] Wire "Export ICS" button in `src/components/workspace/TimetableView.tsx` to call `buildIcs()` and download
- [ ] T044 [US8] Add search input + status filter dropdown to `src/components/workspace/CoursesView.tsx`

**Checkpoint**: Core views fully interactive.

---

## Phase 8: Keyboard Shortcuts, Accessibility & External Pages (US9, US10)

**Goal**: Add Cmd+K, ESC close, ARIA labels, mobile nav, and share page redesign.

- [ ] T045 [US9] Add global `keydown` listener for Cmd+K / Ctrl+K to toggle command palette
- [ ] T046 [US9] Add ESC key handler in `ActionCenter.tsx` to close the palette
- [ ] T047 [US9] Add `aria-label` attributes to all icon-only buttons across workspace
- [ ] T048 [US10] Add mobile hamburger menu + slide-out drawer to landing page
- [ ] T049 [US10] Fix footer links (replace `#` with actual paths or remove)
- [ ] T050 [US10] Redesign `src/app/s/[token]/page.tsx` with dark theme design system

**Checkpoint**: Full keyboard support, accessibility, and external page polish.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Cleanup)**: No dependencies — can start immediately
- **Phase 2 (TypeScript)**: No dependencies — can run in parallel with Phase 1
- **Phase 3 (Entity CRUD)**: Depends on Phase 1 (dead code removed)
- **Phase 4 (Replace prompts)**: Depends on Phase 2 (types fixed for props)
- **Phase 5 (Settings)**: Depends on Phase 3 (entity pages done as reference)
- **Phase 6 (Account)**: Can run in parallel with Phase 5
- **Phase 7 (Polish)**: Depends on Phase 4 (editing modals exist)
- **Phase 8 (A11y/External)**: Can run in parallel with Phase 7

### Parallel Opportunities

- Phase 1 tasks T001-T006 all touch different files and can run in parallel
- Phase 2 tasks T009-T011 all touch different files and can run in parallel
- Phase 3 groups/instructors/rooms can be implemented in parallel
- Phase 6 and Phase 5 can be implemented in parallel

---

## Implementation Strategy

### MVP First (Phase 1 → Phase 3)

1. Complete Phase 1: Remove dead code
2. Complete Phase 2: Fix TypeScript types
3. Complete Phase 3: Wire entity CRUD (most impactful fix)
4. **STOP and VALIDATE**: Test all 3 entity pages end-to-end

### Full Delivery

1. Phases 1-3 → Validate
2. Phase 4 → Replace all prompts → Validate
3. Phase 5 → Complete SettingsView → Validate
4. Phase 6-8 → Polish → Final validation

---

## Notes

- [P] tasks = different files, no dependencies
- Commit after each phase completes
- Run `npm run build` after every phase as a gate
- Use existing `Modal.tsx` component for all new modal dialogs
- Use existing CSS custom properties — do not introduce new styling approaches
- Toast via existing `showToast()` function in workspace page
