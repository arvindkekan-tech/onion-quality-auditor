const puppeteer = require('puppeteer-core');
const path = require('path');

async function diagnose() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0];

  page.on('console', msg => console.log('[Browser Console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[Page Error]', err));
  page.on('requestfailed', req => console.log('[Request Failed]', req.url(), req.failure()?.errorText));

  console.log('Current URL:', page.url());

  // Check what is currently rendered on the page
  const text = await page.evaluate(() => document.body.innerText);
  console.log('--- Page text preview ---');
  console.log(text.slice(0, 500));

  // Let's test the upload directly in the WebView context using an XMLHttpRequest
  const testUpload = await page.evaluate(async () => {
    try {
      const resp = await fetch('https://onivis-api.onrender.com/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variety: 'Nashik Red',
          weightKg: 20,
          location: 'Lasalgaon APMC',
        })
      });
      const data = await resp.json();
      return { ok: resp.ok, data };
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }
  });
  console.log('Create inspection test:', testUpload);

  if (testUpload.data && testUpload.data.id) {
    const inspId = testUpload.data.id;
    console.log('Now testing FormData upload via XMLHttpRequest in WebView...');
    const uploadResult = await page.evaluate(async (id) => {
      return new Promise((resolve) => {
        // Create 1x1 dummy jpeg blob
        const byteString = atob('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=');
        const ia = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ia], { type: 'image/jpeg' });
        const file = new File([blob], 'test_onion.jpg', { type: 'image/jpeg' });
        const fd = new FormData();
        fd.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://onivis-api.onrender.com/inspections/${id}/images`);
        xhr.onload = () => {
          resolve({ status: xhr.status, responseText: xhr.responseText });
        };
        xhr.onerror = (e) => {
          resolve({ status: xhr.status, error: 'XHR onerror fired' });
        };
        xhr.send(fd);
      });
    }, inspId);
    console.log('XHR Upload result:', uploadResult);

    // Also test fetch with FormData (to see what CapacitorHttp does)
    const fetchUploadResult = await page.evaluate(async (id) => {
      try {
        const byteString = atob('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=');
        const ia = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ia], { type: 'image/jpeg' });
        const file = new File([blob], 'test_onion.jpg', { type: 'image/jpeg' });
        const fd = new FormData();
        fd.append('file', file);

        const res = await fetch(`https://onivis-api.onrender.com/inspections/${id}/images`, {
          method: 'POST',
          body: fd,
        });
        const resText = await res.text();
        return { status: res.status, text: resText };
      } catch (e) {
        return { error: e.message };
      }
    }, inspId);
    console.log('Fetch Upload result:', fetchUploadResult);
  }

  process.exit(0);
}

diagnose().catch(err => {
  console.error(err);
  process.exit(1);
});
