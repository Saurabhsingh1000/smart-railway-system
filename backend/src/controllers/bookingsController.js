// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/controllers/bookingsController.js
// Description: Ticket booking, cancellation, and PNR status controller.
// ============================================================================

const bookingService = require('../services/bookingService');

async function createBooking(req, res, next) {
  try {
    const {
      scheduleId,
      class: travelClass,
      fromStationId,
      toStationId,
      passengers,
      paymentMethod,
      forcePayFail,
    } = req.body;

    const userId = req.user.userId;

    const result = await bookingService.bookTicket({
      userId,
      scheduleId: parseInt(scheduleId, 10),
      travelClass,
      fromStationId: parseInt(fromStationId, 10),
      toStationId: parseInt(toStationId, 10),
      passengers,
      paymentMethod: paymentMethod || 'UPI',
      forcePayFail: Boolean(forcePayFail),
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Booking could not be completed',
        detail: result.detail,
        status: result.status,
      });
    }

    res.status(201).json({
      success: true,
      message: result.status === 'CONFIRMED' 
        ? 'Ticket booked and confirmed successfully' 
        : 'Ticket booked with Waiting List allocation',
      booking: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getMyBookings(req, res, next) {
  try {
    const userId = req.user.userId;
    const bookings = await bookingService.getUserBookings(userId);

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    next(err);
  }
}

async function getPNRStatus(req, res, next) {
  try {
    const { pnr } = req.params;
    const booking = await bookingService.getPNRStatus(pnr);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: `Booking with PNR '${pnr}' not found`,
      });
    }

    res.json({
      success: true,
      booking,
    });
  } catch (err) {
    next(err);
  }
}

async function cancelBooking(req, res, next) {
  try {
    const { pnr } = req.params;
    const userId = req.user.userId;

    const result = await bookingService.cancelTicket(pnr, userId);

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBooking,
  getMyBookings,
  getPNRStatus,
  cancelBooking,
};
