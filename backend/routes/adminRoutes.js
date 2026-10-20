const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { authenticateToken, requireRole, normalizeRole } = require('../middleware/auth');

// All endpoints in this router require authentication and administrator role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Helper to record admin audit log
async function logAdminAction(db, { admin_id, admin_name, action, target_type, target_id, reason, outcome = 'success', ip = null }) {
  try {
    await db.run(`
      INSERT INTO admin_audit_logs (admin_id, admin_name, action, target_type, target_id, reason, outcome, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [admin_id, admin_name, action, target_type, target_id || null, reason || '', outcome, ip]);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// ====================================================
// 1. DASHBOARD OVERVIEW STATISTICS (Real DB Data)
// ====================================================
const getDashboardStats = async (req, res) => {
  try {
    const db = await getDb();

    const [
      totalUsersRes,
      totalOwnersRes,
      totalFarmersRes,
      totalAdminsRes,
      totalSubAdminsRes,
      pendingVerificationsRes,
      verifiedUsersRes,
      suspendedAccountsRes,
      reportedAccountsRes,
      totalLandsRes,
      pendingLandsRes,
      totalRentalsRes,
      duplicateCasesRes
    ] = await Promise.all([
      db.get(`SELECT COUNT(*) as count FROM users WHERE LOWER(role) NOT IN ('admin', 'main_admin') AND is_deleted = 0`),
      db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'owner' AND is_deleted = 0`),
      db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'farmer' AND is_deleted = 0`),
      db.get(`SELECT COUNT(*) as count FROM users WHERE LOWER(role) IN ('admin', 'main_admin') AND is_deleted = 0`),
      db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_deleted = 0`),
      db.get(`SELECT COUNT(*) as count FROM users WHERE is_verified = 0 AND LOWER(role) NOT IN ('admin', 'main_admin') AND is_deleted = 0`),
      db.get(`SELECT COUNT(*) as count FROM users WHERE is_verified = 1 AND is_deleted = 0`),
      db.get(`SELECT COUNT(*) as count FROM users WHERE status = 'suspended' AND is_deleted = 0`),
      db.get(`SELECT COUNT(*) as count FROM fraud_reports WHERE status IN ('pending', 'under_review')`),
      db.get(`SELECT COUNT(*) as count FROM lands`),
      db.get(`SELECT COUNT(*) as count FROM lands WHERE approval_status = 'pending'`),
      db.get(`SELECT COUNT(*) as count FROM rental_requests`),
      db.get(`SELECT COUNT(*) as count FROM duplicate_review_cases WHERE status = 'review_required'`)
    ]);

    const stats = {
      totalUsers: totalUsersRes.count,
      totalOwners: totalOwnersRes.count,
      totalFarmers: totalFarmersRes.count,
      totalAdmins: totalAdminsRes.count,
      totalSubAdmins: totalSubAdminsRes.count,
      pendingVerifications: pendingVerificationsRes.count,
      verifiedUsers: verifiedUsersRes.count,
      suspendedAccounts: suspendedAccountsRes.count,
      reportedAccounts: reportedAccountsRes.count,
      totalLands: totalLandsRes.count,
      pendingLandVerifications: pendingLandsRes.count,
      totalRentalRequests: totalRentalsRes.count,
      duplicateReviewCases: duplicateCasesRes.count
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch platform dashboard statistics.' });
  }
};

router.get('/stats', getDashboardStats);
router.get('/dashboard', getDashboardStats);

// ====================================================
// 2. MAIN ADMIN: SUB-ADMIN MANAGEMENT (Main Admin Only)
// ====================================================

// GET /api/admin/admins - List Sub-Admin Accounts
router.get('/admins', requireRole(['main_admin']), async (req, res) => {
  try {
    const db = await getDb();
    const includeMain = req.query.include_main === 'true';
    const roleCondition = includeMain
      ? "LOWER(u.role) IN ('admin', 'main_admin')"
      : "LOWER(u.role) = 'admin'";

    const admins = await db.all(`
      SELECT u.id, u.farmer_user_id, u.name, u.email, u.phone, u.role, u.status, u.is_verified, u.created_at, u.created_by,
             (SELECT COUNT(*) FROM admin_audit_logs WHERE admin_id = u.id) as actions_count
      FROM users u
      WHERE ${roleCondition} AND u.is_deleted = 0
      ORDER BY u.created_at DESC
    `);

    res.json({ success: true, count: admins.length, admins });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve administrators.' });
  }
});

// POST /api/admin/admins - Create Sub-Admin
router.post('/admins', requireRole(['main_admin']), async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = await getDb();

    // Prevent duplicate email
    const existing = await db.get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const adminUserId = `AGRI-ADM-${randomSuffix}`;

    const result = await db.run(`
      INSERT INTO users (farmer_user_id, name, email, password_hash, phone, role, location, is_verified, status, verification_status, created_by)
      VALUES (?, ?, ?, ?, ?, 'admin', 'Chennai, Tamil Nadu', 1, 'active', 'verified', ?)
    `, [adminUserId, name.trim(), cleanEmail, passwordHash, phone ? phone.trim() : '+91 9876543200', req.user.id]);

    const newAdminId = result.lastID;

    // Log action
    await logAdminAction(db, {
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: 'create_sub_admin',
      target_type: 'admin',
      target_id: newAdminId,
      reason: `Created sub-admin account for ${name.trim()} (${cleanEmail})`
    });

    res.status(201).json({
      success: true,
      message: 'Sub-Admin created successfully.',
      admin: {
        id: newAdminId,
        farmer_user_id: adminUserId,
        name: name.trim(),
        email: cleanEmail,
        role: 'admin',
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Create sub-admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to create sub-admin account.' });
  }
});

// PATCH /api/admin/admins/:id/status - Activate / Deactivate / Suspend Sub-Admin
router.patch('/admins/:id/status', requireRole(['main_admin']), async (req, res) => {
  try {
    const { status, reason } = req.body;
    const targetId = parseInt(req.params.id);

    if (!['active', 'deactivated', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid admin status specified.' });
    }

    const db = await getDb();
    const targetAdmin = await db.get('SELECT * FROM users WHERE id = ? AND is_deleted = 0', [targetId]);

    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: 'Administrator account not found.' });
    }

    // Protection: Main Admin cannot be deactivated or suspended
    if (normalizeRole(targetAdmin.role) === 'main_admin') {
      return res.status(403).json({ success: false, message: 'The Main Admin account cannot be deactivated or modified.' });
    }

    // Protection: Requester cannot deactivate themselves
    if (targetId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot alter your own administrative status.' });
    }

    await db.run('UPDATE users SET status = ?, status_reason = ? WHERE id = ?', [
      status,
      reason ? reason.trim() : `Status set to ${status} by Main Admin`,
      targetId
    ]);

    await logAdminAction(db, {
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: status === 'active' ? 'activate_sub_admin' : 'deactivate_sub_admin',
      target_type: 'admin',
      target_id: targetId,
      reason: reason || `Sub-admin status changed to ${status}`
    });

    res.json({ success: true, message: `Sub-admin status updated to ${status}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update admin status.' });
  }
});

// DELETE /api/admin/admins/:id - Remove Sub-Admin (Soft delete with audit)
router.delete('/admins/:id', requireRole(['main_admin']), async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const { reason } = req.body || {};

    const db = await getDb();
    const targetAdmin = await db.get('SELECT * FROM users WHERE id = ? AND is_deleted = 0', [targetId]);

    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: 'Administrator not found.' });
    }

    // Protection: Main Admin cannot be deleted
    if (normalizeRole(targetAdmin.role) === 'main_admin') {
      return res.status(403).json({ success: false, message: 'The Main Admin account cannot be removed.' });
    }

    // Protection: Cannot delete self
    if (targetId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own administrator account.' });
    }

    // Soft delete to preserve foreign keys and audit history
    await db.run(`
      UPDATE users 
      SET is_deleted = 1, status = 'deleted', deleted_at = CURRENT_TIMESTAMP, deleted_reason = ?
      WHERE id = ?
    `, [reason || 'Removed by Main Admin', targetId]);

    await logAdminAction(db, {
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: 'remove_sub_admin',
      target_type: 'admin',
      target_id: targetId,
      reason: reason || 'Sub-admin privileges revoked and account deleted'
    });

    res.json({ success: true, message: 'Sub-admin account removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove sub-admin account.' });
  }
});

// ====================================================
// 3. MANAGE LANDOWNERS & FARMERS
// ====================================================

// GET /api/admin/users - Searchable, Filtered Users List
router.get('/users', async (req, res) => {
  try {
    const { role, status, verification, search } = req.query;
    const db = await getDb();

    let query = `
      SELECT u.id, u.farmer_user_id, u.name, u.email, u.phone, u.role, u.location, u.aadhaar_last4,
             u.is_verified, u.verification_status, u.status, u.status_reason, u.created_at,
             (SELECT COUNT(*) FROM lands WHERE owner_id = u.id) as land_count,
             (SELECT COUNT(*) FROM rental_requests WHERE farmer_id = u.id) as request_count
      FROM users u
      WHERE u.is_deleted = 0
    `;
    const params = [];

    if (role && role !== 'all') {
      const normRole = normalizeRole(role);
      query += ` AND u.role = ?`;
      params.push(normRole);
    } else {
      query += ` AND LOWER(u.role) NOT IN ('admin', 'main_admin')`;
    }

    if (status && status !== 'all') {
      query += ` AND u.status = ?`;
      params.push(status);
    }

    if (verification && verification !== 'all') {
      if (verification === 'verified') {
        query += ` AND u.is_verified = 1`;
      } else {
        query += ` AND u.is_verified = 0`;
      }
    }

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.farmer_user_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY u.created_at DESC`;

    const users = await db.all(query, params);
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve user accounts.' });
  }
});

// GET /api/admin/users/:id - User Detail View
router.get('/users/:id', async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get(`
      SELECT id, farmer_user_id, name, email, phone, role, location, aadhaar_last4,
             is_verified, verification_status, rejection_reason, status, status_reason, created_at
      FROM users 
      WHERE id = ? AND is_deleted = 0
    `, [req.params.id]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Associated lands if owner
    let lands = [];
    if (user.role === 'owner') {
      lands = await db.all('SELECT * FROM lands WHERE owner_id = ?', [user.id]);
    }

    // Associated rental requests if farmer
    let requests = [];
    if (user.role === 'farmer') {
      requests = await db.all(`
        SELECT r.*, l.title as land_title, l.location as land_location 
        FROM rental_requests r
        JOIN lands l ON r.land_id = l.id
        WHERE r.farmer_id = ?
      `, [user.id]);
    }

    // Recent reports involving user
    const reports = await db.all(`
      SELECT * FROM fraud_reports 
      WHERE reported_user_id = ? OR reporter_id = ?
      ORDER BY created_at DESC LIMIT 5
    `, [user.id, user.id]);

    res.json({
      success: true,
      user: {
        ...user,
        lands,
        requests,
        reports
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user details.' });
  }
});

// PATCH /api/admin/users/:id/status - Suspend or Reactivate Account
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    const targetId = parseInt(req.params.id);

    if (!['active', 'suspended', 'deactivated'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid account status specified.' });
    }

    if (status === 'suspended' && !reason) {
      return res.status(400).json({ success: false, message: 'A suspension reason is mandatory.' });
    }

    const db = await getDb();
    const target = await db.get('SELECT * FROM users WHERE id = ? AND is_deleted = 0', [targetId]);

    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Protection: Cannot suspend Main Admin
    if (normalizeRole(target.role) === 'main_admin') {
      return res.status(403).json({ success: false, message: 'The Main Admin account cannot be suspended.' });
    }

    // Only Main Admin can suspend other admins
    if (normalizeRole(target.role) === 'admin' && normalizeRole(req.user.role) !== 'main_admin') {
      return res.status(403).json({ success: false, message: 'Only the Main Admin can modify administrator accounts.' });
    }

    await db.run('UPDATE users SET status = ?, status_reason = ? WHERE id = ?', [
      status,
      reason ? reason.trim() : null,
      targetId
    ]);

    // Send in-app notification to affected user
    await db.run(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, ?, ?)
    `, [
      targetId,
      status === 'suspended' ? 'Account Suspended' : 'Account Status Updated',
      status === 'suspended'
        ? `Your account was suspended by administration. Reason: ${reason}`
        : 'Your account has been reactivated. You may now access all AgriConnect services.'
    ]);

    await logAdminAction(db, {
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: status === 'suspended' ? 'suspend_account' : 'reactivate_account',
      target_type: 'user',
      target_id: targetId,
      reason: reason || `Account status changed to ${status}`
    });

    res.json({ success: true, message: `Account status successfully updated to ${status}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update account status.' });
  }
});

// DELETE /api/admin/users/:id - Soft Delete User Account with Confirmation Reason
router.delete('/users/:id', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const { reason } = req.body || {};

    if (!reason) {
      return res.status(400).json({ success: false, message: 'A deletion reason is required for audit compliance.' });
    }

    const db = await getDb();
    const target = await db.get('SELECT * FROM users WHERE id = ? AND is_deleted = 0', [targetId]);

    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (normalizeRole(target.role) === 'main_admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete the Main Admin account.' });
    }

    if (normalizeRole(target.role) === 'admin' && normalizeRole(req.user.role) !== 'main_admin') {
      return res.status(403).json({ success: false, message: 'Only the Main Admin can remove administrator accounts.' });
    }

    if (targetId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account through this operation.' });
    }

    // Soft delete user (never hard delete to preserve rental transactions and audit trails)
    await db.run(`
      UPDATE users 
      SET is_deleted = 1, status = 'deleted', deleted_at = CURRENT_TIMESTAMP, deleted_reason = ?
      WHERE id = ?
    `, [reason.trim(), targetId]);

    await logAdminAction(db, {
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: 'delete_account',
      target_type: 'user',
      target_id: targetId,
      reason: reason.trim()
    });

    res.json({ success: true, message: 'Account successfully removed from active directory.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete account.' });
  }
});

// ====================================================
// 4. USER AND DOCUMENT VERIFICATION
// ====================================================

// GET /api/admin/verification-requests - Pending Verifications
router.get('/verification-requests', async (req, res) => {
  try {
    const db = await getDb();
    const pendingUsers = await db.all(`
      SELECT id, farmer_user_id, name, email, phone, role, location, aadhaar_last4, created_at
      FROM users
      WHERE is_verified = 0 AND LOWER(role) NOT IN ('admin', 'main_admin') AND is_deleted = 0
      ORDER BY created_at DESC
    `);

    const pendingDocs = await db.all(`
      SELECT ld.*, l.title as land_title, l.location as land_location, u.name as owner_name, u.farmer_user_id as owner_user_id
      FROM land_documents ld
      JOIN lands l ON ld.land_id = l.id
      JOIN users u ON l.owner_id = u.id
      WHERE ld.verification_status = 'pending'
      ORDER BY ld.uploaded_at DESC
    `);

    res.json({
      success: true,
      pendingUsers,
      pendingDocs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load verification requests.' });
  }
});

// PATCH /api/admin/verifications/:id - Approve or Reject User Verification
router.patch('/verifications/:id', async (req, res) => {
  try {
    const { status, reason } = req.body; // status: 'verified' | 'rejected'
    const targetUserId = parseInt(req.params.id);

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be verified or rejected.' });
    }

    if (status === 'rejected' && !reason) {
      return res.status(400).json({ success: false, message: 'Please provide a reason when rejecting verification.' });
    }

    const db = await getDb();
    const target = await db.get('SELECT * FROM users WHERE id = ?', [targetUserId]);

    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isVerified = status === 'verified' ? 1 : 0;
    await db.run(`
      UPDATE users 
      SET is_verified = ?, verification_status = ?, rejection_reason = ? 
      WHERE id = ?
    `, [isVerified, status, status === 'rejected' ? reason.trim() : null, targetUserId]);

    await db.run(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, ?, ?)
    `, [
      targetUserId,
      status === 'verified' ? 'Identity Verified Successfully' : 'Verification Update Required',
      status === 'verified'
        ? 'Congratulations! Your AgriConnect identity has been verified by the administration.'
        : `Your identity verification was not approved. Reason: ${reason}`
    ]);

    await logAdminAction(db, {
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: status === 'verified' ? 'approve_verification' : 'reject_verification',
      target_type: 'user',
      target_id: targetUserId,
      reason: reason || `User verification marked as ${status}`
    });

    res.json({ success: true, message: `User verification updated to ${status}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update verification status.' });
  }
});

// PUT /api/admin/verify-user/:id (Backward compatibility)
router.put('/verify-user/:id', async (req, res) => {
  try {
    const { is_verified } = req.body;
    const status = is_verified ? 'verified' : 'rejected';
    const db = await getDb();
    await db.run('UPDATE users SET is_verified = ?, verification_status = ? WHERE id = ?', [is_verified ? 1 : 0, status, req.params.id]);
    res.json({ success: true, message: 'User verification status updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/verification-documents - Private Document Inspector (Admin Only)
router.get('/verification-documents', async (req, res) => {
  try {
    const db = await getDb();
    const docs = await db.all(`
      SELECT ld.*, l.title as land_title, l.location as land_location, u.name as owner_name, u.farmer_user_id as owner_user_id, u.aadhaar_last4
      FROM land_documents ld
      JOIN lands l ON ld.land_id = l.id
      JOIN users u ON l.owner_id = u.id
      ORDER BY ld.uploaded_at DESC
    `);
    res.json({ success: true, count: docs.length, documents: docs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch verification documents.' });
  }
});

// ====================================================
// 5. DUPLICATE REGISTRATION REVIEW
// ====================================================

// GET /api/admin/duplicate-cases - List Duplicate Cases
router.get('/duplicate-cases', async (req, res) => {
  try {
    const db = await getDb();
    const cases = await db.all(`
      SELECT drc.*, 
             u1.name as primary_name, u1.email as primary_email, u1.phone as primary_phone, u1.role as primary_role, u1.status as primary_status,
             u2.name as dup_name, u2.email as dup_email, u2.phone as dup_phone, u2.role as dup_role, u2.status as dup_status
      FROM duplicate_review_cases drc
      JOIN users u1 ON drc.primary_user_id = u1.id
      JOIN users u2 ON drc.duplicate_user_id = u2.id
      ORDER BY CASE WHEN drc.status = 'review_required' THEN 0 ELSE 1 END, drc.created_at DESC
    `);

    // Mask sensitive fields (e.g. partial email, partial phone)
    const sanitized = cases.map(c => ({
      ...c,
      primary_email: c.primary_email ? c.primary_email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3') : '',
      primary_phone: c.primary_phone ? c.primary_phone.replace(/^(\+?\d{2,4})\d{4}(\d{4})$/, '$1****$2') : '',
      dup_email: c.dup_email ? c.dup_email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3') : '',
      dup_phone: c.dup_phone ? c.dup_phone.replace(/^(\+?\d{2,4})\d{4}(\d{4})$/, '$1****$2') : ''
    }));

    res.json({ success: true, count: sanitized.length, cases: sanitized });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load duplicate review cases.' });
  }
});

// PATCH /api/admin/duplicate-cases/:id - Review and Resolve Duplicate Case
router.patch('/duplicate-cases/:id', async (req, res) => {
  try {
    const { status, admin_notes, suspend_duplicate, suspension_reason } = req.body;
    const caseId = parseInt(req.params.id);

    if (!['clear', 'confirmed_duplicate', 'CLEAR', 'CONFIRMED_DUPLICATE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Case status must be CLEAR or CONFIRMED_DUPLICATE.' });
    }

    const normStatus = status.toLowerCase();
    const db = await getDb();
    const existingCase = await db.get('SELECT * FROM duplicate_review_cases WHERE id = ?', [caseId]);

    if (!existingCase) {
      return res.status(404).json({ success: false, message: 'Duplicate case not found.' });
    }

    await db.run(`
      UPDATE duplicate_review_cases 
      SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [normStatus, admin_notes || '', req.user.id, caseId]);

    // Optionally suspend duplicate account if confirmed duplicate
    if (suspend_duplicate && existingCase.duplicate_user_id) {
      await db.run('UPDATE users SET status = "suspended", status_reason = ? WHERE id = ?', [
        suspension_reason || 'Account suspended: Confirmed duplicate registration.',
        existingCase.duplicate_user_id
      ]);
    }

    await logAdminAction(db, {
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: 'review_duplicate_case',
      target_type: 'duplicate_case',
      target_id: caseId,
      reason: admin_notes || `Marked duplicate case #${caseId} as ${normStatus}`
    });

    res.json({ success: true, message: `Duplicate case marked as ${normStatus}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update duplicate case.' });
  }
});

// ====================================================
// 6. FRAUD REPORT MANAGEMENT
// ====================================================

// GET /api/admin/fraud-reports - List all Fraud Reports
router.get('/fraud-reports', async (req, res) => {
  try {
    const db = await getDb();
    const reports = await db.all(`
      SELECT fr.*,
             u1.name as reporter_name, u1.farmer_user_id as reporter_user_id,
             u2.name as reported_user_name, u2.farmer_user_id as reported_user_id_code, u2.status as reported_user_status,
             l.title as land_title, l.location as land_location
      FROM fraud_reports fr
      LEFT JOIN users u1 ON fr.reporter_id = u1.id
      LEFT JOIN users u2 ON fr.reported_user_id = u2.id
      LEFT JOIN lands l ON fr.land_id = l.id
      ORDER BY CASE WHEN fr.status = 'pending' THEN 0 WHEN fr.status = 'under_review' THEN 1 ELSE 2 END, fr.created_at DESC
    `);

    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve fraud reports.' });
  }
});

// PATCH /api/admin/fraud-reports/:id - Update Fraud Report Status & Action
router.patch('/fraud-reports/:id', async (req, res) => {
  try {
    const { status, review_notes, action_taken, suspend_reported_user, suspension_reason } = req.body;
    const reportId = parseInt(req.params.id);

    if (!['pending', 'under_review', 'resolved', 'dismissed'].includes(status?.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Status must be under_review, resolved, or dismissed.' });
    }

    const normStatus = status.toLowerCase();
    const db = await getDb();
    const report = await db.get('SELECT * FROM fraud_reports WHERE id = ?', [reportId]);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    await db.run(`
      UPDATE fraud_reports
      SET status = ?, review_notes = ?, action_taken = ?, reviewed_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [normStatus, review_notes || '', action_taken || '', req.user.id, reportId]);

    // If moderator chooses to suspend reported user
    if (suspend_reported_user && report.reported_user_id) {
      await db.run('UPDATE users SET status = "suspended", status_reason = ? WHERE id = ?', [
        suspension_reason || `Account suspended following verified fraud report #${reportId}`,
        report.reported_user_id
      ]);
    }

    await logAdminAction(db, {
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: 'moderate_fraud_report',
      target_type: 'fraud_report',
      target_id: reportId,
      reason: review_notes || `Report status updated to ${normStatus}`
    });

    res.json({ success: true, message: `Report updated to ${normStatus}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update fraud report.' });
  }
});

// ====================================================
// 7. LAND LISTING MODERATION
// ====================================================

// GET /api/admin/lands and GET /api/admin/listings
const getAdminLands = async (req, res) => {
  try {
    const db = await getDb();
    const listings = await db.all(`
      SELECT l.*, u.name as owner_name, u.farmer_user_id as owner_user_id, u.is_verified as owner_verified,
             (SELECT COUNT(*) FROM fraud_reports WHERE land_id = l.id) as report_count
      FROM lands l
      JOIN users u ON l.owner_id = u.id
      ORDER BY l.created_at DESC
    `);

    res.json({ success: true, count: listings.length, listings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve listings.' });
  }
};

router.get('/lands', getAdminLands);
router.get('/listings', getAdminLands);

// PATCH /api/admin/lands/:id/status & PUT /api/admin/approve-listing/:id
const updateLandStatus = async (req, res) => {
  try {
    const { approval_status, status, reason } = req.body;
    const landId = parseInt(req.params.id);

    const db = await getDb();
    const land = await db.get('SELECT owner_id, title FROM lands WHERE id = ?', [landId]);

    if (!land) {
      return res.status(404).json({ success: false, message: 'Land listing not found.' });
    }

    const updates = [];
    const params = [];

    if (approval_status) {
      if (!['approved', 'rejected', 'pending'].includes(approval_status)) {
        return res.status(400).json({ success: false, message: 'Invalid approval status.' });
      }
      updates.push('approval_status = ?');
      params.push(approval_status);
    }

    if (status) {
      if (!['available', 'unlisted', 'rented', 'pending'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid listing status.' });
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (reason) {
      updates.push('moderation_reason = ?');
      params.push(reason.trim());
    }

    if (updates.length > 0) {
      params.push(landId);
      await db.run(`UPDATE lands SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Send notification to owner
    await db.run(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, ?, ?)
    `, [
      land.owner_id,
      'Listing Moderation Update',
      `Your land listing "${land.title}" status has been updated.${reason ? ' Note: ' + reason : ''}`
    ]);

    await logAdminAction(db, {
      admin_id: req.user.id,
      admin_name: req.user.name,
      action: 'moderate_land_listing',
      target_type: 'land',
      target_id: landId,
      reason: reason || `Updated land listing #${landId}`
    });

    res.json({ success: true, message: 'Land listing status updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update listing status.' });
  }
};

router.patch('/lands/:id/status', updateLandStatus);
router.put('/approve-listing/:id', updateLandStatus);

// ====================================================
// 8. RENTAL REQUESTS OVERVIEW
// ====================================================
router.get('/rental-requests', async (req, res) => {
  try {
    const db = await getDb();
    const requests = await db.all(`
      SELECT r.*,
             l.title as land_title, l.location as land_location, l.area_acres, l.rent_amount as land_price,
             u_f.name as farmer_name, u_f.farmer_user_id as farmer_user_id_code, u_f.phone as farmer_phone,
             u_o.name as owner_name, u_o.farmer_user_id as owner_user_id_code, u_o.phone as owner_phone
      FROM rental_requests r
      JOIN lands l ON r.land_id = l.id
      JOIN users u_f ON r.farmer_id = u_f.id
      JOIN users u_o ON r.owner_id = u_o.id
      ORDER BY r.created_at DESC
    `);

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch rental requests.' });
  }
});

// ====================================================
// 9. ADMIN ACTIVITY AUDIT LOGS
// ====================================================
router.get('/audit-logs', async (req, res) => {
  try {
    const { search, action, page = 1, limit = 50 } = req.query;
    const db = await getDb();

    let query = 'SELECT * FROM admin_audit_logs WHERE 1=1';
    const params = [];

    if (action && action !== 'all') {
      query += ' AND action = ?';
      params.push(action);
    }

    if (search) {
      query += ' AND (admin_name LIKE ? OR action LIKE ? OR target_type LIKE ? OR reason LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const logs = await db.all(query, params);
    const countRes = await db.get('SELECT COUNT(*) as count FROM admin_audit_logs');

    res.json({ success: true, count: countRes.count, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve admin audit logs.' });
  }
});

module.exports = router;
