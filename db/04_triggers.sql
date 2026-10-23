-- ============================================================================
-- SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
-- File: db/04_triggers.sql
-- Description: Business integrity triggers for auto waitlist promotion,
-- optimistic lock versioning, audit logging, and double-allocation prevention.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. trg_promote_waitlist
-- Fires AFTER UPDATE on seat_inventory when status goes from 'BOOKED' to 'FREE'
-- Automatically invokes promote_waiting_list() for the freed seat.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trigger_promote_waitlist()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_class VARCHAR(10);
BEGIN
    -- Only trigger when a booked seat is released back to free
    IF OLD.status = 'BOOKED' AND NEW.status = 'FREE' THEN
        -- Resolve travel class of the freed seat
        SELECT c.class INTO v_class
        FROM seats s
        JOIN coaches c ON c.coach_id = s.coach_id
        WHERE s.seat_id = NEW.seat_id;

        IF v_class IS NOT NULL THEN
            -- Attempt auto-promotion of next waiting passenger
            PERFORM promote_waiting_list(NEW.schedule_id, v_class, NEW.seat_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_waitlist ON seat_inventory;
CREATE TRIGGER trg_promote_waitlist
AFTER UPDATE ON seat_inventory
FOR EACH ROW
WHEN (OLD.status = 'BOOKED' AND NEW.status = 'FREE')
EXECUTE FUNCTION fn_trigger_promote_waitlist();


-- ----------------------------------------------------------------------------
-- 2. trg_seat_version
-- Fires BEFORE UPDATE on seat_inventory to auto-increment version number.
-- Powers optimistic concurrency control checks (UPDATE ... WHERE version = $n).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trigger_seat_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.version := OLD.version + 1;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seat_version ON seat_inventory;
CREATE TRIGGER trg_seat_version
BEFORE UPDATE ON seat_inventory
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_seat_version();


-- ----------------------------------------------------------------------------
-- 3. trg_audit_booking_status
-- Fires AFTER INSERT OR UPDATE on bookings to maintain an immutable audit trail.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trigger_audit_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, action, pnr, old_status, new_status, changed_at)
        VALUES ('bookings', 'INSERT', NEW.pnr, NULL, NEW.status, CURRENT_TIMESTAMP);
    ELSIF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO audit_log (table_name, action, pnr, old_status, new_status, changed_at)
        VALUES ('bookings', 'UPDATE', NEW.pnr, OLD.status, NEW.status, CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_booking_status ON bookings;
CREATE TRIGGER trg_audit_booking_status
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_audit_booking_status();


-- ----------------------------------------------------------------------------
-- 4. trg_prevent_double_assign
-- Fires BEFORE INSERT OR UPDATE on passengers.
-- Serves as an invariant safety net ensuring no two passengers are ever
-- concurrently assigned the exact same seat on the same schedule run.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trigger_prevent_double_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_schedule_id INT;
    v_conflict_pnr VARCHAR(10);
BEGIN
    -- Only evaluate when seat is assigned and passenger is confirmed
    IF NEW.seat_id IS NOT NULL AND NEW.status = 'CONFIRMED' THEN
        -- Obtain schedule ID of current booking
        SELECT schedule_id INTO v_schedule_id
        FROM bookings
        WHERE pnr = NEW.pnr;

        -- Search for any conflicting confirmed passenger on the same schedule and seat
        SELECT p.pnr INTO v_conflict_pnr
        FROM passengers p
        JOIN bookings b ON b.pnr = p.pnr
        WHERE b.schedule_id = v_schedule_id
          AND p.seat_id = NEW.seat_id
          AND p.status = 'CONFIRMED'
          AND (TG_OP = 'INSERT' OR p.passenger_id <> NEW.passenger_id)
        LIMIT 1;

        IF v_conflict_pnr IS NOT NULL THEN
            RAISE EXCEPTION 'Double allocation violation: Seat % is already assigned to confirmed passenger on PNR % for schedule %',
                NEW.seat_id, v_conflict_pnr, v_schedule_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_double_assign ON passengers;
CREATE TRIGGER trg_prevent_double_assign
BEFORE INSERT OR UPDATE ON passengers
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_prevent_double_assign();
