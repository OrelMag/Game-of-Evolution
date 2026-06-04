import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotPath = path.join(__dirname, 'screenshot.png');

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = (await browser.newContext()).newPage ? await (await browser.newContext()).newPage() : null;

const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push(err.message));

await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: screenshotPath, fullPage: true });

console.log('Screenshot saved to:', screenshotPath);
if (errors.length) {
  console.log('Console errors:', errors);
} else {
  console.log('No console errors.');
}

await browser.close();
