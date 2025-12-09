#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { join } from 'path';

const SCREENSHOT_DIR = '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/shadow-clean/screenshots';

async function testShadowApp() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const logs = {
      console: [],
      network: [],
      errors: []
    };

    page.on('console', msg => {
      logs.console.push({ type: msg.type(), text: msg.text() });
    });

    page.on('response', async response => {
      const url = response.url();
      if (url.includes('convex') || url.includes('api') || url.includes('task')) {
        logs.network.push({
          url,
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    page.on('pageerror', error => {
      logs.errors.push(error.message);
    });

    console.log('=== NAVIGATING TO APP ===');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n=== CHECKING INITIAL STATE ===');
    const initialState = await page.evaluate(() => {
      return {
        hasSetupDialog: !!document.querySelector('[role="dialog"]'),
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean),
        hasSidebar: !!document.querySelector('nav, aside, [role="navigation"]'),
        taskCount: document.querySelectorAll('[data-task], .task-item').length
      };
    });
    console.log('Initial state:', JSON.stringify(initialState, null, 2));

    console.log('\n=== CLICKING START BUILDING ===');
    const buttonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startButton = buttons.find(b => b.textContent?.includes('Start Building'));
      if (startButton) {
        startButton.click();
        return true;
      }
      return false;
    });

    if (buttonClicked) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const afterClickState = await page.evaluate(() => {
        return {
          hasChatInput: !!document.querySelector('textarea, input[type="text"]'),
          hasDialog: !!document.querySelector('[role="dialog"]'),
          visibleText: document.body.innerText.substring(0, 300)
        };
      });
      console.log('After click state:', JSON.stringify(afterClickState, null, 2));

      await page.screenshot({
        path: join(SCREENSHOT_DIR, '04-final-state.png'),
        fullPage: true
      });
    }

    console.log('\n=== NETWORK ACTIVITY ===');
    console.log('Total network calls:', logs.network.length);
    logs.network.forEach(req => {
      console.log(`  ${req.status} ${req.url}`);
    });

    console.log('\n=== CONSOLE LOGS ===');
    logs.console.forEach(log => {
      if (log.type === 'error' || log.type === 'warn') {
        console.log(`  [${log.type}] ${log.text}`);
      }
    });

    console.log('\n=== ERRORS ===');
    if (logs.errors.length > 0) {
      logs.errors.forEach(err => console.log(`  ${err}`));
    } else {
      console.log('  No errors!');
    }

    return { success: true, logs };

  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error(error);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

testShadowApp().then(result => {
  process.exit(result.success ? 0 : 1);
});
