#!/usr/bin/env bash
# ============================================================================
# SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
# File: db/backup.sh
# Description: Automated pg_dump backup script with custom archive format.
# ============================================================================

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-smart_railway}"
PGPASSWORD="${DB_PASSWORD:-postgres}"
export PGPASSWORD

BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "==> Creating custom-format pg_dump backup of $DB_NAME..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -F c -b -v -f "$BACKUP_FILE" "$DB_NAME"

echo "==> Backup successfully created at: $BACKUP_FILE"
