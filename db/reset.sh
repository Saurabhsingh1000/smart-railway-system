#!/usr/bin/env bash
# ============================================================================
# SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
# File: db/reset.sh
# Description: Automated database drop, recreation, migration, and seeding.
# ============================================================================

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-smart_railway}"
PGPASSWORD="${DB_PASSWORD:-postgres}"
export PGPASSWORD

echo "==> Dropping and Recreating Database: $DB_NAME on $DB_HOST:$DB_PORT"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

echo "==> [1/7] Applying Schema (01_schema.sql)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/01_schema.sql

echo "==> [2/7] Applying Indexes (02_indexes.sql)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/02_indexes.sql

echo "==> [3/7] Loading Stored Procedures & Functions (03_functions.sql)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/03_functions.sql

echo "==> [4/7] Registering Triggers (04_triggers.sql)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/04_triggers.sql

echo "==> [5/7] Creating Views (05_views.sql)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/05_views.sql

echo "==> [6/7] Seeding Master Data (06_seed.sql)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/06_seed.sql

echo "==> [7/7] Generating Seat Inventory (07_generate_inventory.sql)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/07_generate_inventory.sql

echo "==> Database reset and initialization complete!"
