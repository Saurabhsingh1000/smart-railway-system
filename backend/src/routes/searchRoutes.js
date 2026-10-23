// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/routes/searchRoutes.js
// Description: Express routes for train and availability search.
// ============================================================================

const express = require('express');
const { searchTrains } = require('../controllers/searchController');

const router = express.Router();

router.get('/', searchTrains);

module.exports = router;
