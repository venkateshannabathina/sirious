const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log(msg.text()));
  page.on('pageerror', err => console.error(err));
  await page.goto('http://localhost:8000');
  await page.waitForTimeout(5000);
  await browser.close();
})();
