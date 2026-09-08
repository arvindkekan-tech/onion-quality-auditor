const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SAMPLE_IMAGE_PATH = path.resolve('tests/sample_onion_tray.jpg');

async function testBufferUpload() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0];

  page.on('console', msg => console.log('[Console]', msg.type(), msg.text()));

  // Read the sample image locally and pass as base64 to WebView to simulate input[type=file] read as arrayBuffer
  const imgBase64 = fs.readFileSync(SAMPLE_IMAGE_PATH).toString('base64');

  const result = await page.evaluate(async (base64) => {
    // 1. Create inspection
    const createRes = await fetch('https://onivis-api.onrender.com/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variety: 'Nashik Red',
        weightKg: 20,
        location: 'Lasalgaon APMC',
      }),
    });
    const insp = await createRes.json();
    console.log('Created inspection:', insp.id);

    // 2. Convert base64 to Uint8Array and Blob
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    const fd = new FormData();
    fd.append('file', blob, 'sample_onion_tray.jpg');

    // 3. Upload via XHR
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://onivis-api.onrender.com/inspections/${insp.id}/images`);
      xhr.onload = () => {
        resolve({
          status: xhr.status,
          response: xhr.responseText ? JSON.parse(xhr.responseText) : null,
        });
      };
      xhr.onerror = (e) => {
        resolve({ status: xhr.status, error: 'XHR error' });
      };
      xhr.send(fd);
    });
  }, imgBase64);

  console.log('Buffer upload result:', JSON.stringify(result, null, 2));
  process.exit(0);
}

testBufferUpload().catch(err => {
  console.error(err);
  process.exit(1);
});
