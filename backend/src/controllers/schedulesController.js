// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/controllers/schedulesController.js
// Description: Schedules and operational run management.
// ============================================================================

const { query } = require('../config/db');

async function getSchedules(req, res, next) {
  try {
    const { train_id, date } = req.query;
    let sql = `
      SELECT 
        sch.schedule_id,
        sch.train_id,
        t.train_no,
        t.name AS train_name,
        sch.journey_date,
        sch.status
      FROM schedules sch
      JOIN trains t ON t.train_id = sch.train_id
      WHERE 1=1
    `;
    const params = [];

    if (train_id) {
      params.push(train_id);
      sql += ` AND sch.train_id = $${params.length}`;
    }

    if (date) {
      params.push(date);
      sql += ` AND sch.journey_date = $${params.length}`;
    }

    sql += ` ORDER BY sch.journey_date ASC LIMIT 100`;

    const result = await query(sql, params);
    res.json({
      success: true,
      count: result.rows.length,
      schedules: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSchedules,
};
