-- ============================================================================
-- SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
-- File: db/02_indexes.sql
-- Description: Performance indexing including B-tree, Composite, and Partial
-- indexes designed for high-concurrency lock scans and query optimization.
-- ============================================================================

-- 1. User authentication lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Booking retrieval by user & schedule
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule_id ON bookings(schedule_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- 3. Passenger lookup by PNR
CREATE INDEX IF NOT EXISTS idx_passengers_pnr ON passengers(pnr);
CREATE INDEX IF NOT EXISTS idx_passengers_seat_id ON passengers(seat_id);

-- 4. Payment lookup by PNR
CREATE INDEX IF NOT EXISTS idx_payments_pnr ON payments(pnr);

-- 5. Operational schedule composite index (exact train on date)
CREATE INDEX IF NOT EXISTS idx_schedules_train_date ON schedules(train_id, journey_date);

-- 6. Route search composite index (efficient join between station and train route sequence)
CREATE INDEX IF NOT EXISTS idx_train_stops_lookup ON train_stops(station_id, train_id, stop_seq);

-- 7. High-concurrency Partial Index for free seat allocation
-- Eliminates table scans when locking available seats under heavy concurrency
CREATE INDEX IF NOT EXISTS idx_seat_inventory_free
ON seat_inventory(schedule_id, seat_id)
WHERE status = 'FREE';

-- 8. Waiting list FIFO queue index for instant promotion
CREATE INDEX IF NOT EXISTS idx_waiting_list_queue
ON waiting_list(schedule_id, class, position);

-- 9. Coach and seat navigation indexes
CREATE INDEX IF NOT EXISTS idx_coaches_train_class ON coaches(train_id, class);
CREATE INDEX IF NOT EXISTS idx_seats_coach_id ON seats(coach_id);
