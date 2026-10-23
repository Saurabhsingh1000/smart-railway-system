// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/routes/stationsRoutes.js
// Description: Express routes for stations.
// ============================================================================

const express = require('express');
const { getAllStations } = require('../controllers/stationsController');

const router = express.Router();

router.get('/', getAllStations);

module.exports = router;
