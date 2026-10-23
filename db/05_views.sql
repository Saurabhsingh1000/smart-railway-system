-- ============================================================================
-- SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
-- File: db/05_views.sql
-- Description: Analytical and Operational Views for train search,
-- seat availability maps, booking history, and admin dashboard KPI metrics.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. v_seat_availability: Real-time inventory status per schedule and travel class
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_seat_availability AS
SELECT 
    sch.schedule_id,
    sch.train_id,
    t.train_no,
    t.name AS train_name,
    sch.journey_date,
    c.class,
    COUNT(si.seat_id) AS total_seats,
    COUNT(CASE WHEN si.status = 'FREE' THEN 1 END) AS free_seats,
    COUNT(CASE WHEN si.status = 'BOOKED' THEN 1 END) AS booked_seats,
    COALESCE(wl.waiting_count, 0) AS waiting_count,
    CASE 
        WHEN COUNT(CASE WHEN si.status = 'FREE' THEN 1 END) > 0 
        THEN 'AVAILABLE ' || COUNT(CASE WHEN si.status = 'FREE' THEN 1 END)
        ELSE 'WL ' || (COALESCE(wl.waiting_count, 0) + 1)
    END AS current_status
FROM schedules sch
JOIN trains t ON t.train_id = sch.train_id
JOIN coaches c ON c.train_id = t.train_id
JOIN seats s ON s.coach_id = c.coach_id
JOIN seat_inventory si ON si.schedule_id = sch.schedule_id AND si.seat_id = s.seat_id
LEFT JOIN (
    SELECT schedule_id, class, COUNT(*) AS waiting_count
    FROM waiting_list
    GROUP BY schedule_id, class
) wl ON wl.schedule_id = sch.schedule_id AND wl.class = c.class
GROUP BY 
    sch.schedule_id,
    sch.train_id,
    t.train_no,
    t.name,
    sch.journey_date,
    c.class,
    wl.waiting_count;

-- ----------------------------------------------------------------------------
-- 2. v_train_search: Fast discovery of trains between source and destination
-- Evaluates stop sequences and computes travel distance and timings
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_train_search AS
SELECT 
    sch.schedule_id,
    sch.journey_date,
    t.train_id,
    t.train_no,
    t.name AS train_name,
    t.type AS train_type,
    s_from.station_id AS from_station_id,
    s_from.code AS from_station_code,
    s_from.name AS from_station_name,
    ts_from.departure_time AS departure_time,
    ts_from.stop_seq AS from_seq,
    s_to.station_id AS to_station_id,
    s_to.code AS to_station_code,
    s_to.name AS to_station_name,
    ts_to.arrival_time AS arrival_time,
    ts_to.stop_seq AS to_seq,
    (ts_to.distance_km - ts_from.distance_km) AS distance_km
FROM schedules sch
JOIN trains t ON t.train_id = sch.train_id
JOIN train_stops ts_from ON ts_from.train_id = t.train_id
JOIN stations s_from ON s_from.station_id = ts_from.station_id
JOIN train_stops ts_to ON ts_to.train_id = t.train_id
JOIN stations s_to ON s_to.station_id = ts_to.station_id
WHERE ts_from.stop_seq < ts_to.stop_seq
  AND sch.status = 'ACTIVE';

-- ----------------------------------------------------------------------------
-- 3. v_booking_history: User booking overview with passenger aggregations
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_booking_history AS
SELECT 
    b.pnr,
    b.user_id,
    u.name AS user_name,
    u.email AS user_email,
    t.train_no,
    t.name AS train_name,
    s_from.code AS from_station_code,
    s_from.name AS from_station_name,
    s_to.code AS to_station_code,
    s_to.name AS to_station_name,
    sch.journey_date,
    b.class,
    b.status,
    b.fare,
    b.booked_at,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'passenger_id', p.passenger_id,
                'name', p.name,
                'age', p.age,
                'gender', p.gender,
                'seat_id', p.seat_id,
                'seat_label', CASE 
                    WHEN p.seat_id IS NOT NULL THEN c.coach_no || '-' || st.seat_no::TEXT
                    ELSE 'WL'
                END,
                'status', p.status
            )
        ) FILTER (WHERE p.passenger_id IS NOT NULL),
        '[]'::jsonb
    ) AS passengers
FROM bookings b
JOIN users u ON u.user_id = b.user_id
JOIN schedules sch ON sch.schedule_id = b.schedule_id
JOIN trains t ON t.train_id = sch.train_id
JOIN stations s_from ON s_from.station_id = b.from_station_id
JOIN stations s_to ON s_to.station_id = b.to_station_id
LEFT JOIN passengers p ON p.pnr = b.pnr
LEFT JOIN seats st ON st.seat_id = p.seat_id
LEFT JOIN coaches c ON c.coach_id = st.coach_id
GROUP BY 
    b.pnr,
    b.user_id,
    u.name,
    u.email,
    t.train_no,
    t.name,
    s_from.code,
    s_from.name,
    s_to.code,
    s_to.name,
    sch.journey_date,
    b.class,
    b.status,
    b.fare,
    b.booked_at;

-- ----------------------------------------------------------------------------
-- 4. v_admin_stats: Executive KPI metrics for database administrators
-- Aggregates revenue, occupancy, active bookings, cancellations, and waitlists.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_admin_stats AS
SELECT 
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'SUCCESS') AS total_revenue,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'REFUNDED') AS total_refunds,
    (SELECT COUNT(*) FROM bookings) AS total_bookings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'CONFIRMED') AS confirmed_bookings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'WAITING') AS waiting_bookings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'CANCELLED') AS cancelled_bookings,
    (SELECT COUNT(*) FROM waiting_list) AS total_waitlisted_passengers,
    (
        ROUND(
            (SELECT COUNT(*) FROM seat_inventory WHERE status = 'BOOKED')::NUMERIC / 
            NULLIF((SELECT COUNT(*) FROM seat_inventory), 0)::NUMERIC * 100, 
            2
        )
    ) AS overall_occupancy_percentage;
