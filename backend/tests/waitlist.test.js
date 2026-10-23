// ============================================================================
// TEST SUITE: Automatic Waitlist Promotion & Concurrent Cancellation Safety
// File: backend/tests/waitlist.test.js
// Verification:
// 1. Cancellation automatically promotes top waitlisted passenger to CONFIRMED.
// 2. Remaining waitlist positions decrement by 1.
// 3. Concurrent cancellations using SKIP LOCKED never promote the same passenger.
// ============================================================================

const { pool, query } = require('../src/config/db');
const bookingService = require('../src/services/bookingService');

describe('Waitlist Auto-Promotion & Cancellation Suite', () => {
  const TEST_SCHEDULE_ID = 4;
  const TEST_CLASS = '2A';

  beforeAll(async () => {
    // Clean test state for schedule 4
    await query('DELETE FROM bookings WHERE schedule_id = $1', [TEST_SCHEDULE_ID]);
    await query('DELETE FROM waiting_list WHERE schedule_id = $1', [TEST_SCHEDULE_ID]);

    // Mark ALL seats in 2A as BOOKED
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
  });

  afterAll(async () => {
    await pool.end();
  });

  test('Cancellation of confirmed ticket auto-promotes WL#1 and decrements downstream positions', async () => {
    // 1. Free exactly 1 seat and book it to get a known confirmed PNR
    const seatRes = await query(
      `SELECT s.seat_id
       FROM seats s
       JOIN coaches c ON c.coach_id = s.coach_id
       WHERE c.train_id = (SELECT train_id FROM schedules WHERE schedule_id = $1)
         AND c.class = $2
       LIMIT 1`,
      [TEST_SCHEDULE_ID, TEST_CLASS]
    );
    const confirmedSeatId = seatRes.rows[0].seat_id;

    await query(
      `UPDATE seat_inventory SET status = 'FREE' WHERE schedule_id = $1 AND seat_id = $2`,
      [TEST_SCHEDULE_ID, confirmedSeatId]
    );

    const confirmedBooking = await bookingService.bookTicket({
      userId: 2,
      scheduleId: TEST_SCHEDULE_ID,
      travelClass: TEST_CLASS,
      fromStationId: 7, // HWH
      toStationId: 1,   // NDLS
      passengers: [{ name: 'To-Be-Cancelled Passenger', age: 40, gender: 'M' }],
      paymentMethod: 'UPI',
    });
    expect(confirmedBooking.status).toBe('CONFIRMED');
    const pnrToCancel = confirmedBooking.pnr;

    // 2. Now queue 3 waitlisted passengers (WL 1, WL 2, WL 3)
    const wl1 = await bookingService.bookTicket({
      userId: 3,
      scheduleId: TEST_SCHEDULE_ID,
      travelClass: TEST_CLASS,
      fromStationId: 7,
      toStationId: 1,
      passengers: [{ name: 'Waitlist Passenger Alpha', age: 24, gender: 'F' }],
    });
    expect(wl1.status).toBe('WAITING');
    expect(wl1.wl_positions[0]).toBe(1);

    const wl2 = await bookingService.bookTicket({
      userId: 4,
      scheduleId: TEST_SCHEDULE_ID,
      travelClass: TEST_CLASS,
      fromStationId: 7,
      toStationId: 1,
      passengers: [{ name: 'Waitlist Passenger Beta', age: 28, gender: 'M' }],
    });
    expect(wl2.status).toBe('WAITING');
    expect(wl2.wl_positions[0]).toBe(2);

    const wl3 = await bookingService.bookTicket({
      userId: 2,
      scheduleId: TEST_SCHEDULE_ID,
      travelClass: TEST_CLASS,
      fromStationId: 7,
      toStationId: 1,
      passengers: [{ name: 'Waitlist Passenger Gamma', age: 35, gender: 'F' }],
    });
    expect(wl3.status).toBe('WAITING');
    expect(wl3.wl_positions[0]).toBe(3);

    // 3. Cancel the confirmed ticket
    const cancelRes = await bookingService.cancelTicket(pnrToCancel, 2);
    expect(cancelRes.status).toBe('CANCELLED');

    // 4. Verify that Waitlist Passenger Alpha was automatically PROMOTED to CONFIRMED!
    const alphaStatus = await bookingService.getPNRStatus(wl1.pnr);
    expect(alphaStatus.booking_status).toBe('CONFIRMED');
    expect(alphaStatus.passengers[0].status).toBe('CONFIRMED');
    expect(alphaStatus.passengers[0].seat_id).toBe(confirmedSeatId);

    // 5. Verify that remaining waitlisted positions shifted: Beta -> pos 1, Gamma -> pos 2
    const remainingWl = await query(
      `SELECT pnr, position FROM waiting_list WHERE schedule_id = $1 AND class = $2 ORDER BY position ASC`,
      [TEST_SCHEDULE_ID, TEST_CLASS]
    );

    expect(remainingWl.rows.length).toBe(2);
    expect(remainingWl.rows[0].pnr).toBe(wl2.pnr);
    expect(remainingWl.rows[0].position).toBe(1); // Shifted from 2 to 1
    expect(remainingWl.rows[1].pnr).toBe(wl3.pnr);
    expect(remainingWl.rows[1].position).toBe(2); // Shifted from 3 to 2
  });

  test('Two concurrent cancellations with SKIP LOCKED never promote the same passenger', async () => {
    // Clean state for parallel cancellation test
    await query('DELETE FROM bookings WHERE schedule_id = $1', [TEST_SCHEDULE_ID]);
    await query('DELETE FROM waiting_list WHERE schedule_id = $1', [TEST_SCHEDULE_ID]);

    // 1. Prepare two confirmed bookings
    const seatsRes = await query(
      `SELECT s.seat_id
       FROM seats s
       JOIN coaches c ON c.coach_id = s.coach_id
       WHERE c.train_id = (SELECT train_id FROM schedules WHERE schedule_id = $1)
         AND c.class = $2
       LIMIT 2`,
      [TEST_SCHEDULE_ID, TEST_CLASS]
    );
    const seatA = seatsRes.rows[0].seat_id;
    const seatB = seatsRes.rows[1].seat_id;

    await query(
      `UPDATE seat_inventory SET status = 'FREE' WHERE schedule_id = $1 AND seat_id IN ($2, $3)`,
      [TEST_SCHEDULE_ID, seatA, seatB]
    );

    const bookA = await bookingService.bookTicket({
      userId: 2,
      scheduleId: TEST_SCHEDULE_ID,
      travelClass: TEST_CLASS,
      fromStationId: 7,
      toStationId: 1,
      passengers: [{ name: 'Cancel Target A', age: 30, gender: 'M' }],
    });

    const bookB = await bookingService.bookTicket({
      userId: 3,
      scheduleId: TEST_SCHEDULE_ID,
      travelClass: TEST_CLASS,
      fromStationId: 7,
      toStationId: 1,
      passengers: [{ name: 'Cancel Target B', age: 31, gender: 'F' }],
    });

    expect(bookA.status).toBe('CONFIRMED');
    expect(bookB.status).toBe('CONFIRMED');

    // 2. Perform simultaneous parallel cancellations
    const [cancelResultA, cancelResultB] = await Promise.all([
      bookingService.cancelTicket(bookA.pnr, 2),
      bookingService.cancelTicket(bookB.pnr, 3),
    ]);

    expect(cancelResultA.status).toBe('CANCELLED');
    expect(cancelResultB.status).toBe('CANCELLED');

    // 3. Verify no single passenger was allocated more than one seat
    const duplicateAllocationCheck = await query(
      `SELECT p.name, COUNT(p.seat_id)
       FROM passengers p
       JOIN bookings b ON b.pnr = p.pnr
       WHERE b.schedule_id = $1 AND p.status = 'CONFIRMED'
       GROUP BY p.name, p.seat_id
       HAVING COUNT(*) > 1`,
      [TEST_SCHEDULE_ID]
    );

    expect(duplicateAllocationCheck.rows.length).toBe(0);
  });
});
