// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/routes/schedulesRoutes.js
// Description: Express routes for operational schedules.
// ============================================================================

const express = require('express');
const { getSchedules } = require('../controllers/schedulesController');

const router = express.Router();

router.get('/', getSchedules);

module.exports = router;
