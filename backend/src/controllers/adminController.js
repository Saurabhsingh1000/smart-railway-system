// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/controllers/adminController.js
// Description: Admin management operations and KPI analytical dashboard.
// ============================================================================

const { query } = require('../config/db');
const bookingService = require('../services/bookingService');

async function getStats(req, res, next) {
  try {
    const stats = await bookingService.getAdminStats();
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
}

// --- Train CRUD ---
async function createTrain(req, res, next) {
  try {
    const { train_no, name, type } = req.body;
    const sql = `
      INSERT INTO trains (train_no, name, type) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `;
    const result = await query(sql, [train_no, name, type || 'SUPERFAST']);
    res.status(201).json({ success: true, train: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function updateTrain(req, res, next) {
  try {
    const { id } = req.params;
    const { train_no, name, type } = req.body;
    const sql = `
      UPDATE trains 
      SET train_no = COALESCE($1, train_no),
          name = COALESCE($2, name),
          type = COALESCE($3, type)
      WHERE train_id = $4
      RETURNING *
    `;
    const result = await query(sql, [train_no, name, type, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Train not found' });
    }
    res.json({ success: true, train: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function deleteTrain(req, res, next) {
  try {
    const { id } = req.params;
    await query('DELETE FROM trains WHERE train_id = $1', [id]);
    res.json({ success: true, message: 'Train deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// --- Station CRUD ---
async function createStation(req, res, next) {
  try {
    const { code, name, city } = req.body;
    const sql = `
      INSERT INTO stations (code, name, city) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `;
    const result = await query(sql, [code.toUpperCase(), name, city]);
    res.status(201).json({ success: true, station: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function updateStation(req, res, next) {
  try {
    const { id } = req.params;
    const { code, name, city } = req.body;
    const sql = `
      UPDATE stations 
      SET code = COALESCE($1, code),
          name = COALESCE($2, name),
          city = COALESCE($3, city)
      WHERE station_id = $4
      RETURNING *
    `;
    const result = await query(sql, [code ? code.toUpperCase() : null, name, city, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Station not found' });
    }
    res.json({ success: true, station: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function deleteStation(req, res, next) {
  try {
    const { id } = req.params;
    await query('DELETE FROM stations WHERE station_id = $1', [id]);
    res.json({ success: true, message: 'Station deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// --- Schedule CRUD ---
async function createSchedule(req, res, next) {
  try {
    const { train_id, journey_date } = req.body;
    const sql = `
      INSERT INTO schedules (train_id, journey_date, status) 
      VALUES ($1, $2, 'ACTIVE') 
      RETURNING *
    `;
    const result = await query(sql, [train_id, journey_date]);
    const schedule = result.rows[0];

    // Auto-generate seat inventory for this new schedule
    const inventorySql = `
      INSERT INTO seat_inventory (schedule_id, seat_id, status, version)
      SELECT $1, s.seat_id, 'FREE', 0
      FROM coaches c
      JOIN seats s ON s.coach_id = c.coach_id
      WHERE c.train_id = $2
      ON CONFLICT (schedule_id, seat_id) DO NOTHING
    `;
    await query(inventorySql, [schedule.schedule_id, train_id]);

    res.status(201).json({
      success: true,
      schedule,
      message: 'Schedule created and seat inventory automatically generated',
    });
  } catch (err) {
    next(err);
  }
}

async function deleteSchedule(req, res, next) {
  try {
    const { id } = req.params;
    await query('DELETE FROM schedules WHERE schedule_id = $1', [id]);
    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// --- Stops CRUD ---
async function addStop(req, res, next) {
  try {
    const { train_id, station_id, stop_seq, arrival_time, departure_time, distance_km } = req.body;
    const sql = `
      INSERT INTO train_stops (train_id, station_id, stop_seq, arrival_time, departure_time, distance_km)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await query(sql, [
      train_id,
      station_id,
      stop_seq,
      arrival_time || null,
      departure_time || null,
      distance_km,
    ]);
    res.status(201).json({ success: true, stop: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function deleteStop(req, res, next) {
  try {
    const { train_id, stop_seq } = req.params;
    await query('DELETE FROM train_stops WHERE train_id = $1 AND stop_seq = $2', [train_id, stop_seq]);
    res.json({ success: true, message: 'Stop deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats,
  createTrain,
  updateTrain,
  deleteTrain,
  createStation,
  updateStation,
  deleteStation,
  createSchedule,
  deleteSchedule,
  addStop,
  deleteStop,
};
