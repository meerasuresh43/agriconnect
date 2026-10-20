const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: path.join(__dirname, 'agriconnect.db'),
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON');

  // Initialize Core Schema
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_user_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      role TEXT CHECK(role IN ('owner', 'farmer', 'admin', 'main_admin', 'MAIN_ADMIN', 'ADMIN', 'LAND_OWNER', 'FARMER')) NOT NULL,
      location TEXT,
      aadhaar_last4 TEXT,
      is_verified INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'deactivated', 'deleted')),
      status_reason TEXT,
      rejection_reason TEXT,
      verification_status TEXT DEFAULT 'pending' CHECK(verification_status IN ('pending', 'verified', 'rejected')),
      created_by INTEGER,
      is_deleted INTEGER DEFAULT 0,
      deleted_at DATETIME,
      deleted_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS farmer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      preferred_crop TEXT,
      preferred_land_size TEXT,
      preferred_rental_duration TEXT,
      budget_range TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      area_acres REAL NOT NULL,
      rent_amount REAL NOT NULL,
      rent_unit TEXT DEFAULT 'per_month',
      duration_months INTEGER NOT NULL,
      available_from DATE NOT NULL,
      soil_type TEXT NOT NULL,
      water_source TEXT NOT NULL,
      electricity TEXT DEFAULT 'Available',
      previous_crops TEXT,
      description TEXT,
      status TEXT DEFAULT 'available' CHECK(status IN ('available', 'pending', 'rented', 'unlisted')),
      approval_status TEXT DEFAULT 'approved' CHECK(approval_status IN ('pending', 'approved', 'rejected')),
      moderation_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS land_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      land_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      FOREIGN KEY (land_id) REFERENCES lands(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS land_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      land_id INTEGER NOT NULL,
      doc_type TEXT CHECK(doc_type IN ('ownership', 'identity')) NOT NULL,
      doc_url TEXT NOT NULL,
      verification_status TEXT DEFAULT 'pending' CHECK(verification_status IN ('pending', 'verified', 'rejected')),
      rejection_reason TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (land_id) REFERENCES lands(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rental_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      land_id INTEGER NOT NULL,
      farmer_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      duration_requested TEXT,
      proposed_amount REAL,
      message TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (land_id) REFERENCES lands(id) ON DELETE CASCADE,
      FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS government_schemes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheme_name TEXT NOT NULL,
      state TEXT NOT NULL,
      purpose TEXT NOT NULL,
      eligibility TEXT NOT NULL,
      benefits TEXT NOT NULL,
      application_info TEXT NOT NULL,
      official_link TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Admin Activity Audit Logs Table
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      admin_name TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      reason TEXT,
      outcome TEXT DEFAULT 'success',
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Fraud and Suspicious Activity Reports Table
    CREATE TABLE IF NOT EXISTS fraud_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER,
      reported_user_id INTEGER,
      land_id INTEGER,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      evidence_url TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'under_review', 'resolved', 'dismissed', 'PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')),
      reviewed_by INTEGER,
      review_notes TEXT,
      action_taken TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (land_id) REFERENCES lands(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Duplicate Registration Review Cases Table
    CREATE TABLE IF NOT EXISTS duplicate_review_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      primary_user_id INTEGER NOT NULL,
      duplicate_user_id INTEGER NOT NULL,
      match_type TEXT NOT NULL,
      match_reason TEXT NOT NULL,
      status TEXT DEFAULT 'review_required' CHECK(status IN ('clear', 'review_required', 'confirmed_duplicate', 'CLEAR', 'REVIEW_REQUIRED', 'CONFIRMED_DUPLICATE')),
      reviewed_by INTEGER,
      review_notes TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (primary_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (duplicate_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Migrate existing users table if schema update needed
  try {
    const tableInfo = await dbInstance.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
    if (tableInfo && !tableInfo.sql.includes('main_admin')) {
      await dbInstance.run('PRAGMA foreign_keys = OFF');
      await dbInstance.exec(`
        CREATE TABLE users_migrated (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          farmer_user_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          phone TEXT,
          role TEXT CHECK(role IN ('owner', 'farmer', 'admin', 'main_admin', 'MAIN_ADMIN', 'ADMIN', 'LAND_OWNER', 'FARMER')) NOT NULL,
          location TEXT,
          aadhaar_last4 TEXT,
          is_verified INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'deactivated', 'deleted')),
          status_reason TEXT,
          rejection_reason TEXT,
          verification_status TEXT DEFAULT 'pending' CHECK(verification_status IN ('pending', 'verified', 'rejected')),
          created_by INTEGER,
          is_deleted INTEGER DEFAULT 0,
          deleted_at DATETIME,
          deleted_reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO users_migrated (id, farmer_user_id, name, email, password_hash, phone, role, location, aadhaar_last4, is_verified, created_at)
        SELECT id, farmer_user_id, name, email, password_hash, phone, role, location, aadhaar_last4, is_verified, created_at FROM users;

        DROP TABLE users;
        ALTER TABLE users_migrated RENAME TO users;
      `);
      await dbInstance.run('PRAGMA foreign_keys = ON');
    }
  } catch (err) {
    console.error('Users migration notice:', err.message);
  }

  // Ensure individual migration columns exist on existing databases
  const userColumns = [
    `ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`,
    `ALTER TABLE users ADD COLUMN status_reason TEXT`,
    `ALTER TABLE users ADD COLUMN rejection_reason TEXT`,
    `ALTER TABLE users ADD COLUMN verification_status TEXT DEFAULT 'pending'`,
    `ALTER TABLE users ADD COLUMN created_by INTEGER`,
    `ALTER TABLE users ADD COLUMN is_deleted INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN deleted_at DATETIME`,
    `ALTER TABLE users ADD COLUMN deleted_reason TEXT`,
    `ALTER TABLE lands ADD COLUMN moderation_reason TEXT`,
    `ALTER TABLE land_documents ADD COLUMN verification_status TEXT DEFAULT 'pending'`,
    `ALTER TABLE land_documents ADD COLUMN rejection_reason TEXT`
  ];

  for (const colSql of userColumns) {
    try {
      await dbInstance.exec(colSql);
    } catch {}
  }

  // Database Constraint: Enforce ONLY ONE active Main Admin at engine level
  try {
    await dbInstance.exec(`
      DROP INDEX IF EXISTS idx_single_main_admin;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_single_main_admin 
      ON users(role) 
      WHERE role IN ('main_admin', 'MAIN_ADMIN') AND is_deleted = 0;
    `);
  } catch (err) {
    console.error('Index creation notice:', err.message);
  }

  return dbInstance;
}

module.exports = { getDb };
