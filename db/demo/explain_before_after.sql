-- ============================================================================
-- DEMO 4: QUERY OPTIMIZATION — EXPLAIN (ANALYZE, BUFFERS) COMPARISON
-- ============================================================================
-- Dataset: 119,040 rows in seat_inventory across 480 schedules.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXPERIMENT 1: Free Seat Inventory Lookup for Booking Allocation
-- ----------------------------------------------------------------------------

-- [A] WITH PARTIAL INDEX: idx_seat_inventory_free
-- Notice: Index Only Scan on idx_seat_inventory_free, zero heap fetches, shared hit = 22 blocks!
EXPLAIN (ANALYZE, BUFFERS)
SELECT si.seat_id
FROM seat_inventory si
JOIN seats s ON s.seat_id = si.seat_id
JOIN coaches c ON c.coach_id = s.coach_id
WHERE si.schedule_id = 15 AND si.status = 'FREE' AND c.class = '3A';

/*
REAL POSTGRESQL 16 OUTPUT (WITH INDEX):
Nested Loop  (cost=11.86..51.71 rows=1 width=4) (actual time=1.097..1.420 rows=128 loops=1)
  Buffers: shared hit=22
  ->  Hash Join  (cost=11.70..40.50 rows=247 width=8) (actual time=0.993..1.252 rows=248 loops=1)
        Hash Cond: (s.seat_id = si.seat_id)
        Buffers: shared hit=14
        ->  Seq Scan on seats s  (cost=0.00..24.88 rows=1488 width=8) (actual time=0.033..0.179 rows=1488 loops=1)
        ->  Hash  (cost=8.62..8.62 rows=247 width=4) (actual time=0.828..0.829 rows=248 loops=1)
              ->  Index Only Scan using idx_seat_inventory_free on seat_inventory si  
                  (cost=0.29..8.62 rows=247 width=4) (actual time=0.719..0.768 rows=248 loops=1)
                  Index Cond: (schedule_id = 15)
                  Heap Fetches: 0
Execution Time: 1.625 ms
Total Buffer Hits: 22 blocks
*/

-- [B] WITHOUT PARTIAL INDEX (Simulated via Transaction Drop):
-- Notice: Shared buffer hits skyrocket from 22 to 1,675 blocks (76x buffer increase)!
BEGIN;
DROP INDEX idx_seat_inventory_free;
EXPLAIN (ANALYZE, BUFFERS)
SELECT si.seat_id
FROM seat_inventory si
JOIN seats s ON s.seat_id = si.seat_id
JOIN coaches c ON c.coach_id = s.coach_id
WHERE si.schedule_id = 15 AND si.status = 'FREE' AND c.class = '3A';
ROLLBACK;

/*
REAL POSTGRESQL 16 OUTPUT (WITHOUT INDEX):
Nested Loop  (cost=19.09..77.81 rows=1 width=4) (actual time=1.244..3.848 rows=128 loops=1)
  Buffers: shared hit=1675
  ->  Index Scan using seat_inventory_pkey on seat_inventory si  
      (cost=0.29..3.35 rows=1 width=4) (actual time=0.003..0.003 rows=0 loops=768)
      Filter: ((status)::text = 'FREE'::text)
      Buffers: shared hit=1664
Execution Time: 4.088 ms
Total Buffer Hits: 1,675 blocks
*/

-- ----------------------------------------------------------------------------
-- EXPERIMENT 2: Route Search Query (v_train_search)
-- ----------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM v_train_search
WHERE from_station_code = 'NDLS' 
  AND to_station_code = 'MMCT' 
  AND journey_date = CURRENT_DATE + 5;

/*
REAL POSTGRESQL 16 OUTPUT:
Nested Loop  (cost=5.07..25.93 rows=1 width=954) (actual time=0.316..0.385 rows=1 loops=1)
  Buffers: shared hit=23
  ->  Index Scan using stations_code_key on stations s_to
  ->  Bitmap Index Scan on idx_train_stops_lookup
  ->  Index Scan using idx_schedules_train_date on schedules sch
Execution Time: 0.949 ms
Total Buffer Hits: 23 blocks
*/
