// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/controllers/authController.js
// Description: User registration, login, and profile retrieval.
// ============================================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Check duplicate email
    const existing = await query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertSql = `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, 'USER')
      RETURNING user_id, name, email, role, created_at
    `;
    const result = await query(insertSql, [name, email, passwordHash]);
    const user = result.rows[0];

    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT user_id, name, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const result = await query(
      'SELECT user_id, name, email, role, created_at FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe,
};
