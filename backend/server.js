// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/server.js
// Description: Express HTTP server configuration, security middleware,
// REST routing, and database health check.
// ============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { pool } = require('./src/config/db');

// Route Handlers
const authRoutes = require('./src/routes/authRoutes');
const stationsRoutes = require('./src/routes/stationsRoutes');
const trainsRoutes = require('./src/routes/trainsRoutes');
const schedulesRoutes = require('./src/routes/schedulesRoutes');
const searchRoutes = require('./src/routes/searchRoutes');
const seatsRoutes = require('./src/routes/seatsRoutes');
const bookingsRoutes = require('./src/routes/bookingsRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const { getPNRStatus } = require('./src/controllers/bookingsController');
const errorHandler = require('./src/middleware/errorHandler');

const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(u => u.trim()) 
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() AS db_time, version() AS pg_version');
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        connected: true,
        time: dbRes.rows[0].db_time,
        version: dbRes.rows[0].pg_version.split(',')[0],
        pool: {
          totalClients: pool.totalCount,
          idleClients: pool.idleCount,
          waitingClients: pool.waitingCount,
        },
      },
    });
  } catch (err) {
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: err.message,
      },
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stations', stationsRoutes);
app.use('/api/trains', trainsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api', seatsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.get('/api/pnr/:pnr', getPNRStatus);
app.use('/api/admin', adminRoutes);

// Serve static frontend build if present
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 Handler for API endpoints
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚂 Smart Railway Reservation System Backend Running`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

module.exports = app;
