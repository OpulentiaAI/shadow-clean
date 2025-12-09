#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
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

    // Listen for console messages
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text());
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.error('PAGE ERROR:', error.message);
    });

    // Listen for network failures
    page.on('requestfailed', request => {
      console.error('REQUEST FAILED:', request.url(), request.failure().errorText);
    });

    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Take homepage screenshot
    console.log('Taking homepage screenshot...');
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '01-homepage.png'),
      fullPage: true
    });

    // Get page title
    const title = await page.title();
    console.log('Page title:', title);

    // Check for visible text content
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Page contains text (first 500 chars):', bodyText.substring(0, 500));

    // Look for authentication elements
    console.log('Checking for authentication elements...');
    const authElements = await page.evaluate(() => {
      const elements = {
        signInButton: null,
        loginButton: null,
        authForm: null,
        userMenu: null,
        setupDialog: null
      };

      // Look for common auth-related elements
      const buttons = Array.from(document.querySelectorAll('button'));
      elements.signInButton = buttons.find(b =>
        b.textContent.toLowerCase().includes('sign in') ||
        b.textContent.toLowerCase().includes('login')
      )?.textContent;

      elements.loginButton = buttons.find(b =>
        b.textContent.toLowerCase().includes('log in')
      )?.textContent;

      const forms = Array.from(document.querySelectorAll('form'));
      elements.authForm = forms.length > 0 ? 'Found form element' : null;

      const userMenus = Array.from(document.querySelectorAll('[role="menu"], [aria-label*="user"], [aria-label*="account"]'));
      elements.userMenu = userMenus.length > 0 ? 'Found user menu' : null;

      // Look for setup dialog
      const dialogContent = document.querySelector('[role="dialog"]');
      elements.setupDialog = dialogContent ? 'Found setup dialog' : null;

      return elements;
    });
    console.log('Auth elements found:', JSON.stringify(authElements, null, 2));

    // Look for task-related UI
    console.log('Checking for task-related UI...');
    const taskElements = await page.evaluate(() => {
      const elements = {
        taskList: null,
        createTaskButton: null,
        taskItems: 0,
        chatInterface: null,
        sidebar: null
      };

      // Look for task-related elements
      const buttons = Array.from(document.querySelectorAll('button'));
      elements.createTaskButton = buttons.find(b =>
        b.textContent.toLowerCase().includes('create') ||
        b.textContent.toLowerCase().includes('new task') ||
        b.textContent.toLowerCase().includes('start building')
      )?.textContent;

      // Count task items
      const taskSelectors = ['[data-task]', '[role="listitem"]', '.task-item', '.task-card'];
      taskSelectors.forEach(selector => {
        const items = document.querySelectorAll(selector);
        if (items.length > elements.taskItems) {
          elements.taskItems = items.length;
        }
      });

      // Look for chat interface
      const chatSelectors = ['[role="textbox"]', 'textarea', 'input[type="text"]', '.chat-input'];
      elements.chatInterface = chatSelectors.some(selector =>
        document.querySelector(selector)
      ) ? 'Found chat interface' : null;

      // Look for sidebar
      elements.sidebar = document.querySelector('[role="navigation"], nav, aside') ? 'Found sidebar' : null;

      return elements;
    });
    console.log('Task elements found:', JSON.stringify(taskElements, null, 2));

    // Wait for any dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '02-loaded-state.png'),
      fullPage: true
    });

    // Try to click "Start Building" button if found
    console.log('Looking for Start Building button...');
    const startBuildingButton = await page.$('button:has-text("Start Building")');
    if (startBuildingButton) {
      console.log('Found Start Building button, clicking...');
      await startBuildingButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({
        path: join(SCREENSHOT_DIR, '03-after-start-building.png'),
        fullPage: true
      });
    } else {
      console.log('Start Building button not found, trying to click any primary button...');
      const primaryButtons = await page.$$('button[type="submit"], button.primary, .start-building-button');
      if (primaryButtons.length > 0) {
        await primaryButtons[0].click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.screenshot({
          path: join(SCREENSHOT_DIR, '03-after-button-click.png'),
          fullPage: true
        });
      }
    }

    // Check for any task list in the sidebar
    console.log('Checking sidebar tasks...');
    const sidebarTasks = await page.evaluate(() => {
      const tasks = [];
      const sidebar = document.querySelector('[role="navigation"], nav, aside');
      if (sidebar) {
        const taskElements = sidebar.querySelectorAll('[data-task], .task-item, a[href*="/task/"]');
        taskElements.forEach((el, idx) => {
          tasks.push({
            text: el.textContent?.trim().substring(0, 100),
            href: el.getAttribute('href')
          });
        });
      }
      return tasks;
    });
    console.log('Sidebar tasks:', JSON.stringify(sidebarTasks, null, 2));

    // Check network activity
    const metrics = await page.metrics();
    console.log('Page metrics:', JSON.stringify(metrics, null, 2));

    // Check for Convex-related network calls
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(r => r.name.includes('convex') || r.name.includes('websocket') || r.name.includes('api'))
        .map(r => ({
          name: r.name,
          duration: r.duration,
          type: r.initiatorType
        }));
    });
    console.log('Convex/API requests:', JSON.stringify(performanceEntries, null, 2));

    console.log('Test completed successfully!');
    return {
      success: true,
      title,
      authElements,
      taskElements,
      sidebarTasks,
      metrics,
      convexRequests: performanceEntries
    };

  } catch (error) {
    console.error('Test failed:', error);

    // Try to take error screenshot
    try {
      const pages = await browser.pages();
      if (pages.length > 0) {
        await pages[0].screenshot({
          path: join(SCREENSHOT_DIR, 'error.png'),
          fullPage: true
        });
      }
    } catch (screenshotError) {
      console.error('Could not take error screenshot:', screenshotError);
    }

    return {
      success: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

// Create screenshot directory
import { mkdirSync } from 'fs';
try {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
} catch (err) {
  // Directory might already exist
}

// Run the test
testShadowApp().then(result => {
  console.log('\n=== TEST RESULTS ===');
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
