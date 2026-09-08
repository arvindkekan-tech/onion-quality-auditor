const fs = require('fs');
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];

  page.on('console', msg => console.log('  [WebView Console]', msg.type(), msg.text()));

  // Ensure logged out
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  console.log('Navigating to /inspection/new anonymously...');
  await page.goto('https://onivis-frontend.onrender.com/inspection/new', { waitUntil: 'networkidle0' });

  console.log('Current URL:', page.url());
  const batchId = await page.$eval('#batchId', el => el.value);
  const centre = await page.$eval('#centre', el => el.value);
  console.log('Form values:', { batchId, centre });

  console.log('Clicking submit batch button...');
  const submitBtn = await page.$('form button[type="submit"]');
  await submitBtn.click();

  console.log('Waiting for URL to change to /capture...');
  await page.waitForFunction(() => window.location.pathname.includes('/capture'), { timeout: 15000 });
  console.log('SUCCESS! Current URL:', page.url());

  await browser.disconnect();
})().catch(console.error);
