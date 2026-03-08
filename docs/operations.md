# Operations Guide

## Live deployment
- Domain: `https://demostb.duckdns.org`
- App service: `students-timetable.service`
- Reverse proxy: Caddy
- App path: `/home/ubuntu/.openclaw/workspace/students-timetable-app`

## Canonical architecture
- Product model: Workspace / Course / Group / Instructor / Room
- Auth: NextAuth credentials-only (OAuth providers currently disabled intentionally)
- DB: PostgreSQL
- Realtime: deferred/removed from live path for this release

## Environment
Active env file:
- `/home/ubuntu/.openclaw/workspace/students-timetable-app/.env`

Current permission target:
- `600`
- owner: `ubuntu:ubuntu`

## Build / deploy
```bash
cd /home/ubuntu/.openclaw/workspace/students-timetable-app
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
sudo systemctl restart students-timetable.service
```

## Health / verification
```bash
sudo systemctl status students-timetable.service --no-pager
curl https://demostb.duckdns.org/api/health
curl -I https://demostb.duckdns.org/auth
curl -I https://demostb.duckdns.org/workspace
```

## Database
- Runtime DB: PostgreSQL
- Host: `127.0.0.1:5432`
- DB name: `students_timetable`
- DB user: `students_timetable_app`

## Backups
Backup script:
- `scripts/backup_postgres.sh`

systemd backup units:
- `students-timetable-backup.service`
- `students-timetable-backup.timer`

Schedule:
- daily at `03:30 UTC`

Backup location:
- `backups/postgres/`

Manual backup:
```bash
/home/ubuntu/.openclaw/workspace/students-timetable-app/scripts/backup_postgres.sh
```

## Rollback
SQLite rollback assets are preserved in:
- `backups/dev-*.db`
- `backups/.env-pre-postgres-*`

If PostgreSQL rollback is required:
1. restore previous `.env` with SQLite `DATABASE_URL`
2. restore previous Prisma schema/migration state if needed
3. restart `students-timetable.service`
4. use the preserved SQLite DB backup as the rollback source of truth

## OAuth provider state
- Google: disabled intentionally
- GitHub: disabled intentionally

Do not re-enable until:
- provider dashboard settings are verified
- secrets are rotated/confirmed
- end-to-end login/logout/session tests pass in production
- logs stay clean

## GitHub sync status
The local repo is committed, but push from this VPS is currently blocked because GitHub credentials are not configured on the machine.

## Recommended next maintenance tasks
- configure authenticated Git push from VPS or push from a trusted local environment
- review and remove legacy timetable data structures once no longer needed
- add automated regression coverage for auth, CRUD, and account flows
