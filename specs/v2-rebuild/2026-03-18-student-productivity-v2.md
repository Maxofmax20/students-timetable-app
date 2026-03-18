# Students Timetable V2 — Student Productivity Rebuild

- **Date:** 2026-03-18
- **Status:** Approved for execution
- **Owner:** main + delegated planner/builder/verifier workers

## Problem
V1 has a capable scheduling core but the product identity is split between an institution-facing timetable workspace and a premium landing page. The data model is missing key student-planning entities (terms, exams, assignments, preferences), navigation is resource-heavy rather than workflow-heavy, and the UI system is dark-only and uneven across dashboard/auth/workspace surfaces.

## Goals
1. Reposition the product as a premium student productivity platform centered on timetable + academic planning.
2. Preserve the strongest V1 assets: auth, workspace access model, timetable intelligence, course/session model, Prisma/Next stack.
3. Add maintainable backend foundations for AcademicTerm, Exam, Assignment, and UserPreference.
4. Introduce a clearer V2 information architecture: Dashboard, Timetable, Courses, Exams, Tasks, Settings.
5. Upgrade mobile-first UX and make dashboard/timetable feel like the heart of a daily-use product.
6. Create concrete migration docs and implementation docs while shipping real code.

## Non-goals
- Full real-time collaboration rewrite in this phase.
- Destructive removal of legacy timetable-era tables before compatibility is verified.
- Risky runtime/PWA/service-worker work.
- Public marketing site rewrite beyond alignment with the product direction.

## Constraints
- Production-safe targeted migration only.
- Keep current auth/session behavior working.
- Use existing Next.js + Prisma + Tailwind foundation unless a replacement is clearly justified.
- Implement only approved scope; flag gaps instead of inventing scope.

## Current audit summary
- Stack: Next.js 16, React 19, TS, Tailwind v4, Prisma, PostgreSQL, NextAuth, Zustand in deps, Zod.
- V1 already has a richer workspace schema than a simple timetable app.
- Core debt: mixed product identity, dark-only token system, dashboard oriented to admin/resource health instead of student outcomes, missing student-planning entities and routes, some legacy timetable compatibility still present in schema and auth registration.

## Scope for this execution wave
### Documentation
- AUDIT.md
- MIGRATION-PLAN.md
- ARCHITECTURE-V2.md
- DATA-MODEL-V2.md
- UI-SYSTEM-V2.md
- TEST-CHECKLIST.md

### Backend foundation
- Extend Prisma schema with AcademicTerm, Exam, Assignment, UserPreference.
- Add shared validation/types/helpers for the new planning domain.
- Add CRUD API routes for terms, exams, assignments, preferences.

### Frontend foundation
- Update navigation and app shell for V2 modules.
- Rebuild dashboard toward student daily workflow.
- Add Exams, Tasks, and Settings pages wired to new APIs.
- Keep timetable/courses working while repositioning the app.

## Task checklist
- [ ] T1 — Audit repo + live app and document KEEP/REFACTOR/REPLACE/DELETE.  
  - **Owner:** main/planner  
  - **Acceptance:** AUDIT.md exists with concrete facts.
- [ ] T2 — Write migration and V2 architecture docs.  
  - **Owner:** main/planner  
  - **Acceptance:** migration, architecture, data model, UI system docs exist.
- [ ] T3 — Add planning-domain Prisma models + shared TS types/helpers.  
  - **Owner:** builder  
  - **Acceptance:** schema/types cover AcademicTerm, Exam, Assignment, UserPreference.
- [ ] T4 — Add terms/exams/assignments/preferences API surface.  
  - **Owner:** builder  
  - **Acceptance:** CRUD/read routes compile and follow workspace access rules.
- [ ] T5 — Upgrade workspace IA/navigation and ship new pages.  
  - **Owner:** builder  
  - **Acceptance:** Dashboard, Exams, Tasks, Settings routes exist and fit V2 navigation.
- [ ] T6 — Rebuild dashboard into student daily command center.  
  - **Owner:** builder  
  - **Acceptance:** dashboard shows today/next/upcoming exams/tasks/term context.
- [ ] T7 — Verification pass against acceptance criteria.  
  - **Owner:** verifier/main  
  - **Acceptance:** report of done/not-done + test checklist updated.

## Acceptance criteria
- New planning entities are modeled in code.
- New student-facing modules exist in app navigation.
- Dashboard is materially different from the old admin-health dashboard.
- Docs clearly state what is kept, refactored, replaced, and deleted.
- Implementation advances the product toward a true V2 rather than a cosmetic patch.
