#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function checkConvexWarnings() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('=== ALL CONSOLE MESSAGES ===');
    consoleLogs.forEach(log => {
      console.log(`[${log.type}] ${log.text}`);
    });

    const convexWarnings = consoleLogs.filter(log => 
      log.text.includes('CONVEX') || log.text.includes('convex')
    );

    console.log('\n=== CONVEX-RELATED MESSAGES ===');
    if (convexWarnings.length > 0) {
      convexWarnings.forEach(log => {
        console.log(`[${log.type}] ${log.text}`);
      });
    } else {
      console.log('No Convex-related console messages');
    }

  } finally {
    await browser.close();
  }
}

checkConvexWarnings();
