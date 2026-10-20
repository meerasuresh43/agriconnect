const API_BASE = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const config = {
    ...options,
    headers
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  const res = await fetch(fullUrl, config);
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('AGRICONNECT AI - DEMO LAND & ROLE-BASED LOGIN SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const ts = Date.now();

  try {
    // ----------------------------------------------------
    // SCENARIO 1 & 2: Empty Database & Zero Demo Lands
    // ----------------------------------------------------
    console.log('--- Test Group 1: Zero Demo Lands & Real Land Discovery ---');
    const initialLandsRes = await request('/lands');
    assert(initialLandsRes.status === 200, 'GET /api/lands returns 200 OK');
    assert(initialLandsRes.data?.success === true, 'GET /api/lands returns success: true');
    assert(Array.isArray(initialLandsRes.data?.lands), 'lands response is an array from database');
    assert(initialLandsRes.data.lands.length === 0, 'No demo land records returned from database (count is 0)');

    // ----------------------------------------------------
    // SCENARIO 3: Frontend Login Page Inspection
    // ----------------------------------------------------
    console.log('\n--- Test Group 2: Frontend Three Login Options Available ---');
    const frontendRes = await fetch('http://localhost:3000/login');
    assert(frontendRes.status === 200, 'Frontend /login route is reachable (200 OK)');
    const frontendHtml = await frontendRes.text();
    assert(frontendHtml.toLowerCase().includes('<!doctype html>'), 'Frontend returns valid HTML');

    // Also verify the Login component source code contains the three login options
    const fs = require('fs');
    const loginJsx = fs.readFileSync('./frontend/src/pages/Login.jsx', 'utf8');
    assert(loginJsx.includes('Landowner Login'), 'Login page includes "Landowner Login" option');
    assert(loginJsx.includes('Farmer Login'), 'Login page includes "Farmer Login" option');
    assert(loginJsx.includes('Admin Login'), 'Login page includes "Admin Login" option');

    // Verify Home.jsx empty state text
    const homeJsx = fs.readFileSync('./frontend/src/pages/Home.jsx', 'utf8');
    assert(
      homeJsx.includes('No agricultural lands are available yet. Landowners can log in to list their land.'),
      'Home page contains required empty state text verbatim'
    );
    assert(homeJsx.includes('List Your Land'), 'Home page keeps "List Your Land" button visible');

    // ----------------------------------------------------
    // SCENARIO 4: Landowner Registration & Role Login
    // ----------------------------------------------------
    console.log('\n--- Test Group 3: Landowner Authentication & Role Enforcement ---');
    const ownerEmail = `real_landowner_${ts}@agriconnect.ai`;
    const ownerPassword = 'StrongOwnerPassword@123';

    const ownerRegRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Murugan Landowner',
        email: ownerEmail,
        password: ownerPassword,
        phone: '9876541111',
        role: 'owner'
      }
    });
    assert(ownerRegRes.status === 201, 'Landowner registered successfully (201)');
    const ownerId = ownerRegRes.data.user.id;

    // Landowner logs in via Landowner Login option (role = 'owner')
    const ownerLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: ownerEmail,
        password: ownerPassword,
        role: 'owner'
      }
    });
    assert(ownerLoginRes.status === 200, 'Landowner logs in successfully through Landowner Login (200)');
    assert(ownerLoginRes.data.user.role === 'owner', 'User role is confirmed "owner"');
    const ownerToken = ownerLoginRes.data.token;

    // Landowner attempts to log in via Farmer Login option (role = 'farmer')
    const ownerFarmerLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: ownerEmail,
        password: ownerPassword,
        role: 'farmer'
      }
    });
    assert(ownerFarmerLoginRes.status === 403, 'Landowner using Farmer Login option is rejected with 403 Forbidden');

    // Landowner attempts to log in via Admin Login option (role = 'admin')
    const ownerAdminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: ownerEmail,
        password: ownerPassword,
        role: 'admin'
      }
    });
    assert(ownerAdminLoginRes.status === 403, 'Landowner using Admin Login option is rejected with 403 Forbidden');

    // ----------------------------------------------------
    // SCENARIO 5: Farmer Registration & Role Login
    // ----------------------------------------------------
    console.log('\n--- Test Group 4: Farmer Authentication & Role Enforcement ---');
    const farmerEmail = `real_farmer_${ts}@agriconnect.ai`;
    const farmerPassword = 'StrongFarmerPassword@123';

    const farmerRegRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Selvam Farmer',
        email: farmerEmail,
        password: farmerPassword,
        phone: '9876542222',
        role: 'farmer'
      }
    });
    assert(farmerRegRes.status === 201, 'Farmer registered successfully (201)');
    const farmerId = farmerRegRes.data.user.id;

    // Farmer logs in via Farmer Login option (role = 'farmer')
    const farmerLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: farmerEmail,
        password: farmerPassword,
        role: 'farmer'
      }
    });
    assert(farmerLoginRes.status === 200, 'Farmer logs in successfully through Farmer Login (200)');
    assert(farmerLoginRes.data.user.role === 'farmer', 'User role is confirmed "farmer"');
    const farmerToken = farmerLoginRes.data.token;

    // Farmer attempts to log in via Landowner Login option (role = 'owner')
    const farmerOwnerLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: farmerEmail,
        password: farmerPassword,
        role: 'owner'
      }
    });
    assert(farmerOwnerLoginRes.status === 403, 'Farmer using Landowner Login option is rejected with 403 Forbidden');

    // Farmer attempts to log in via Admin Login option (role = 'admin')
    const farmerAdminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: farmerEmail,
        password: farmerPassword,
        role: 'admin'
      }
    });
    assert(farmerAdminLoginRes.status === 403, 'Farmer using Admin Login option is rejected with 403 Forbidden');

    // ----------------------------------------------------
    // SCENARIO 6: Main Admin Authentication via Admin Login
    // ----------------------------------------------------
    console.log('\n--- Test Group 5: Main Admin Authentication via Admin Login ---');
    const mainAdminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'superadmin@agriconnect.ai',
        password: 'SuperAdmin@2026',
        role: 'admin'
      }
    });
    assert(mainAdminLoginRes.status === 200, 'Main Admin logs in successfully through Admin Login (200)');
    assert(mainAdminLoginRes.data.user.role === 'main_admin', 'Main Admin role is "main_admin"');
    const mainAdminToken = mainAdminLoginRes.data.token;

    // Verify Main Admin can access Admin console APIs
    const adminStatsRes = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${mainAdminToken}` }
    });
    assert(adminStatsRes.status === 200, 'Main Admin can access Admin Dashboard stats (/api/admin/stats)');
    assert(typeof adminStatsRes.data.stats?.totalUsers === 'number', 'Admin stats returns real calculated totalUsers');

    // ----------------------------------------------------
    // SCENARIO 7: Sub-Admin Creation & Authentication
    // ----------------------------------------------------
    console.log('\n--- Test Group 6: Authorized Sub-Admin Login & Governance ---');
    const subAdminEmail = `subadmin_flow_${ts}@agriconnect.ai`;
    const subAdminPassword = 'SubAdminPass@123';

    // Main Admin provisions Sub-Admin
    const createSubAdminRes = await request('/admin/admins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: {
        name: 'Divya SubAdmin',
        email: subAdminEmail,
        password: subAdminPassword,
        confirmPassword: subAdminPassword,
        phone: '+91 9876543333'
      }
    });
    assert(createSubAdminRes.status === 201, 'Main Admin provisions real Sub-Admin account (201)');
    const subAdminId = createSubAdminRes.data.admin.id;

    // Sub-Admin logs in via Admin Login
    const subAdminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: subAdminEmail,
        password: subAdminPassword,
        role: 'admin'
      }
    });
    assert(subAdminLoginRes.status === 200, 'Authorized Sub-Admin logs in successfully through Admin Login (200)');
    assert(subAdminLoginRes.data.user.role === 'admin', 'Sub-Admin role is "admin"');
    const subAdminToken = subAdminLoginRes.data.token;

    // Sub-Admin accesses Admin stats
    const subAdminStatsRes = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${subAdminToken}` }
    });
    assert(subAdminStatsRes.status === 200, 'Sub-Admin can access Admin Dashboard stats (200)');

    // Main Admin deactivates Sub-Admin
    const deactivateRes = await request(`/admin/admins/${subAdminId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: { status: 'deactivated', reason: 'Temporary operational pause' }
    });
    assert(deactivateRes.status === 200, 'Sub-Admin status updated to deactivated (200)');

    // Deactivated Sub-Admin attempting to log in is rejected
    const deactLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: subAdminEmail,
        password: subAdminPassword,
        role: 'admin'
      }
    });
    assert(deactLoginRes.status === 403, 'Deactivated Sub-Admin login is rejected with 403 Forbidden');

    // ----------------------------------------------------
    // SCENARIO 8: Farmer/Landowner Blocked from Admin APIs
    // ----------------------------------------------------
    console.log('\n--- Test Group 7: Server-side RBAC Blocking Non-Admins ---');
    const ownerAccessAdminRes = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(ownerAccessAdminRes.status === 403, 'Landowner token accessing /api/admin/stats is blocked with 403 Forbidden');

    const farmerAccessAdminRes = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    assert(farmerAccessAdminRes.status === 403, 'Farmer token accessing /api/admin/stats is blocked with 403 Forbidden');

    // ----------------------------------------------------
    // SCENARIO 9: Public Registration Cannot Create Admin
    // ----------------------------------------------------
    console.log('\n--- Test Group 8: Public Registration Admin Role Blocking ---');
    const rogueAdminRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Rogue Admin',
        email: `rogue_${ts}@agriconnect.ai`,
        password: 'password123',
        phone: '9876549999',
        role: 'admin'
      }
    });
    assert(rogueAdminRes.status === 403, 'Public registration requesting role "admin" is blocked with 403 Forbidden');

    const rogueMainAdminRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Rogue Main Admin',
        email: `roguemain_${ts}@agriconnect.ai`,
        password: 'password123',
        phone: '9876549998',
        role: 'main_admin'
      }
    });
    assert(rogueMainAdminRes.status === 403, 'Public registration requesting role "main_admin" is blocked with 403 Forbidden');

    // ----------------------------------------------------
    // SCENARIO 10: Land Posting & Rental Flow by Real Users
    // ----------------------------------------------------
    console.log('\n--- Test Group 9: Real Land Posting & Rental Lifecycle ---');
    // Farmer cannot post land
    const farmerPostLandRes = await request('/lands', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: {
        title: 'Farmer Illegitimate Land',
        location: 'Madurai',
        area_acres: 3,
        rent_amount: 12000
      }
    });
    assert(farmerPostLandRes.status === 403, 'Farmer attempting to post land listing is blocked with 403 Forbidden');

    // Landowner posts a genuine land listing
    const postLandRes = await request('/lands', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        title: 'Murugan Organic Paddy Land',
        location: 'Thanjavur, Tamil Nadu',
        latitude: 10.7867,
        longitude: 79.1378,
        area_acres: 4.5,
        rent_amount: 15000,
        rent_unit: 'per_month',
        duration_months: 12,
        available_from: '2026-11-01',
        soil_type: 'Alluvial Soil',
        water_source: 'Canal & Borewell',
        electricity: 'Available',
        previous_crops: 'Paddy, Black Gram',
        description: 'Authentic rich Cauvery delta paddy field with perennial canal water.'
      }
    });
    assert(postLandRes.status === 201, 'Genuine Landowner creates land listing (201 Created)');
    const landId = postLandRes.data.land.id;

    // Verify land appears on public discovery
    const publicLandsRes = await request('/lands');
    assert(publicLandsRes.status === 200, 'Public GET /api/lands returns 200');
    assert(publicLandsRes.data.lands.length === 1, 'Public listing shows exactly the 1 real user-created land');
    assert(publicLandsRes.data.lands[0].title === 'Murugan Organic Paddy Land', 'Real listing title matches database');
    assert(publicLandsRes.data.lands[0].owner_name === 'Murugan Landowner', 'Owner name correctly mapped from user table');

    // Farmer submits a rental request for the land
    const rentalReqRes = await request('/rentals', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: {
        land_id: landId,
        duration_requested: '12 months',
        proposed_amount: 15000,
        message: 'Experienced paddy cultivator ready for upcoming Samba season.'
      }
    });
    assert(rentalReqRes.status === 201, 'Farmer submits rental request (201 Created)');
    const rentalId = rentalReqRes.data.request.id;

    // Landowner views incoming requests
    const incomingReqsRes = await request('/rentals/incoming', {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(incomingReqsRes.status === 200, 'Landowner can view incoming rental requests (200)');
    assert(incomingReqsRes.data.requests.length >= 1, 'Incoming request list includes submitted request');

    // Landowner accepts request
    const acceptRes = await request(`/rentals/${rentalId}/respond`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { status: 'accepted' }
    });
    assert(acceptRes.status === 200, 'Landowner accepted rental request (200)');

    // Verify land status changed to 'rented'
    const landDetailRes = await request(`/lands/${landId}`);
    assert(landDetailRes.status === 200, 'GET /api/lands/:id returns 200');
    assert(landDetailRes.data.land.status === 'rented', 'Land status automatically transitioned to "rented"');

    // Clean up created land to return database to zero lands
    const deleteLandRes = await request(`/lands/${landId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(deleteLandRes.status === 200, 'Landowner deleted land listing (200)');

    // Confirm database is back to zero lands
    const finalLandsRes = await request('/lands');
    assert(finalLandsRes.data.lands.length === 0, 'Database returns 0 lands after unlisting, showing empty state');

  } catch (err) {
    console.error('Test execution exception:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
