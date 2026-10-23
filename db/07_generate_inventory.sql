-- ============================================================================
-- SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
-- File: db/07_generate_inventory.sql
-- Description: Generates seat inventory rows across all active schedules.
-- Produces over 130,000+ seat_inventory records to satisfy DBMS project
-- requirements for realistic EXPLAIN ANALYZE query plan comparisons.
-- ============================================================================

DO $$
DECLARE
    v_total_inventory_inserted BIGINT;
BEGIN
    RAISE NOTICE 'Generating seat inventory records for all schedules...';

    -- Bulk insert cross-join of schedules and their corresponding train seats
    INSERT INTO seat_inventory (schedule_id, seat_id, status, version)
    SELECT 
        sch.schedule_id,
        s.seat_id,
        'FREE' AS status,
        0 AS version
    FROM schedules sch
    JOIN coaches c ON c.train_id = sch.train_id
    JOIN seats s ON s.coach_id = c.coach_id
    ON CONFLICT (schedule_id, seat_id) DO NOTHING;

    GET DIAGNOSTICS v_total_inventory_inserted = ROW_COUNT;
    RAISE NOTICE 'Successfully generated % seat inventory records.', v_total_inventory_inserted;
END;
$$;
