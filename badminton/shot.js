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
  await page.setViewport({width: 1280, height: 800, deviceScaleFactor: 2});
  const mode = process.argv[2] || 'shop';
  const out = process.argv[3] || 'shot.png';
  await page.goto('http://localhost:3456/badminton/index.html', {waitUntil: 'networkidle0', timeout: 15000});
  await new Promise(r => setTimeout(r, 400));
  if (mode === 'shop') {
    await page.evaluate(() => {
      profile.coins = 999999; profile.inventory = Object.keys(RACKETS);
      saveLocal(); openModal('#shopModal');
    });
    await new Promise(r => setTimeout(r, 500));
  } else if (mode === 'skills') {
    await page.evaluate(() => {
      profile.coins = 999999; saveLocal(); openModal('#shopModal');
      const m = document.querySelector('#shopModal .modal'); m.scrollTop = m.scrollHeight;
    });
    await new Promise(r => setTimeout(r, 500));
  } else if (mode === 'match') {
    await page.evaluate(() => { startLocal('pro'); });
    await new Promise(r => setTimeout(r, 300));
    // pose the players: one mid-swing/jump, one running
    await page.evaluate(() => {
      const m = current;
      m.phase = 'play';
      m.players[0].x = 360; m.players[0].y = FLOOR - 110; m.players[0].vy = -120; m.players[0].onGround = false; m.players[0].vx = 120; m.players[0].swing = 0.95;
      m.players[1].x = 940; m.players[1].y = FLOOR; m.players[1].vx = -260; m.players[1].swing = 0.2;
      m.shuttle.x = 430; m.shuttle.y = FLOOR - 210; m.shuttle.vx = 600; m.shuttle.vy = -120; m.shuttle.trail = [];
    });
    await new Promise(r => setTimeout(r, 200));
  } else if (mode === 'stand') {
    await page.evaluate(() => { startLocal('pro'); const m=current; m.phase='play'; m.players[0].x=380; m.players[1].x=900; });
    await new Promise(r => setTimeout(r, 200));
    await page.evaluate(() => { const b=document.querySelector('#banner'); if(b) b.classList.add('hidden'); });
    await new Promise(r => setTimeout(r, 60));
    await page.screenshot({path: out, clip:{x:300,y:440,width:240,height:290}});
    console.log('saved ' + out); await browser.close(); return;
  }
  await page.evaluate(() => { const b=document.querySelector('#banner'); if(b) b.classList.add('hidden'); });
  await new Promise(r => setTimeout(r, 60));
  await page.screenshot({path: out});
  console.log('saved ' + out);
  await browser.close();
})();
