// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/controllers/trainsController.js
// Description: Train listings and route details controller.
// ============================================================================

const { query } = require('../config/db');

async function getAllTrains(req, res, next) {
  try {
    const trainsRes = await query('SELECT train_id, train_no, name, type FROM trains ORDER BY train_no ASC');
    res.json({
      success: true,
      count: trainsRes.rows.length,
      trains: trainsRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function getTrainDetails(req, res, next) {
  try {
    const { id } = req.params;

    const trainRes = await query(
      'SELECT train_id, train_no, name, type FROM trains WHERE train_id = $1',
      [id]
    );

    if (trainRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Train not found' });
    }

    const train = trainRes.rows[0];

    // Fetch stops
    const stopsRes = await query(
      `SELECT ts.stop_seq, s.station_id, s.code, s.name, s.city, ts.arrival_time, ts.departure_time, ts.distance_km
       FROM train_stops ts
       JOIN stations s ON s.station_id = ts.station_id
       WHERE ts.train_id = $1
       ORDER BY ts.stop_seq ASC`,
      [id]
    );

    // Fetch coaches
    const coachesRes = await query(
      `SELECT coach_id, coach_no, class, total_seats
       FROM coaches
       WHERE train_id = $1
       ORDER BY coach_no ASC`,
      [id]
    );

    train.stops = stopsRes.rows;
    train.coaches = coachesRes.rows;

    res.json({ success: true, train });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllTrains,
  getTrainDetails,
};
