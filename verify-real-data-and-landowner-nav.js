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
  console.log('AGRICONNECT AI - REAL DATA & LANDOWNER NAV TEST SUITE');
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
    // 1. Log in as Main Admin
    const mainAdminLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'superadmin@agriconnect.ai',
        password: 'SuperAdmin@2026',
        role: 'admin'
      }
    });
    assert(mainAdminLogin.status === 200, 'Main Admin logged in successfully (200)');
    const mainAdminToken = mainAdminLogin.data.token;

    // 2. Fetch Sub-Admins list
    const initialAdminsRes = await request('/admin/admins', {
      headers: { Authorization: `Bearer ${mainAdminToken}` }
    });
    assert(initialAdminsRes.status === 200, 'GET /api/admin/admins returns 200');
    assert(Array.isArray(initialAdminsRes.data?.admins), 'admins response is an array from database');
    // Verify no password hashes or sensitive fields exposed
    for (const adm of initialAdminsRes.data.admins) {
      assert(adm.password_hash === undefined, `Admin #${adm.id} does not expose password_hash`);
      assert(adm.role === 'admin', `Admin #${adm.id} has role "admin" (only real sub-admins)`);
    }

    // 3. Create a real Sub-Admin account
    const subAdminEmail = `subadmin_real_${ts}@agriconnect.ai`;
    const createSubAdminRes = await request('/admin/admins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: {
        name: 'Real Test SubAdmin',
        email: subAdminEmail,
        password: 'StrongSubAdminPass@123',
        confirmPassword: 'StrongSubAdminPass@123',
        phone: '+91 9876543299'
      }
    });
    assert(createSubAdminRes.status === 201, 'Real Sub-Admin created in database (201)');
    const newSubAdminId = createSubAdminRes.data?.admin?.id;
    assert(newSubAdminId !== undefined, `Created Sub-Admin ID: ${newSubAdminId}`);

    // 4. Verify the newly created Sub-Admin appears in GET /api/admin/admins
    const refreshedAdminsRes = await request('/admin/admins', {
      headers: { Authorization: `Bearer ${mainAdminToken}` }
    });
    const foundAdmin = refreshedAdminsRes.data?.admins?.find(a => a.id === newSubAdminId);
    assert(foundAdmin !== undefined, 'Newly created Sub-Admin appears in real database list');
    assert(foundAdmin?.name === 'Real Test SubAdmin', 'Real stored name matches input');
    assert(foundAdmin?.email === subAdminEmail, 'Real stored email matches input');
    assert(foundAdmin?.role === 'admin', 'Real stored role is "admin"');
    assert(foundAdmin?.status === 'active', 'Real initial status is "active"');
    assert(foundAdmin?.password_hash === undefined, 'No password hash exposed');

    // 5. Deactivate Sub-Admin
    const deactivateRes = await request(`/admin/admins/${newSubAdminId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: {
        status: 'deactivated',
        reason: 'Temporary deactivation test'
      }
    });
    assert(deactivateRes.status === 200, 'Sub-Admin status updated to deactivated (200)');

    // Verify persisted in database
    const postDeactivateRes = await request('/admin/admins', {
      headers: { Authorization: `Bearer ${mainAdminToken}` }
    });
    const deactivatedAdmin = postDeactivateRes.data?.admins?.find(a => a.id === newSubAdminId);
    assert(deactivatedAdmin?.status === 'deactivated', 'Sub-Admin status persisted as "deactivated" in database');

    // 6. Remove Sub-Admin (Soft delete)
    const deleteRes = await request(`/admin/admins/${newSubAdminId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: { reason: 'Test cleanup' }
    });
    assert(deleteRes.status === 200, 'Sub-Admin removed successfully (200)');

    // Verify excluded from real sub-admin list
    const postDeleteRes = await request('/admin/admins', {
      headers: { Authorization: `Bearer ${mainAdminToken}` }
    });
    const deletedAdmin = postDeleteRes.data?.admins?.find(a => a.id === newSubAdminId);
    assert(deletedAdmin === undefined, 'Deleted Sub-Admin is excluded from real database list');

    // 7. Landowner Protection & Navigation verification
    // Register a Landowner
    const ownerEmail = `landowner_nav_${ts}@agriconnect.ai`;
    const ownerRegRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Naveen Landowner',
        email: ownerEmail,
        password: 'password123',
        phone: '9876543111',
        role: 'LAND_OWNER'
      }
    });
    assert(ownerRegRes.status === 201, 'Landowner registered successfully (201)');
    const ownerToken = ownerRegRes.data.token;

    // Register a Farmer
    const farmerEmail = `farmer_nav_${ts}@agriconnect.ai`;
    const farmerRegRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Kannan Farmer',
        email: farmerEmail,
        password: 'password123',
        phone: '9876543222',
        role: 'FARMER'
      }
    });
    assert(farmerRegRes.status === 201, 'Farmer registered successfully (201)');
    const farmerToken = farmerRegRes.data.token;

    // Unauthenticated creation of land blocked (401)
    const unauthLandRes = await request('/lands', {
      method: 'POST',
      body: { title: 'Unauthorized Land' }
    });
    assert(unauthLandRes.status === 401, 'Unauthenticated land creation correctly returns 401');

    // Farmer attempt to create land blocked (403 Forbidden)
    const farmerLandRes = await request('/lands', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: { title: 'Farmer Land' }
    });
    assert(farmerLandRes.status === 403, 'Farmer creating land listing blocked with 403 Forbidden');

    // Admin attempt to create land blocked (403 Forbidden - Only Landowners can create)
    const adminLandRes = await request('/lands', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: { title: 'Admin Land' }
    });
    assert(adminLandRes.status === 403, 'Admin creating land listing blocked with 403 Forbidden (Landowner only)');

    // Landowner creates real land listing
    const formData = new FormData();
    formData.append('title', 'Fertile Paddy Farmland in Tanjore');
    formData.append('location', 'Thanjavur, Tamil Nadu');
    formData.append('latitude', '10.7870');
    formData.append('longitude', '79.1378');
    formData.append('area_acres', '5.5');
    formData.append('rent_amount', '18000');
    formData.append('rent_unit', 'per_month');
    formData.append('duration_months', '12');
    formData.append('available_from', '2026-11-01');
    formData.append('soil_type', 'Alluvial Soil');
    formData.append('water_source', 'Canal & Borewell');
    formData.append('electricity', 'Available');
    formData.append('previous_crops', 'Paddy, Black Gram');
    formData.append('description', 'High yielding fertile paddy soil with abundant Cauvery canal irrigation.');

    const ownerLandRes = await fetch(`${API_BASE}/lands`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: formData
    });
    const ownerLandData = await ownerLandRes.json();
    assert(ownerLandRes.status === 201, 'Landowner successfully created land listing (201)');
    assert(ownerLandData.land?.id !== undefined, `Land created with ID: ${ownerLandData.land?.id}`);

    // Verify land appears on public discovery
    const publicLandsRes = await request('/lands');
    const createdLandInPublic = publicLandsRes.data?.lands?.find(l => l.id === ownerLandData.land?.id);
    assert(createdLandInPublic !== undefined, 'Landowner created land is visible on public discovery');
    assert(createdLandInPublic?.owner_name === 'Naveen Landowner', 'Owner name properly mapped from database');

    console.log('\n====================================================');
    console.log(`TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

  } catch (error) {
    console.error('Test suite uncaught error:', error);
    process.exit(1);
  }
}

runTests();
