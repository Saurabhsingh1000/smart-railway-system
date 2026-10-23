// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/routes/seatsRoutes.js
// Description: Express routes for live seat layout.
// ============================================================================

const express = require('express');
const { getSeatsForSchedule } = require('../controllers/seatsController');

const router = express.Router();

router.get('/schedules/:id/seats', getSeatsForSchedule);

module.exports = router;
