const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SAMPLE_IMAGE_PATH = path.resolve('tests/sample_onion_tray.jpg');

async function testDataTransfer() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0];

  page.on('console', msg => console.log('[Console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[PageError]', err.message));

  console.log('Navigating to /inspection/new...');
  await page.goto('https://onivis-frontend.onrender.com/inspection/new', { waitUntil: 'networkidle0' });

  console.log('Submitting batch form...');
  await (await page.$('form button[type="submit"]')).click();

  await page.waitForFunction(() => window.location.pathname.includes('/capture'), { timeout: 10000 });
  console.log('Arrived at capture URL:', page.url());

  const base64Data = fs.readFileSync(SAMPLE_IMAGE_PATH).toString('base64');

  console.log('Attaching sample onion tray photo via HTML5 DataTransfer...');
  const attachResult = await page.evaluate((b64) => {
    try {
      const input = document.querySelector('input[type="file"]');
      if (!input) return 'No file input found';

      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const file = new File([bytes], 'sample_onion_tray.jpg', { type: 'image/jpeg' });

      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));

      return 'File attached successfully via DataTransfer!';
    } catch (e) {
      return 'Error: ' + e.message;
    }
  }, base64Data);
  console.log(attachResult);

  // Wait for image thumbnail in UI
  await page.waitForSelector('img[alt="Tray 1"]', { timeout: 10000 });
  console.log('Thumbnail "Tray 1" is visible in UI!');

  // Click Continue
  console.log('Clicking Continue button in UI...');
  const clickResult = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => /Continue/i.test(b.textContent));
    if (btn) {
      btn.click();
      return 'Clicked Continue';
    }
    return 'Continue button not found';
  });
  console.log(clickResult);

  console.log('Waiting for navigation to /quality...');
  await page.waitForFunction(() => window.location.pathname.includes('/quality'), { timeout: 25000 });
  console.log('SUCCESSFULLY NAVIGATED TO /quality! URL:', page.url());

  // Wait for Proceed to AI Analysis button to be enabled
  console.log('Waiting for Quality Check verification and Proceed to AI Analysis button...');
  await page.waitForFunction(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => /Proceed to AI Analysis/i.test(b.textContent));
    return btn && !btn.disabled;
  }, { timeout: 25000 });

  console.log('Clicking Proceed to AI Analysis...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => /Proceed to AI Analysis/i.test(b.textContent));
    btn.click();
  });

  await page.waitForFunction(() => window.location.pathname.includes('/analysis'), { timeout: 20000 });
  console.log('SUCCESSFULLY NAVIGATED TO /analysis! URL:', page.url());

  // Monitor real ML analysis
  console.log('Monitoring real YOLO model analysis execution on Render backend...');
  let finished = false;
  for (let p = 1; p <= 35; p++) {
    await new Promise(r => setTimeout(r, 3000));
    const text = await page.evaluate(() => document.body.innerText);
    const hasViewResults = text.includes('View Results');
    console.log(`  [Poll ${p}/35] Analysis in progress... View Results visible: ${hasViewResults}`);
    if (hasViewResults) {
      finished = true;
      break;
    }
  }

  if (!finished) {
    throw new Error('Analysis did not finish within timeout');
  }

  console.log('Clicking View Results...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => /View Results/i.test(b.textContent));
    btn.click();
  });

  await page.waitForFunction(() => window.location.pathname.includes('/results'), { timeout: 15000 });
  console.log('SUCCESSFULLY NAVIGATED TO /results! URL:', page.url());

  const resultsText = await page.evaluate(() => document.body.innerText);
  console.log('Results page text preview:');
  console.log(resultsText.slice(0, 400));

  process.exit(0);
}

testDataTransfer().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
