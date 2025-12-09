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

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(error.message);
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

    // Use evaluate to click button
    console.log('Looking for Start Building button...');
    const buttonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startButton = buttons.find(b => b.textContent.includes('Start Building'));
      if (startButton) {
        startButton.click();
        return true;
      }
      return false;
    });

    if (buttonClicked) {
      console.log('Clicked Start Building button');
      await new Promise(resolve => setTimeout(resolve, 3000));
      await page.screenshot({
        path: join(SCREENSHOT_DIR, '03-after-start-building.png'),
        fullPage: true
      });
    }

    // Check for Convex network activity
    const convexActivity = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      return entries
        .filter(r => r.name.includes('convex'))
        .map(r => ({
          url: r.name,
          duration: r.duration
        }));
    });

    console.log('\n=== TEST RESULTS ===');
    console.log('Console Errors:', consoleErrors.length);
    console.log('Page Errors:', pageErrors.length);
    console.log('Convex Requests:', convexActivity.length);

    return {
      success: true,
      errors: {
        console: consoleErrors,
        page: pageErrors
      },
      convexActivity
    };

  } catch (error) {
    console.error('Test failed:', error);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

testShadowApp().then(result => {
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});
