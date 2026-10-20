const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'agriconnect_super_secret_jwt_key_2026';

function normalizeRole(role) {
  if (!role) return '';
  const r = String(role).toLowerCase().trim();
  if (r === 'main_admin' || r === 'super_admin') return 'main_admin';
  if (r === 'admin' || r === 'sub_admin') return 'admin';
  if (r === 'land_owner' || r === 'owner') return 'owner';
  if (r === 'farmer') return 'farmer';
  return r;
}

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token missing or invalid' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token is expired or invalid' });
    }

    try {
      const db = await getDb();
      // Server-side verification from trusted database: check role, active status, and deletion
      const dbUser = await db.get(`
        SELECT id, farmer_user_id, name, email, role, status, status_reason, is_deleted 
        FROM users 
        WHERE id = ?
      `, [decodedUser.id]);

      if (!dbUser || dbUser.is_deleted === 1) {
        return res.status(401).json({ success: false, message: 'Account no longer exists or has been removed.' });
      }

      // Check account suspension or deactivation (immediate session invalidation)
      if (dbUser.status === 'suspended') {
        return res.status(403).json({
          success: false,
          is_suspended: true,
          message: `Your account has been suspended by administration. Reason: ${dbUser.status_reason || 'Policy violation or investigation in progress.'}`
        });
      }

      if (dbUser.status === 'deactivated') {
        return res.status(403).json({
          success: false,
          is_deactivated: true,
          message: `Your account has been deactivated. Reason: ${dbUser.status_reason || 'Administrative action.'}`
        });
      }

      // Attach trusted server-side verified user
      req.user = {
        ...decodedUser,
        role: normalizeRole(dbUser.role),
        status: dbUser.status,
        name: dbUser.name,
        email: dbUser.email,
        farmer_user_id: dbUser.farmer_user_id
      };

      next();
    } catch (dbErr) {
      console.error('Auth token DB verification error:', dbErr);
      return res.status(500).json({ success: false, message: 'Internal authentication error.' });
    }
  });
}

function requireRole(roles) {
  const allowed = roles.map(normalizeRole);
  // Main Admin is the Super Admin and inherently possesses all 'admin' privileges
  if (allowed.includes('admin') && !allowed.includes('main_admin')) {
    allowed.push('main_admin');
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userRole = normalizeRole(req.user.role);
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient administrative privileges' });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  normalizeRole,
  JWT_SECRET
};
