# Students Timetable — PostgreSQL Cutover Plan (Executed)

## Current State (Verified)

- Runtime datasource in `prisma/schema.prisma` is `sqlite`.
- `prisma/migration_lock.toml` says `provider = "postgresql"`.
- Existing migration history:
  - `20260306134021_init_mvp`
  - `20260306225959_workspace_v1_foundation`
- `prisma migrate status` is currently invalid because provider history and runtime provider do not match.
- Current live SQLite data is small enough to migrate safely.
- Current schema is portable to PostgreSQL (`prisma validate` + `prisma migrate diff --from-empty --to-schema` succeeded with a temporary PostgreSQL schema copy).

## Decision

### Canonical production database
Use **PostgreSQL**.

### Existing migration history decision
**Recreate cleanly** instead of attempting to repair the current migration history.

Reason:
- existing migrations belong to a mismatched provider state
- the app evolved across legacy + workspace product phases
- trying to salvage current migration history adds more risk than creating one clean baseline from the current schema

### Data preservation decision
**Preserve and migrate existing SQLite data**.

Reason:
- live user/workspace data exists
- data volume is currently small
- a scripted one-time migration is low risk and easy to verify

## Chosen PostgreSQL landing zone

Use the existing host PostgreSQL instance currently exposed by the `memory-postgres` container, but create:
- a dedicated database
- a dedicated database user
- a dedicated password

This avoids introducing a second Postgres service during product completion while still isolating the Students Timetable app from the memory database at the DB/user level.

## Exact Cutover Sequence

1. **Pre-cutover backup**
   - stop writes briefly (maintenance window)
   - copy `dev.db` to a timestamped backup path
   - export app data from SQLite to JSON as a second safety net

2. **Provision isolated Postgres target**
   - create DB user: `students_timetable_app`
   - create DB: `students_timetable`
   - grant ownership/privileges only for that DB

3. **Prepare schema for Postgres**
   - switch `prisma/schema.prisma` datasource provider to `postgresql`
   - update `DATABASE_URL` to the new PostgreSQL DSN

4. **Reset migration history cleanly**
   - archive current `prisma/migrations` directory for reference
   - generate a new baseline migration from the current schema
   - apply baseline migration to the new PostgreSQL DB

5. **Data migration**
   - run one-time migration script from SQLite → PostgreSQL
   - migrate at minimum:
     - `User`
     - `Account`
     - `Session`
     - `VerificationToken`
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
     - legacy timetable tables still present in schema (`Timetable`, `TimetableMember`, `TimetableEvent`, `ShareLink`, `AuditLog`) so existing data is not dropped during transition

6. **Application validation before swap**
   - `npx prisma generate`
   - `npx prisma migrate status`
   - `npm run build`
   - authenticated route smoke tests against PostgreSQL-backed runtime

7. **Production swap**
   - update `.env` `DATABASE_URL`
   - restart `students-timetable.service`
   - verify live routes + auth + CRUD

8. **Post-cutover verification**
   - verify app boot
   - verify auth session still works
   - verify workspace creation/deletion
   - verify account export/delete on throwaway account
   - verify `prisma migrate status` is healthy

## Rollback Plan

If any cutover step fails after deployment:
1. restore previous `.env` with SQLite `DATABASE_URL`
2. restore previous `prisma/schema.prisma`
3. restart `students-timetable.service`
4. keep `dev.db` backup as source of truth
5. investigate/fix migration issues offline before retry

Rollback is low risk because SQLite source data remains untouched until PostgreSQL runtime is verified.

## Required Env / Service Changes

- `.env`
  - `DATABASE_URL` → PostgreSQL connection string
- systemd service
  - no unit-path change required if `.env` path stays the same
- no Caddy change required

## Verification Checklist After Cutover

- `/auth` loads
- credentials login works
- `/workspace` accessible after login
- `/account` loads and saves profile
- workspace CRUD still works
- key API routes return success
- `prisma migrate status` returns healthy PostgreSQL state
- no provider mismatch remains

## Deferred Notes

- Realtime has been explicitly deferred/removed from the live product path; see `docs/realtime-decision.md`.
- Legacy timetable tables can be removed later only after confirming they are no longer needed for compatibility/data retention.
