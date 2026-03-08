#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/home/ubuntu/.openclaw/workspace/students-timetable-app/backups/postgres"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/students_timetable_$STAMP.sql.gz"
LATEST_LINK="$BACKUP_DIR/latest.sql.gz"

/usr/bin/docker exec memory-postgres pg_dump -U memory -d students_timetable --clean --if-exists --no-owner --no-privileges \
  | /usr/bin/gzip -9 > "$OUT"

ln -sfn "$OUT" "$LATEST_LINK"
find "$BACKUP_DIR" -type f -name 'students_timetable_*.sql.gz' -mtime +14 -delete

echo "backup_written=$OUT"
