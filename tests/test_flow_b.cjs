const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];

  page.on('console', msg => console.log('  [WebView Console]', msg.type(), msg.text()));

  await page.goto('https://onivis-frontend.onrender.com/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[type="email"]');

  // Type email and password
  console.log('Typing credentials...');
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', 'inspector.lasalgaon@apmc.gov.in', { delay: 30 });

  await page.click('input[placeholder="••••••••"]');
  await page.type('input[placeholder="••••••••"]', 'Password@123', { delay: 30 });

  console.log('Submitting login form...');
  const submitBtn = await page.$('form button[type="submit"]');
  await submitBtn.click();

  console.log('Waiting for navigation...');
  await page.waitForFunction(() => window.location.pathname === '/' || window.location.pathname === '', { timeout: 10000 });
  console.log('SUCCESS! Current URL:', page.url());

  const token = await page.evaluate(() => localStorage.getItem('onivis_token'));
  console.log('Stored Token:', token ? token.substring(0, 20) + '...' : 'NONE');

  await browser.disconnect();
})().catch(console.error);
