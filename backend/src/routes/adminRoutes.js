// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/routes/adminRoutes.js
// Description: Express routes for admin-only operations and dashboard stats.
// ============================================================================

const express = require('express');
const { body } = require('express-validator');
const {
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
} = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

// Apply auth and admin-role enforcement across all admin routes
router.use(authenticateToken, requireRole('ADMIN'));

// KPI Stats
router.get('/stats', getStats);

// Trains Management
router.post(
  '/trains',
  [
    body('train_no').trim().notEmpty().withMessage('Train number is required'),
    body('name').trim().notEmpty().withMessage('Train name is required'),
    validateRequest,
  ],
  createTrain
);
router.put('/trains/:id', updateTrain);
router.delete('/trains/:id', deleteTrain);

// Stations Management
router.post(
  '/stations',
  [
    body('code').trim().isLength({ min: 2, max: 10 }).withMessage('Valid station code required'),
    body('name').trim().notEmpty().withMessage('Station name is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    validateRequest,
  ],
  createStation
);
router.put('/stations/:id', updateStation);
router.delete('/stations/:id', deleteStation);

// Schedules Management
router.post(
  '/schedules',
  [
    body('train_id').isInt({ min: 1 }).withMessage('Valid train_id is required'),
    body('journey_date').isDate().withMessage('Valid journey_date is required'),
    validateRequest,
  ],
  createSchedule
);
router.delete('/schedules/:id', deleteSchedule);

// Stops Management
router.post(
  '/stops',
  [
    body('train_id').isInt({ min: 1 }).withMessage('Valid train_id is required'),
    body('station_id').isInt({ min: 1 }).withMessage('Valid station_id is required'),
    body('stop_seq').isInt({ min: 1 }).withMessage('Valid stop_seq is required'),
    body('distance_km').isInt({ min: 0 }).withMessage('Valid distance_km is required'),
    validateRequest,
  ],
  addStop
);
router.delete('/stops/:train_id/:stop_seq', deleteStop);

module.exports = router;
