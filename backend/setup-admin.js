const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const { getDb } = require('./db');

/**
 * Validates an email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).trim());
}

/**
 * Initializes the first MAIN_ADMIN account.
 * 
 * Rules:
 * 1. Reads credentials strictly from environment variables (MAIN_ADMIN_EMAIL, MAIN_ADMIN_PASSWORD).
 * 2. Never falls back to a hardcoded password.
 * 3. Never prints passwords or hashes in logs.
 * 4. Checks if an active Main Admin already exists in the database. If so, REFUSES to create another.
 * 5. Saves the account with role 'MAIN_ADMIN' and active status.
 * 6. Does not create mock users or duplicate databases.
 */
async function initMainAdmin(options = {}) {
  const { silent = false, isServerStart = false } = options;
  const db = await getDb();

  // 1. Check if an active Main Admin already exists in the database
  const existingMainAdmin = await db.get(`
    SELECT id, farmer_user_id, name, email, role, status, created_at 
    FROM users 
    WHERE (role = 'MAIN_ADMIN' OR role = 'main_admin') AND is_deleted = 0
  `);

  if (existingMainAdmin) {
    const isResetPassword = options.resetPassword || process.argv.includes('--reset-password');
    if (isResetPassword) {
      const rawPassword = process.env.MAIN_ADMIN_PASSWORD;
      if (!rawPassword || !rawPassword.trim()) {
        throw new Error('MAIN_ADMIN_PASSWORD is missing in backend/.env. Cannot reset password without a configured password.');
      }
      if (rawPassword.trim().length < 6) {
        throw new Error('Admin password in backend/.env must be at least 6 characters long.');
      }
      const newHash = await bcrypt.hash(rawPassword.trim(), 10);
      await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, existingMainAdmin.id]);
      try {
        await db.run(`
          INSERT INTO admin_audit_logs (admin_id, admin_name, action, target_type, target_id, reason, outcome)
          VALUES (?, ?, 'reset_main_admin_password', 'admin', ?, 'Main Admin password reset from environment configuration', 'success')
        `, [existingMainAdmin.id, existingMainAdmin.name, existingMainAdmin.id]);
      } catch {}

      if (!silent) {
        console.log('======================================================================');
        console.log('🔑 Main Admin password updated successfully from backend/.env!');
        console.log(`   User ID:     ${existingMainAdmin.farmer_user_id} (Database ID: ${existingMainAdmin.id})`);
        console.log(`   Email:       ${existingMainAdmin.email}`);
        console.log(`   Role:        ${existingMainAdmin.role}`);
        console.log('   Security:    New password hashed with bcrypt. Password not logged.');
        console.log('======================================================================');
      }
      return { created: false, reset: true, user: existingMainAdmin };
    }

    if (!silent) {
      console.log('======================================================================');
      console.log('🔒 [MAIN ADMIN GUARD] Refusing creation: Main Admin already exists.');
      console.log(`   User ID:     ${existingMainAdmin.farmer_user_id} (Database ID: ${existingMainAdmin.id})`);
      console.log(`   Name:        ${existingMainAdmin.name}`);
      console.log(`   Email:       ${existingMainAdmin.email}`);
      console.log(`   Role:        ${existingMainAdmin.role}`);
      console.log(`   Status:      ${existingMainAdmin.status}`);
      console.log(`   Created At:  ${existingMainAdmin.created_at}`);
      console.log('   Notice: Only ONE Main Admin account is permitted in the system.');
      console.log('   Note: If you need to update/reset the Main Admin password to the');
      console.log('   value configured in backend/.env, execute:');
      console.log('     npm run setup:admin -- --reset-password');
      console.log('======================================================================');
    }
    return { created: false, reason: 'ALREADY_EXISTS', user: existingMainAdmin };
  }

  // If called during automatic server startup and credentials are not present, do not throw
  const rawEmail = process.env.MAIN_ADMIN_EMAIL;
  const rawPassword = process.env.MAIN_ADMIN_PASSWORD;

  if (!rawEmail || !rawPassword || !rawPassword.trim()) {
    if (isServerStart) {
      console.log('ℹ️  [Main Admin Setup] No Main Admin configured yet.');
      console.log('   To initialize, configure MAIN_ADMIN_EMAIL and MAIN_ADMIN_PASSWORD in backend/.env');
      console.log('   and run: npm run setup:admin');
      return { created: false, reason: 'CREDENTIALS_MISSING' };
    }

    console.error('======================================================================');
    console.error('❌ [ERROR] Main Admin credentials missing in backend/.env!');
    console.error('Please configure the following environment variables in backend/.env:');
    console.error('  MAIN_ADMIN_EMAIL=your-admin-email@example.com');
    console.error('  MAIN_ADMIN_PASSWORD=YourSecurePasswordHere');
    console.error('');
    console.error('Optional environment variables:');
    console.error('  MAIN_ADMIN_NAME=AgriConnect Super Admin');
    console.error('  MAIN_ADMIN_PHONE=+91 9876543210');
    console.error('======================================================================');
    throw new Error('Missing MAIN_ADMIN_EMAIL or MAIN_ADMIN_PASSWORD environment variables.');
  }

  const email = rawEmail.toLowerCase().trim();
  const password = rawPassword.trim();
  const name = (process.env.MAIN_ADMIN_NAME || 'AgriConnect Super Admin').trim();
  const phone = (process.env.MAIN_ADMIN_PHONE || '').trim();

  // 2. Validate Email
  if (!isValidEmail(email)) {
    throw new Error(`Invalid email format: "${email}". Please enter a valid email address.`);
  }

  // 3. Validate Password Length (minimum 8 characters recommended for admin)
  if (password.length < 6) {
    throw new Error('Admin password must be at least 6 characters long.');
  }

  // 4. Ensure email is not already registered under another role
  const existingEmailUser = await db.get('SELECT id, email, role FROM users WHERE LOWER(email) = ?', [email]);
  if (existingEmailUser) {
    throw new Error(`Email "${email}" is already registered in the system (Role: ${existingEmailUser.role}, ID: ${existingEmailUser.id}).`);
  }

  // 5. Hash password securely using bcryptjs (already used by the project)
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // 6. Generate Main Admin unique user ID
  const farmerUserId = 'AGRI-MAIN-001';

  // 7. Save account in existing database with role MAIN_ADMIN and active status
  const result = await db.run(`
    INSERT INTO users (
      farmer_user_id,
      name,
      email,
      password_hash,
      phone,
      role,
      location,
      is_verified,
      status,
      verification_status
    ) VALUES (?, ?, ?, ?, ?, 'MAIN_ADMIN', 'Chennai, Tamil Nadu', 1, 'active', 'verified')
  `, [farmerUserId, name, email, passwordHash, phone]);

  const adminId = result.lastID;

  // 8. Record audit log entry if table exists
  try {
    await db.run(`
      INSERT INTO admin_audit_logs (admin_id, admin_name, action, target_type, target_id, reason, outcome)
      VALUES (?, ?, 'create_main_admin', 'admin', ?, 'Initial secure provisioning of MAIN_ADMIN account', 'success')
    `, [adminId, name, adminId]);
  } catch (logErr) {
    // If audit table is not yet created, proceed safely
  }

  // 9. Display success banner (WITHOUT printing password)
  if (!silent) {
    console.log('======================================================================');
    console.log('⭐ MAIN_ADMIN Account Initialized Successfully!');
    console.log(`   Database:    Existing SQLite database (agriconnect.db)`);
    console.log(`   Name:        ${name}`);
    console.log(`   Email:       ${email}`);
    console.log(`   User ID:     ${farmerUserId} (Database ID: ${adminId})`);
    console.log(`   Role:        MAIN_ADMIN`);
    console.log(`   Status:      active`);
    console.log(`   Verified:    verified (1)`);
    console.log('   Security:    Password hashed with bcrypt. Password not logged.');
    console.log('======================================================================');
  }

  return {
    created: true,
    user: {
      id: adminId,
      farmer_user_id: farmerUserId,
      name,
      email,
      role: 'MAIN_ADMIN',
      status: 'active'
    }
  };
}

if (require.main === module) {
  initMainAdmin({ silent: false, isServerStart: false })
    .then((res) => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Main Admin initialization failed:', err.message);
      process.exit(1);
    });
}

module.exports = { initMainAdmin };
