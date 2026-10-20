const bcrypt = require('bcryptjs');
const { getDb } = require('./db');
const { resetDatabase } = require('./reset');

async function seedData() {
  console.log('--- Initializing AgriConnect AI Database ---');
  
  // 1. Reset database (resets tables, clears demo lands/photos, inserts official Govt Schemes and Admin account)
  await resetDatabase();
  
  console.log('Database initialized with official Government Schemes repository.');
  console.log('Zero demo users, zero mock sub-admins, zero mock landowners/farmers seeded.');
  console.log('All platform data is 100% database-driven by real user registrations.');
  console.log('====================================================');
  console.log('🌾 AgriConnect AI Database Setup Complete!');
  console.log('====================================================');
}

if (require.main === module) {
  seedData().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

module.exports = { seedData };
