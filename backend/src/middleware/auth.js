const jwt = require('jsonwebtoken');
const { ROLES } = require('../config/constants');

// ─────────────────────────────────────────────────────────────
// JWT secret selection — each role gets its own secret
// so a tenant token can never impersonate an admin
// ─────────────────────────────────────────────────────────────
function getJwtSecret(role) {
  switch (role) {
    case ROLES.SUPER_ADMIN:
    case ROLES.ADMIN:
      return process.env.JWT_SECRET_ADMIN;
    case ROLES.TENANT:
      return process.env.JWT_SECRET_TENANT;
    case ROLES.STAFF:
      return process.env.JWT_SECRET_STAFF;
    default:
      throw new Error('Unknown role: ' + role);
  }
}

// ─────────────────────────────────────────────────────────────
// Core authentication middleware
// Verifies the Bearer token and attaches `req.user`
// ─────────────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  const token = authHeader.split(' ')[1];

  // We try each secret since we don't know the role yet
  const secrets = [
    process.env.JWT_SECRET_ADMIN,
    process.env.JWT_SECRET_TENANT,
    process.env.JWT_SECRET_STAFF
  ];

  let decoded = null;
  for (const secret of secrets) {
    try {
      decoded = jwt.verify(token, secret);
      break;
    } catch {
      // try next secret
    }
  }

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }

  req.user = decoded;
  next();
}

// ─────────────────────────────────────────────────────────────
// Role-based authorization — use after authenticate()
// Usage: authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN)
// ─────────────────────────────────────────────────────────────
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────
// Token generation helpers (used in auth controller)
// ─────────────────────────────────────────────────────────────
function generateAccessToken(user) {
  return jwt.sign(
    {
      id:          user.id,
      role:        user.role,
      compound_id: user.compound_id,
      email:       user.email,
      phone:       user.phone,
      full_name:   user.full_name
    },
    getJwtSecret(user.role),
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '30d' }
  );
}

module.exports = {
  authenticate,
  authorize,
  generateAccessToken,
  generateRefreshToken
};
