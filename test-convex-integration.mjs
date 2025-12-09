#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { join } from 'path';

const SCREENSHOT_DIR = '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/shadow-clean/screenshots';

async function testConvexIntegration() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const networkRequests = [];
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });

    console.log('=== LOADING APPLICATION ===');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check for Convex-related globals and state
    console.log('\n=== CHECKING CONVEX INTEGRATION ===');
    const convexState = await page.evaluate(() => {
      // Check window object for Convex
      const hasConvexGlobal = typeof window.Convex !== 'undefined';
      
      // Check React DevTools for Convex context
      const scripts = Array.from(document.querySelectorAll('script[src]'))
        .map(s => s.src)
        .filter(src => src.includes('convex'));
      
      // Check localStorage for Convex data
      const localStorageKeys = Object.keys(localStorage).filter(k => 
        k.includes('convex') || k.includes('Convex')
      );
      
      // Check for environment variables in page
      const metaTags = Array.from(document.querySelectorAll('meta'))
        .map(m => ({ name: m.getAttribute('name'), content: m.getAttribute('content') }))
        .filter(m => m.content?.includes('convex'));
      
      return {
        hasConvexGlobal,
        convexScripts: scripts,
        localStorageKeys,
        metaTags
      };
    });

    console.log('Convex state:', JSON.stringify(convexState, null, 2));

    // Filter network requests for Convex
    const convexRequests = networkRequests.filter(req => 
      req.url.includes('convex') || 
      req.url.includes('.convex.cloud') ||
      req.url.includes('.convex.site')
    );

    console.log('\n=== CONVEX NETWORK REQUESTS ===');
    if (convexRequests.length > 0) {
      console.log(`Found ${convexRequests.length} Convex-related requests:`);
      convexRequests.forEach(req => {
        console.log(`  [${req.method}] ${req.url}`);
      });
    } else {
      console.log('No Convex network requests detected');
    }

    // Check API endpoints being called
    const apiRequests = networkRequests.filter(req => 
      req.url.includes('/api/')
    );

    console.log('\n=== API ENDPOINTS CALLED ===');
    apiRequests.forEach(req => {
      console.log(`  [${req.method}] ${req.url}`);
    });

    // Click Start Building and monitor new requests
    console.log('\n=== CLICKING START BUILDING ===');
    const beforeClickCount = networkRequests.length;
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startButton = buttons.find(b => b.textContent?.includes('Start Building'));
      if (startButton) startButton.click();
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const afterClickRequests = networkRequests.slice(beforeClickCount);
    console.log(`New requests after click: ${afterClickRequests.length}`);
    afterClickRequests.forEach(req => {
      console.log(`  [${req.method}] ${req.url}`);
    });

    // Check if task interface loaded
    const taskInterfaceState = await page.evaluate(() => {
      return {
        hasChatInput: !!document.querySelector('textarea'),
        hasTaskButtons: Array.from(document.querySelectorAll('button'))
          .some(b => b.textContent?.includes('Task') || b.textContent?.includes('Create')),
        pageTitle: document.title,
        url: window.location.href
      };
    });

    console.log('\n=== TASK INTERFACE STATE ===');
    console.log(JSON.stringify(taskInterfaceState, null, 2));

    // Take final screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '05-convex-test-final.png'),
      fullPage: true
    });

    return {
      success: true,
      convexState,
      convexRequests: convexRequests.length,
      apiRequests: apiRequests.length,
      taskInterfaceState
    };

  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error(error);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

testConvexIntegration().then(result => {
  console.log('\n=== FINAL RESULTS ===');
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});
