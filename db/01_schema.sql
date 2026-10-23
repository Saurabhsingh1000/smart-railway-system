-- ============================================================================
-- SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
-- File: db/01_schema.sql
-- Description: Core 12 relational tables + audit_log normalized to 3NF.
-- Includes strict primary keys, foreign keys with referential actions,
-- domain check constraints, and sequence for unique PNR generation.
-- ============================================================================

-- Drop existing tables if re-running
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS waiting_list CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS passengers CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS seat_inventory CASCADE;
DROP TABLE IF EXISTS seats CASCADE;
DROP TABLE IF EXISTS coaches CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS train_stops CASCADE;
DROP TABLE IF EXISTS trains CASCADE;
DROP TABLE IF EXISTS stations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP SEQUENCE IF EXISTS pnr_seq CASCADE;

-- Sequence for 10-digit PNR generation (starts at 1000000000)
CREATE SEQUENCE pnr_seq START WITH 1000000001 INCREMENT BY 1;

-- ----------------------------------------------------------------------------
-- 1. USERS: System accounts (Passengers & Admins)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. STATIONS: Railway station master data
-- ----------------------------------------------------------------------------
CREATE TABLE stations (
    station_id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 3. TRAINS: Train master details
-- ----------------------------------------------------------------------------
CREATE TABLE trains (
    train_id SERIAL PRIMARY KEY,
    train_no VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'SUPERFAST'
);

-- ----------------------------------------------------------------------------
-- 4. TRAIN_STOPS: Route definition and stop sequence
-- Normal Form: 3NF (composite PK on train_id, stop_seq; no transitive dependency)
-- ----------------------------------------------------------------------------
CREATE TABLE train_stops (
    train_id INT NOT NULL REFERENCES trains(train_id) ON DELETE CASCADE,
    station_id INT NOT NULL REFERENCES stations(station_id) ON DELETE RESTRICT,
    stop_seq INT NOT NULL CHECK (stop_seq > 0),
    arrival_time TIME,
    departure_time TIME,
    distance_km INT NOT NULL CHECK (distance_km >= 0),
    PRIMARY KEY (train_id, stop_seq),
    UNIQUE (train_id, station_id)
);

-- ----------------------------------------------------------------------------
-- 5. SCHEDULES: Train operational run instances by journey date
-- ----------------------------------------------------------------------------
CREATE TABLE schedules (
    schedule_id SERIAL PRIMARY KEY,
    train_id INT NOT NULL REFERENCES trains(train_id) ON DELETE CASCADE,
    journey_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED', 'COMPLETED')),
    UNIQUE (train_id, journey_date)
);

-- ----------------------------------------------------------------------------
-- 6. COACHES: Physical coaches attached to train compositions
-- ----------------------------------------------------------------------------
CREATE TABLE coaches (
    coach_id SERIAL PRIMARY KEY,
    train_id INT NOT NULL REFERENCES trains(train_id) ON DELETE CASCADE,
    coach_no VARCHAR(10) NOT NULL,
    class VARCHAR(10) NOT NULL CHECK (class IN ('SL', '3A', '2A')),
    total_seats INT NOT NULL CHECK (total_seats > 0),
    UNIQUE (train_id, coach_no)
);

-- ----------------------------------------------------------------------------
-- 7. SEATS: Individual berths in a coach
-- ----------------------------------------------------------------------------
CREATE TABLE seats (
    seat_id SERIAL PRIMARY KEY,
    coach_id INT NOT NULL REFERENCES coaches(coach_id) ON DELETE CASCADE,
    seat_no INT NOT NULL CHECK (seat_no > 0),
    berth_type VARCHAR(20) NOT NULL CHECK (berth_type IN ('LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER', 'SIDE_UPPER')),
    UNIQUE (coach_id, seat_no)
);

-- ----------------------------------------------------------------------------
-- 8. SEAT_INVENTORY: Row-level lock target per schedule run
-- Concurrency note: status changes atomic via SELECT ... FOR UPDATE
-- ----------------------------------------------------------------------------
CREATE TABLE seat_inventory (
    schedule_id INT NOT NULL REFERENCES schedules(schedule_id) ON DELETE CASCADE,
    seat_id INT NOT NULL REFERENCES seats(seat_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'FREE' CHECK (status IN ('FREE', 'BOOKED')),
    version INT NOT NULL DEFAULT 0,
    PRIMARY KEY (schedule_id, seat_id)
);

-- ----------------------------------------------------------------------------
-- 9. BOOKINGS: Transaction master with 10-digit unique PNR
-- ----------------------------------------------------------------------------
CREATE TABLE bookings (
    pnr VARCHAR(10) PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    schedule_id INT NOT NULL REFERENCES schedules(schedule_id) ON DELETE RESTRICT,
    from_station_id INT NOT NULL REFERENCES stations(station_id),
    to_station_id INT NOT NULL REFERENCES stations(station_id),
    class VARCHAR(10) NOT NULL CHECK (class IN ('SL', '3A', '2A')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('CONFIRMED', 'WAITING', 'CANCELLED')),
    fare NUMERIC(10, 2) NOT NULL CHECK (fare >= 0),
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 10. PASSENGERS: Individual travelers attached to a booking PNR
-- ----------------------------------------------------------------------------
CREATE TABLE passengers (
    passenger_id SERIAL PRIMARY KEY,
    pnr VARCHAR(10) NOT NULL REFERENCES bookings(pnr) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL CHECK (age > 0 AND age <= 120),
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('M', 'F', 'O')),
    seat_id INT REFERENCES seats(seat_id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('CONFIRMED', 'WAITING', 'CANCELLED'))
);

-- ----------------------------------------------------------------------------
-- 11. PAYMENTS: Financial transaction record (ACID rollback target)
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    pnr VARCHAR(10) NOT NULL REFERENCES bookings(pnr) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    method VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'REFUNDED')),
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 12. WAITING_LIST: Auto-promoted queue per schedule and class
-- ----------------------------------------------------------------------------
CREATE TABLE waiting_list (
    wl_id SERIAL PRIMARY KEY,
    schedule_id INT NOT NULL REFERENCES schedules(schedule_id) ON DELETE CASCADE,
    pnr VARCHAR(10) NOT NULL REFERENCES bookings(pnr) ON DELETE CASCADE,
    passenger_id INT NOT NULL REFERENCES passengers(passenger_id) ON DELETE CASCADE,
    class VARCHAR(10) NOT NULL CHECK (class IN ('SL', '3A', '2A')),
    position INT NOT NULL CHECK (position > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (schedule_id, class, position)
);

-- ----------------------------------------------------------------------------
-- 13. AUDIT_LOG: Immutable record of booking state changes via triggers
-- ----------------------------------------------------------------------------
CREATE TABLE audit_log (
    log_id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    pnr VARCHAR(10),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
