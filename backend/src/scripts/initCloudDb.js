// ============================================================================
// File: backend/src/scripts/initCloudDb.js
// Description: Automated script to initialize schema, functions, triggers,
// and seeds onto any PostgreSQL instance (Neon, Supabase, Render, Railway, etc.)
// Usage: node backend/src/scripts/initCloudDb.js
// ============================================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

const SQL_FILES = [
  '01_schema.sql',
  '02_indexes.sql',
  '03_functions.sql',
  '04_triggers.sql',
  '05_views.sql',
  '06_seed.sql',
  '07_generate_inventory.sql',
];

async function initializeDatabase() {
  console.log('🚀 Connecting to PostgreSQL database...');
  const client = await pool.connect();

  try {
    const dbDir = path.join(__dirname, '../../../db');
    console.log(`📁 Loading SQL migration files from: ${dbDir}`);

    for (const file of SQL_FILES) {
      const filePath = path.join(dbDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Warning: ${file} not found at ${filePath}, skipping.`);
        continue;
      }

      console.log(`⏳ Executing ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
      console.log(`✅ Completed: ${file}`);
    }

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('All schemas, functions, triggers, and mock seeds are ready.');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase();
