const path = require('path');
const puppeteer = require('puppeteer-core');

const SAMPLE_IMAGE_PATH = path.resolve('tests/sample_onion_tray.jpg');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];

  page.on('console', msg => console.log('  [WebView Console]', msg.type(), msg.text()));

  console.log('On capture page:', page.url());

  // Upload sample image
  console.log('Uploading sample onion tray image...');
  await page.waitForSelector('input[type="file"]');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(SAMPLE_IMAGE_PATH);
  await new Promise(r => setTimeout(r, 2000));

  console.log('Checking for tray preview thumbnail...');
  await page.waitForSelector('img[alt="Tray 1"]', { timeout: 10000 });
  console.log('Thumbnail rendered!');

  // Click continue button
  console.log('Clicking continue button to upload...');
  const continueBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent.includes('Continue'));
  });
  await page.evaluate(b => b.click(), continueBtn);

  console.log('Waiting for Quality Check page...');
  await page.waitForFunction(() => window.location.pathname.includes('/quality'), { timeout: 15000 });
  console.log('Reached Quality Check! URL:', page.url());

  // On Quality Check, wait for Proceed to AI Analysis button to be enabled
  console.log('Waiting for image quality check to complete...');
  await page.waitForFunction(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Proceed to AI Analysis'));
    return btn && !btn.disabled;
  }, { timeout: 20000 });
  console.log('Quality check verified!');

  const proceedBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent.includes('Proceed to AI Analysis'));
  });
  await page.evaluate(b => b.click(), proceedBtn);

  console.log('Waiting for AI Analysis page...');
  await page.waitForFunction(() => window.location.pathname.includes('/analysis'), { timeout: 15000 });
  console.log('Reached AI Analysis! URL:', page.url());

  // Monitor analysis status
  console.log('Monitoring analysis progress...');
  let completed = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const isDone = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return Boolean(buttons.find(b => b.textContent.includes('View Results')));
    });
    console.log(`Poll ${i + 1}/30: View Results button ready? ${isDone}`);
    if (isDone) {
      completed = true;
      break;
    }
  }

  if (!completed) {
    throw new Error('Analysis did not complete within 90s');
  }

  console.log('Analysis completed! Clicking View Results...');
  const viewResultsBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent.includes('View Results'));
  });
  await page.evaluate(b => b.click(), viewResultsBtn);

  await page.waitForFunction(() => window.location.pathname.includes('/results'), { timeout: 15000 });
  console.log('REACHED RESULTS PAGE! URL:', page.url());

  const resultsText = await page.evaluate(() => document.body.innerText);
  console.log('Results page text excerpt:', resultsText.substring(0, 300));

  await browser.disconnect();
})().catch(console.error);
