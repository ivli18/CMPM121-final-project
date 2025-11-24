// playwright-test.mjs
import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("https://ivli18.github.io/CMPM121-final-project/");
  await page.waitForSelector("#game");

  // Mini Movement Script
  const holdTime = 2000;
  await page.keyboard.down('ArrowDown');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(holdTime);
  await page.keyboard.up('ArrowDown');
  await page.keyboard.up('ArrowRight');

  console.log('Finished holding keys.');

  // Take a screenshot
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await page.screenshot({ path: `screenshots/screenshot-${timestamp}.png` });
  console.log("Screenshot taken");

  await browser.close();
})();
