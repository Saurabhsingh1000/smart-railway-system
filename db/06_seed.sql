-- ============================================================================
-- SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
-- File: db/06_seed.sql
-- Description: Master seed data including 16 major stations, 6 iconic trains,
-- realistic stop sequence with km offsets, multi-class coaches, seats with
-- accurate Indian Railway berth allocations, 60-day schedules, and auth users.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USERS: Passwords hashed with bcrypt (cost factor 10)
-- Admin: admin@railway.com / Admin@123
-- User1: user1@railway.com / User@123
-- User2: user2@railway.com / User@123
-- User3: user3@railway.com / User@123
-- ----------------------------------------------------------------------------
INSERT INTO users (user_id, name, email, password_hash, role) VALUES
(1, 'System Administrator', 'admin@railway.com', '$2a$10$42HJFGtiEb3/Fus8NfpuYe4DDp6Kra.Cht5SwwOd8asvYGmSWzESW', 'ADMIN'),
(2, 'Aarav Sharma', 'user1@railway.com', '$2a$10$jziNaOf.uAsjyWEx78fqx.Tg1GWPITdzDBzUHpbORFtYRhs3ee5Fa', 'USER'),
(3, 'Priya Patel', 'user2@railway.com', '$2a$10$jziNaOf.uAsjyWEx78fqx.Tg1GWPITdzDBzUHpbORFtYRhs3ee5Fa', 'USER'),
(4, 'Rohan Verma', 'user3@railway.com', '$2a$10$jziNaOf.uAsjyWEx78fqx.Tg1GWPITdzDBzUHpbORFtYRhs3ee5Fa', 'USER')
ON CONFLICT (email) DO NOTHING;

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- ----------------------------------------------------------------------------
-- 2. STATIONS (16 Major Indian Railway Junctions)
-- ----------------------------------------------------------------------------
INSERT INTO stations (station_id, code, name, city) VALUES
(1,  'NDLS', 'New Delhi Railway Station', 'New Delhi'),
(2,  'MMCT', 'Mumbai Central', 'Mumbai'),
(3,  'CNB',  'Kanpur Central', 'Kanpur'),
(4,  'BPL',  'Bhopal Junction', 'Bhopal'),
(5,  'JP',   'Jaipur Junction', 'Jaipur'),
(6,  'LKO',  'Lucknow Charbagh', 'Lucknow'),
(7,  'HWH',  'Howrah Junction', 'Kolkata'),
(8,  'MAS',  'Chennai Central', 'Chennai'),
(9,  'SBC',  'KSR Bengaluru City', 'Bengaluru'),
(10, 'ADI',  'Ahmedabad Junction', 'Ahmedabad'),
(11, 'PNBE', 'Patna Junction', 'Patna'),
(12, 'AGC',  'Agra Cantt', 'Agra'),
(13, 'BRC',  'Vadodara Junction', 'Vadodara'),
(14, 'KOTA', 'Kota Junction', 'Kota'),
(15, 'GWL',  'Gwalior Junction', 'Gwalior'),
(16, 'BSB',  'Varanasi Junction', 'Varanasi')
ON CONFLICT (code) DO NOTHING;

SELECT setval('stations_station_id_seq', (SELECT MAX(station_id) FROM stations));

-- ----------------------------------------------------------------------------
-- 3. TRAINS (6 Flagship Indian Railway Expresses)
-- ----------------------------------------------------------------------------
INSERT INTO trains (train_id, train_no, name, type) VALUES
(1, '12951', 'Mumbai Tejas Rajdhani Express', 'RAJDHANI'),
(2, '12952', 'New Delhi Tejas Rajdhani Express', 'RAJDHANI'),
(3, '12004', 'Lucknow Swarna Shatabdi Express', 'SHATABDI'),
(4, '12301', 'Howrah Rajdhani Express', 'RAJDHANI'),
(5, '12626', 'Kerala Express', 'SUPERFAST'),
(6, '12958', 'Swarna Jayanti Rajdhani Express', 'RAJDHANI')
ON CONFLICT (train_no) DO NOTHING;

SELECT setval('trains_train_id_seq', (SELECT MAX(train_id) FROM trains));

-- ----------------------------------------------------------------------------
-- 4. TRAIN_STOPS (Ordered Stop Sequence, Arrival/Departure, Distances)
-- ----------------------------------------------------------------------------
-- Train 1: 12951 (NDLS -> KOTA -> BRC -> MMCT)
INSERT INTO train_stops (train_id, station_id, stop_seq, arrival_time, departure_time, distance_km) VALUES
(1, 1,  1, NULL,       '16:55:00', 0),
(1, 14, 2, '21:30:00', '21:40:00', 465),
(1, 13, 3, '03:40:00', '03:50:00', 992),
(1, 2,  4, '08:35:00', NULL,       1386)
ON CONFLICT (train_id, stop_seq) DO NOTHING;

-- Train 2: 12952 (MMCT -> BRC -> KOTA -> NDLS)
INSERT INTO train_stops (train_id, station_id, stop_seq, arrival_time, departure_time, distance_km) VALUES
(2, 2,  1, NULL,       '17:00:00', 0),
(2, 13, 2, '21:35:00', '21:45:00', 394),
(2, 14, 3, '03:45:00', '03:55:00', 921),
(2, 1,  4, '08:35:00', NULL,       1386)
ON CONFLICT (train_id, stop_seq) DO NOTHING;

-- Train 3: 12004 (NDLS -> AGC -> CNB -> LKO)
INSERT INTO train_stops (train_id, station_id, stop_seq, arrival_time, departure_time, distance_km) VALUES
(3, 1,  1, NULL,       '06:10:00', 0),
(3, 12, 2, '07:50:00', '07:55:00', 195),
(3, 3,  3, '11:20:00', '11:25:00', 435),
(3, 6,  4, '12:40:00', NULL,       512)
ON CONFLICT (train_id, stop_seq) DO NOTHING;

-- Train 4: 12301 (HWH -> PNBE -> CNB -> NDLS)
INSERT INTO train_stops (train_id, station_id, stop_seq, arrival_time, departure_time, distance_km) VALUES
(4, 7,  1, NULL,       '16:50:00', 0),
(4, 11, 2, '22:50:00', '23:00:00', 532),
(4, 3,  3, '05:30:00', '05:35:00', 1018),
(4, 1,  4, '10:05:00', NULL,       1453)
ON CONFLICT (train_id, stop_seq) DO NOTHING;

-- Train 5: 12626 (NDLS -> AGC -> GWL -> BPL -> MAS)
INSERT INTO train_stops (train_id, station_id, stop_seq, arrival_time, departure_time, distance_km) VALUES
(5, 1,  1, NULL,       '20:10:00', 0),
(5, 12, 2, '22:20:00', '22:25:00', 195),
(5, 15, 3, '23:45:00', '23:50:00', 313),
(5, 4,  4, '05:20:00', '05:30:00', 703),
(5, 8,  5, '04:30:00', NULL,       2182)
ON CONFLICT (train_id, stop_seq) DO NOTHING;

-- Train 6: 12958 (ADI -> JP -> NDLS)
INSERT INTO train_stops (train_id, station_id, stop_seq, arrival_time, departure_time, distance_km) VALUES
(6, 10, 1, NULL,       '17:45:00', 0),
(6, 5,  2, '01:45:00', '01:55:00', 625),
(6, 1,  3, '07:30:00', NULL,       933)
ON CONFLICT (train_id, stop_seq) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. COACHES (SL, 3A, 2A classes per train)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t_id INT;
BEGIN
    FOR t_id IN 1..6 LOOP
        INSERT INTO coaches (train_id, coach_no, class, total_seats) VALUES
        (t_id, 'S1', 'SL', 72),
        (t_id, 'B1', '3A', 64),
        (t_id, 'B2', '3A', 64),
        (t_id, 'A1', '2A', 48)
        ON CONFLICT (train_id, coach_no) DO NOTHING;
    END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. SEATS (Populate seats and realistic berth types per coach)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    c RECORD;
    s_no INT;
    b_type VARCHAR(20);
    mod_val INT;
BEGIN
    FOR c IN SELECT coach_id, class, total_seats FROM coaches LOOP
        FOR s_no IN 1..c.total_seats LOOP
            IF c.class IN ('SL', '3A') THEN
                mod_val := s_no % 8;
                IF mod_val IN (1, 4) THEN b_type := 'LOWER';
                ELSIF mod_val IN (2, 5) THEN b_type := 'MIDDLE';
                ELSIF mod_val IN (3, 6) THEN b_type := 'UPPER';
                ELSIF mod_val = 7 THEN b_type := 'SIDE_LOWER';
                ELSE b_type := 'SIDE_UPPER';
                END IF;
            ELSE -- 2A
                mod_val := s_no % 6;
                IF mod_val IN (1, 3) THEN b_type := 'LOWER';
                ELSIF mod_val IN (2, 4) THEN b_type := 'UPPER';
                ELSIF mod_val = 5 THEN b_type := 'SIDE_LOWER';
                ELSE b_type := 'SIDE_UPPER';
                END IF;
            END IF;

            INSERT INTO seats (coach_id, seat_no, berth_type)
            VALUES (c.coach_id, s_no, b_type)
            ON CONFLICT (coach_id, seat_no) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. SCHEDULES (Next 80 Days for All 6 Trains = 480 Schedules)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t_id INT;
    day_offset INT;
    j_date DATE;
BEGIN
    FOR day_offset IN 0..79 LOOP
        j_date := CURRENT_DATE + day_offset;
        FOR t_id IN 1..6 LOOP
            INSERT INTO schedules (train_id, journey_date, status)
            VALUES (t_id, j_date, 'ACTIVE')
            ON CONFLICT (train_id, journey_date) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$;
