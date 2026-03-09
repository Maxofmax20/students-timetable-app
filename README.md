# Students Timetable

Production-deployed scheduling workspace for managing university courses, groups, instructors, rooms, and timetables.

**Live:** <https://demostb.duckdns.org>

## Architecture

- **Framework:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS, CSS custom properties (dark theme)
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth (credentials only; Google/GitHub OAuth disabled)
- **Runtime:** Caddy reverse proxy → Next.js production server
- **Icons:** Material Symbols Outlined

### Data model (Workspace platform)
- `User` → owns `Workspace`
- `Workspace` → has `Course`, `AcademicGroup`, `Instructor`, `Room`, `SessionEntry`
- `Workspace` stores persisted settings (time format, week start, conflict policy, dense mode, auto-save, font scale, animations, snap interval, smart placement)

### Routing model
Workspace tabs use query-param routing on a single page:
- `/workspace?tab=Dashboard` — overview, stats, quick actions
- `/workspace?tab=Timetable` — weekly grid/list schedule view
- `/workspace?tab=Courses` — course catalog with search, CRUD
- `/workspace?tab=Settings` — persisted workspace configuration

Resource pages use dedicated routes:
- `/workspace/groups` — student group management
- `/workspace/instructors` — faculty management
- `/workspace/rooms` — room/facility management

Other routes:
- `/auth` — login/register
- `/account` — profile, security, data export/deletion
- `/api/health` — health check

## Current state

### Auth
- **Active:** email/password credentials via NextAuth
- **Disabled:** Google OAuth, GitHub OAuth (intentionally disabled until provider dashboards are reconfigured)

### Database
- **Provider:** PostgreSQL (production)
- **Migrations:** up to date (`prisma migrate deploy`)
- **Settings persistence:** all workspace settings stored in `Workspace` table

### Settings persistence
| Setting | Storage | Notes |
|---------|---------|-------|
| Time format (12h/24h) | Workspace DB | `timeFormat` column |
| Week start | Workspace DB | `weekStart` column |
| Conflict policy | Workspace DB | `conflictMode` column |
| Snap interval | Workspace DB | `snapMinutes` column |
| Dense mode | Workspace DB | `denseRows` column |
| Auto-save | Workspace DB | `autoSave` column |
| Smart placement | Workspace DB | `smartPlacement` column |
| Font scale | Workspace DB | `fontScale` column (debounced save) |
| Animations | Workspace DB | `animationsEnabled` column |
| Mini-map | Client only | Not rendered in settings UI; internal state only |

### Realtime
Deferred/removed for this release. See `docs/realtime-decision.md`.

### Export
- JSON export available from Settings → Data & Security
- ICS calendar export button in Timetable view
- Account data export from `/account`

## Production deployment

### Canonical paths
- **Repo:** `/home/ubuntu/timetable`
- **Reverse proxy:** Caddy (`/etc/caddy/Caddyfile`)
- **Domain:** `demostb.duckdns.org`

### Environment variables (`.env`)
```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://demostb.duckdns.org"
AUTH_ENABLE_GOOGLE="false"
AUTH_ENABLE_GITHUB="false"
```

### Deploy/update
```bash
cd /home/ubuntu/timetable
git pull
npm install
npx prisma generate
npx prisma migrate deploy
npx next build
# Kill old process, then:
nohup npx next start > next.log 2>&1 &
```

### Health check
```bash
curl https://demostb.duckdns.org/api/health
```

## Local development

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

## Backups
- Script: `scripts/backup_postgres.sh`
- Storage: `backups/postgres/`

## Known limitations
- OAuth providers disabled until provider dashboard reconfiguration
- Legacy timetable data structures remain in schema for data retention
- Mini-map setting is client-side only (not rendered in UI)
- Font scale save is debounced (500ms) to avoid excessive API calls

## Next recommended enhancements
1. Re-enable OAuth after provider dashboard verification
2. Add automated integration tests for auth and CRUD flows
3. Remove legacy timetable schema after compatibility review
4. Add workspace collaboration/sharing UI
5. Add bulk import for courses (CSV/Excel)
6. Add systemd service for production process management
