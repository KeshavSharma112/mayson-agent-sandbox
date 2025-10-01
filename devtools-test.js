const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Connecting to the browser...');
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null,
    });

    console.log('Connected to the browser. Waiting for pages...');
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    console.log('Attached to a page. Listening for console events...');

    page.on('console', msg => {
      console.log('Browser Console:', msg.text());
    });

    console.log('DevTools listener is active. Press Ctrl+C to exit.');

    // Keep the script running
    await new Promise(resolve => {});

  } catch (error) {
    console.error('An error occurred:', error);
  }
})();
