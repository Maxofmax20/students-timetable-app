# ARCHITECTURE-V2.md

## Target product architecture
Students Timetable V2 becomes a **student productivity platform** with timetable at the core and planning modules around it.

## Frontend architecture
- Framework: keep **Next.js app router**
- Language: keep **TypeScript**
- Styling: keep **Tailwind v4** + upgrade semantic design tokens
- Motion: add Framer Motion later where it adds value, not noise
- Forms: standardize on **React Hook Form + Zod** for new/create-edit surfaces in later passes
- State: keep local state where sufficient; use lightweight shared stores only for cross-route UI state

## Backend architecture
- Keep **Prisma + PostgreSQL**
- Continue app-router route handlers for now, but organize by domain:
  - auth
  - workspace core
  - timetable/courses
  - planning (terms/exams/assignments/preferences)
- Move shared rules into `src/lib/*` helpers to avoid route duplication

## Route/page structure
- `/workspace/dashboard`
- `/workspace/timetable`
- `/workspace/courses`
- `/workspace/exams`
- `/workspace/tasks`
- `/workspace/settings`
- Secondary resource/admin pages remain available but are not the primary product story

## UI composition direction
- App shell with strong mobile nav behavior
- Student dashboard as the home surface
- Timetable as signature scheduling surface
- Planning modules use list/timeline/kanban-friendly patterns
- Shared states: loading, empty, error, filters, quick actions

## What stays vs changes
### Stays
- App router
- Prisma
- NextAuth
- Course/session scheduling core

### Changes
- Information architecture
- Product copy and module emphasis
- Planning data model
- Dashboard purpose
- Settings/preference surface
