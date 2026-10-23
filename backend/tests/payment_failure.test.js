// ============================================================================
// TEST SUITE: Payment Failure & ACID Transaction Rollback
// File: backend/tests/payment_failure.test.js
// Verification: Ensures failed payments trigger SAVEPOINT rollbacks leaving
// ZERO partial booking records, ZERO passenger rows, and preserves FREE seat status.
// ============================================================================

const { pool, query } = require('../src/config/db');
const bookingService = require('../src/services/bookingService');

describe('Payment Failure & Transaction Rollback Test Suite', () => {
  const TEST_SCHEDULE_ID = 2; // Using schedule 2
  const TEST_CLASS = '2A';
  let targetSeatId;

  beforeAll(async () => {
    // Isolate a specific free seat for testing
    const res = await query(
      `SELECT si.seat_id
       FROM seat_inventory si
       JOIN seats s ON s.seat_id = si.seat_id
       JOIN coaches c ON c.coach_id = s.coach_id
       WHERE si.schedule_id = $1 AND c.class = $2 AND si.status = 'FREE'
       LIMIT 1`,
      [TEST_SCHEDULE_ID, TEST_CLASS]
    );
    targetSeatId = res.rows[0].seat_id;
  });

  afterAll(async () => {
    await pool.end();
  });

  test('Should cleanly abort booking and rollback on payment failure (forcePayFail = true)', async () => {
    // 1. Snapshot initial state
    const beforeInventory = await query(
      'SELECT status, version FROM seat_inventory WHERE schedule_id = $1 AND seat_id = $2',
      [TEST_SCHEDULE_ID, targetSeatId]
    );
    expect(beforeInventory.rows[0].status).toBe('FREE');
    const initialVersion = beforeInventory.rows[0].version;

    const beforeBookingsCount = await query('SELECT COUNT(*) FROM bookings');
    const beforePassengersCount = await query('SELECT COUNT(*) FROM passengers');

    // 2. Attempt booking with forcePayFail = true
    const bookingResult = await bookingService.bookTicket({
      userId: 2,
      scheduleId: TEST_SCHEDULE_ID,
      travelClass: TEST_CLASS,
      fromStationId: 2, // MMCT
      toStationId: 1,   // NDLS
      passengers: [{ name: 'Rollback Candidate', age: 32, gender: 'M' }],
      paymentMethod: 'CARD',
      forcePayFail: true,
    });

    // 3. Verify returned payload indicates failure
    expect(bookingResult.success).toBe(false);
    expect(bookingResult.status).toBe('PAYMENT_FAILED');
    expect(bookingResult.pnr).toBeNull();

    // 4. Verify ZERO residual rows created in database (Atomicity check)
    const afterBookingsCount = await query('SELECT COUNT(*) FROM bookings');
    const afterPassengersCount = await query('SELECT COUNT(*) FROM passengers');

    expect(parseInt(afterBookingsCount.rows[0].count, 10)).toBe(
      parseInt(beforeBookingsCount.rows[0].count, 10)
    );
    expect(parseInt(afterPassengersCount.rows[0].count, 10)).toBe(
      parseInt(beforePassengersCount.rows[0].count, 10)
    );

    // 5. Verify seat remains untouched in inventory
    const afterInventory = await query(
      'SELECT status, version FROM seat_inventory WHERE schedule_id = $1 AND seat_id = $2',
      [TEST_SCHEDULE_ID, targetSeatId]
    );
    expect(afterInventory.rows[0].status).toBe('FREE');
    expect(afterInventory.rows[0].version).toBe(initialVersion);
  });
});
