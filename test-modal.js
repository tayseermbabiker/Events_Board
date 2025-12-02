const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('Navigating to site...');
  await page.goto('https://silver-maamoul-f8cc76.netlify.app/');

  // Wait for events to load
  console.log('Waiting for events to load...');
  await page.waitForSelector('.event-card', { timeout: 10000 });

  // Take screenshot before clicking
  await page.screenshot({ path: 'screenshots/before-modal.png', fullPage: true });
  console.log('Screenshot saved: before-modal.png');

  // Click first event card to open modal
  console.log('Clicking first event card...');
  await page.click('.event-card');

  // Wait for modal to appear
  await page.waitForSelector('#event-modal', { state: 'visible', timeout: 5000 });

  // Wait a bit for any animations
  await page.waitForTimeout(1000);

  // Take screenshot of modal
  await page.screenshot({ path: 'screenshots/modal-open.png', fullPage: true });
  console.log('Screenshot saved: modal-open.png');

  // Get modal position and dimensions
  const modalInfo = await page.evaluate(() => {
    const modal = document.querySelector('#event-modal');
    const sheet = document.querySelector('.modal-sheet');
    const overlay = document.querySelector('.modal-overlay');

    return {
      modal: {
        display: window.getComputedStyle(modal).display,
        position: window.getComputedStyle(modal).position,
        zIndex: window.getComputedStyle(modal).zIndex
      },
      sheet: {
        position: window.getComputedStyle(sheet).position,
        top: window.getComputedStyle(sheet).top,
        bottom: window.getComputedStyle(sheet).bottom,
        left: window.getComputedStyle(sheet).left,
        transform: window.getComputedStyle(sheet).transform,
        maxHeight: window.getComputedStyle(sheet).maxHeight,
        boundingRect: sheet.getBoundingClientRect()
      },
      overlay: {
        display: window.getComputedStyle(overlay).display,
        position: window.getComputedStyle(overlay).position
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollY: window.scrollY
      }
    };
  });

  console.log('\nModal CSS Info:');
  console.log(JSON.stringify(modalInfo, null, 2));

  // Check console errors
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  console.log('\nTest complete. Press Ctrl+C to close browser.');

  // Keep browser open for inspection
  await page.waitForTimeout(30000);

  await browser.close();
})();
