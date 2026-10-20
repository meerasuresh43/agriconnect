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
  console.log('   AGRICONNECT AI - SYSTEM VERIFICATION SUITE');
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

  try {
    // 1. Initial State: DB should have 0 demo lands
    const initialLands = await request('/lands');
    assert(initialLands.status === 200, 'GET /api/lands returns 200');
    assert(initialLands.data?.success === true, 'GET /api/lands success is true');
    assert(initialLands.data?.count === 0, 'Database has 0 mock/demo land cards initially');

    // 2. Auth Validation Tests
    const invalidReg = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Invalid User',
        email: 'invalid-email',
        password: '123',
        role: 'farmer'
      }
    });
    assert(invalidReg.status === 400, 'Registration with invalid inputs properly returns 400');

    // 3. User Registration: New Landowner and Farmer
    const ts = Date.now();
    const ownerEmail = `owner_${ts}@test.com`;
    const farmerEmail = `farmer_${ts}@test.com`;

    const regOwnerRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Ramu Landowner',
        email: ownerEmail,
        password: 'StrongPassword123',
        phone: '9876543210',
        role: 'LAND_OWNER'
      }
    });
    assert(regOwnerRes.status === 201, 'Landowner registered successfully (201)');
    assert(regOwnerRes.data?.token, 'Registration returns JWT token');
    assert(!regOwnerRes.data?.user?.password, 'Password hash is NOT returned in user object');
    assert(regOwnerRes.data?.user?.role === 'owner', 'Role LAND_OWNER normalized to owner');
    const ownerToken = regOwnerRes.data.token;
    const ownerId = regOwnerRes.data.user.id;

    const regFarmerRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Selvam Farmer',
        email: farmerEmail,
        password: 'StrongPassword123',
        phone: '9876543211',
        role: 'FARMER'
      }
    });
    assert(regFarmerRes.status === 201, 'Farmer registered successfully (201)');
    const farmerToken = regFarmerRes.data.token;
    const farmerId = regFarmerRes.data.user.id;

    // 4. Test Login
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: ownerEmail,
        password: 'StrongPassword123'
      }
    });
    assert(loginRes.status === 200, 'Landowner login successful');
    assert(loginRes.data?.token, 'Login returns JWT');
    assert(loginRes.data?.user?.email === ownerEmail, 'Authenticated user profile matches');

    // 5. Role-based Authorization: Farmer cannot create land
    const farmerCreate = await request('/lands', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: {
        title: 'Unauthorized Land Listing',
        location: 'Madurai',
        land_area_acres: 2.5,
        price_per_month: 15000
      }
    });
    assert(farmerCreate.status === 403, 'Farmer creating land listing correctly blocked with 403 Forbidden');

    // 6. Landowner creates real land listing
    const createLandRes = await request('/lands', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        title: 'Thanjavur Delta Organic Farmland',
        location: 'Thanjavur, Tamil Nadu',
        latitude: 10.7870,
        longitude: 79.1378,
        land_area_acres: 5.5,
        price_per_month: 25000,
        rental_duration_months: 12,
        soil_type: 'Alluvial Soil',
        water_source: 'Canal & Borewell',
        electricity_available: true,
        previous_crops: 'Paddy, Black Gram',
        description: 'Prime Kaveri delta agricultural land with continuous canal water supply.'
      }
    });
    assert(createLandRes.status === 201, 'Landowner creates real land listing (201)');
    const landId = createLandRes.data?.land?.id;
    assert(landId !== undefined, `Land created with ID: ${landId}`);
    assert(createLandRes.data?.land?.landowner_id === ownerId, 'Land associated with authenticated owner');

    // 7. Verify Public Listing API displays newly created land
    const publicLandsRes = await request('/lands');
    assert(publicLandsRes.data?.count === 1, 'Public lands API now displays exactly 1 user-created listing');
    assert(publicLandsRes.data?.lands[0]?.title === 'Thanjavur Delta Organic Farmland', 'Land title matches user input');
    assert(publicLandsRes.data?.lands[0]?.landowner_name === 'Ramu Landowner', 'Owner name properly mapped');

    // 8. Landowner views own listings via /lands/my and /lands/my-listings
    const myLandsRes = await request('/lands/my', {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(myLandsRes.data?.lands?.length === 1, 'GET /api/lands/my returns owner land');

    // 9. Farmer submits rental request
    const rentalReqRes = await request('/rental-requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: {
        land_id: landId,
        proposed_duration_months: 12,
        message: 'I am interested in cultivating traditional samba paddy for this season.'
      }
    });
    assert(rentalReqRes.status === 201, 'Farmer submitted rental request (201)');
    const reqId = rentalReqRes.data?.request?.id;
    assert(rentalReqRes.data?.request?.status === 'pending', 'Default rental request status is pending');

    // 10. Landowner views incoming rental requests
    const incomingRes = await request('/rental-requests/incoming', {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(incomingRes.data?.requests?.length === 1, 'Landowner sees incoming rental request for their land');
    assert(incomingRes.data?.requests[0]?.farmer_id === farmerId, 'Farmer ID matches requester');

    // 11. Landowner accepts rental request
    const updateReqRes = await request(`/rental-requests/${reqId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { status: 'accepted' }
    });
    assert(updateReqRes.status === 200, 'Landowner accepted rental request');
    assert(updateReqRes.data?.request?.status === 'accepted', 'Request status updated to accepted in DB');

    // 12. Verify land status is updated to rented
    const landDetailsRes = await request(`/lands/${landId}`);
    assert(landDetailsRes.data?.land?.status === 'rented', 'Land status automatically transitioned to rented');

    // 13. Farmer attempts unauthorized deletion of land -> Blocked
    const unauthorizedDelete = await request(`/lands/${landId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    assert(unauthorizedDelete.status === 403, 'Unauthorized land deletion blocked with 403');

    // 14. Landowner deletes land listing
    const deleteRes = await request(`/lands/${landId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(deleteRes.status === 200, 'Landowner deleted their own land listing');

    // 15. Verify listing is removed from public list
    const finalLandsRes = await request('/lands');
    assert(finalLandsRes.data?.count === 0, 'Deleted land is removed from public listing (count: 0)');

    // 16. AI Chat API functionality
    const chatRes = await request('/ai/chat', {
      method: 'POST',
      body: {
        message: 'தக்காளி செடியில் இலைகள் மஞ்சளாக மாறுகிறது',
        lang: 'ta'
      }
    });
    assert(chatRes.status === 200, 'AI Chat endpoint responds 200 for Tamil question');
    assert(chatRes.data?.success === true, 'AI Chat response success is true');
    assert(chatRes.data?.reply?.length > 0, 'AI Chat returns helpful farming advice');

    console.log('\n====================================================');
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

runTests();
