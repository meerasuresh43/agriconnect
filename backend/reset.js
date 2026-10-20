const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

async function resetDatabase() {
  const db = await getDb();
  console.log('Clearing database of all demo data...');

  // Clear all demo/test user data
  try { await db.run('DELETE FROM fraud_reports'); } catch {}
  try { await db.run('DELETE FROM duplicate_review_cases'); } catch {}
  try { await db.run('DELETE FROM admin_audit_logs'); } catch {}
  await db.run('DELETE FROM notifications');
  await db.run('DELETE FROM rental_requests');
  await db.run('DELETE FROM land_documents');
  await db.run('DELETE FROM land_images');
  await db.run('DELETE FROM lands');
  await db.run('DELETE FROM farmer_profiles');
  await db.run('DELETE FROM users');
  await db.run('DELETE FROM government_schemes');
  try {
    await db.run('DELETE FROM sqlite_sequence');
  } catch (err) {}

  // Initialize the single Main Admin from environment variables if configured
  const { initMainAdmin } = require('./setup-admin');
  try {
    await initMainAdmin({ silent: true, isServerStart: true });
  } catch (err) {
    console.log('Main Admin initialization notice:', err.message);
  }

  // Keep Official Government Schemes repository (Real reference data)
  const schemes = [
    {
      name: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
      state: 'All India / Tamil Nadu',
      purpose: 'Direct income support for small and landholding farmer families across India.',
      eligibility: 'All landholding farmers cultivate agricultural land. Excludes high-income tax payers and institutional landholders.',
      benefits: 'Financial benefit of ₹6,000 per year transferred in 3 equal installments of ₹2,000 directly into bank account.',
      application_info: 'Apply online via PM-KISAN portal or through local Common Service Centre (CSC) with Aadhaar and Patta/Chitta land documents.',
      link: 'https://pmkisan.gov.in/'
    },
    {
      name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
      state: 'All India / Tamil Nadu',
      purpose: 'Crop insurance protection against natural calamities, pests, and yield loss.',
      eligibility: 'All farmers including tenant farmers and sharecroppers growing notified crops in notified areas.',
      benefits: 'Comprehensive risk coverage from pre-sowing to post-harvest. Nominal premium: 1.5% for Rabi, 2.0% for Kharif, 5% for commercial crops.',
      application_info: 'Enroll through Uzhavan App, bank branches, insurance intermediaries, or PMFBY online portal before cut-off dates.',
      link: 'https://pmfby.gov.in/'
    },
    {
      name: 'Chief Minister\'s Solar Powered Pump Sets Scheme',
      state: 'Tamil Nadu',
      purpose: '90% subsidy for installation of off-grid solar agriculture pump sets for farmers.',
      eligibility: 'Individual farmers, farmer groups, and cooperative farming societies in Tamil Nadu with verified agricultural land.',
      benefits: '90% subsidy on 5 HP to 10 HP solar pumps with 25-year solar panel performance warranty.',
      application_info: 'Submit application via Uzhavan App or contact Agricultural Engineering Department (AED) Executive Engineer.',
      link: 'https://tnagrisnet.tn.gov.in/'
    },
    {
      name: 'Sub-Mission on Agricultural Mechanization (SMAM)',
      state: 'All India / Tamil Nadu',
      purpose: 'Subsidy for purchasing farm machinery, tractors, rotavators, power tillers, and harvesters.',
      eligibility: 'Small and marginal farmers, SC/ST farmers, women farmers, and registered farmer producer organizations (FPOs).',
      benefits: '40% to 50% subsidy on agricultural equipment purchase or setting up Custom Hiring Centres (CHC).',
      application_info: 'Register on agrimachinery.nic.in or apply through District Agricultural Officer.',
      link: 'https://agrimachinery.nic.in/'
    },
    {
      name: 'Soil Health Card Scheme (Mridaparikshak)',
      state: 'All India / Tamil Nadu',
      purpose: 'Free soil testing and customized fertilizer application recommendations.',
      eligibility: 'All farmers owning or renting agricultural land across all states.',
      benefits: 'Provides detailed soil nutrient status (N, P, K, Micro-nutrients, pH) and precise fertilizer doses to cut costs by 20-30%.',
      application_info: 'Contact local Assistant Director of Agriculture (ADA) or Agri Extension Officer to collect soil sample.',
      link: 'https://soilhealth.dac.gov.in/'
    },
    {
      name: 'PM-KUSUM Component B & C',
      state: 'All India / Tamil Nadu',
      purpose: 'Solarization of existing grid-connected agricultural pumps and grid-connected solar power plants on barren/farmland.',
      eligibility: 'Individual farmers, cooperatives, panchayats, FPOs having agricultural land.',
      benefits: '30% Central + 30% State subsidy. Farmers can sell extra solar power back to TANGEDCO/Discoms for steady extra income.',
      application_info: 'Apply via TANGEDCO or Ministry of New and Renewable Energy (MNRE) portal.',
      link: 'https://pmkusum.mnre.gov.in/'
    }
  ];

  for (const s of schemes) {
    await db.run(`
      INSERT INTO government_schemes (scheme_name, state, purpose, eligibility, benefits, application_info, official_link)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [s.name, s.state, s.purpose, s.eligibility, s.benefits, s.application_info, s.link]);
  }

  console.log('Database cleared successfully! Only Admin account & Govt Schemes retained.');
}

if (require.main === module) {
  resetDatabase().catch(err => {
    console.error('Reset error:', err);
  });
}

module.exports = { resetDatabase };
