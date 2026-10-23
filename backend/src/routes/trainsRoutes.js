// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/routes/trainsRoutes.js
// Description: Express routes for trains and routes.
// ============================================================================

const express = require('express');
const { getAllTrains, getTrainDetails } = require('../controllers/trainsController');

const router = express.Router();

router.get('/', getAllTrains);
router.get('/:id', getTrainDetails);

module.exports = router;
