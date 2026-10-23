// ============================================================================
// TEST SUITE: High Concurrency Seat Allocation & Double-Booking Prevention
// File: backend/tests/concurrency.test.js
// Verification: 50 concurrent requests competing for ONE remaining seat
// yields EXACTLY 1 CONFIRMED allocation and 49 WAITING list placements.
// Invariant check: ZERO seats double-allocated (SQL GROUP BY HAVING > 1 = 0).
// ============================================================================

const { pool, query } = require('../src/config/db');
const bookingService = require('../src/services/bookingService');

describe('High Concurrency Booking Test Suite', () => {
  const TEST_SCHEDULE_ID = 3;
  const TEST_CLASS = '2A';
  let remainingSeatId;

  beforeAll(async () => {
    // 1. Clean prior bookings & waiting list for schedule 3
    await query('DELETE FROM bookings WHERE schedule_id = $1', [TEST_SCHEDULE_ID]);
    await query('DELETE FROM waiting_list WHERE schedule_id = $1', [TEST_SCHEDULE_ID]);

    // 2. Mark ALL 2A seats for schedule 3 as BOOKED except for exactly ONE seat
    await query(
      `UPDATE seat_inventory si
       SET status = 'BOOKED'
       FROM seats s, coaches c
       WHERE s.seat_id = si.seat_id
         AND c.coach_id = s.coach_id
         AND si.schedule_id = $1
         AND c.class = $2`,
      [TEST_SCHEDULE_ID, TEST_CLASS]
    );

    // Pick 1 specific seat to be FREE
    const res = await query(
      `SELECT s.seat_id
       FROM seats s
       JOIN coaches c ON c.coach_id = s.coach_id
       WHERE c.train_id = (SELECT train_id FROM schedules WHERE schedule_id = $1)
         AND c.class = $2
       LIMIT 1`,
      [TEST_SCHEDULE_ID, TEST_CLASS]
    );
    remainingSeatId = res.rows[0].seat_id;

    await query(
      `UPDATE seat_inventory
       SET status = 'FREE', version = 0
       WHERE schedule_id = $1 AND seat_id = $2`,
      [TEST_SCHEDULE_ID, remainingSeatId]
    );

    // Clean any prior waiting list for schedule 3
    await query('DELETE FROM waiting_list WHERE schedule_id = $1', [TEST_SCHEDULE_ID]);
  });

  afterAll(async () => {
    await pool.end();
  });

  test('50 concurrent bookings competing for 1 free seat yields exactly 1 CONFIRMED and 49 WAITING', async () => {
    const CONCURRENT_REQUESTS = 50;

    // Launch 50 simultaneous booking promises
    const promises = Array.from({ length: CONCURRENT_REQUESTS }, (_, index) => {
      return bookingService.bookTicket({
        userId: 2,
        scheduleId: TEST_SCHEDULE_ID,
        travelClass: TEST_CLASS,
        fromStationId: 1, // NDLS
        toStationId: 6,   // LKO
        passengers: [
          {
            name: `Contender #${index + 1}`,
            age: 20 + (index % 40),
            gender: index % 2 === 0 ? 'M' : 'F',
          },
        ],
        paymentMethod: 'UPI',
        forcePayFail: false,
      });
    });

    const results = await Promise.all(promises);

    // Analyze results
    const confirmed = results.filter((r) => r.status === 'CONFIRMED');
    const waiting = results.filter((r) => r.status === 'WAITING');
    const failures = results.filter((r) => !r.success);

    console.log(`[Concurrency Test Summary]`);
    console.log(`- Total Requests: ${CONCURRENT_REQUESTS}`);
    console.log(`- Confirmed:      ${confirmed.length}`);
    console.log(`- Waitlisted:     ${waiting.length}`);
    console.log(`- Failed:         ${failures.length}`);

    // EXACTLY 1 CONFIRMED
    expect(confirmed.length).toBe(1);
    expect(confirmed[0].seat_ids).toContain(remainingSeatId);

    // 49 WAITING LIST PLACEMENTS
    expect(waiting.length).toBe(CONCURRENT_REQUESTS - 1);

    // ZERO UNHANDLED FAILURES
    expect(failures.length).toBe(0);

    // Verify Invariant via SQL: ZERO double-assigned seats on this schedule
    const doubleBookCheck = await query(
      `SELECT p.seat_id, COUNT(*) AS count
       FROM passengers p
       JOIN bookings b ON b.pnr = p.pnr
       WHERE b.schedule_id = $1 AND p.seat_id IS NOT NULL AND p.status = 'CONFIRMED'
       GROUP BY p.seat_id
       HAVING COUNT(*) > 1`,
      [TEST_SCHEDULE_ID]
    );

    expect(doubleBookCheck.rows.length).toBe(0);

    // Verify FIFO ordering of waitlist positions
    const wlCheck = await query(
      `SELECT position FROM waiting_list WHERE schedule_id = $1 AND class = $2 ORDER BY position ASC`,
      [TEST_SCHEDULE_ID, TEST_CLASS]
    );
    expect(wlCheck.rows.length).toBe(49);
    for (let i = 0; i < 49; i++) {
      expect(wlCheck.rows[i].position).toBe(i + 1);
    }
  }, 30000); // 30s timeout for 50 concurrent transactions
});
