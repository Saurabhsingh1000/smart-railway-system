// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/routes/bookingsRoutes.js
// Description: Express routes for bookings, cancellation, and PNR status.
// ============================================================================

const express = require('express');
const { body } = require('express-validator');
const {
  createBooking,
  getMyBookings,
  getPNRStatus,
  cancelBooking,
} = require('../controllers/bookingsController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

// 1. Create a new booking
router.post(
  '/',
  authenticateToken,
  [
    body('scheduleId').isInt({ min: 1 }).withMessage('Valid scheduleId is required'),
    body('class').isIn(['SL', '3A', '2A']).withMessage('Class must be SL, 3A, or 2A'),
    body('fromStationId').isInt({ min: 1 }).withMessage('Valid fromStationId is required'),
    body('toStationId').isInt({ min: 1 }).withMessage('Valid toStationId is required'),
    body('passengers').isArray({ min: 1, max: 6 }).withMessage('Passengers array must contain 1 to 6 items'),
    body('passengers.*.name').trim().notEmpty().withMessage('Passenger name is required'),
    body('passengers.*.age').isInt({ min: 1, max: 120 }).withMessage('Valid age between 1 and 120 is required'),
    body('passengers.*.gender').isIn(['M', 'F', 'O']).withMessage('Gender must be M, F, or O'),
    validateRequest,
  ],
  createBooking
);

// 2. User booking history
router.get('/my', authenticateToken, getMyBookings);

// 3. Cancel booking
router.post('/:pnr/cancel', authenticateToken, cancelBooking);

module.exports = router;
