-- ============================================================================
-- DEMO 1: SESSION A — Last Seat Row-Level Locking (Pessimistic Concurrency)
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Open Terminal 1 (psql -U postgres -d smart_railway)
-- 2. Execute statements step-by-step as numbered below.
-- ----------------------------------------------------------------------------

-- Step 1: Start Transaction in Session A
BEGIN;

-- Step 2: Lock the target seat row using FOR UPDATE
-- This places an Exclusive Row-Level Lock (X-lock) on the selected seat.
SELECT schedule_id, seat_id, status, version 
FROM seat_inventory 
WHERE schedule_id = 1 AND seat_id = 1
FOR UPDATE;

-- >>> NOW GO TO SESSION B (Terminal 2) AND EXECUTE STEP 2 THERE <<<
-- Notice that Session B will BLOCK (hangs waiting on lock acquisition).

-- Step 3: Session A completes booking and updates inventory to BOOKED
UPDATE seat_inventory 
SET status = 'BOOKED' 
WHERE schedule_id = 1 AND seat_id = 1;

-- Step 4: Commit Transaction in Session A
-- Upon COMMIT, the row lock is released, instantaneously unblocking Session B!
COMMIT;

-- >>> OBSERVE SESSION B: It now resumes, reads the committed row, sees status = 'BOOKED',
-- and cleanly diverts the user to the Waiting List instead of double-booking! <<<
