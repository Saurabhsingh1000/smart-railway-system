# ============================================================================
# SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
# File: db/reset.ps1
# Description: PowerShell script to drop, recreate, migrate, and seed database.
# ============================================================================

$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "smart_railway" }
$env:PGPASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "postgres" }

Write-Host "==> Dropping and Recreating Database: $DB_NAME on $DB_HOST`:$DB_PORT" -ForegroundColor Cyan
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"

Write-Host "==> [1/7] Applying Schema (01_schema.sql)..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/01_schema.sql

Write-Host "==> [2/7] Applying Indexes (02_indexes.sql)..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/02_indexes.sql

Write-Host "==> [3/7] Loading Stored Procedures & Functions (03_functions.sql)..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/03_functions.sql

Write-Host "==> [4/7] Registering Triggers (04_triggers.sql)..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/04_triggers.sql

Write-Host "==> [5/7] Creating Views (05_views.sql)..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/05_views.sql

Write-Host "==> [6/7] Seeding Master Data (06_seed.sql)..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/06_seed.sql

Write-Host "==> [7/7] Generating Seat Inventory (07_generate_inventory.sql)..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/07_generate_inventory.sql

Write-Host "==> Database reset and initialization complete!" -ForegroundColor Green
