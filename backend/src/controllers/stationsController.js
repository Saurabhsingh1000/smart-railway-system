// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/controllers/stationsController.js
// Description: Station data retrieval controller.
// ============================================================================

const { query } = require('../config/db');

async function getAllStations(req, res, next) {
  try {
    const result = await query('SELECT station_id, code, name, city FROM stations ORDER BY name ASC');
    res.json({
      success: true,
      count: result.rows.length,
      stations: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllStations,
};
