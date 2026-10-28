// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/config/db.js
// Description: PostgreSQL connection pool configuration using 'pg'.
// ============================================================================

const { Pool } = require('pg');
require('dotenv').config();

const isCloud = !!process.env.DATABASE_URL || process.env.NODE_ENV === 'production';
const sslOption = process.env.DATABASE_SSL === 'false' 
  ? false 
  : (isCloud ? { rejectUnauthorized: false } : false);

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: sslOption,
        max: 30,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'smart_railway',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ssl: sslOption,
        max: 60,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
      }
);

pool.on('error', (err) => {
  console.error('[DB Pool Error] Unexpected idle client error:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
