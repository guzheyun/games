const puppeteer = require('../node_modules/puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox','--disable-gpu']
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  page.on('console', m => { if(m.type()==='error') console.log('CONSOLE:', m.text()); });
  await page.setViewport({width: 1999, height: 910, deviceScaleFactor: 1});
  const out = process.argv[2] || 'shot.png';
  await page.goto('http://localhost:3456/billiards/index.html', {waitUntil: 'networkidle0', timeout: 15000});
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => { document.querySelector('#soloBtn').click(); });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => { document.querySelector('.difficulty-list button').click(); });
  await new Promise(r => setTimeout(r, 500));
  const info = await page.evaluate(() => {
    const c = document.querySelector('#table');
    const r = c.getBoundingClientRect();
    const stage = document.querySelector('.table-stage').getBoundingClientRect();
    return {canvas:{w:r.width,h:r.height,top:r.top,left:r.left}, canvasAttr:{w:c.width,h:c.height}, stage:{w:stage.width,h:stage.height,top:stage.top}, matched: matchMedia('(min-width:1001px)').matches};
  });
  console.log(JSON.stringify(info));
  await page.screenshot({path: out});
  console.log('saved ' + out);
  await browser.close();
})();
