# AUDIT.md — Students Timetable V1 audit (2026-03-18)

## Current stack summary
- Framework: **Next.js 16** app router under `src/app`
- UI: **React 19 + TypeScript**
- Styling: **Tailwind CSS v4** + CSS variables in `src/app/globals.css`
- Data layer: **Prisma 7** with PostgreSQL in production and optional SQLite adapter fallback in `src/lib/prisma.ts`
- Auth: **NextAuth** + credentials flow + OTP verification/reset routes
- Validation: **Zod** in API routes
- State/utilities: some local client state, Zustand dependency present, shared helpers in `src/lib/*`
- Deployment: systemd + reverse proxy per repo docs

## Live app facts checked
- `https://demostb.duckdns.org` currently renders a premium marketing-style landing page titled **Timetable Workspace — Smart University Scheduling**.
- Live messaging/positioning currently emphasizes institution/department scheduling, conflict graphs, departmental sync, and public views.
- That live identity does **not** yet match the requested V2 student productivity direction.

## Folder architecture summary
- `src/app/*` → app-router pages and API routes
- `src/components/*` → reusable UI/layout/workspace components
- `src/lib/*` → Prisma/auth/schedule/access/audit/helpers
- `prisma/schema.prisma` → main data model
- `docs/*` → operational and release docs
- `scripts/verification/*` → smoke/release verification scripts
- `specs/*` → spec-driven workflow docs (new V2 spec added)

## Frontend quality assessment
### Strengths
- App router structure already established.
- Auth page and landing page are visually ambitious, not barebones.
- Timetable/dashboard pages already use reusable layout and shared components.
- Timetable feature has meaningful logic for filtering, saved views, export, conflicts.
- Mobile-aware routing exists (`/workspace` redirects mobile users to timetable).

### Weaknesses / debt
- Product identity is split: landing speaks to institutional scheduling, while requested direction is premium student planner.
- Global theme is effectively dark-only; no real light-mode system yet.
- Dashboard is oriented around resource/admin health metrics rather than student outcomes (today’s classes, exams, tasks).
- Navigation is resource-centric (groups/instructors/rooms) instead of workflow-centric (dashboard/timetable/courses/exams/tasks/settings).
- Some pages/components are large and heavily stateful in a single client component.
- Visual system is polished but still inconsistent in hierarchy and product semantics.

## Backend quality assessment
### Strengths
- Prisma schema already moved beyond a toy timetable model.
- Workspace access rules, role checks, audit logging, and read/write gating are present.
- Courses support one-to-many sessions; API routes use Zod and structured Prisma includes.
- PostgreSQL is canonical and documented.

### Weaknesses / debt
- Schema still contains **legacy timetable-era tables** (`Timetable`, `TimetableEvent`, `ShareLink`, etc.) alongside workspace V2-era models.
- Registration flow still creates legacy timetable records, showing architecture straddles two product generations.
- Student planning entities requested for V2 are missing from schema: **AcademicTerm, Exam, Assignment, UserPreference**.
- API layer is route-based and functional, but domain services are still thin; some business rules remain embedded directly in route handlers.
- Naming/product boundaries remain mixed between timetable-era and workspace-era concepts.

## Product UX assessment
- Current UX is strong for timetable operations and scheduling resources.
- It is not yet a serious day-to-day student product because it lacks exams/tasks/term planning surfaces.
- Dashboard does not currently function as a daily command center.
- Mobile timetable direction is better than many academic tools, but the overall product flow is still not optimized for a student opening it multiple times per day.

## KEEP / REFACTOR / REPLACE / DELETE
### KEEP
- Next.js app-router foundation
- Prisma + PostgreSQL foundation
- NextAuth + OTP flows
- Course -> SessionEntry model
- Timetable conflict/filter/export logic
- Shared layout/component primitives that are already solid

### REFACTOR
- Dashboard into a student-centric daily hub
- Navigation/app shell into workflow-first IA
- API organization toward planning-domain modules
- Global theme tokens into real light/dark theming and clearer semantic tokens
- Large client pages into smaller, composable surfaces over time

### REPLACE
- V1 product positioning from “institution timetable workspace” to “premium student productivity platform”
- Resource-health-first default experience with a student-planning-first default experience
- Missing planning backend with normalized term/exam/task/preference models

### DELETE (targeted, not immediate destructive removal)
- Dead/obsolete UI copy that frames the app as only an institutional scheduling engine
- Eventually retire legacy timetable-era compatibility tables/flows **after** migration validation
- Avoid adding more new features on top of legacy timetable bootstrapping
