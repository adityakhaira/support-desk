const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { getJwtSecret } = require('../utils/auth');

const getToken = (req) => {
  if (req.cookies && req.cookies.supportdesk_token) return req.cookies.supportdesk_token;
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
};

async function authenticate(req, res, next) {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch (error) {
    if (error.message === 'JWT_SECRET must be configured.') {
      return next(error);
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ? AND is_active = 1',
      [payload.id]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'User not found or inactive.' });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden. Insufficient permissions.' });
    }
    next();
  };
}

module.exports = { authenticate, authorizeRoles };
