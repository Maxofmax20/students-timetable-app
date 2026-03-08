# Implementation Plan: UI Fix & Polish

**Branch**: `001-ui-fix-polish` | **Date**: 2026-03-08 | **Spec**: `.specify/specs/001-ui-fix-polish/spec.md`
**Input**: Feature specification from `/specs/001-ui-fix-polish/spec.md`

## Summary

The Timetable Workspace V2.0 has undergone a major visual redesign but the implementation left 66+ issues: dead buttons with no handlers, 9 browser `window.prompt()` calls in place of proper UI, unused legacy code, entity management pages without CRUD wiring, missing settings sections, and TypeScript `any` types. This plan covers every fix needed to make the entire UI fully functional and polished.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 15  
**Primary Dependencies**: NextAuth.js, Prisma ORM, Tailwind CSS v4, Material Symbols  
**Storage**: SQLite (via Prisma) with dev.db  
**Testing**: `npm run build` (TypeScript compilation), manual browser testing  
**Target Platform**: Web browser (desktop + mobile responsive)  
**Project Type**: Full-stack web application (Next.js App Router)  
**Constraints**: Must use existing CSS custom property design system (`globals.css`), existing API routes (`/api/v1/*`), and existing `Modal.tsx` component

## Project Structure

### Source Code (repository root)

```text
src/
├── app/
│   ├── account/page.tsx          # [MODIFY] Wire 4 buttons
│   ├── auth/page.tsx             # [MODIFY] Fix forgot password link
│   ├── page.tsx                  # [MODIFY] Add mobile nav, fix footer
│   ├── workspace/
│   │   ├── page.tsx              # [MODIFY] Remove settings overlay, replace prompts
│   │   ├── groups/page.tsx       # [MODIFY] Wire CRUD
│   │   ├── instructors/page.tsx  # [MODIFY] Wire CRUD
│   │   └── rooms/page.tsx        # [MODIFY] Wire CRUD
│   ├── s/[token]/page.tsx        # [MODIFY] Redesign with dark theme
│   ├── builder/                  # [DELETE] Legacy redirect
│   └── editor/                   # [DELETE] Legacy redirect
├── components/
│   ├── workspace/
│   │   ├── ActionCenter.tsx      # [MODIFY] ESC close, keyboard nav
│   │   ├── CoursesView.tsx       # [MODIFY] Add search/filter, type props
│   │   ├── DashboardView.tsx     # [MODIFY] Type props
│   │   ├── SettingsView.tsx      # [MODIFY] Add 3 sections, type props
│   │   └── TimetableView.tsx     # [MODIFY] Wire Export ICS button
│   ├── AuthDrawer.tsx            # [DELETE] if unused
│   └── ThemeToggle.tsx           # [DELETE] if unused
├── lib/
│   └── builder-store.ts          # [DELETE] 22KB unused
└── types/                        # May add Modal-related types
```

### Files to Delete

| File/Directory | Reason |
|---------------|--------|
| `src/app/builder/` | Redirect stub to `/` |
| `src/app/editor/` | Redirect stub to `/` |
| `src/components/builder/` | Empty directory |
| `src/lib/builder-store.ts` | 22KB unused store |
| `src/components/AuthDrawer.tsx` | Verify unused, then delete |
| `src/components/ThemeToggle.tsx` | Verify unused, then delete |

### Files to Modify (20 total)

| File | Changes |
|------|---------|
| `workspace/page.tsx` | Delete settings overlay (L1926-2009), replace 9 `window.prompt` calls, remove `SvgLogo`, redirect settings trigger |
| `groups/page.tsx` | Wire New/Edit/Delete with modals + API |
| `instructors/page.tsx` | Wire New/Edit/Delete with modals + API |
| `rooms/page.tsx` | Wire New/Edit/Delete with modals + API |
| `account/page.tsx` | Wire Save, Export, Delete Account buttons |
| `DashboardView.tsx` | Add TypeScript interface |
| `CoursesView.tsx` | Add TypeScript interface, search bar |
| `SettingsView.tsx` | Add TypeScript interface, 3 new sections |
| `TimetableView.tsx` | Wire Export ICS button |
| `ActionCenter.tsx` | ESC close, keyboard nav |
| `page.tsx` (landing) | Mobile hamburger, fix footer links, smooth scroll |
| `s/[token]/page.tsx` | Dark theme redesign |
| `auth/page.tsx` | Fix forgot password link |

## Complexity Tracking

No constitution violations. All changes use existing patterns and components.
