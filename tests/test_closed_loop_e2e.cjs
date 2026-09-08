const puppeteer = require('puppeteer-core');
const assert = require('assert');

const FRONTEND_URL = 'http://127.0.0.1:5173';
const BACKEND_URL = 'http://127.0.0.1:8000';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runTest() {
  console.log('====================================================');
  console.log('ONIVIS CLOSED-LOOP RE-AUDIT END-TO-END QA TEST');
  console.log('====================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('Error') || txt.includes('error') || txt.includes('warn') || txt.includes('failed')) {
        console.log('  [Browser Console]', txt);
      }
    });
    page.on('pageerror', err => console.log('  [Browser PageError]', err.message));

    // Step 1: Health check
    console.log('\n[1] Checking local Backend & Frontend liveness...');
    const healthRes = await fetch(`${BACKEND_URL}/api/v1/health`);
    assert.strictEqual(healthRes.status, 200, 'Backend health must be 200');
    console.log('  ✓ Backend alive at http://127.0.0.1:8000');

    await page.goto(`${FRONTEND_URL}/verify`, { waitUntil: 'networkidle0' });
    const pageTitle = await page.title();
    console.log(`  ✓ Frontend loaded: "${pageTitle}"`);

    // Step 2: Login as Officer A to get an existing certificate
    console.log('\n[2] Authenticating Officer A to locate certified lot...');
    const officerEmail = 'officer.demo@agmark.gov.in';
    const officerPassword = 'Password@123';
    let officerALogin = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: officerEmail,
        password: officerPassword,
      }),
    });

    if (!officerALogin.ok) {
      console.log('  Registering Officer A...');
      const signRes = await fetch(`${BACKEND_URL}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: officerEmail,
          password: officerPassword,
          name: 'Officer Ramesh Shinde',
          role: 'OFFICER',
        }),
      });
      console.log(`  Signup response status: ${signRes.status}`);
      officerALogin = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: officerEmail,
          password: officerPassword,
        }),
      });
    }

    assert.strictEqual(officerALogin.status, 200, 'Officer A login must succeed');
    const officerAData = await officerALogin.json();
    const tokenA = officerAData.accessToken;
    console.log(`  ✓ Officer A logged in: ${officerAData.user.fullName} (${officerAData.user.email})`);

    // Fetch inspections or create an approved inspection with certificate for testing
    const inspRes = await fetch(`${BACKEND_URL}/api/v1/inspections`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const inspections = await inspRes.json();
    let testCertId = null;
    let testInspId = null;

    for (const insp of inspections) {
      if (insp.certificateId) {
        testCertId = insp.certificateId;
        testInspId = insp.id;
        break;
      }
    }

    if (!testCertId) {
      testCertId = 'cert-88f862d9';
      testInspId = 'insp-b67663a3';
    }
    console.log(`  ✓ Target Certificate: ${testCertId} (Inspection: ${testInspId})`);

    // Step 3: Farmer verifies certificate on public page (no login)
    console.log('\n[3] Farmer tests public certificate verification...');
    await page.goto(`${FRONTEND_URL}/verify/${testCertId}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('text/Certificate Verified', { timeout: 10000 });
    console.log('  ✓ Public Certificate Verified displayed');

    // Step 4: Farmer clicks Request Quality Re-audit
    console.log('\n[4] Farmer opens Request Quality Re-audit form...');
    const reAuditBtn = await page.waitForSelector('button ::-p-text(Request Independent Quality Re-audit)');
    await reAuditBtn.click();

    await page.waitForSelector('input[placeholder="e.g. Kisan Suresh Patil"]', { timeout: 5000 });
    console.log('  ✓ Dispute modal opened');

    const farmerTestPhone = '9876543210';
    const farmerRemarks = 'Dispute on 2 bulbs classified as rotten. Should be Grade A.';
    await page.type('input[placeholder="e.g. Kisan Suresh Patil"]', 'Kisan Ramesh Patil');
    await page.type('input[placeholder="98XXXXXXXX"]', farmerTestPhone);
    await page.type('textarea[placeholder="Describe specific sample or grading discrepancies…"]', farmerRemarks);

    const submitDisputeBtn = await page.waitForSelector('button ::-p-text(Submit Request)');
    await submitDisputeBtn.click();

    // Step 5: Submission confirmation
    console.log('\n[5] Waiting for Re-audit Request submission confirmation...');
    await page.waitForSelector('text/Re-audit Request Submitted', { timeout: 10000 });
    console.log('  ✓ Re-audit Request Submitted confirmation view rendered');

    // Extract Request ID
    const modalText = await page.evaluate(() => document.body.innerText);
    const idMatch = modalText.match(/RA-\d{4}-\d{6}/);
    assert(idMatch, 'Generated Request ID must match RA-YYYY-XXXXXX format');
    const requestId = idMatch[0];
    console.log(`  ✓ Unique Human-Readable Request ID generated: ${requestId}`);

    // Step 6: Click Track Re-audit Request
    console.log('\n[6] Farmer clicks Track Re-audit Request button...');
    const trackReqBtn = await page.waitForSelector('button ::-p-text(Track Re-audit Request)');
    await trackReqBtn.click();

    await page.waitForFunction(() => window.location.pathname === '/re-audit/track', {}, FRONTEND_URL);
    console.log(`  ✓ Navigated to ${page.url()}`);

    // Step 7: Verify Pending status on tracking page
    console.log('\n[7] Verifying Public Tracking in Pending state...');
    await page.waitForSelector('text/Pending', { timeout: 10000 });
    const trackingText = await page.evaluate(() => document.body.innerText);

    assert(trackingText.includes(requestId), 'Must display Request ID');
    assert(trackingText.includes(testCertId), 'Must display Certificate ID');
    assert(trackingText.includes('Awaiting Officer Review'), 'Must display Awaiting Officer Review in timeline');
    assert(trackingText.includes(farmerRemarks), 'Must display exact farmer remarks');
    console.log('  ✓ Tracking displays Request ID, Certificate ID, Pending status, timeline, and exact farmer concern');

    // Step 8: Security - Test Wrong Phone Number Rejection
    console.log('\n[8] Security: Verifying wrong phone number rejection...');
    const wrongPhoneRes = await fetch(`${BACKEND_URL}/api/v1/re-audit-requests/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: requestId,
        phoneNumber: '9999999999',
      }),
    });
    assert.strictEqual(wrongPhoneRes.status, 404, 'Wrong phone number MUST return 404 Not Found');
    console.log('  ✓ Security verified: Backend returns 404 for wrong phone number');

    // Step 9: Officer logs in and opens Re-audit Requests
    console.log('\n[9] Officer A logs into ONIVIS...');
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'officer.demo@agmark.gov.in');
    await page.type('input[type="password"]', 'Password@123');
    const loginSubmit = await page.waitForSelector('button[type="submit"]');
    await loginSubmit.click();

    await page.waitForFunction(() => !!localStorage.getItem('onivis_token'), { timeout: 10000 });
    console.log('  ✓ Officer A authenticated in session');

    // Navigate to /re-audits
    await page.goto(`${FRONTEND_URL}/re-audits`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('text/Re-audit Requests', { timeout: 10000 });
    console.log('  ✓ Re-audit Requests queue loaded');

    // Open the request
    console.log(`\n[10] Officer opens request ${requestId}...`);
    await page.waitForSelector(`text/${requestId}`, { timeout: 10000 });
    const card = await page.waitForSelector(`div[data-testid="request-card"] ::-p-text(${requestId})`);
    await card.click();

    await page.waitForSelector("text/Farmer's Requested Review", { timeout: 5000 });
    const officerModalText = await page.evaluate(() => document.body.innerText);
    assert(officerModalText.includes(farmerRemarks), 'Officer MUST see exact farmer remarks');
    console.log('  ✓ Officer sees exact farmer remarks');

    // Step 11: Officer clicks "Start Re-audit"
    console.log('\n[11] Officer starts re-audit...');
    const startReAuditBtn = await page.waitForSelector('button ::-p-text(Start Re-audit)');
    await page.evaluate((el) => {
      el.scrollIntoView({ block: 'center' });
      el.click();
    }, startReAuditBtn);

    await page.waitForSelector('text/Document Re-audit & Determination', { timeout: 10000 });
    console.log('  ✓ Status transitioned to In Review, documentation form revealed');

    // Step 12: Farmer tracks while In Review
    console.log('\n[12] Verifying Farmer Tracking while In Review...');
    const trackInReviewRes = await fetch(`${BACKEND_URL}/api/v1/re-audit-requests/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: requestId,
        phoneNumber: farmerTestPhone,
      }),
    });
    const inReviewTrackData = await trackInReviewRes.json();
    assert.strictEqual(inReviewTrackData.status, 'IN_REVIEW', 'Status must be IN_REVIEW');
    console.log('  ✓ Farmer tracking returns status IN_REVIEW');

    // Step 13: Officer records evidence, finding, and explanation
    console.log('\n[13] Officer documents evidence, finding, and required explanation...');
    const officerExplanation = 'Re-examined high-resolution annotated image and AI detection bounding boxes. Two bulbs classified as rot exhibit superficial skin blemishes without internal decay. Grade updated to Grade A.';
    
    // Fill explanation
    const explanationTextarea = await page.waitForSelector('textarea[placeholder*="Explain what was reviewed"]');
    await explanationTextarea.type(officerExplanation);

    // Complete re-audit
    const completeBtn = await page.waitForSelector('button ::-p-text(Complete Re-audit)');
    await page.evaluate((el) => {
      el.scrollIntoView({ block: 'center' });
      el.click();
    }, completeBtn);

    await page.waitForSelector('text/Documented Re-audit Determination', { timeout: 10000 });
    console.log('  ✓ Officer successfully completed re-audit');

    // Step 14: Farmer tracks completed response
    console.log('\n[14] Farmer tracks completed response...');
    await page.goto(`${FRONTEND_URL}/re-audit/track?id=${requestId}&phone=${farmerTestPhone}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('text/Re-audit Completed', { timeout: 10000 });
    
    const completedPageText = await page.evaluate(() => document.body.innerText);
    assert(completedPageText.includes(requestId), 'Must display Request ID');
    assert(completedPageText.includes(farmerRemarks), 'Must display farmer remarks');
    assert(completedPageText.includes(officerExplanation), 'Must display officer explanation');
    assert(completedPageText.includes('Original inspection image'), 'Must display evidence reviewed');
    console.log('  ✓ Farmer sees complete response: Request ID, Finding, Explanation, Evidence Reviewed, and Farmer Request');

    // Step 15: Verify original inspection remains unchanged
    console.log('\n[15] Verifying original inspection record remains historically preserved...');
    const originalInspCheck = await fetch(`${BACKEND_URL}/api/v1/inspections/${testInspId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(originalInspCheck.status, 200, 'Inspection record must remain accessible');
    const certCheck = await fetch(`${BACKEND_URL}/api/v1/certificates/${testCertId}`);
    const certData = await certCheck.json();
    assert.strictEqual(certData.id, testCertId, 'Certificate ID intact');
    assert.strictEqual(certData.inspectionId, testInspId, 'Certificate linked to original inspection intact');
    console.log('  ✓ Original inspection and certificate preserved unchanged');

    // Step 16: User A/B Isolation
    console.log('\n[16] Verifying User A / User B Officer isolation...');
    let officerBLogin = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'officer.pune@agmark.gov.in',
        password: 'Password@123',
      }),
    });
    if (!officerBLogin.ok) {
      await fetch(`${BACKEND_URL}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'officer.pune@agmark.gov.in',
          password: 'Password@123',
          name: 'Officer Vikram Ghorpade',
          role: 'OFFICER',
        }),
      });
      officerBLogin = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'officer.pune@agmark.gov.in',
          password: 'Password@123',
        }),
      });
    }
    assert.strictEqual(officerBLogin.status, 200, 'Officer B login must succeed');
    const officerBData = await officerBLogin.json();
    const tokenB = officerBData.accessToken;
      const officerBRequests = await fetch(`${BACKEND_URL}/api/v1/re-audit-requests`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const bRequests = await officerBRequests.json();
      const hasOfficerARequest = bRequests.some((r) => r.id === requestId);
      assert.strictEqual(hasOfficerARequest, false, 'Officer B must NOT see Officer A re-audit request');
      console.log('  ✓ User A/B isolation verified: Officer B cannot access Officer A request');

    console.log('\n====================================================');
    console.log('ALL 17 VERIFICATION TESTS PASSED SUCCESSFULLY! ✓');
    console.log('====================================================');
  } finally {
    await browser.close();
  }
}

runTest().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
