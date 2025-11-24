// playwright-test.mjs
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('https://ivli18.github.io/CMPM121-final-project/');
  await page.waitForSelector('#game');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ path: `screenshots/screenshot-${timestamp}.png` });
  console.log('Screenshot taken');

  await browser.close();
})();
