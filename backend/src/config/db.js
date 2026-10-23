// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/config/db.js
// Description: PostgreSQL connection pool configuration using 'pg'.
// ============================================================================

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'smart_railway',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 60, // Support concurrent connections for 50+ concurrency stress testing
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[DB Pool Error] Unexpected idle client error:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
