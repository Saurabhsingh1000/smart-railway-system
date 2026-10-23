// ============================================================================
// SMART RAILWAY RESERVATION SYSTEM (Advanced DBMS Project)
// File: backend/src/middleware/role.js
// Description: Role-based Access Control (RBAC) middleware.
// ============================================================================

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required before role check',
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires '${role}' role, but user has '${req.user.role}'.`,
      });
    }

    next();
  };
}

module.exports = {
  requireRole,
};
