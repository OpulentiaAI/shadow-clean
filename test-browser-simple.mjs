#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { join } from 'path';

const SCREENSHOT_DIR = '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/shadow-clean/screenshots';

async function testShadowApp() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    let consoleErrors = [];
    let pageErrors = [];
    let requestFailures = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    page.on('requestfailed', request => {
      requestFailures.push({
        url: request.url(),
        error: request.failure().errorText
      });
    });

    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '01-homepage.png'),
      fullPage: true
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '02-loaded-state.png'),
      fullPage: true
    });

    // Find and click "Start Building" button using XPath
    console.log('Looking for Start Building button...');
    const [button] = await page.$x("//button[contains(text(), 'Start Building')]");

    if (button) {
      console.log('Found Start Building button, clicking...');
      await button.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
      await page.screenshot({
        path: join(SCREENSHOT_DIR, '03-after-start-building.png'),
        fullPage: true
      });

      // Check if we're now in task interface
      const hasTaskInterface = await page.evaluate(() => {
        const textarea = document.querySelector('textarea');
        const chatInput = document.querySelector('[placeholder*="message"], [placeholder*="task"], [placeholder*="build"]');
        return !!(textarea || chatInput);
      });

      console.log('Has task interface after click:', hasTaskInterface);

      if (hasTaskInterface) {
        // Try to type a message
        console.log('Found task interface, attempting to type...');
        const input = await page.$('textarea') || await page.$('input[type="text"]');
        if (input) {
          await input.type('Hello, this is a test task');
          await new Promise(resolve => setTimeout(resolve, 1000));
          await page.screenshot({
            path: join(SCREENSHOT_DIR, '04-after-typing.png'),
            fullPage: true
          });
        }
      }
    } else {
      console.log('Start Building button not found');
    }

    // Check for Convex network activity
    const convexActivity = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      return entries
        .filter(r => r.name.includes('convex'))
        .map(r => ({
          url: r.name,
          duration: r.duration,
          type: r.initiatorType
        }));
    });

    console.log('\n=== TEST RESULTS ===');
    console.log('Console Errors:', consoleErrors);
    console.log('Page Errors:', pageErrors);
    console.log('Request Failures:', requestFailures);
    console.log('Convex Network Activity:', convexActivity);

    return {
      success: true,
      errors: {
        console: consoleErrors,
        page: pageErrors,
        network: requestFailures
      },
      convexActivity
    };

  } catch (error) {
    console.error('Test failed:', error);
    const pages = await browser.pages();
    if (pages.length > 0) {
      await pages[0].screenshot({
        path: join(SCREENSHOT_DIR, 'error.png'),
        fullPage: true
      });
    }
    return {
      success: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

testShadowApp().then(result => {
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
