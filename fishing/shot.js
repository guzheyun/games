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
  await page.goto(url, {waitUntil: 'networkidle0', timeout: 15000});
  // seed a save slot and load it so we skip the menu
  const scene = process.argv[4] || 'verdant';
  const xpFor = {verdant:0,volcano:500,coral:1400,abyss:3200,aurora:6600}[scene]||0;
  await page.evaluate(({scene,xpFor}) => {
    const id = 'slot_shot';
    const data = {version:2,slotId:id,saveName:'shot',gold:100,totalXp:xpFor,level:1,scene,rod:'wood',ownedRods:['wood'],baits:{worm:12},bait:'worm',bag:[],aquarium:[],dex:{},caught:0,lastSave:Date.now()};
    const slots = {}; slots[id] = {savedAt: Date.now(), data};
    localStorage.setItem('fishingRemasterSlots', JSON.stringify(slots));
    localStorage.setItem('fishingActiveSlot', id);
    try { R.loadSlot(id); } catch(e){ try { window.R.loadSlot(id); } catch(e2){} }
  }, {scene,xpFor});
  await new Promise(r => setTimeout(r, 1200));
  const path = process.argv[3] || 'shot.png';
  await page.screenshot({path});
  console.log('saved ' + path);
  await browser.close();
})();
