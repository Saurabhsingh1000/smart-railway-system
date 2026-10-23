#!/usr/bin/env bash
# ============================================================================
# SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
# File: db/restore.sh
# Description: Automated pg_restore script for point-in-time database recovery.
# ============================================================================

set -e

if [ -z "$1" ]; then
    echo "Usage: ./db/restore.sh <path_to_dump_file>"
    exit 1
fi

BACKUP_FILE="$1"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-smart_railway}"
PGPASSWORD="${DB_PASSWORD:-postgres}"
export PGPASSWORD

echo "==> Restoring $DB_NAME from $BACKUP_FILE..."
pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists -v "$BACKUP_FILE"

echo "==> Database restore completed successfully!"
