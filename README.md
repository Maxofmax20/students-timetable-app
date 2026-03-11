# Students Timetable

Students Timetable is a production-deployed university scheduling workspace for managing courses, sessions, groups, instructors, rooms, and weekly timetable views from one shared product model.

- **Live site:** <https://demostb.duckdns.org>
- **Canonical production repo path:** `/home/ubuntu/.openclaw/workspace/students-timetable-app`
- **Production runtime:** `students-timetable.service` (systemd)

> Safety note: treat `/home/ubuntu/.openclaw/workspace/students-timetable-app` as the source of truth for live production work. Do **not** assume `/home/ubuntu/timetable` is the canonical live repo path.

---

## What the app does

Students Timetable helps a university department or teaching team manage the real scheduling objects behind a timetable:

- courses
- many sessions per course
- academic groups and subgroups
- instructors
- structured rooms
- weekly timetable rendering
- account/auth flows
- CSV bulk import for operational data entry

The app is designed around a workspace model so scheduling data, settings, and resources live together instead of being scattered across separate tools.

---

## Main product capabilities

### Auth and account
- Email/password authentication
- Email verification flow
- Forgot/reset password flow
- OTP verification with visible and usable OTP UI
- OTP typing and paste handling fixes already shipped
- Account/profile and account security screens

### Courses and sessions
- One **Course** can own **many SessionEntry rows**
- Course create/edit supports multi-session scheduling
- Session types supported:
  - `LECTURE`
  - `SECTION`
  - `LAB`
  - `ONLINE`
  - `HYBRID`
- Course/session import now supports grouped creation from CSV

### Groups
- Main group + subgroup hierarchy
- Parent-child academic group model
- Grouped UI with collapsible sections
- Groups CSV import with hierarchy-safe validation

### Rooms
- Structured room model using:
  - `buildingCode`
  - `roomNumber`
  - derived `level`
- Grouped UI by building with collapsible sections
- Rooms CSV import with structure validation and derived level handling

### Timetable
- Timetable intelligence controls
- Session-type visibility controls
- Group/subgroup focused filtering
- Delivery-mode filtering
- Visible-session count
- Conflict visibility layer
- Grid and List modes
- Day-focused mobile grid fallback
- Adaptive timetable card density/readability improvements

### Batch 1 productivity features
- Smart filters on Courses page
- Saved views on Courses page
- Browser-local saved views persistence

### Bulk import (Batch 3)
- Rooms CSV import
- Groups CSV import
- Courses + Sessions CSV import
- Preview → validation → confirm import flow
- Create-only safety model with explicit duplicate reporting

---

## Current architecture summary

### Stack
- **Framework:** Next.js 16
- **UI:** React 19 + TypeScript
- **Styling:** Tailwind CSS + app design tokens / CSS variables
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth credentials-based auth
- **Email/OTP:** SMTP + OTP codes for verification/reset flows
- **Production runtime:** systemd service running `next start`
- **Reverse proxy:** Caddy

### Product architecture
The live product uses a workspace-centric model:

- `User`
- `Workspace`
- `WorkspaceMember`
- `AcademicGroup`
- `Instructor`
- `Room`
- `Course`
- `SessionEntry`
- `WorkspaceShareLink`
- `WorkspaceRevision`
- `OtpCode`

Legacy timetable-era tables still exist in schema for compatibility/data retention, but the canonical live product direction is the workspace/course/group/instructor/room/session system.

---

## Core data model summary

### Courses and sessions
The real product model is:

- **one Course**
- **many SessionEntry rows**

This means a single course can own multiple scheduled sessions such as lecture + lab + section without duplicating the course itself.

### Session types
Supported session types:

- `LECTURE`
- `SECTION`
- `LAB`
- `ONLINE`
- `HYBRID`

Online and hybrid sessions can also store `onlinePlatform` and `onlineLink`.

### Group hierarchy
Groups support hierarchy using `parentGroupId`:

- main groups like `A`, `B`
- subgroups like `A1`, `A2`, `B1`

### Structured rooms
Rooms support structured physical identity using:

- `buildingCode`
- `roomNumber`
- derived `level`
- optional building name
- optional capacity

Current level derivation rule:

- `100–199` → Level 0
- `200–299` → Level 1
- `300–399` → Level 2
- `400–499` → Level 3
- `500–599` → Level 4
- `600–699` → Level 5

---

## Timetable capabilities

### Intelligence controls
The timetable surface now includes:

- session-type controls
- group/subgroup focus
- delivery-mode filtering
- active filter state visibility
- reset behavior
- conflict visibility toggle

### View modes
- **Grid View** — adaptive weekly/day-focused board
- **List View** — grouped by day with fuller readable metadata

### Mobile behavior
- Grid uses a **day-focused mobile board** for readability
- List View serves as the more comfortable full-detail mobile fallback

---

## Smart filters and saved views

The Courses page includes:

- smart filters for course discovery and narrowing
- browser-local saved views for common filter sets
- filter combinations for status, session type, day, group, instructor, room, and delivery mode

---

## Bulk import support

Students Timetable now supports real CSV bulk import flows directly inside the product.

### Rooms import
- supports structured room fields
- validates room/building structure
- derives level automatically
- reports duplicates explicitly
- skips duplicates safely
- never overwrites existing rooms

### Groups import
- supports main groups and subgroups
- can infer subgroup parent from codes like `A1 -> A`
- rejects orphan subgroup rows
- reports duplicates explicitly
- never overwrites existing groups

### Courses + Sessions import
- uses one CSV row per session
- groups shared `courseCode` rows into one course with many sessions
- resolves linked groups/rooms/instructors safely
- reports duplicates explicitly
- never overwrites existing courses

For format details and examples, see [`docs/import-csv.md`](docs/import-csv.md).

---

## Local development setup

### Prerequisites
- Node.js 22+
- npm
- PostgreSQL database
- project `.env`

### Install
```bash
cd /home/ubuntu/.openclaw/workspace/students-timetable-app
npm install
npx prisma generate
```

### Run migrations
```bash
npx prisma migrate deploy
```

### Start development server
```bash
npm run dev
```

### Production build test
```bash
npm run build
```

---

## Production deployment notes

### Canonical production path
```bash
cd /home/ubuntu/.openclaw/workspace/students-timetable-app
```

### Standard deploy/update flow
```bash
git pull
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
sudo systemctl restart students-timetable.service
```

### Runtime health checks
```bash
sudo systemctl status students-timetable.service --no-pager
curl https://demostb.duckdns.org/api/health
curl -I https://demostb.duckdns.org/auth
curl -I https://demostb.duckdns.org/workspace
```

### Reverse proxy / runtime
- Reverse proxy: Caddy
- App server: Next.js production server via systemd
- Service: `students-timetable.service`

---

## Environment variable expectations

A starter template is provided in [`.env.example`](.env.example).

Common variables used by the app include:

### Required baseline
- `DATABASE_URL`
- `AUTH_SECRET` or `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`

### Email / OTP
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### Optional OAuth toggles (currently disabled in live path)
- `AUTH_ENABLE_GOOGLE`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_ENABLE_GITHUB`
- `GITHUB_ID`
- `GITHUB_SECRET`

---

## Migration / upgrade notes

### PostgreSQL is the canonical production database
The production datasource is PostgreSQL.

### Legacy data structures still exist
Legacy timetable-era tables remain in schema for compatibility/data retention. Do not remove them casually during routine feature work.

### Course model migration note
The current live product model uses **one course with many sessions**. Any migration or import work must preserve that model rather than recreating duplicate course rows.

### Bulk import safety note
Current import flows are intentionally **create-only**. They preview data first, report duplicates/conflicts explicitly, and do not overwrite existing records.

---

## Supporting docs

- [docs/import-csv.md](docs/import-csv.md) — CSV import formats, examples, and safety rules
- [docs/operations.md](docs/operations.md) — production operations / deployment notes
- [docs/release-phase-summary-2026-03.md](docs/release-phase-summary-2026-03.md) — release summary for the current completed phase
- [docs/realtime-decision.md](docs/realtime-decision.md) — why realtime is deferred from the live path
- [docs/postgres-cutover-plan.md](docs/postgres-cutover-plan.md) — executed database cutover background

---

## Known limitations

- Import mode is currently **create-only**; there is no update/merge/replace import mode yet.
- Instructor resolution during Courses import is intentionally strict:
  - email first
  - exact unique name fallback only
- OAuth providers remain intentionally disabled in the current live path.
- Legacy timetable-era tables remain in schema and should only be removed in a deliberate later cleanup phase.

---

## Future ideas

- import update/merge workflows with explicit user confirmation rules
- bulk import for instructors
- stronger automated regression coverage for auth, CRUD, timetable, and import flows
- richer admin/export tooling
- deeper release automation around build + health + browser smoke checks

---

## Release status for this phase

This repo now includes the completed scope for:

- Batch 1 — smart filters + saved views
- Batch 2 — timetable intelligence + rendering/readability fixes + list view restoration
- Batch 3 — Rooms / Groups / Courses+Sessions CSV bulk import
- Final phase — docs, polish, QA closure, and release sync
