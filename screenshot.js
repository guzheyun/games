const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox','--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewport({width: 1280, height: 720});
  const url = process.argv[2] || 'http://localhost:3456/fishing/';
  await page.goto(url, {waitUntil: 'networkidle0', timeout: 10000});
  await new Promise(r => setTimeout(r, 1500));
  const path = process.argv[3] || 'screenshot.png';
  await page.screenshot({path});
  console.log('Screenshot saved to ' + path);
  await browser.close();
})();
