import playwright from 'playwright';

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
    console.log('[console]', m.type(), m.text());
  });
  page.on('pageerror', (err) => {
    errors.push(String(err));
    console.error('[pageerror]', err);
  });
  const url = process.env.URL || 'http://localhost:8081/excel-tools';
  console.log('Opening', url);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'e2e/excel-tools-screenshot.png', fullPage: true });
  console.log('Errors captured:', errors.length);
  errors.forEach((e) => console.log(e));
  await browser.close();
})();