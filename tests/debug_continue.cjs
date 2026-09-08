const puppeteer = require('puppeteer-core');
const path = require('path');

const SAMPLE_IMAGE_PATH = path.resolve('tests/sample_onion_tray.jpg');

async function debugContinue() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0];

  page.on('console', msg => console.log('[Console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[PageError]', err.message, err.stack));

  console.log('Navigating to /inspection/new...');
  await page.goto('https://onivis-frontend.onrender.com/inspection/new', { waitUntil: 'networkidle0' });

  console.log('Submitting batch form...');
  await (await page.$('form button[type="submit"]')).click();

  await page.waitForFunction(() => window.location.pathname.includes('/capture'), { timeout: 10000 });
  console.log('Arrived at capture URL:', page.url());

  console.log('Uploading sample file to input[type="file"]...');
  await page.waitForSelector('input[type="file"]', { timeout: 10000 });
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(SAMPLE_IMAGE_PATH);
  await new Promise(r => setTimeout(r, 2000));

  console.log('Triggering handleContinue by clicking Continue button in browser context...');
  const errorFromClick = await page.evaluate(async () => {
    try {
      const btns = Array.from(document.querySelectorAll('button'));
      const continueBtn = btns.find(b => /Continue/i.test(b.textContent));
      if (!continueBtn) return 'Button not found!';
      console.log('Found button text:', continueBtn.textContent, 'disabled:', continueBtn.disabled);
      
      // Let's hook window.onerror to capture anything
      window.__lastError = null;
      window.addEventListener('error', e => { window.__lastError = e.message; });
      window.addEventListener('unhandledrejection', e => { window.__lastError = e.reason?.message || String(e.reason); });

      continueBtn.click();
      return 'Clicked!';
    } catch (e) {
      return e.message;
    }
  });
  console.log('Click result:', errorFromClick);

  for (let s = 1; s <= 15; s++) {
    await new Promise(r => setTimeout(r, 1000));
    const url = page.url();
    const lastErr = await page.evaluate(() => window.__lastError);
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
    console.log(`[${s}s] URL: ${url} | Error: ${lastErr} | Text preview: ${bodyText.replace(/\n/g, ' ')}`);
    if (url.includes('/quality')) {
      console.log('SUCCESS: NAVIGATED TO QUALITY CHECK PAGE!');
      break;
    }
  }

  process.exit(0);
}

debugContinue().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
