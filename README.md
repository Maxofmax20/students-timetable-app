# Students Timetable

Students Timetable is a workspace-based academic scheduling platform for managing courses, sessions, groups, instructors, rooms, and timetable views in one structured system. It is designed for institutions that need a reliable operational layer behind a timetable, not just a visual calendar. The product combines resource management, scheduling intelligence, and import workflows so academic data can be created, validated, and maintained consistently.

**Live:** <https://demostb.duckdns.org>

---

## Key Features

### Scheduling and timetable management
- Weekly timetable with **Grid** and **List** views
- Day-focused mobile timetable behavior for better readability on smaller screens
- Timetable intelligence controls for:
  - session type visibility
  - group and subgroup focus
  - delivery mode filtering
  - conflict visibility
  - reset and active filter state handling

### Course and session management
- One **Course** can contain **multiple sessions**
- Session-aware create and edit flows
- Support for mixed delivery models within the same course structure
- Session types:
  - `LECTURE`
  - `SECTION`
  - `LAB`
  - `ONLINE`
  - `HYBRID`

### Academic resource management
- Hierarchical academic groups with main-group and subgroup relationships
- Structured rooms with building metadata and derived level information
- Dedicated management surfaces for:
  - Courses
  - Groups
  - Rooms
  - Instructors

### Productivity features
- Smart filters on course management surfaces
- Saved views for frequently used course filters
- Browser-local persistence for saved views

### Bulk import workflows
- CSV import for **Rooms**
- CSV import for **Groups**
- CSV import for **Courses + Sessions**
- Preview-before-import validation flow
- Explicit duplicate reporting
- Create-only import behavior to avoid silent overwrites

### Authentication and account flows
- Email/password authentication
- Email verification flow
- Forgot/reset password flow
- OTP-based verification and reset support
- Account profile and security screens

---

## Core Concepts / Data Model

Students Timetable is built around a workspace-oriented academic model.

### Workspace
A workspace is the top-level scheduling boundary. It owns scheduling resources, settings, and timetable data.

### Course → multiple sessions
A course is the academic unit. Each course can contain multiple session rows, which makes it possible to represent combinations such as lecture + lab + section without duplicating the course itself.

### Session types
Sessions are first-class scheduling objects and support these types:
- `LECTURE`
- `SECTION`
- `LAB`
- `ONLINE`
- `HYBRID`

Online and hybrid sessions can also store platform and link metadata.

### Academic group hierarchy
Groups support a parent-child hierarchy using main groups and subgroups.

Examples:
- `A`
- `A1`
- `A2`
- `B`
- `B1`

### Structured rooms
Rooms are modeled with structured physical identity rather than freeform names alone.

Core room fields include:
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

## Architecture Overview

Students Timetable uses a modern web application architecture centered around a workspace domain model.

### Product architecture
Core domain entities include:
- `User`
- `Workspace`
- `WorkspaceMember`
- `Course`
- `SessionEntry`
- `AcademicGroup`
- `Instructor`
- `Room`
- `WorkspaceShareLink`
- `WorkspaceRevision`
- `OtpCode`

### Runtime architecture
- Web application served by Next.js
- PostgreSQL as the canonical production database
- Prisma as the data access layer
- NextAuth-based credentials authentication
- SMTP-backed email/OTP flows
- Caddy as reverse proxy in production
- systemd-managed application runtime in production

### Production source of truth
The canonical production repository path is:

```bash
/home/ubuntu/.openclaw/workspace/students-timetable-app
```

If multiple local copies exist, treat that path as the source of truth for production deployment and maintenance.

---

## Technology Stack

- **Framework:** Next.js 16
- **UI:** React 19 + TypeScript
- **Styling:** Tailwind CSS + design-token based CSS variables
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** NextAuth
- **Email delivery:** Nodemailer / SMTP
- **Validation:** Zod
- **State management:** Zustand
- **Deployment model:** Caddy + systemd + Next.js production server

---

## Getting Started (Local Dev)

### Prerequisites
- Node.js 22+
- npm
- PostgreSQL
- a configured `.env` file

### Install dependencies
```bash
git clone <your-fork-or-repo-url>
cd students-timetable-app
npm install
npx prisma generate
```

### Apply database migrations
```bash
npx prisma migrate deploy
```

### Start the development server
```bash
npm run dev
```

### Run a production build locally
```bash
npm run build
```

---

## Environment Variables

A starter template is available in [`.env.example`](.env.example).

### Core application
- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`

### Email / OTP
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### Optional OAuth toggles
- `AUTH_ENABLE_GOOGLE`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_ENABLE_GITHUB`
- `GITHUB_ID`
- `GITHUB_SECRET`

OAuth flags are available in configuration, but the live product is currently operated with credentials-based auth.

---

## Deployment

### Production path
```bash
cd /home/ubuntu/.openclaw/workspace/students-timetable-app
```

### Standard deployment flow
```bash
git pull
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
sudo systemctl restart students-timetable.service
```

### Health checks
```bash
sudo systemctl status students-timetable.service --no-pager
curl https://demostb.duckdns.org/api/health
curl -I https://demostb.duckdns.org/auth
curl -I https://demostb.duckdns.org/workspace
```

### Production notes
- Reverse proxy: Caddy
- App runtime: `students-timetable.service`
- Database: PostgreSQL

---

## Documentation Links

- [CSV Import Guide](docs/import-csv.md)
- [Operations Guide](docs/operations.md)
- [Release Summary](docs/release-phase-summary-2026-03.md)
- [Realtime Decision](docs/realtime-decision.md)
- [PostgreSQL Cutover Plan](docs/postgres-cutover-plan.md)

---

## Limitations

- Bulk import is currently **create-only**. Update, merge, and replace-style imports are not implemented.
- Instructor resolution in course import is intentionally strict for safety.
- OAuth providers are configured as optional but are not the primary live authentication path.
- Legacy timetable-era tables remain in schema for compatibility and data retention and should only be removed deliberately.

---

## Roadmap

High-level areas for future development include:
- richer import and synchronization workflows
- bulk instructor import
- broader automated regression coverage
- operational/admin tooling improvements
- long-term schema cleanup of legacy timetable-era structures once compatibility requirements are fully retired

---

## License

License information has not been finalized yet.
