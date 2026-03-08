#!/usr/bin/env python3
import json
import sqlite3
from datetime import datetime
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb

SQLITE_PATH = Path(__file__).resolve().parents[1] / 'dev.db'
POSTGRES_DSN = "postgresql://students_timetable_app:poNBOi8MVtzeDW_5hhQXbffODaKY7s9K@127.0.0.1:5432/students_timetable?sslmode=disable"

TABLES = [
    'User',
    'VerificationToken',
    'Account',
    'Session',
    'Timetable',
    'Workspace',
    'TimetableMember',
    'WorkspaceMember',
    'AcademicGroup',
    'Instructor',
    'Room',
    'Course',
    'TimetableEvent',
    'SessionEntry',
    'ShareLink',
    'WorkspaceShareLink',
    'WorkspaceRevision',
    'AuditLog',
    'OtpCode',
]

JSON_COLUMNS = {
    'Timetable': {'days'},
    'AuditLog': {'payload'},
    'WorkspaceRevision': {'snapshot'},
}

BOOL_COLUMNS = {
    'Timetable': {'allowOverlap'},
    'ShareLink': {'revoked'},
    'WorkspaceShareLink': {'revoked'},
}

DATETIME_COLUMNS = {
    'User': {'emailVerified', 'emailVerifiedAt', 'createdAt', 'updatedAt'},
    'Session': {'expires'},
    'VerificationToken': {'expires'},
    'Timetable': {'createdAt', 'updatedAt'},
    'TimetableMember': {'createdAt'},
    'TimetableEvent': {'createdAt', 'updatedAt'},
    'ShareLink': {'createdAt'},
    'AuditLog': {'createdAt'},
    'Workspace': {'createdAt', 'updatedAt'},
    'WorkspaceMember': {'createdAt', 'updatedAt'},
    'AcademicGroup': {'createdAt', 'updatedAt'},
    'Instructor': {'createdAt', 'updatedAt'},
    'Room': {'createdAt', 'updatedAt'},
    'Course': {'createdAt', 'updatedAt'},
    'SessionEntry': {'createdAt', 'updatedAt'},
    'WorkspaceShareLink': {'expiresAt', 'createdAt'},
    'WorkspaceRevision': {'createdAt'},
    'OtpCode': {'expiresAt', 'consumedAt', 'createdAt'},
}


def parse_datetime(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        normalized = value.replace('Z', '+00:00')
        try:
            return datetime.fromisoformat(normalized)
        except ValueError:
            return datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
    return value


def convert_value(table, column, value):
    if value is None:
        return None
    if column in JSON_COLUMNS.get(table, set()):
        return Jsonb(json.loads(value) if isinstance(value, str) else value)
    if column in BOOL_COLUMNS.get(table, set()):
        return bool(value)
    if column in DATETIME_COLUMNS.get(table, set()):
        return parse_datetime(value)
    return value


def main():
    if not SQLITE_PATH.exists():
        raise SystemExit(f'SQLite database not found: {SQLITE_PATH}')

    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    pg_conn = psycopg.connect(POSTGRES_DSN)

    total_rows = 0
    try:
        with pg_conn.transaction():
            with pg_conn.cursor() as cur:
                for table in reversed(TABLES):
                    cur.execute(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE;')

                for table in TABLES:
                    rows = sqlite_conn.execute(f'SELECT * FROM "{table}"').fetchall()
                    if not rows:
                        print(f'{table}: 0')
                        continue

                    columns = rows[0].keys()
                    quoted_columns = ', '.join(f'"{column}"' for column in columns)
                    placeholders = ', '.join(['%s'] * len(columns))
                    sql = f'INSERT INTO "{table}" ({quoted_columns}) VALUES ({placeholders})'

                    values = [
                        tuple(convert_value(table, column, row[column]) for column in columns)
                        for row in rows
                    ]
                    cur.executemany(sql, values)
                    print(f'{table}: {len(rows)}')
                    total_rows += len(rows)
        print(f'Total migrated rows: {total_rows}')
    finally:
        sqlite_conn.close()
        pg_conn.close()


if __name__ == '__main__':
    main()
