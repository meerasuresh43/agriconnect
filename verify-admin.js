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

async function runAdminTests() {
  console.log('====================================================');
  console.log('   AGRICONNECT AI - ADMIN & GOVERNANCE TEST SUITE');
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
    // 1. Initial State: Main Admin exists and can log in
    const mainAdminLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'superadmin@agriconnect.ai',
        password: 'SuperAdmin@2026',
        role: 'admin'
      }
    });

    assert(mainAdminLogin.status === 200, 'Main Admin (Super Admin) logs in successfully (200)');
    assert(mainAdminLogin.data?.token, 'Main Admin login returns valid JWT');
    assert(mainAdminLogin.data?.user?.role === 'main_admin', 'Main Admin role is main_admin');
    const mainAdminToken = mainAdminLogin.data.token;
    const mainAdminId = mainAdminLogin.data.user.id;

    // 2. Public Registration Protection: Normal users cannot register as Admin or Main Admin
    const publicAdminAttempt1 = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Hacker Admin',
        email: 'hacker1@agriconnect.ai',
        password: 'password123',
        role: 'admin'
      }
    });
    assert(publicAdminAttempt1.status === 403, 'Public registration with role "admin" is blocked with 403 Forbidden');

    const publicAdminAttempt2 = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Hacker Main Admin',
        email: 'hacker2@agriconnect.ai',
        password: 'password123',
        role: 'main_admin'
      }
    });
    assert(publicAdminAttempt2.status === 403, 'Public registration with role "main_admin" is blocked with 403 Forbidden');

    // 3. Normal user cannot access Admin APIs
    // Register a legitimate farmer first
    const ts = Date.now();
    const farmerRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Test Farmer Ram',
        email: `ram_${ts}@agriconnect.ai`,
        password: 'password123',
        phone: '9876500001',
        role: 'FARMER'
      }
    });
    assert(farmerRes.status === 201, 'Farmer registered successfully');
    const farmerToken = farmerRes.data.token;
    const farmerId = farmerRes.data.user.id;

    const unauthorizedAdminAccess = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    assert(unauthorizedAdminAccess.status === 403, 'Farmer accessing /api/admin/stats is blocked with 403 Forbidden');

    // 4. Main Admin can fetch real dashboard statistics
    const statsRes = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${mainAdminToken}` }
    });
    assert(statsRes.status === 200, 'Main Admin can access /api/admin/stats');
    assert(typeof statsRes.data?.stats?.totalUsers === 'number', 'Real totalUsers count returned from database');
    assert(typeof statsRes.data?.stats?.totalOwners === 'number', 'Real totalOwners count returned from database');
    assert(typeof statsRes.data?.stats?.totalFarmers === 'number', 'Real totalFarmers count returned from database');
    assert(statsRes.data?.stats?.totalAdmins >= 1, 'Total admins count reflects active administrators');

    // 5. Main Admin provisions a Sub-Admin
    const subAdminEmail = `subadmin_${ts}@agriconnect.ai`;
    const createSubAdminRes = await request('/admin/admins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: {
        name: 'Kavitha SubAdmin',
        email: subAdminEmail,
        password: 'SubAdminPass@123',
        confirmPassword: 'SubAdminPass@123',
        phone: '+91 9876543299'
      }
    });
    assert(createSubAdminRes.status === 201, 'Main Admin creates Sub-Admin account successfully (201)');
    const subAdminId = createSubAdminRes.data?.admin?.id;
    assert(subAdminId !== undefined, `Sub-Admin created with ID: ${subAdminId}`);

    // 6. Sub-Admin logs in
    const subAdminLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: subAdminEmail,
        password: 'SubAdminPass@123',
        role: 'admin'
      }
    });
    assert(subAdminLogin.status === 200, 'Sub-Admin logs in successfully');
    assert(subAdminLogin.data?.user?.role === 'admin', 'Sub-Admin role is "admin"');
    const subAdminToken = subAdminLogin.data.token;

    // 7. Sub-Admin CANNOT create another Admin
    const subAdminCreateAdmin = await request('/admin/admins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${subAdminToken}` },
      body: {
        name: 'Rogue Admin',
        email: `rogue_${ts}@agriconnect.ai`,
        password: 'password123',
        confirmPassword: 'password123'
      }
    });
    assert(subAdminCreateAdmin.status === 403, 'Sub-Admin attempting to create another Admin is strictly blocked (403)');

    // 8. Sub-Admin CANNOT delete or modify the Main Admin
    const subAdminDeleteMain = await request(`/admin/admins/${mainAdminId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${subAdminToken}` },
      body: { reason: 'Unauthorized attempt' }
    });
    assert(subAdminDeleteMain.status === 403, 'Sub-Admin attempting to delete Main Admin is blocked (403)');

    // 9. Main Admin CANNOT delete themselves
    const mainAdminSelfDelete = await request(`/admin/admins/${mainAdminId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: { reason: 'Self deletion' }
    });
    assert(mainAdminSelfDelete.status === 403 || mainAdminSelfDelete.status === 400, 'Main Admin cannot delete own account');

    // 10. Database Constraint: Two active Main Admins cannot exist
    // Attempting to create an admin with role 'main_admin' directly via DB or API fails
    const secondMainAttempt = await request('/admin/admins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: {
        name: 'Second Super Admin',
        email: `second_main_${ts}@agriconnect.ai`,
        password: 'password123',
        confirmPassword: 'password123',
        role: 'main_admin' // Requesting main_admin role
      }
    });
    // Should create only as 'admin', not 'main_admin'
    assert(secondMainAttempt.data?.admin?.role === 'admin', 'Admins created through endpoint receive role "admin", preventing duplicate Main Admins');

    // 11. Duplicate Detection Workflow:
    // Registering a second user with the same phone number as the farmer should flag a duplicate review case!
    const dupFarmerRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Duplicate Ramu',
        email: `dup_ram_${ts}@agriconnect.ai`,
        password: 'password123',
        phone: '9876500001', // Exact same normalized phone!
        role: 'FARMER'
      }
    });
    assert(dupFarmerRes.status === 201, 'Second user with same contact phone registered');
    const dupFarmerId = dupFarmerRes.data.user.id;

    // Check duplicate cases in admin console
    const duplicateCasesRes = await request('/admin/duplicate-cases', {
      headers: { Authorization: `Bearer ${mainAdminToken}` }
    });
    assert(duplicateCasesRes.status === 200, 'Admin can view duplicate review cases');
    const flaggedCase = duplicateCasesRes.data?.cases?.find(c => c.duplicate_user_id === dupFarmerId || c.primary_user_id === farmerId);
    assert(flaggedCase !== undefined, 'Potential duplicate registration automatically flagged in duplicate_review_cases');
    assert(flaggedCase?.status === 'review_required', 'Case initial status is review_required');

    // Admin resolves duplicate case
    if (flaggedCase) {
      const resolveCaseRes = await request(`/admin/duplicate-cases/${flaggedCase.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${mainAdminToken}` },
        body: {
          status: 'confirmed_duplicate',
          admin_notes: 'Confirmed secondary registration using identical phone number.',
          suspend_duplicate: true
        }
      });
      assert(resolveCaseRes.status === 200, 'Admin resolved duplicate case and suspended duplicate account');

      // Verify the duplicate account's session is now blocked!
      const dupUserMeRes = await request('/auth/me', {
        headers: { Authorization: `Bearer ${dupFarmerRes.data.token}` }
      });
      assert(dupUserMeRes.status === 403, 'Suspended duplicate account token is immediately rejected with 403 Forbidden');
    }

    // 12. User Verification Workflow:
    // Admin reviews and approves farmer verification
    const verifyUserRes = await request(`/admin/verifications/${farmerId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: {
        status: 'verified',
        reason: 'Identity and phone records verified.'
      }
    });
    assert(verifyUserRes.status === 200, 'Admin approved user verification');

    // 13. Account Suspension & Immediate Token Revocation:
    // Register another user to test suspension
    const userToSuspendRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Offending User',
        email: `offender_${ts}@agriconnect.ai`,
        password: 'password123',
        phone: '9876599999',
        role: 'owner'
      }
    });
    const offenderToken = userToSuspendRes.data.token;
    const offenderId = userToSuspendRes.data.user.id;

    // Admin suspends account
    const suspendRes = await request(`/admin/users/${offenderId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: {
        status: 'suspended',
        reason: 'Multiple fraudulent behavior complaints.'
      }
    });
    assert(suspendRes.status === 200, 'Admin suspended account with mandatory reason');

    // Attempting protected API with suspended user token must immediately return 403
    const suspendedApiCall = await request('/auth/me', {
      headers: { Authorization: `Bearer ${offenderToken}` }
    });
    assert(suspendedApiCall.status === 403, 'Suspended user token is immediately revoked (403)');
    assert(suspendedApiCall.data?.is_suspended === true, 'Response clarifies account suspension with reason');

    // Admin reactivates account
    const reactivateRes = await request(`/admin/users/${offenderId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: {
        status: 'active',
        reason: 'Reactivated after review.'
      }
    });
    assert(reactivateRes.status === 200, 'Admin reactivated account');

    // Reactivated user can now call API again
    const reactivatedApiCall = await request('/auth/me', {
      headers: { Authorization: `Bearer ${offenderToken}` }
    });
    assert(reactivatedApiCall.status === 200, 'Reactivated user can access protected APIs again');

    // 14. Soft-delete user with confirmation reason
    const deleteUserRes = await request(`/admin/users/${offenderId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: { reason: 'User requested removal and verified.' }
    });
    assert(deleteUserRes.status === 200, 'Admin performed compliant soft-deletion with reason');

    // Deleted user cannot access APIs
    const deletedApiCall = await request('/auth/me', {
      headers: { Authorization: `Bearer ${offenderToken}` }
    });
    assert(deletedApiCall.status === 401, 'Deleted user cannot access APIs (401)');

    // 15. Fraud Reporting Workflow:
    // Farmer submits report against a land
    const submitReportRes = await request('/fraud-reports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: {
        category: 'misleading_info',
        description: 'Listing water source claims canal, but canal is dried up.',
        evidence_url: 'https://example.com/evidence.jpg'
      }
    });
    assert(submitReportRes.status === 201, 'Farmer submitted fraud/misconduct report (201)');
    const reportId = submitReportRes.data?.reportId;

    // Admin reviews and resolves report
    const resolveReportRes = await request(`/admin/fraud-reports/${reportId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: {
        status: 'resolved',
        review_notes: 'Contacted landowner to update water source details.',
        action_taken: 'Water source record corrected.'
      }
    });
    assert(resolveReportRes.status === 200, 'Admin resolved fraud report');

    // 16. Safe Sub-Admin Deactivation & Immediate Token Invalidation:
    // Main Admin deactivates the sub-admin created earlier
    const deactivateSubAdminRes = await request(`/admin/admins/${subAdminId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${mainAdminToken}` },
      body: {
        status: 'deactivated',
        reason: 'Rotational administrative staff transition.'
      }
    });
    assert(deactivateSubAdminRes.status === 200, 'Main Admin deactivated Sub-Admin');

    // Using the deactivated Sub-Admin token MUST be immediately rejected!
    const deactivatedAdminCall = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${subAdminToken}` }
    });
    assert(deactivatedAdminCall.status === 403, 'Deactivated Sub-Admin token immediately revoked on next request (403)');

    // 17. Admin Activity Audit Logs:
    // Verify that administrative actions are captured in the immutable audit log
    const auditLogsRes = await request('/admin/audit-logs', {
      headers: { Authorization: `Bearer ${mainAdminToken}` }
    });
    assert(auditLogsRes.status === 200, 'Admin can view immutable audit logs');
    assert(auditLogsRes.data?.logs?.length > 0, 'Audit logs contain recorded governance events');
    const actions = auditLogsRes.data.logs.map(l => l.action);
    assert(actions.includes('create_sub_admin') || actions.includes('deactivate_sub_admin'), 'Audit log includes sub-admin lifecycle actions');

    console.log('\n====================================================');
    console.log(`ADMIN TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Admin test execution error:', error);
    process.exit(1);
  }
}

runAdminTests();
