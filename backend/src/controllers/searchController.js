// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/controllers/searchController.js
// Description: Multi-stop train discovery and live seat availability search.
// ============================================================================

const bookingService = require('../services/bookingService');

async function searchTrains(req, res, next) {
  try {
    const { from, to, date, class: travelClass } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({
        success: false,
        error: 'Query parameters from, to, and date are required',
      });
    }

    const trains = await bookingService.searchTrains(from, to, date, travelClass);

    res.json({
      success: true,
      count: trains.length,
      searchParams: { from, to, date, class: travelClass || 'ALL' },
      trains,
      results: trains,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchTrains,
};
