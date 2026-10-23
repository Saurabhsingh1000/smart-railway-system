// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/controllers/seatsController.js
// Description: Live visual seat map controller.
// ============================================================================

const bookingService = require('../services/bookingService');

async function getSeatsForSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const { class: travelClass } = req.query;

    const seats = await bookingService.getSeatMap(id, travelClass);

    res.json({
      success: true,
      scheduleId: parseInt(id, 10),
      count: seats.length,
      seats,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSeatsForSchedule,
};
