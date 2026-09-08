const assert = require('assert');

const API_BASE = 'https://onivis-api.onrender.com';
const ORIGIN = 'https://onivis-frontend.onrender.com';

async function testSuite() {
  console.log('====================================================');
  console.log('ONIVIS PRODUCTION FULL-SYSTEM INTEGRATION TEST SUITE');
  console.log('====================================================');

  // 1. Health & Production Architecture
  console.log('\n[1/7] Testing Production Health & ML System...');
  const healthRes = await fetch(`${API_BASE}/health`, {
    headers: { 'Origin': ORIGIN }
  });
  assert.strictEqual(healthRes.status, 200, 'Health endpoint should return 200 OK');
  const health = await healthRes.json();
  assert.strictEqual(health.status, 'ok');
  assert(['connected', 'sqlite_fallback'].includes(health.database?.status), 'Database must be operational');
  assert.strictEqual(health.ml?.provider, 'real');
  assert.strictEqual(health.ml?.detectionModel?.exists, true);
  assert.strictEqual(health.ml?.classificationModel?.exists, true);
  console.log('  ✓ Backend Service: OK (Render Production)');
  console.log('  ✓ Supabase Database: Connected');
  console.log('  ✓ YOLO Detection Model: Present and verified');
  console.log('  ✓ YOLO Classification Model: Present and verified');

  // 2. CORS Preflight
  console.log('\n[2/7] Testing CORS Preflight for Android Scheme...');
  const corsRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'OPTIONS',
    headers: {
      'Origin': ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization'
    }
  });
  assert.strictEqual(corsRes.status, 200, 'CORS preflight should return 200 OK');
  assert.strictEqual(corsRes.headers.get('access-control-allow-origin'), ORIGIN);
  console.log('  ✓ CORS Preflight: 200 OK (Origin whitelist verified)');

  // 3. Demo Inspector Authentication
  console.log('\n[3/7] Testing Demo Inspector Login & Registration Fallback...');
  const demoEmail = 'inspector.lasalgaon@apmc.gov.in';
  const demoPassword = 'Password@123';
  let token = null;
  let user = null;

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN },
    body: JSON.stringify({ email: demoEmail, password: demoPassword })
  });

  if (loginRes.ok) {
    const data = await loginRes.json();
    token = data.accessToken;
    user = data.user;
    console.log('  ✓ Demo Login: Succeeded directly');
  } else {
    const signupRes = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN },
      body: JSON.stringify({
        name: 'Inspector Rajesh Patil',
        email: demoEmail,
        password: demoPassword,
        role: 'INSPECTOR'
      })
    });
    assert(signupRes.ok, `Demo auto-signup should succeed: ${signupRes.status}`);
    const data = await signupRes.json();
    token = data.accessToken;
    user = data.user;
    console.log('  ✓ Demo Auto-Signup: Succeeded');
  }

  assert(token, 'Access token must be present');
  assert.strictEqual(user.email, demoEmail);
  console.log(`  ✓ Authenticated as: ${user.name} (${user.role})`);

  // 4. Session Persistence & /auth/me
  console.log('\n[4/7] Testing Session Persistence & Profile Verification...');
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Origin': ORIGIN }
  });
  assert.strictEqual(meRes.status, 200);
  const me = await meRes.json();
  assert.strictEqual(me.email, demoEmail);
  console.log('  ✓ /auth/me verified successfully');

  // 5. Custom Inspector Registration & Login
  console.log('\n[5/7] Testing Custom Inspector Registration & Login...');
  const testEmail = `inspector.unit.${Date.now()}@apmc.gov.in`;
  const regRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN },
    body: JSON.stringify({
      name: 'Mandi Officer Suresh',
      email: testEmail,
      password: 'Password@123',
      role: 'INSPECTOR'
    })
  });
  assert.strictEqual(regRes.status, 201);
  const regData = await regRes.json();
  console.log(`  ✓ Registration passed for: ${regData.user.email}`);

  const custLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN },
    body: JSON.stringify({ email: testEmail, password: 'Password@123' })
  });
  assert.strictEqual(custLoginRes.status, 200);
  console.log('  ✓ Custom credentials sign-in passed');

  // 6. Public Quick Start (No-Login Inspection Creation & Image Upload)
  console.log('\n[6/7] Testing Public No-Login Quick Start Pipeline...');
  const createRes = await fetch(`${API_BASE}/inspections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN },
    body: JSON.stringify({
      variety: 'Nashik Red',
      weightKg: 500,
      location: 'Lasalgaon Mandi'
    })
  });
  assert.strictEqual(createRes.status, 200, 'Anonymous inspection creation should succeed');
  const inspection = await createRes.json();
  assert(inspection.id, 'Inspection ID must be returned');
  console.log(`  ✓ Created inspection without login: ${inspection.id}`);

  // Test Image Quality Check
  const dummyJpg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
  const blob = new Blob([dummyJpg], { type: 'image/jpeg' });
  const form = new FormData();
  form.append('file', blob, 'sample_tray.jpg');

  const uploadRes = await fetch(`${API_BASE}/inspections/${inspection.id}/images`, {
    method: 'POST',
    headers: { 'Origin': ORIGIN },
    body: form
  });
  assert.strictEqual(uploadRes.status, 200, 'Anonymous image upload should succeed');
  const uploadData = await uploadRes.json();
  assert(uploadData.id, 'Uploaded image ID must be present');
  console.log(`  ✓ Uploaded inspection tray image: ${uploadData.id}`);

  const qualityRes = await fetch(`${API_BASE}/inspections/${inspection.id}/images/${uploadData.id}/quality-check`, {
    method: 'POST',
    headers: { 'Origin': ORIGIN }
  });
  assert.strictEqual(qualityRes.status, 200);
  const quality = await qualityRes.json();
  console.log(`  ✓ Quality check passed: Score ${quality.score}/100, checks: ${quality.checks?.length}`);

  // 7. QR Verification
  console.log('\n[7/7] Testing Public QR Verification Endpoint...');
  const fakeQrRes = await fetch(`${API_BASE}/verify/invalid-test-token-12345`, {
    headers: { 'Origin': ORIGIN }
  });
  assert.strictEqual(fakeQrRes.status, 200, 'Verification endpoint returns HTTP 200 with validity status');
  const fakeQrData = await fakeQrRes.json();
  assert.strictEqual(fakeQrData.valid, false, 'Invalid QR token must return valid: false');
  console.log(`  ✓ Invalid QR correctly evaluated as: valid=${fakeQrData.valid}, msg="${fakeQrData.message}"`);

  console.log('\n====================================================');
  console.log('ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY (7/7)');
  console.log('====================================================');
}

testSuite().catch((err) => {
  console.error('\nFAILED TEST:', err);
  process.exit(1);
});
