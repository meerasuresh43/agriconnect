const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { authenticateToken, normalizeRole, JWT_SECRET } = require('../middleware/auth');

// Generate unique Farmer/User ID
function generateUserId(role) {
  const norm = normalizeRole(role);
  const prefix = norm === 'main_admin' ? 'AGRI-MAIN-' : norm === 'admin' ? 'AGRI-ADM-' : norm === 'owner' ? 'AGRI-OWN-' : 'AGRI-FAR-';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomNum}`;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, location, aadhaar, preferredCrop, preferredLandSize, preferredDuration, budgetRange } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, password, and user role.' });
    }

    const normRole = normalizeRole(role);

    // CRITICAL SECURITY GUARD: Public users cannot register as Admin or Main Admin
    if (normRole === 'admin' || normRole === 'main_admin') {
      return res.status(403).json({
        success: false,
        message: 'Public registration for administrator roles is prohibited. Administrator accounts must be provisioned securely.'
      });
    }

    if (!['owner', 'farmer'].includes(normRole)) {
      return res.status(400).json({ success: false, message: 'Invalid user role specified. Must be LAND_OWNER or FARMER.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? phone.replace(/[\s\-\(\)\+]/g, '').slice(-10) : '';
    const db = await getDb();

    // Check existing email
    const existingEmail = await db.get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email address is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const farmerUserId = generateUserId(normRole);
    const aadhaarLast4 = aadhaar ? String(aadhaar).slice(-4) : null;

    const result = await db.run(`
      INSERT INTO users (farmer_user_id, name, email, password_hash, phone, role, location, aadhaar_last4, is_verified, status, verification_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', 'pending')
    `, [farmerUserId, name.trim(), cleanEmail, passwordHash, phone ? phone.trim() : '', normRole, location ? location.trim() : '', aadhaarLast4]);

    const userId = result.lastID;

    // Check for Potential Duplicate Account (duplicate normalized phone or Aadhaar)
    if (cleanPhone || aadhaarLast4) {
      const matchConditions = [];
      const matchParams = [];

      if (cleanPhone && cleanPhone.length >= 7) {
        matchConditions.push("(phone != '' AND REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ?)");
        matchParams.push(`%${cleanPhone}`);
      }
      if (aadhaarLast4) {
        matchConditions.push("(aadhaar_last4 IS NOT NULL AND aadhaar_last4 = ?)");
        matchParams.push(aadhaarLast4);
      }

      if (matchConditions.length > 0) {
        const potentialDup = await db.get(`
          SELECT id, name, email, phone, role 
          FROM users 
          WHERE id != ? AND (${matchConditions.join(' OR ')})
          LIMIT 1
        `, [userId, ...matchParams]);

        if (potentialDup) {
          const matchType = cleanPhone && potentialDup.phone && potentialDup.phone.replace(/[\s\-\(\)\+]/g, '').includes(cleanPhone) ? 'phone' : 'aadhaar';
          const matchReason = matchType === 'phone'
            ? `Matching normalized contact phone number (+91...${cleanPhone.slice(-4)}) detected with user #${potentialDup.id} (${potentialDup.name}).`
            : `Matching Aadhaar last-4 digits (${aadhaarLast4}) detected with user #${potentialDup.id} (${potentialDup.name}).`;

          await db.run(`
            INSERT INTO duplicate_review_cases (primary_user_id, duplicate_user_id, match_type, match_reason, status)
            VALUES (?, ?, ?, ?, 'review_required')
          `, [potentialDup.id, userId, matchType, matchReason]);
        }
      }
    }

    // Create farmer profile if farmer
    if (normRole === 'farmer') {
      await db.run(`
        INSERT INTO farmer_profiles (user_id, preferred_crop, preferred_land_size, preferred_rental_duration, budget_range)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, preferredCrop || '', preferredLandSize || '', preferredDuration || '', budgetRange || '']);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, farmer_user_id: farmerUserId, role: normRole, name: name.trim(), email: cleanEmail },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: userId,
        farmer_user_id: farmerUserId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : '',
        role: normRole,
        location: location ? location.trim() : '',
        aadhaar_last4: aadhaarLast4,
        is_verified: 0,
        status: 'active',
        verification_status: 'pending'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { identifier, email, password, role } = req.body;
    const loginId = identifier || email;

    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: 'Please enter your email/ID and password.' });
    }

    const db = await getDb();
    const cleanId = loginId.trim();

    // Query by email OR farmer_user_id (case-insensitive for email)
    const user = await db.get(`
      SELECT * FROM users 
      WHERE (LOWER(email) = LOWER(?) OR farmer_user_id = ?) AND is_deleted = 0
    `, [cleanId, cleanId]);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    // 1. Verify password hash first (credentials validation)
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Wrong password.' });
    }

    // 2. Check account status: suspended or deactivated
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        is_suspended: true,
        message: `Your account has been suspended by administration. Reason: ${user.status_reason || 'Under review for compliance.'}`
      });
    }

    if (user.status === 'deactivated') {
      return res.status(403).json({
        success: false,
        is_deactivated: true,
        message: `Your account has been deactivated. Reason: ${user.status_reason || 'Account marked inactive.'}`
      });
    }

    // 3. Server-side role verification after credential validation
    const userNormRole = normalizeRole(user.role);
    if (role) {
      const clientNormRole = normalizeRole(role);
      if (clientNormRole === 'admin') {
        if (userNormRole !== 'admin' && userNormRole !== 'main_admin') {
          return res.status(403).json({ success: false, message: 'Access denied: You do not have administrative privileges.' });
        }
      } else if (clientNormRole === 'owner') {
        if (userNormRole !== 'owner') {
          return res.status(403).json({ success: false, message: 'Access denied: This account is not registered as a Landowner. Please select the correct login option.' });
        }
      } else if (clientNormRole === 'farmer') {
        if (userNormRole !== 'farmer') {
          return res.status(403).json({ success: false, message: 'Access denied: This account is not registered as a Farmer. Please select the correct login option.' });
        }
      } else if (clientNormRole !== userNormRole) {
        return res.status(403).json({ success: false, message: `Account exists, but is registered as a ${user.role}. Please select the correct login tab.` });
      }
    }

    // Get farmer profile if farmer
    let farmerProfile = null;
    if (userNormRole === 'farmer') {
      farmerProfile = await db.get('SELECT * FROM farmer_profiles WHERE user_id = ?', [user.id]);
    }

    const token = jwt.sign(
      { id: user.id, farmer_user_id: user.farmer_user_id, role: userNormRole, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        farmer_user_id: user.farmer_user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: userNormRole,
        location: user.location,
        aadhaar_last4: user.aadhaar_last4,
        is_verified: user.is_verified,
        status: user.status,
        verification_status: user.verification_status,
        farmerProfile
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get(`
      SELECT id, farmer_user_id, name, email, phone, role, location, aadhaar_last4, is_verified, status, verification_status, created_at 
      FROM users 
      WHERE id = ? AND is_deleted = 0
    `, [req.user.id]);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let farmerProfile = null;
    if (normalizeRole(user.role) === 'farmer') {
      farmerProfile = await db.get('SELECT * FROM farmer_profiles WHERE user_id = ?', [user.id]);
    }

    res.json({
      success: true,
      user: {
        ...user,
        role: normalizeRole(user.role),
        farmerProfile
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching user profile.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, location, preferredCrop, preferredLandSize, preferredDuration, budgetRange } = req.body;
    const db = await getDb();

    await db.run(`
      UPDATE users SET name = ?, phone = ?, location = ? WHERE id = ?
    `, [name, phone, location, req.user.id]);

    if (req.user.role === 'farmer') {
      const existing = await db.get('SELECT id FROM farmer_profiles WHERE user_id = ?', [req.user.id]);
      if (existing) {
        await db.run(`
          UPDATE farmer_profiles SET preferred_crop = ?, preferred_land_size = ?, preferred_rental_duration = ?, budget_range = ? WHERE user_id = ?
        `, [preferredCrop, preferredLandSize, preferredDuration, budgetRange, req.user.id]);
      } else {
        await db.run(`
          INSERT INTO farmer_profiles (user_id, preferred_crop, preferred_land_size, preferred_rental_duration, budget_range)
          VALUES (?, ?, ?, ?, ?)
        `, [req.user.id, preferredCrop, preferredLandSize, preferredDuration, budgetRange]);
      }
    }

    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// GET /api/auth/notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const notifications = await db.all(`
      SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC
    `, [req.user.id]);
    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

module.exports = router;
