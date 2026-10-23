// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/middleware/auth.js
// Description: JWT authentication middleware verifying Bearer tokens.
// ============================================================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_railway_system_2026_change_in_prod';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract 'Bearer <token>'

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token missing. Please provide Authorization: Bearer <token>',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired authentication token',
      });
    }

    req.user = user;
    next();
  });
}

module.exports = {
  authenticateToken,
  JWT_SECRET,
};
