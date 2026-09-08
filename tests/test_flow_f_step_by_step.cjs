const puppeteer = require('puppeteer-core');
const path = require('path');

const SAMPLE_IMAGE_PATH = path.resolve('tests/sample_onion_tray.jpg');

async function testFlowF() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0];

  page.on('console', msg => console.log('[Console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[Page Error]', err));

  console.log('Navigating to /welcome...');
  await page.goto('https://onivis-frontend.onrender.com/welcome', { waitUntil: 'networkidle0' });

  console.log('Clicking Start New Inspection...');
  const startBtn = await page.$('main a[href="/inspection/new"]');
  await startBtn.click();
  await page.waitForFunction(() => window.location.pathname === '/inspection/new', { timeout: 10000 });

  console.log('Filling New Inspection form...');
  // The form has batchId, centre, etc.
  const submitBtn = await page.$('form button[type="submit"]');
  await submitBtn.click();
  await page.waitForFunction(() => window.location.pathname.includes('/capture'), { timeout: 15000 });

  const captureUrl = page.url();
  console.log('Current URL on capture page:', captureUrl);

  console.log('Uploading sample onion image to file input...');
  await page.waitForSelector('input[type="file"]', { timeout: 10000 });
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(SAMPLE_IMAGE_PATH);
  await new Promise(r => setTimeout(r, 2500));

  // Check buttons on page
  const buttonInfo = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent.trim(),
      disabled: b.disabled,
      tagName: b.tagName,
    }));
  });
  console.log('Buttons on capture page:', buttonInfo);

  // Click the continue button using element.click() in browser context
  console.log('Clicking Continue button...');
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const continueBtn = btns.find(b => /Continue/i.test(b.textContent));
    if (continueBtn) {
      continueBtn.click();
      return true;
    }
    return false;
  });
  console.log('Continue button found and clicked:', clicked);

  // Wait and check URL over 15 seconds
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const url = page.url();
    console.log(`[${i+1}s] URL: ${url}`);
    if (url.includes('/quality')) {
      console.log('SUCCESSFULLY NAVIGATED TO QUALITY CHECK PAGE!');
      break;
    }
  }

  process.exit(0);
}

testFlowF().catch(err => {
  console.error(err);
  process.exit(1);
});
