# ⚡ Concurrency & Benchmark Audit Report

## 1. Executive Summary

This report documents the empirical concurrency testing and ACID verification conducted on the **Smart Railway Reservation System**. The system was stressed under simulated high-contention Tatkal race conditions where **50 concurrent client connections** competed simultaneously for **exactly one remaining seat**.

### Key Findings
| Metric | Benchmark Result | Target Invariant | Status |
| :--- | :--- | :--- | :--- |
| **Concurrent Contenders** | 50 simultaneous transactions | 50 requests | PASS |
| **Confirmed Allocations** | Exactly 1 Confirmed | Exactly 1 | PASS |
| **Double Bookings** | **0** duplicate allocations | 0 | PASS |
| **Waitlist Assignments** | Exactly 49 Enqueued | 49 | PASS |
| **Waitlist Sequence** | Strictly sequential (1..49) | No gaps or overlaps | PASS |
| **Unhandled Errors** | 0 unhandled aborts | 0 | PASS |
| **Payment Rollback Residuals** | 0 orphaned rows | 0 | PASS |

---

## 2. Invariant Verification

### Invariant 1: Zero Double-Booking (`HAVING COUNT(*) > 1 = 0`)
To mathematically verify that no two passengers were ever assigned the same seat ID on the same train run, the following SQL invariant check was executed immediately after the 50 concurrent transactions completed:

```sql
SELECT p.seat_id, COUNT(*) AS count
FROM passengers p
JOIN bookings b ON b.pnr = p.pnr
WHERE b.schedule_id = :schedule_id 
  AND p.seat_id IS NOT NULL 
  AND p.status = 'CONFIRMED'
GROUP BY p.seat_id
HAVING COUNT(*) > 1;
```
**Result**: **0 rows returned**. Row-level lock isolation strictly serialized access.

### Invariant 2: FIFO Waiting List Order
The waiting list positions were verified via:
```sql
SELECT position 
FROM waiting_list 
WHERE schedule_id = :schedule_id AND class = :class 
ORDER BY position ASC;
```
**Result**: Positions evaluated strictly to values `1, 2, 3, ..., 49` without missing integers or duplicates.

---

## 3. ACID Atomicity & Payment Failure Test

To verify atomicity when a third-party payment gateway fails mid-transaction:
1. `bookTicket` was invoked with `forcePayFail = true`.
2. The stored procedure simulated a payment gateway timeout/rejection.
3. Database checks confirmed:
   - Seat status in `seat_inventory` reverted to `'FREE'` with unmodified `version`.
   - Total row counts in `bookings` and `passengers` remained unchanged (`COUNT(after) == COUNT(before)`).
   - Zero partial booking records remained.

---

## 4. How to Reproduce

Run the automated concurrency verification script:
```bash
node scripts/run_concurrency_demo.js
```
Or execute Jest test suites:
```bash
cd backend
npm test
```
