-- ============================================================================
-- DEMO 1: SESSION B — Last Seat Contention & Clean Waitlist Divert
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Open Terminal 2 (psql -U postgres -d smart_railway)
-- 2. Follow sequence after Session A has executed Step 2.
-- ----------------------------------------------------------------------------

-- Step 1: Start Transaction in Session B
BEGIN;

-- Step 2: Attempt to lock the EXACT SAME seat row that Session A locked
-- CRITICAL OBSERVATION: This query will IMMEDIATELY BLOCK!
-- PostgreSQL halts Session B at the lock queue until Session A issues COMMIT or ROLLBACK.
SELECT schedule_id, seat_id, status, version 
FROM seat_inventory 
WHERE schedule_id = 1 AND seat_id = 1
FOR UPDATE;

-- Step 3: [Session B unblocks after Session A commits]
-- Check the status of the unblocked row:
-- Notice: status is now 'BOOKED'!
-- In application logic, because status is not 'FREE', Session B detects seat loss
-- and allocates a Waiting List (WL) spot instead of corrupting seat state.

-- Step 4: Session B completes transaction cleanly
COMMIT;
