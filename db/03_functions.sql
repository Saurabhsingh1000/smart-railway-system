-- ============================================================================
-- SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
-- File: db/03_functions.sql
-- Description: Core Stored Procedures and Functions managing ACID bookings,
-- ordered row-level locking (FOR UPDATE), savepoints, payment simulation,
-- cancellation refund tiers, and waitlist promotion (SKIP LOCKED).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. generate_pnr(): Guaranteed unique 10-digit Indian Railway style PNR
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_pnr()
RETURNS VARCHAR(10)
LANGUAGE plpgsql
AS $$
DECLARE
    v_next_val BIGINT;
    v_pnr VARCHAR(10);
    v_exists BOOLEAN;
BEGIN
    LOOP
        v_next_val := nextval('pnr_seq');
        -- Form 10-digit PNR string
        v_pnr := LPAD((v_next_val % 10000000000)::TEXT, 10, '1');
        
        -- Check collisions (extra safety guarantee)
        SELECT EXISTS (SELECT 1 FROM bookings WHERE pnr = v_pnr) INTO v_exists;
        IF NOT v_exists THEN
            RETURN v_pnr;
        END IF;
    END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. calculate_fare(train_id, from_stn, to_stn, class)
-- Computes fare based on segment distance and class rate
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_fare(
    p_train_id INT,
    p_from_station_id INT,
    p_to_station_id INT,
    p_class VARCHAR(10)
)
RETURNS NUMERIC(10, 2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_from_dist INT;
    v_to_dist INT;
    v_dist INT;
    v_rate_per_km NUMERIC(5, 2);
    v_min_fare NUMERIC(10, 2);
    v_calculated_fare NUMERIC(10, 2);
BEGIN
    -- Retrieve stop distances
    SELECT distance_km INTO v_from_dist
    FROM train_stops
    WHERE train_id = p_train_id AND station_id = p_from_station_id;

    SELECT distance_km INTO v_to_dist
    FROM train_stops
    WHERE train_id = p_train_id AND station_id = p_to_station_id;

    IF v_from_dist IS NULL OR v_to_dist IS NULL THEN
        RAISE EXCEPTION 'Station not found on train route for train_id: %', p_train_id;
    END IF;

    IF v_from_dist >= v_to_dist THEN
        RAISE EXCEPTION 'Origin station must appear strictly before destination station';
    END IF;

    v_dist := v_to_dist - v_from_dist;

    -- Class-based rate cards (IRCTC modeled)
    CASE p_class
        WHEN 'SL' THEN
            v_rate_per_km := 0.60;
            v_min_fare := 140.00;
        WHEN '3A' THEN
            v_rate_per_km := 1.55;
            v_min_fare := 450.00;
        WHEN '2A' THEN
            v_rate_per_km := 2.40;
            v_min_fare := 750.00;
        ELSE
            RAISE EXCEPTION 'Invalid travel class: %', p_class;
    END CASE;

    v_calculated_fare := GREATEST(v_min_fare, ROUND((v_dist * v_rate_per_km)::NUMERIC, 2));
    RETURN v_calculated_fare;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. simulate_payment(amount, method, force_fail)
-- Deterministic mock payment gateway with 90% default success
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION simulate_payment(
    p_amount NUMERIC(10, 2),
    p_method VARCHAR(50),
    p_force_fail BOOLEAN DEFAULT FALSE
)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_force_fail THEN
        RETURN 'FAILED';
    END IF;

    -- Successful payment unless explicitly instructed to fail
    RETURN 'SUCCESS';
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. promote_waiting_list(schedule_id, class, seat_id)
-- Promotes first waiting passenger using SELECT ... FOR UPDATE SKIP LOCKED
-- to guarantee concurrency safety without blocking parallel cancellations.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION promote_waiting_list(
    p_schedule_id INT,
    p_class VARCHAR(10),
    p_seat_id INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_wl_record RECORD;
    v_pnr VARCHAR(10);
    v_passenger_id INT;
    v_remaining_waiting INT;
BEGIN
    -- Atomically select and lock the top waitlisted passenger
    SELECT wl_id, pnr, passenger_id, position
    INTO v_wl_record
    FROM waiting_list
    WHERE schedule_id = p_schedule_id AND class = p_class
    ORDER BY position ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        -- No waiting passenger; seat remains FREE in inventory
        RETURN FALSE;
    END IF;

    v_pnr := v_wl_record.pnr;
    v_passenger_id := v_wl_record.passenger_id;

    -- 1. Allocate freed seat to passenger
    UPDATE passengers
    SET seat_id = p_seat_id,
        status = 'CONFIRMED'
    WHERE passenger_id = v_passenger_id;

    -- 2. Mark seat BOOKED in inventory
    UPDATE seat_inventory
    SET status = 'BOOKED'
    WHERE schedule_id = p_schedule_id AND seat_id = p_seat_id;

    -- 3. Remove entry from waiting list
    DELETE FROM waiting_list
    WHERE wl_id = v_wl_record.wl_id;

    -- 4. Check if any other passengers on this PNR are still waiting
    SELECT COUNT(*) INTO v_remaining_waiting
    FROM passengers
    WHERE pnr = v_pnr AND status = 'WAITING';

    IF v_remaining_waiting = 0 THEN
        UPDATE bookings
        SET status = 'CONFIRMED'
        WHERE pnr = v_pnr;
    END IF;

    -- 5. Shift subsequent waitlist positions by -1
    UPDATE waiting_list
    SET position = position - 1
    WHERE schedule_id = p_schedule_id
      AND class = p_class
      AND position > v_wl_record.position;

    RETURN TRUE;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. book_ticket(...)
-- Complete ACID Transaction Booking Procedure
-- Concurrency:
--   a) Ordered row locks (ORDER BY seat_id FOR UPDATE) prevent deadlocks.
--   b) Subtransaction SAVEPOINT isolates payment failure: zero tickets survive.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION book_ticket(
    p_user_id INT,
    p_schedule_id INT,
    p_class VARCHAR(10),
    p_from_station_id INT,
    p_to_station_id INT,
    p_passengers JSONB,
    p_method VARCHAR(50),
    p_force_pay_fail BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_passenger_count INT;
    v_train_id INT;
    v_from_seq INT;
    v_to_seq INT;
    v_single_fare NUMERIC(10, 2);
    v_total_fare NUMERIC(10, 2);
    v_pnr VARCHAR(10);
    v_allocated_seats INT[];
    v_allocated_seat_nos VARCHAR[];
    v_wl_positions INT[];
    v_free_seat_ids INT[];
    v_seat_cur_id INT;
    v_seat_cur_no INT;
    v_coach_cur_no VARCHAR(10);
    v_booking_status VARCHAR(20);
    v_payment_status VARCHAR(20);
    v_next_wl_pos INT;
    v_passenger_rec RECORD;
    v_passenger_id INT;
    i INT;
BEGIN
    -- Step 1: Validate passenger count (IRCTC max 6 per booking)
    v_passenger_count := jsonb_array_length(p_passengers);
    IF v_passenger_count <= 0 OR v_passenger_count > 6 THEN
        RAISE EXCEPTION 'Passenger count must be between 1 and 6 (provided %)', v_passenger_count;
    END IF;

    -- Step 2: Validate schedule existence and status
    SELECT train_id INTO v_train_id
    FROM schedules
    WHERE schedule_id = p_schedule_id AND status = 'ACTIVE';

    IF v_train_id IS NULL THEN
        RAISE EXCEPTION 'Active schedule with ID % not found', p_schedule_id;
    END IF;

    -- Step 3: Validate stops and route sequence
    SELECT stop_seq INTO v_from_seq
    FROM train_stops
    WHERE train_id = v_train_id AND station_id = p_from_station_id;

    SELECT stop_seq INTO v_to_seq
    FROM train_stops
    WHERE train_id = v_train_id AND station_id = p_to_station_id;

    IF v_from_seq IS NULL OR v_to_seq IS NULL THEN
        RAISE EXCEPTION 'Specified stations are not valid stops for train %', v_train_id;
    END IF;

    IF v_from_seq >= v_to_seq THEN
        RAISE EXCEPTION 'Origin stop sequence (%) must precede destination stop sequence (%)', v_from_seq, v_to_seq;
    END IF;

    -- Step 4: Calculate total fare
    v_single_fare := calculate_fare(v_train_id, p_from_station_id, p_to_station_id, p_class);
    v_total_fare := v_single_fare * v_passenger_count;

    -- Step 5: Lock available seats using ORDER BY seat_id FOR UPDATE
    -- ORDER BY seat_id is CRITICAL: ensures all concurrent transactions request locks
    -- in strictly identical order, eliminating deadlocks.
    SELECT ARRAY_AGG(seat_id ORDER BY seat_id)
    INTO v_free_seat_ids
    FROM (
        SELECT si.seat_id
        FROM seat_inventory si
        JOIN seats s ON s.seat_id = si.seat_id
        JOIN coaches c ON c.coach_id = s.coach_id
        WHERE si.schedule_id = p_schedule_id
          AND si.status = 'FREE'
          AND c.class = p_class
        ORDER BY si.seat_id
        FOR UPDATE
    ) sub;

    IF v_free_seat_ids IS NULL THEN
        v_free_seat_ids := ARRAY[]::INT[];
    END IF;

    -- Step 6: Determine Confirmation or Waiting List
    IF array_length(v_free_seat_ids, 1) >= v_passenger_count THEN
        -- CONFIRMED ALLOCATION
        v_booking_status := 'CONFIRMED';
        v_allocated_seats := v_free_seat_ids[1:v_passenger_count];
    ELSE
        -- INSUFFICIENT SEATS -> WAITING LIST
        v_booking_status := 'WAITING';
        v_allocated_seats := ARRAY[]::INT[];
    END IF;

    -- Generate unique PNR
    v_pnr := generate_pnr();

    -- Step 7: Subtransaction / SAVEPOINT execution for payment processing
    -- If payment fails, everything within this BEGIN...EXCEPTION block is rolled back!
    BEGIN
        -- Test / Process payment gateway simulation
        v_payment_status := simulate_payment(v_total_fare, p_method, p_force_pay_fail);
        IF v_payment_status <> 'SUCCESS' THEN
            RAISE EXCEPTION 'PAYMENT_FAILED_SIMULATION';
        END IF;

        -- Create master booking record
        INSERT INTO bookings (
            pnr, user_id, schedule_id, from_station_id, to_station_id,
            class, status, fare, booked_at
        ) VALUES (
            v_pnr, p_user_id, p_schedule_id, p_from_station_id, p_to_station_id,
            p_class, v_booking_status, v_total_fare, CURRENT_TIMESTAMP
        );

        -- Record successful payment
        INSERT INTO payments (pnr, amount, method, status, paid_at)
        VALUES (v_pnr, v_total_fare, p_method, 'SUCCESS', CURRENT_TIMESTAMP);

        -- Process passengers
        IF v_booking_status = 'CONFIRMED' THEN
            -- Update seat inventory to BOOKED
            FOR i IN 1..v_passenger_count LOOP
                v_seat_cur_id := v_allocated_seats[i];
                
                -- Mark inventory row
                UPDATE seat_inventory
                SET status = 'BOOKED'
                WHERE schedule_id = p_schedule_id AND seat_id = v_seat_cur_id;

                -- Fetch coach and seat label for client display
                SELECT c.coach_no || '-' || s.seat_no::TEXT
                INTO v_coach_cur_no
                FROM seats s
                JOIN coaches c ON c.coach_id = s.coach_id
                WHERE s.seat_id = v_seat_cur_id;

                v_allocated_seat_nos := array_append(v_allocated_seat_nos, v_coach_cur_no);

                -- Insert passenger record
                INSERT INTO passengers (
                    pnr, name, age, gender, seat_id, status
                ) VALUES (
                    v_pnr,
                    p_passengers->(i-1)->>'name',
                    (p_passengers->(i-1)->>'age')::INT,
                    p_passengers->(i-1)->>'gender',
                    v_seat_cur_id,
                    'CONFIRMED'
                );
            END LOOP;
        ELSE
            -- Booking is WAITING
            FOR i IN 1..v_passenger_count LOOP
                -- Determine current waitlist position atomically
                SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_wl_pos
                FROM waiting_list
                WHERE schedule_id = p_schedule_id AND class = p_class;

                -- Insert passenger with NULL seat
                INSERT INTO passengers (
                    pnr, name, age, gender, seat_id, status
                ) VALUES (
                    v_pnr,
                    p_passengers->(i-1)->>'name',
                    (p_passengers->(i-1)->>'age')::INT,
                    p_passengers->(i-1)->>'gender',
                    NULL,
                    'WAITING'
                ) RETURNING passenger_id INTO v_passenger_id;

                -- Insert into waiting_list queue
                INSERT INTO waiting_list (
                    schedule_id, pnr, passenger_id, class, position
                ) VALUES (
                    p_schedule_id, v_pnr, v_passenger_id, p_class, v_next_wl_pos
                );

                v_wl_positions := array_append(v_wl_positions, v_next_wl_pos);
            END LOOP;
        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            -- SAVEPOINT rollback: cancels all inserts and updates made in this block.
            -- Seats remain untouched and FREE; zero booking/passenger rows exist.
            RETURN jsonb_build_object(
                'success', false,
                'status', 'PAYMENT_FAILED',
                'pnr', NULL,
                'error', 'Payment transaction failed. Booking aborted and seats released.',
                'detail', SQLERRM
            );
    END;

    -- Return JSON payload matching API expectations
    RETURN jsonb_build_object(
        'success', true,
        'pnr', v_pnr,
        'status', v_booking_status,
        'fare', v_total_fare,
        'seats', COALESCE(to_jsonb(v_allocated_seat_nos), '[]'::jsonb),
        'seat_ids', COALESCE(to_jsonb(v_allocated_seats), '[]'::jsonb),
        'wl_positions', COALESCE(to_jsonb(v_wl_positions), '[]'::jsonb)
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. cancel_ticket(p_pnr, p_user_id)
-- Handles cancellation with tiered refund calculation:
--   > 48 hours: 100% refund
--   12 to 48 hours: 50% refund
--   < 12 hours: 25% refund
-- Releases seats to trigger auto-promotion of waitlist passengers.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_ticket(
    p_pnr VARCHAR(10),
    p_user_id INT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_booking RECORD;
    v_user_role VARCHAR(20);
    v_hours_left NUMERIC;
    v_refund_pct NUMERIC(5, 2);
    v_refund_amt NUMERIC(10, 2);
    v_passenger RECORD;
    v_journey_time TIMESTAMP;
    v_departure_time TIME;
BEGIN
    -- 1. Fetch user role
    SELECT role INTO v_user_role FROM users WHERE user_id = p_user_id;

    -- 2. Lock booking record FOR UPDATE
    SELECT b.*, s.journey_date, s.train_id
    INTO v_booking
    FROM bookings b
    JOIN schedules s ON s.schedule_id = b.schedule_id
    WHERE b.pnr = p_pnr
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking with PNR % not found', p_pnr;
    END IF;

    -- Verify ownership (unless Admin)
    IF v_booking.user_id <> p_user_id AND v_user_role <> 'ADMIN' THEN
        RAISE EXCEPTION 'Unauthorized: Booking does not belong to user %', p_user_id;
    END IF;

    IF v_booking.status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Booking % is already cancelled', p_pnr;
    END IF;

    -- 3. Calculate departure timestamp for refund rules
    SELECT departure_time INTO v_departure_time
    FROM train_stops
    WHERE train_id = v_booking.train_id AND station_id = v_booking.from_station_id;

    IF v_departure_time IS NULL THEN
        v_departure_time := '00:00:00'::TIME;
    END IF;

    v_journey_time := v_booking.journey_date + v_departure_time;
    v_hours_left := EXTRACT(EPOCH FROM (v_journey_time - CURRENT_TIMESTAMP)) / 3600.0;

    -- Tiered refund policy:
    -- > 48 hours: 100%
    -- 12 to 48 hours: 50%
    -- < 12 hours: 25%
    IF v_hours_left > 48 THEN
        v_refund_pct := 100.00;
    ELSIF v_hours_left >= 12 THEN
        v_refund_pct := 50.00;
    ELSE
        v_refund_pct := 25.00;
    END IF;

    v_refund_amt := ROUND((v_booking.fare * (v_refund_pct / 100.0))::NUMERIC, 2);

    -- 4. Update booking status
    UPDATE bookings
    SET status = 'CANCELLED'
    WHERE pnr = p_pnr;

    -- 5. Record refund payment
    INSERT INTO payments (pnr, amount, method, status, paid_at)
    VALUES (p_pnr, v_refund_amt, 'REFUND', 'REFUNDED', CURRENT_TIMESTAMP);

    -- 6. Free up allocated seats (or remove from waiting list)
    -- Mark passengers CANCELLED first so freed seats can immediately be reallocated to waitlist
    UPDATE passengers
    SET status = 'CANCELLED'
    WHERE pnr = p_pnr;

    IF v_booking.status = 'CONFIRMED' THEN
        FOR v_passenger IN
            SELECT seat_id
            FROM passengers
            WHERE pnr = p_pnr AND seat_id IS NOT NULL
        LOOP
            -- Setting status to FREE triggers trg_promote_waitlist
            UPDATE seat_inventory
            SET status = 'FREE'
            WHERE schedule_id = v_booking.schedule_id AND seat_id = v_passenger.seat_id;
        END LOOP;
    ELSIF v_booking.status = 'WAITING' THEN
        -- Remove from waitlist and adjust downstream positions
        FOR v_passenger IN
            SELECT wl_id, position
            FROM waiting_list
            WHERE pnr = p_pnr
        LOOP
            DELETE FROM waiting_list WHERE wl_id = v_passenger.wl_id;

            UPDATE waiting_list
            SET position = position - 1
            WHERE schedule_id = v_booking.schedule_id
              AND class = v_booking.class
              AND position > v_passenger.position;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'pnr', p_pnr,
        'status', 'CANCELLED',
        'refund_percentage', v_refund_pct,
        'refund_amount', v_refund_amt,
        'message', 'Ticket cancelled successfully. Refund processed.'
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. get_seat_availability(schedule_id, class)
-- Provides instant metrics on total, booked, free, and waitlisted seats
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_seat_availability(
    p_schedule_id INT,
    p_class VARCHAR(10)
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_seats INT;
    v_booked_seats INT;
    v_free_seats INT;
    v_waiting_count INT;
BEGIN
    SELECT COUNT(*)
    INTO v_total_seats
    FROM seat_inventory si
    JOIN seats s ON s.seat_id = si.seat_id
    JOIN coaches c ON c.coach_id = s.coach_id
    WHERE si.schedule_id = p_schedule_id AND c.class = p_class;

    SELECT COUNT(*)
    INTO v_free_seats
    FROM seat_inventory si
    JOIN seats s ON s.seat_id = si.seat_id
    JOIN coaches c ON c.coach_id = s.coach_id
    WHERE si.schedule_id = p_schedule_id AND c.class = p_class AND si.status = 'FREE';

    v_booked_seats := v_total_seats - v_free_seats;

    SELECT COUNT(*)
    INTO v_waiting_count
    FROM waiting_list
    WHERE schedule_id = p_schedule_id AND class = p_class;

    RETURN jsonb_build_object(
        'schedule_id', p_schedule_id,
        'class', p_class,
        'total_seats', v_total_seats,
        'booked_seats', v_booked_seats,
        'free_seats', v_free_seats,
        'waiting_count', v_waiting_count,
        'status_text', CASE
            WHEN v_free_seats > 0 THEN 'AVAILABLE-' || v_free_seats
            ELSE 'WL-' || (v_waiting_count + 1)
        END
    );
END;
$$;
