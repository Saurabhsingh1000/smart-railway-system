// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/services/bookingService.js
// Description: Core service executing stored procedures with automatic retry
// logic on concurrency conflicts (SQLSTATE 40001 / 40P01).
// ============================================================================

const { pool, query } = require('../config/db');
const { withRetry } = require('../utils/retry');

class BookingService {
  /**
   * Book tickets by calling the book_ticket stored procedure inside
   * an explicit transaction wrapped with concurrency retries.
   */
  async bookTicket({
    userId,
    scheduleId,
    travelClass,
    fromStationId,
    toStationId,
    passengers,
    paymentMethod = 'UPI',
    forcePayFail = false,
  }) {
    return await withRetry(async (attempt) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');

        const sql = `
          SELECT book_ticket($1, $2, $3, $4, $5, $6::jsonb, $7, $8) AS result
        `;
        const values = [
          userId,
          scheduleId,
          travelClass,
          fromStationId,
          toStationId,
          JSON.stringify(passengers),
          paymentMethod,
          forcePayFail,
        ];

        const res = await client.query(sql, values);
        const result = res.rows[0].result;

        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });
  }

  /**
   * Cancel ticket using cancel_ticket stored procedure
   */
  async cancelTicket(pnr, userId) {
    const sql = `SELECT cancel_ticket($1, $2) AS result`;
    const res = await query(sql, [pnr, userId]);
    return res.rows[0].result;
  }

  /**
   * Fetch visual seat map for a given schedule and travel class
   */
  async getSeatMap(scheduleId, travelClass) {
    let sql = `
      SELECT 
        si.schedule_id,
        si.seat_id,
        si.status,
        si.version,
        s.seat_no,
        s.berth_type,
        c.coach_no,
        c.class
      FROM seat_inventory si
      JOIN seats s ON s.seat_id = si.seat_id
      JOIN coaches c ON c.coach_id = s.coach_id
      WHERE si.schedule_id = $1
    `;
    const params = [scheduleId];

    if (travelClass) {
      sql += ` AND c.class = $2`;
      params.push(travelClass);
    }

    sql += ` ORDER BY c.coach_no, s.seat_no`;

    const res = await query(sql, params);
    return res.rows;
  }

  /**
   * Get detailed PNR status including passengers, route, and payments
   */
  async getPNRStatus(pnr) {
    const bookingSql = `
      SELECT 
        b.pnr,
        b.user_id,
        b.schedule_id,
        b.class,
        b.status AS booking_status,
        b.fare,
        b.booked_at,
        t.train_no,
        t.name AS train_name,
        t.type AS train_type,
        s_from.code AS from_station_code,
        s_from.name AS from_station_name,
        s_to.code AS to_station_code,
        s_to.name AS to_station_name,
        sch.journey_date
      FROM bookings b
      JOIN schedules sch ON sch.schedule_id = b.schedule_id
      JOIN trains t ON t.train_id = sch.train_id
      JOIN stations s_from ON s_from.station_id = b.from_station_id
      JOIN stations s_to ON s_to.station_id = b.to_station_id
      WHERE b.pnr = $1
    `;
    const bookingRes = await query(bookingSql, [pnr]);
    if (bookingRes.rows.length === 0) {
      return null;
    }

    const booking = bookingRes.rows[0];

    // Fetch passengers
    const passengersSql = `
      SELECT 
        p.passenger_id,
        p.name,
        p.age,
        p.gender,
        p.status,
        p.seat_id,
        c.coach_no,
        s.seat_no,
        s.berth_type,
        wl.position AS waitlist_position
      FROM passengers p
      LEFT JOIN seats s ON s.seat_id = p.seat_id
      LEFT JOIN coaches c ON c.coach_id = s.coach_id
      LEFT JOIN waiting_list wl ON wl.passenger_id = p.passenger_id
      WHERE p.pnr = $1
      ORDER BY p.passenger_id
    `;
    const passengersRes = await query(passengersSql, [pnr]);
    booking.passengers = passengersRes.rows;

    // Fetch payment record
    const paymentSql = `
      SELECT payment_id, amount, method, status, paid_at
      FROM payments
      WHERE pnr = $1
      ORDER BY paid_at DESC
    `;
    const paymentRes = await query(paymentSql, [pnr]);
    booking.payments = paymentRes.rows;

    return booking;
  }

  /**
   * Search available trains between source and destination
   */
  async searchTrains(fromStation, toStation, journeyDate, travelClass) {
    let sql = `
      SELECT 
        v.schedule_id,
        v.journey_date,
        v.train_id,
        v.train_no,
        v.train_name,
        v.train_type,
        v.from_station_id,
        v.from_station_code,
        v.from_station_name,
        v.departure_time,
        v.to_station_id,
        v.to_station_code,
        v.to_station_name,
        v.arrival_time,
        v.distance_km,
        jsonb_agg(
          jsonb_build_object(
            'class', sa.class,
            'total_seats', sa.total_seats,
            'free_seats', sa.free_seats,
            'booked_seats', sa.booked_seats,
            'waiting_count', sa.waiting_count,
            'current_status', sa.current_status,
            'fare', calculate_fare(v.train_id, v.from_station_id, v.to_station_id, sa.class)
          )
        ) AS availability
      FROM v_train_search v
      JOIN v_seat_availability sa ON sa.schedule_id = v.schedule_id
      WHERE (v.from_station_code = $1 OR v.from_station_name ILIKE $1)
        AND (v.to_station_code = $2 OR v.to_station_name ILIKE $2)
        AND v.journey_date = $3::DATE
    `;

    const params = [fromStation, toStation, journeyDate];

    if (travelClass) {
      sql += ` AND sa.class = $4`;
      params.push(travelClass);
    }

    sql += `
      GROUP BY 
        v.schedule_id, v.journey_date, v.train_id, v.train_no, v.train_name,
        v.train_type, v.from_station_id, v.from_station_code, v.from_station_name,
        v.departure_time, v.to_station_id, v.to_station_code, v.to_station_name,
        v.arrival_time, v.distance_km
      ORDER BY v.departure_time ASC
    `;

    const res = await query(sql, params);
    return res.rows;
  }

  /**
   * Get user booking history from v_booking_history
   */
  async getUserBookings(userId) {
    const sql = `
      SELECT * 
      FROM v_booking_history 
      WHERE user_id = $1 
      ORDER BY booked_at DESC
    `;
    const res = await query(sql, [userId]);
    return res.rows;
  }

  /**
   * Get analytical dashboard statistics from v_admin_stats
   */
  async getAdminStats() {
    const statsSql = `SELECT * FROM v_admin_stats`;
    const statsRes = await query(statsSql);

    // Fetch daily booking trend
    const trendSql = `
      SELECT 
        DATE(booked_at) AS booking_date,
        COUNT(*) AS total_bookings,
        COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) AS confirmed,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) AS cancelled,
        SUM(fare) AS revenue
      FROM bookings
      GROUP BY DATE(booked_at)
      ORDER BY booking_date DESC
      LIMIT 14
    `;
    const trendRes = await query(trendSql);

    // Fetch occupancy per train
    const trainOccupancySql = `
      SELECT 
        t.train_no,
        t.name AS train_name,
        COUNT(si.seat_id) AS total_seats,
        COUNT(CASE WHEN si.status = 'BOOKED' THEN 1 END) AS booked_seats,
        ROUND(
          COUNT(CASE WHEN si.status = 'BOOKED' THEN 1 END)::NUMERIC / 
          NULLIF(COUNT(si.seat_id), 0)::NUMERIC * 100, 2
        ) AS occupancy_pct
      FROM trains t
      JOIN schedules sch ON sch.train_id = t.train_id
      JOIN seat_inventory si ON si.schedule_id = sch.schedule_id
      GROUP BY t.train_no, t.name
      ORDER BY occupancy_pct DESC
    `;
    const trainOccupancyRes = await query(trainOccupancySql);

    return {
      kpi: statsRes.rows[0],
      trends: trendRes.rows,
      trainOccupancy: trainOccupancyRes.rows,
    };
  }
}

module.exports = new BookingService();
