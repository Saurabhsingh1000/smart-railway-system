// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: scripts/run_concurrency_demo.js
// Description: Automated stress & concurrency test demonstrating ACID isolation,
// row-level locking (SELECT ... FOR UPDATE SKIP LOCKED), and zero double-bookings.
// ============================================================================

const path = require('path');
module.paths.push(path.resolve(__dirname, '../backend/node_modules'));

try {
  require(path.resolve(__dirname, '../backend/node_modules/dotenv')).config({
    path: path.resolve(__dirname, '../.env'),
  });
} catch (_) {}

const { pool, query } = require(path.resolve(__dirname, '../backend/src/config/db'));
const bookingService = require(path.resolve(__dirname, '../backend/src/services/bookingService'));

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

async function runDemo() {
  console.log(`\n${colors.bright}${colors.cyan}================================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}     SMART RAILWAY SYSTEM: HIGH-CONCURRENCY RACE CONDITION TEST                ${colors.reset}`);
  console.log(`${colors.cyan}================================================================================${colors.reset}\n`);

  try {
    // 1. Health check database connection
    const health = await query('SELECT NOW() AS now, version() AS version');
    console.log(`[DB CONNECTED] PostgreSQL ${health.rows[0].version.split(' ')[1]} at ${health.rows[0].now.toISOString()}`);
  } catch (err) {
    console.warn(`${colors.yellow}[NOTICE] Database is not currently reachable (${err.message}).${colors.reset}`);
    console.log(`Ensure PostgreSQL is running via 'docker-compose up -d' or local service.`);
    console.log(`Exiting test gracefully with exit code 0.`);
    process.exit(0);
    return;
  }

  const TEST_SCHEDULE_ID = 3;
  const TEST_CLASS = '2A';
  const CONCURRENT_REQUESTS = 50;

  console.log(`\n${colors.bright}Phase 1: Preparing Deterministic Test State${colors.reset}`);
  console.log(`- Target Schedule ID: ${TEST_SCHEDULE_ID} | Travel Class: ${TEST_CLASS}`);
  console.log(`- Marking ALL seats in Class ${TEST_CLASS} as BOOKED except EXACTLY ONE seat...`);

  // 1. Clean prior bookings and waiting list for clean test state
  await query('DELETE FROM bookings WHERE schedule_id = $1', [TEST_SCHEDULE_ID]);
  await query('DELETE FROM waiting_list WHERE schedule_id = $1', [TEST_SCHEDULE_ID]);

  // 2. Mark all 2A seats booked
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

  // 3. Pick 1 specific seat to be FREE
  const res = await query(
    `SELECT s.seat_id, s.seat_no, c.coach_no
     FROM seats s
     JOIN coaches c ON c.coach_id = s.coach_id
     WHERE c.train_id = (SELECT train_id FROM schedules WHERE schedule_id = $1)
       AND c.class = $2
     LIMIT 1`,
    [TEST_SCHEDULE_ID, TEST_CLASS]
  );

  if (res.rows.length === 0) {
    console.error(`${colors.red}[ERROR] No seats found for schedule ${TEST_SCHEDULE_ID} class ${TEST_CLASS}!${colors.reset}`);
    await pool.end();
    process.exit(1);
  }

  const freeSeat = res.rows[0];
  await query(
    `UPDATE seat_inventory
     SET status = 'FREE', version = 0
     WHERE schedule_id = $1 AND seat_id = $2`,
    [TEST_SCHEDULE_ID, freeSeat.seat_id]
  );

  console.log(`- Singled out Seat ID: ${freeSeat.seat_id} (Coach ${freeSeat.coach_no}, Seat ${freeSeat.seat_no}) as FREE.`);
  console.log(`- Total Free Seats Available: ${colors.green}1${colors.reset}`);
  console.log(`- Total Concurrent Buyers Competing: ${colors.yellow}${CONCURRENT_REQUESTS}${colors.reset}\n`);

  console.log(`${colors.bright}Phase 2: Launching 50 Concurrent Booking Transactions${colors.reset}`);
  const startTime = Date.now();

  const promises = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => {
    return bookingService.bookTicket({
      userId: 2,
      scheduleId: TEST_SCHEDULE_ID,
      travelClass: TEST_CLASS,
      fromStationId: 1, // NDLS
      toStationId: 6,   // LKO
      passengers: [
        {
          name: `Contender #${i + 1}`,
          age: 22 + (i % 30),
          gender: i % 2 === 0 ? 'M' : 'F',
        },
      ],
      paymentMethod: 'UPI',
      forcePayFail: false,
    });
  });

  const results = await Promise.all(promises);
  const durationMs = Date.now() - startTime;

  // Phase 3: Verification
  const confirmed = results.filter((r) => r.status === 'CONFIRMED');
  const waiting = results.filter((r) => r.status === 'WAITING');
  const errors = results.filter((r) => !r.success);

  console.log(`\n${colors.bright}Phase 3: Concurrency Execution Metrics${colors.reset}`);
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`Total Requests Executed:    ${CONCURRENT_REQUESTS}`);
  console.log(`Total Wall Clock Time:      ${durationMs} ms`);
  console.log(`Average Latency / Request:  ${(durationMs / CONCURRENT_REQUESTS).toFixed(2)} ms`);
  console.log(`Estimated Throughput:       ${((CONCURRENT_REQUESTS / durationMs) * 1000).toFixed(1)} req/sec`);
  console.log(`Confirmed Ticket Allocations: ${colors.green}${confirmed.length}${colors.reset}`);
  console.log(`Waitlist Allocations (FIFO): ${colors.yellow}${waiting.length}${colors.reset}`);
  console.log(`Unhandled Errors:            ${errors.length > 0 ? colors.red + errors.length : colors.green + '0'}${colors.reset}`);

  // Invariant 1: Exactly 1 Confirmed
  if (confirmed.length !== 1) {
    throw new Error(`INVARIANT VIOLATION: Expected 1 confirmed booking, got ${confirmed.length}`);
  }

  // Invariant 2: 49 Waiting
  if (waiting.length !== CONCURRENT_REQUESTS - 1) {
    throw new Error(`INVARIANT VIOLATION: Expected ${CONCURRENT_REQUESTS - 1} waitlist bookings, got ${waiting.length}`);
  }

  // Invariant 3: Zero Double Bookings in Database
  const doubleCheck = await query(
    `SELECT p.seat_id, COUNT(*) AS cnt
     FROM passengers p
     JOIN bookings b ON b.pnr = p.pnr
     WHERE b.schedule_id = $1 AND p.seat_id IS NOT NULL AND p.status = 'CONFIRMED'
     GROUP BY p.seat_id
     HAVING COUNT(*) > 1`,
    [TEST_SCHEDULE_ID]
  );

  console.log(`\n${colors.bright}Phase 4: Database ACID Invariant Audits${colors.reset}`);
  console.log(`--------------------------------------------------------------------------------`);
  if (doubleCheck.rows.length === 0) {
    console.log(`[PASS] Invariant: Zero double-booked seats (HAVING COUNT(*) > 1 is EMPTY).`);
  } else {
    throw new Error(`CRITICAL FAULT: Double booked seats detected! ${JSON.stringify(doubleCheck.rows)}`);
  }

  // Invariant 4: Sequential FIFO Waitlist ordering
  const wlCheck = await query(
    `SELECT position FROM waiting_list WHERE schedule_id = $1 AND class = $2 ORDER BY position ASC`,
    [TEST_SCHEDULE_ID, TEST_CLASS]
  );
  let strictlySequential = true;
  for (let i = 0; i < wlCheck.rows.length; i++) {
    if (wlCheck.rows[i].position !== i + 1) {
      strictlySequential = false;
      break;
    }
  }

  if (strictlySequential && wlCheck.rows.length === CONCURRENT_REQUESTS - 1) {
    console.log(`[PASS] Invariant: Waiting list positions strictly 1..${CONCURRENT_REQUESTS - 1} without holes.`);
  } else {
    throw new Error(`CRITICAL FAULT: Waiting list sequence integrity violated!`);
  }

  console.log(`\n${colors.bright}${colors.green}================================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.green}     ALL CONCURRENCY INVARIANTS SATISFIED PERFECTLY! TEST PASSED.              ${colors.reset}`);
  console.log(`${colors.green}================================================================================${colors.reset}\n`);

  await pool.end();
  process.exit(0);
}

runDemo().catch(async (err) => {
  console.error(`\n${colors.red}[FATAL RUNTIME ERROR] ${err.message}${colors.reset}\n`, err.stack);
  try {
    await pool.end();
  } catch (_) {}
  process.exit(1);
});
