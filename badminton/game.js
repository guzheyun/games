'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const W=1280,H=720,FLOOR=620,NET_X=640,NET_TOP=342,NET_HIT_TOP=430,G=1150;
const RACKETS={
  bamboo:{name:'青竹',price:0,power:1,icon:'🏸',desc:'均衡可靠的入门球拍'},
  thunder:{name:'雷霆 7',price:1200,power:1.08,icon:'🏸',desc:'更快的出球与凌厉手感'},
  carbon:{name:'黑金碳纤',price:3200,power:1.16,icon:'🏸',desc:'职业级碳纤维进攻拍'},
  aurora:{name:'极光冠军',price:6800,power:1.24,icon:'🏸',desc:'冠军级速度与稳定性'},
  comet:{name:'彗星 Z9',price:10500,power:1.30,icon:'🏸',desc:'超轻破风框，出球如彗星'},
  dragon:{name:'赤龙·天击',price:16000,power:1.36,icon:'🏸',desc:'高阶进攻拍，爆发更迅猛'},
  void:{name:'虚空 100X',price:24000,power:1.42,icon:'🏸',desc:'实验级旗舰，极限压缩反应时间'}
};
const BOT={
  rookie:{name:'新秀机器人',reaction:.56,speed:260,error:75,power:1,buffer:.13,miss:.13},
  pro:{name:'职业机器人',reaction:.28,speed:335,error:24,power:1.10,buffer:.22,miss:.025},
  legend:{name:'传奇机器人',reaction:.13,speed:395,error:5,power:1.20,buffer:.30,miss:.003}
};
const SKILLS={
  rescue:{name:'鹰眼救球',price:500,icon:'◉',desc:'扩大一次击球判定范围，并回出高远球'},
  meteor:{name:'雷霆重杀',price:850,icon:'ϟ',desc:'在击球范围内打出一次超高速杀球'},
  feather:{name:'幻羽吊球',price:650,icon:'✦',desc:'扩大少量判定范围，打出加速贴网吊球'}
};
const PERMANENT_SKILLS={
  gale:{name:'疾风救球',key:'Y',price:1600,icon:'➶',cooldown:7,shot:'clear',power:1.08,range:2.2,desc:'扩大击球范围并回出强力高远球，冷却 7 秒'},
  cyclone:{name:'旋刃平抽',key:'U',price:2400,icon:'◎',cooldown:9,shot:'drive',power:1.20,range:1.55,desc:'打出更快的压线平抽球，冷却 9 秒'},
  starfall:{name:'星陨扣杀',key:'I',price:3600,icon:'✹',cooldown:12,shot:'smash',power:1.27,range:1.4,desc:'以更宽松的时机发动强力扣杀，冷却 12 秒'}
};
const RACKET_STYLE={
  bamboo:{f1:'#8fd08a',f2:'#4f9d5c',grip:'#3c6b3f',acc:'#d9ff43'},
  thunder:{f1:'#ffdd78',f2:'#e0a11f',grip:'#7a5a17',acc:'#fff2b0'},
  carbon:{f1:'#6b6b6b',f2:'#141414',grip:'#0e0e0e',acc:'#ffd24a'},
  aurora:{f1:'#63d3ff',f2:'#a97bff',grip:'#2b3a55',acc:'#b9fff0'},
  comet:{f1:'#7fb0ff',f2:'#2450d8',grip:'#16224a',acc:'#eaf3ff'},
  dragon:{f1:'#ff7358',f2:'#c21d17',grip:'#4a1210',acc:'#ffd24a'},
  void:{f1:'#b489ff',f2:'#6321d6',grip:'#1a1030',acc:'#62f3bb'}
};
function racketArt(id){
  const s=RACKET_STYLE[id]||RACKET_STYLE.bamboo,strings=[];
  for(let x=37;x<=83;x+=6.2)strings.push(`<line x1="${x}" y1="8" x2="${x}" y2="80"/>`);
  for(let y=12;y<=76;y+=6.2)strings.push(`<line x1="30" y1="${y}" x2="90" y2="${y}"/>`);
  return `<svg viewBox="0 0 120 158" width="100%" height="100%" style="overflow:visible">
  <defs><linearGradient id="rg-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.f1}"/><stop offset="1" stop-color="${s.f2}"/></linearGradient>
  <clipPath id="rc-${id}"><ellipse cx="60" cy="44" rx="28.5" ry="36.5"/></clipPath></defs>
  <g transform="rotate(-20 60 80)">
    <rect x="53" y="110" width="14" height="42" rx="6" fill="${s.grip}" stroke="#0d120f" stroke-width="1.5"/>
    <g stroke="${s.acc}" stroke-width="1.5" opacity=".7">${[0,1,2,3,4].map(k=>`<line x1="53" y1="${115+k*7}" x2="67" y2="${111+k*7}"/>`).join('')}</g>
    <rect x="57.2" y="94" width="5.6" height="20" rx="2.8" fill="url(#rg-${id})"/>
    <path d="M49 79 L60 96 L71 79" fill="none" stroke="url(#rg-${id})" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <g clip-path="url(#rc-${id})" stroke="${s.acc}" stroke-width=".7" opacity=".5">${strings.join('')}</g>
    <ellipse cx="60" cy="44" rx="28.5" ry="36.5" fill="none" stroke="#0e1512" stroke-width="9"/>
    <ellipse cx="60" cy="44" rx="28.5" ry="36.5" fill="none" stroke="url(#rg-${id})" stroke-width="5.5"/>
    <ellipse cx="60" cy="44" rx="26" ry="34" fill="none" stroke="#ffffff" stroke-width="1" opacity=".35"/>
  </g></svg>`;
}
const SKILL_ART={
  rescue:`<svg viewBox="0 0 40 40" width="1em" height="1em"><path d="M4 20 Q20 5 36 20 Q20 35 4 20 Z" fill="none" stroke="#4ec6ff" stroke-width="2.6"/><circle cx="20" cy="20" r="6.6" fill="#4ec6ff"/><circle cx="20" cy="20" r="2.7" fill="#06130f"/><circle cx="22.6" cy="17.6" r="1.5" fill="#fff"/></svg>`,
  meteor:`<svg viewBox="0 0 40 40" width="1em" height="1em"><path d="M23 3 L9 22 L18 22 L14 37 L31 15 L21 15 Z" fill="#ffd24a" stroke="#e0632a" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  feather:`<svg viewBox="0 0 40 40" width="1em" height="1em"><path d="M31 6 C15 9 8 22 10 34 C22 28 33 20 31 6 Z" fill="#8ff5cf" stroke="#2fae86" stroke-width="1.8" stroke-linejoin="round"/><line x1="31" y1="6" x2="11" y2="33" stroke="#2fae86" stroke-width="1.8" stroke-linecap="round"/><g stroke="#2fae86" stroke-width="1.2"><line x1="24" y1="12" x2="16" y2="14"/><line x1="27" y1="18" x2="16" y2="21"/><line x1="26" y1="25" x2="17" y2="27"/></g></svg>`,
  gale:`<svg viewBox="0 0 40 40" width="1em" height="1em"><g fill="none" stroke="#9fd0ff" stroke-width="2.8" stroke-linecap="round"><path d="M5 13 H25 A4 4 0 1 0 21 9"/><path d="M5 20 H31 A4.4 4.4 0 1 1 26.6 24.4"/><path d="M5 27 H20 A3.4 3.4 0 1 0 16.6 30.4"/></g></svg>`,
  cyclone:`<svg viewBox="0 0 40 40" width="1em" height="1em"><g fill="#3ee0c0" stroke="#1c8f78" stroke-width="1.2" stroke-linejoin="round">${[0,90,180,270].map(a=>`<path d="M20 20 L20 4 Q28 11 20 20 Z" transform="rotate(${a} 20 20)"/>`).join('')}</g><circle cx="20" cy="20" r="3.4" fill="#06130f" stroke="#3ee0c0" stroke-width="1.4"/></svg>`,
  starfall:`<svg viewBox="0 0 40 40" width="1em" height="1em"><path d="M6 35 L19 16" stroke="#c9a0ff" stroke-width="3.2" stroke-linecap="round" opacity=".8"/><path d="M25 5 l2.9 6.6 7.1 .7 -5.4 4.7 1.7 7 -6.3-3.8 -6.3 3.8 1.7-7 -5.4-4.7 7.1-.7 Z" fill="#ffd24a" stroke="#a97bff" stroke-width="1.4" stroke-linejoin="round"/></svg>`
};
function skillArt(id){return SKILL_ART[id]||''}
let profile=JSON.parse(localStorage.getItem('badmintonProfile')||'null')||{token:'',name:'球手',wins:0,coins:800,inventory:['bamboo'],equipped:'bamboo'};
let ws=null,online=false,current=null,onlineYou=0,selectedLevel='pro',sound=true,queueing=false,reconnectTimer=0;
const canvas=$('#gameCanvas'),ctx=canvas.getContext('2d');

function ensureProfile(){profile.inventory=profile.inventory||['bamboo'];profile.equipped=profile.equipped||'bamboo';profile.skillInventory=profile.skillInventory||{};profile.equippedSkill=profile.equippedSkill||null;profile.permanentSkills=profile.permanentSkills||[]}
function saveLocal(){ensureProfile();localStorage.setItem('badmintonProfile',JSON.stringify(profile));updateProfile();}
function updateProfile(){
  ensureProfile();$('#playerName').value=profile.name||'球手';$('#wins').textContent=profile.wins||0;$('#coins').textContent=profile.coins||0;renderShop();
}
function showScreen(id){$$('.screen').forEach(x=>x.classList.remove('active'));$(id).classList.add('active')}
function openModal(id){$(id).classList.remove('hidden')}
function closeModal(el){el.closest('.modal-wrap').classList.add('hidden')}
function toast(text,ms=1900){const e=$('#toast');e.textContent=text;e.classList.remove('hidden');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.add('hidden'),ms)}
function banner(big,small='',ms=950){const e=$('#banner');e.querySelector('strong').textContent=big;e.querySelector('small').textContent=small;e.classList.remove('hidden');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.add('hidden'),ms)}
function renderShop(){
  if(!$('#racketGrid'))return;
  $('#racketGrid').innerHTML=Object.entries(RACKETS).map(([id,r])=>{const own=profile.inventory.includes(id),eq=profile.equipped===id;return `<article class="racket ${eq?'equipped':''}"><div class="racket-art">${racketArt(id)}</div><h3>${r.name}</h3><p>${r.desc}</p><small>击球力量 ${Math.round(r.power*100)}%</small><div class="power-line"><span style="width:${(r.power-.8)*220}%"></span></div><button class="buy-btn" data-racket="${id}" ${eq?'disabled':''}>${eq?'使用中':own?'装备':r.price+' 球币'}</button></article>`}).join('');
  $('#skillShopGrid').innerHTML=Object.entries(SKILLS).map(([id,s])=>{const count=profile.skillInventory[id]||0,eq=profile.equippedSkill===id;return `<article class="shop-skill ${eq?'equipped':''}"><span class="skill-icon">${skillArt(id)}</span><h4>${s.name} ${count?`×${count}`:''}</h4><p>${s.desc}</p><div class="skill-actions"><button class="buy-btn" data-buy-skill="${id}">${s.price} 球币</button><button class="buy-btn" data-equip-skill="${id}" ${!count||eq?'disabled':''}>${eq?'已装备':'装备'}</button></div></article>`}).join('');
  $('#permanentSkillGrid').innerHTML=Object.entries(PERMANENT_SKILLS).map(([id,s])=>{const own=profile.permanentSkills.includes(id);return `<article class="shop-skill ${own?'equipped':''}"><span class="skill-icon">${skillArt(id)}</span><h4>${s.name} <kbd>${s.key}</kbd></h4><p>${s.desc}</p><button class="buy-btn" data-buy-permanent="${id}" ${own?'disabled':''}>${own?'已永久解锁':s.price+' 球币'}</button></article>`}).join('');
}
function buyOrEquipSkill(id,buy){
  if(ws&&ws.readyState===1){ws.send(JSON.stringify({type:buy?'buy-skill':'equip-skill',skill:id}));return}
  const s=SKILLS[id];if(buy){if(profile.coins<s.price)return toast('球币不足');profile.coins-=s.price;profile.skillInventory[id]=(profile.skillInventory[id]||0)+1}else if(profile.skillInventory[id])profile.equippedSkill=id;saveLocal();toast(buy?`已购买 ${s.name}`:`已装备 ${s.name}`)
}
function buyPermanentSkill(id){
  const s=PERMANENT_SKILLS[id];if(!s||profile.permanentSkills.includes(id))return;
  if(ws&&ws.readyState===1){ws.send(JSON.stringify({type:'buy-permanent-skill',skill:id}));return}
  if(profile.coins<s.price)return toast('球币不足');profile.coins-=s.price;profile.permanentSkills.push(id);saveLocal();toast(`已永久解锁 ${s.name}`)
}
function consumeLocalSkill(match){if(!match?.special||match.specialConsumed)return;match.specialConsumed=true;const id=match.special;if(ws?.readyState===1)ws.send(JSON.stringify({type:'consume-skill',skill:id}));profile.skillInventory[id]=Math.max(0,(profile.skillInventory[id]||0)-1);if(!profile.skillInventory[id])delete profile.skillInventory[id];if(profile.equippedSkill===id&&!profile.skillInventory[id])profile.equippedSkill=null;saveLocal()}
function buyOrEquip(id){
  if(ws&&ws.readyState===1){ws.send(JSON.stringify({type:profile.inventory.includes(id)?'equip':'buy',racket:id}));return}
  const r=RACKETS[id];if(!profile.inventory.includes(id)){if(profile.coins<r.price)return toast('球币不足');profile.coins-=r.price;profile.inventory.push(id)}profile.equipped=id;saveLocal();toast(`已装备 ${r.name}`)
}

class LocalMatch{
  constructor(level){
    this.level=level;this.bot=BOT[level];this.players=[this.makePlayer(0),this.makePlayer(1)];this.scores=[0,0];this.games=[0,0];this.gameNo=1;this.server=0;this.rally=0;this.finished=false;this.phase='serve';this.timer=.8;this.aiThink=0;this.aiReaction=0;this.aiSeen=-1;this.aiAimError=0;this.pending=[null,null];this.special=profile.equippedSkill;this.specialUsed=false;this.specialConsumed=false;this.permanentSkills=[...profile.permanentSkills];this.permanentCooldowns={};this.servePrompted=false;this.notice='';this.swap=false;this.decidingSwitched=false;this.shuttle={x:260,y:480,vx:0,vy:0,gravity:G,last:-1,trail:[]};this.resetRally(true)
  }
  makePlayer(side){return {side,x:side?1015:265,y:FLOOR,vy:0,vx:0,onGround:true,facing:side?-1:1,swing:0,jumpLock:false,racket:side?'bamboo':profile.equipped}}
  resetRally(first=false){
    this.phase='serve';this.timer=first?.9:1;this.rally=0;this.pending=[null,null];this.servePrompted=false;const even=this.scores[this.server]%2===0;
    this.players[0].x=this.server===0?(even?455:250):245;this.players[1].x=this.server===1?(even?825:1030):1035;
    this.players.forEach(p=>{p.y=FLOOR;p.vx=p.vy=0;p.onGround=true;p.swing=0});const p=this.players[this.server];this.shuttle={x:p.x+p.facing*36,y:p.y-115,vx:0,vy:0,gravity:G,last:-1,prevX:p.x+p.facing*36,prevY:p.y-115,trail:[]};
    setScoreUI(this);if(!first)banner(`${this.scores[0]} : ${this.scores[1]}`,this.server===0?'你的发球':'对方发球',850)
  }
  input(keys,dt){
    const p=this.players[0];let dir=this.phase==='serve'&&this.server===0?0:(keys.d?1:0)-(keys.a?1:0);p.vx=dir*290;if(!(this.phase==='serve'&&this.server===0)&&keys.w&&!p.jumpLock&&p.onGround){p.vy=-550;p.onGround=false;p.jumpLock=true;beep(310,.05)}if(!keys.w)p.jumpLock=false;
    this.movePlayer(p,dt);this.updateAI(dt);this.players[1].swing=Math.max(0,this.players[1].swing-dt*4);p.swing=Math.max(0,p.swing-dt*4)
  }
  movePlayer(p,dt){p.x+=p.vx*dt;p.vy+=G*dt;p.y+=p.vy*dt;if(p.y>=FLOOR){p.y=FLOOR;p.vy=0;p.onGround=true}p.x=p.side?Math.max(NET_X+55,Math.min(W-75,p.x)):Math.max(75,Math.min(NET_X-55,p.x))}
  updateAI(dt){
    const p=this.players[1],b=this.bot,s=this.shuttle;this.aiThink=Math.max(0,this.aiThink-dt);this.aiReaction=Math.max(0,this.aiReaction-dt);
    if(this.phase==='serve'){p.vx=0;this.movePlayer(p,dt);if(this.server===1&&this.timer<=0){const styles=this.level==='rookie'?['high','short']:this.level==='pro'?['short','drive','high']:['drive','short','high'];this.serve(styles[Math.floor(Math.random()*styles.length)])}return}
    const inbound=this.phase==='play'&&s.last===0&&s.vx>0;
    if(inbound&&this.aiSeen!==this.rally){this.aiSeen=this.rally;this.aiReaction=b.reaction;this.aiAimError=(Math.random()*2-1)*b.error}
    let target=1010;if(inbound&&this.aiReaction<=0){target=predictLanding(s)-p.facing*48+this.aiAimError;target=Math.max(705,Math.min(1195,target))}
    const dx=target-p.x;p.vx=Math.abs(dx)>9?Math.sign(dx)*b.speed:0;
    if(inbound&&this.aiReaction<=0&&this.level!=='rookie'&&p.onGround&&s.y<p.y-190&&Math.abs(s.x-p.x)<155){p.vy=-520;p.onGround=false}
    this.movePlayer(p,dt);
    if(inbound&&this.aiReaction<=0&&this.aiThink<=0&&!this.pending[1]&&this.hitMetric(1)<1.75){
      if(Math.random()<b.miss){this.aiThink=.34}else{let type='clear';if(p.y<FLOOR-40&&s.y<p.y-75)type='smash';else if(this.level!=='rookie'&&Math.random()>.68)type='drop';else if(Math.random()>.52)type='drive';this.pending[1]={type,power:b.power,ttl:b.buffer}}
    }
  }
  hitMetric(side){const p=this.players[side],s=this.shuttle,samples=[[s.x,s.y],[s.prevX??s.x,s.prevY??s.y],[(s.x+(s.prevX??s.x))/2,(s.y+(s.prevY??s.y))/2]];let best=99;for(const [x,y] of samples){const forward=(x-p.x)*p.facing;if(forward < -72||forward>158)continue;const u=(forward-38)/112,v=(y-(p.y-125))/118;best=Math.min(best,u*u+v*v)}return best}
  canHit(side,range=1){return this.phase==='play'&&this.shuttle.last!==side&&this.hitMetric(side)<=range}
  requestHit(side,type,powerOverride){if(this.hit(side,type,powerOverride))return true;if(this.phase==='play'&&this.shuttle.last!==side&&!this.pending[side]){this.pending[side]={type,power:powerOverride,ttl:side?this.bot.buffer:.17};this.players[side].swing=.22;return true}return false}
  processPending(dt){this.pending.forEach((q,side)=>{if(!q)return;q.ttl-=dt;if(this.canHit(side)){this.pending[side]=null;this.hit(side,q.type,q.power);return}if(q.ttl<=0)this.pending[side]=null})}
  hit(side,type,powerOverride,range=1){
    if(!this.canHit(side,range))return false;const p=this.players[side],r=RACKETS[p.racket]||RACKETS.bamboo,power=powerOverride||r.power,s=this.shuttle;p.swing=1;s.last=side;this.rally++;
    let tx,ty=FLOOR-8,base;if(type==='clear'){tx=side?145:1135;base=1.34}else if(type==='drop'){tx=side?550:730;base=1.30}else if(type==='smash'){tx=side?300:980;base=.47}else{tx=side?205:1075;base=1.08}
    tx+=(side?1:-1)*(side===1?this.aiAimError*.22:0);const time=base/power;s.gravity=G*power*power;s.vx=(tx-s.x)/time;s.vy=(ty-s.y-.5*s.gravity*time*time)/time;
    beep(type==='smash'?150:205,.065,type==='smash'?.1:.06);return true
  }
  useSpecial(){
    if(!this.special)return toast('请先在装备中心购买并装备技能'),false;if(this.specialUsed)return toast('本场技能已经使用'),false;if(this.phase!=='play'||this.shuttle.last===0)return toast('现在不能使用技能'),false;
    const r=RACKETS[this.players[0].racket]||RACKETS.bamboo,config={rescue:['clear',r.power*1.05,3],meteor:['smash',r.power*1.32,1.25],feather:['drop',r.power*1.18,1.8]}[this.special];if(!config||!this.hit(0,...config))return toast('羽毛球尚未进入技能范围'),false;this.specialUsed=true;banner(SKILLS[this.special].name,'本场技能已消耗',850);return true
  }
  usePermanentSkill(id){
    const skill=PERMANENT_SKILLS[id];if(!skill||!this.permanentSkills.includes(id))return toast('请先在装备中心永久解锁该技能'),false;if((this.permanentCooldowns[id]||0)>0)return toast(`${skill.name} 冷却中`),false;if(this.phase!=='play'||this.shuttle.last===0)return toast('现在不能使用技能'),false;
    const r=RACKETS[this.players[0].racket]||RACKETS.bamboo;if(!this.hit(0,skill.shot,r.power*skill.power,skill.range))return toast('羽毛球尚未进入技能范围'),false;this.permanentCooldowns[id]=skill.cooldown;banner(skill.name,`${skill.cooldown} 秒后可再次使用`,850);return true
  }
  serve(style='short'){
    if(this.phase!=='serve'||this.timer>0)return false;const p=this.players[this.server],s=this.shuttle,power=this.server?this.bot.power:RACKETS[p.racket].power;const shots={short:[this.server?500:780,1.40,'网前短发球'],high:[this.server?145:1135,1.72,'高远发球'],drive:[this.server?260:1020,1.45,'平快发球']};const [tx,base,label]=shots[style]||shots.short,time=base/power;s.x=p.x+p.facing*38;s.y=p.y-108;s.last=this.server;s.gravity=G*power*power;s.vx=(tx-s.x)/time;s.vy=(FLOOR-10-s.y-.5*s.gravity*time*time)/time;this.phase='play';this.rally=1;this.aiSeen=-1;banner('PLAY',label,560);beep(220,.06);return true
  }
  update(dt,keys){
    if(this.finished)return;dt=Math.min(dt,.034);Object.keys(this.permanentCooldowns).forEach(id=>this.permanentCooldowns[id]=Math.max(0,this.permanentCooldowns[id]-dt));this.input(keys,dt);
    if(this.phase==='serve'){this.timer=Math.max(0,this.timer-dt);const p=this.players[this.server];this.shuttle.x=p.x+p.facing*38;this.shuttle.y=p.y-110;if(this.timer<=0&&this.server===0&&!this.servePrompted){this.servePrompted=true;banner('轮到你发球','H 平快　J 高远　K 短发球',2200)}return}
    this.processPending(dt);const s=this.shuttle;s.trail.unshift({x:s.x,y:s.y});if(s.trail.length>12)s.trail.pop();s.prevX=s.x;s.prevY=s.y;s.vy+=(s.gravity||G)*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;
    if((s.x-NET_X)*(s.prevX-NET_X)<=0&&s.y>NET_HIT_TOP){this.point(s.x<NET_X?1:0,'触网');return}
    if(s.x<20||s.x>W-20){this.point(s.x<NET_X?1:0,'界外');return}
    if(s.y>=FLOOR-5){const court=s.x>=90&&s.x<=1190;if(!court)this.point(s.last===0?1:0,'界外');else this.point(s.x<NET_X?1:0,'落地')}
  }
  point(winner,reason){if(this.phase!=='play')return;this.phase='point';this.scores[winner]++;this.server=winner;setScoreUI(this);beep(winner===0?520:110,.13);toast(`${winner===0?'你':'对手'}得分 · ${reason}`);const a=this.scores[winner],b=this.scores[1-winner],gameWon=(a>=21&&a-b>=2)||a===30;
    if(gameWon){this.games[winner]++;if(this.games[winner]>=2){this.finished=true;setTimeout(()=>finishMatch(winner===0,`${this.games[0]} : ${this.games[1]} 局`),800);return}this.gameNo++;this.scores=[0,0];this.swap=!this.swap;this.decidingSwitched=false;banner(`${winner===0?'你':'对手'}拿下本局`,'交换场地',1300)}
    else if(this.gameNo===3&&!this.decidingSwitched&&(this.scores[0]===11||this.scores[1]===11)){this.decidingSwitched=true;this.swap=!this.swap;banner('决胜局 11 分','交换场地',1200)}
    setTimeout(()=>{if(!this.finished)this.resetRally()},gameWon?1500:950)
  }
}

function predictLanding(s){if(s.y>=FLOOR)return s.x;const gravity=s.gravity||G,disc=s.vy*s.vy+2*gravity*(FLOOR-s.y),t=(-s.vy+Math.sqrt(Math.max(0,disc)))/gravity;return s.x+s.vx*t}
function setScoreUI(g){$('#score1').textContent=g.scores[0];$('#score2').textContent=g.scores[1];$('#gameNo').textContent=`第 ${g.gameNo||1} 局`;$$('#games1 i').forEach((x,i)=>x.classList.toggle('won',i<(g.games?.[0]||0)));$$('#games2 i').forEach((x,i)=>x.classList.toggle('won',i<(g.games?.[1]||0)))}
function startLocal(level){online=false;current=new LocalMatch(level);showScreen('#match');resize();$('#p1name').textContent=profile.name;$('#p2name').textContent=BOT[level].name;$('#p1gear').textContent=`${RACKETS[profile.equipped].name} · 力量 ${Math.round(RACKETS[profile.equipped].power*100)}%`;$('#p2gear').textContent=`${level==='legend'?'冠军':level==='pro'?'职业':'训练'}球拍`;$('#difficultyModal').classList.add('hidden');banner('准备','三局两胜 · 21 分制',1100)}

function finishMatch(won,detail){
  if(!online)consumeLocalSkill(current);$('#resultTitle').textContent=won?'比赛胜利':'惜败，再战';$('#resultText').textContent=`${detail} · ${won?'漂亮的控制与落点！':'调整站位，把握下一次击球。'}`;$('#resultModal').classList.remove('hidden');if(!online&&won){profile.coins+=180;saveLocal()}
}
function leaveMatch(){if(online&&ws?.readyState===1)ws.send(JSON.stringify({type:'forfeit'}));else consumeLocalSkill(current);current=null;online=false;showScreen('#home')}

function resize(){const r=canvas.parentElement.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);canvas._d=d}
/* ---------- 视觉：写实体育馆 ---------- */
const TEAM=[
  {jersey:'#22c98a',jerseyD:'#0d9160',jerseyL:'#74f0c2',shorts:'#f3f7f5',shortsL:'#d3ded8',trim:'#d9ff43',skin:'#f2c9a0',skinD:'#d19a6e',hair:'#2a2019',hairL:'#4a392a',shoe:'#ffffff',shoeAcc:'#d9ff43',band:'#d9ff43',glow:'rgba(217,255,67,'},
  {jersey:'#ff6a4d',jerseyD:'#d5351f',jerseyL:'#ffab93',shorts:'#f6f6f6',shortsL:'#dcdedd',trim:'#ffd24a',skin:'#f3caa4',skinD:'#d29a6e',hair:'#20150c',hairL:'#3a2717',shoe:'#ffffff',shoeAcc:'#ffd24a',band:'#ffd24a',glow:'rgba(255,140,90,'}
];
let bg=null,fx=[],_lastT=performance.now();
function buildBackground(){
  bg=document.createElement('canvas');bg.width=W;bg.height=H;const c=bg.getContext('2d');
  // 明亮的室内球馆空气
  let g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#eaf6ff');g.addColorStop(.32,'#d3ebf8');g.addColorStop(.62,'#c1e0f1');g.addColorStop(1,'#b0d5ea');c.fillStyle=g;c.fillRect(0,0,W,H);
  // 顶部横梁
  c.fillStyle='#93aec0';c.fillRect(0,0,W,9);
  // 天花板桁架
  c.strokeStyle='rgba(70,110,140,.16)';c.lineWidth=2;for(let i=-2;i<14;i++){c.beginPath();c.moveTo(i*110,0);c.lineTo(i*110+150,150);c.stroke()}
  c.strokeStyle='rgba(70,110,140,.11)';for(let y=18;y<150;y+=26){c.beginPath();c.moveTo(0,y);c.lineTo(W,y-8);c.stroke()}
  // 聚光灯灯箱 + 柔和光锥
  const lamps=[210,470,W-470,W-210];
  lamps.forEach(lx=>{
    c.fillStyle='#5c7789';c.fillRect(lx-46,16,92,22);
    for(let k=0;k<3;k++){c.fillStyle=`rgba(255,255,246,${.98-k*.14})`;c.beginPath();c.ellipse(lx-30+k*30,27,12,7,0,0,7);c.fill()}
    const cone=c.createLinearGradient(lx,38,lx,440);cone.addColorStop(0,'rgba(255,255,235,.30)');cone.addColorStop(1,'rgba(255,255,235,0)');
    c.fillStyle=cone;c.beginPath();c.moveTo(lx-40,38);c.lineTo(lx+40,38);c.lineTo(lx+230,440);c.lineTo(lx-230,440);c.closePath();c.fill();
  });
  // 看台
  drawStands(c);
  // LED 广告环
  c.fillStyle='#173447';c.fillRect(0,330,W,26);
  const ad=['#d9ff43','#33d9a8','#ff7d63','#4ec6ff','#ffd24a'];for(let x=0;x<W;x+=118){c.fillStyle=ad[(x/118|0)%ad.length];c.globalAlpha=.55;c.fillRect(x+6,335,104,15);c.globalAlpha=1}
  c.fillStyle='rgba(255,255,255,.22)';c.fillRect(0,330,W,2);
  // ===== 暖色木地板 =====
  const floor=c.createLinearGradient(0,356,0,H);floor.addColorStop(0,'#e6c691');floor.addColorStop(.5,'#d8b078');floor.addColorStop(1,'#c99f63');c.fillStyle=floor;c.fillRect(0,356,W,H-356);
  // 木纹横条
  c.strokeStyle='rgba(120,85,45,.14)';c.lineWidth=1;for(let y=370;y<H;y+=15){c.beginPath();c.moveTo(0,y+((y*7)%3));c.lineTo(W,y);c.stroke()}
  // 地板柔和高光
  let fl=c.createLinearGradient(0,356,0,H);fl.addColorStop(0,'rgba(255,255,255,.14)');fl.addColorStop(.4,'rgba(255,255,255,0)');c.fillStyle=fl;c.fillRect(0,356,W,H-356);
  // 底线
  c.save();c.strokeStyle='rgba(255,255,255,.95)';c.lineWidth=4;c.shadowColor='rgba(255,255,255,.5)';c.shadowBlur=6;c.beginPath();c.moveTo(55,FLOOR);c.lineTo(W-55,FLOOR);c.stroke();c.restore();
  c.strokeStyle='rgba(120,85,45,.28)';c.lineWidth=1;c.beginPath();c.moveTo(55,FLOOR+4);c.lineTo(W-55,FLOOR+4);c.stroke();
  // ===== 侧视球网 =====
  drawNet(c);
  // 轻微暗角（不压黑）
  let vg=c.createRadialGradient(W/2,H*.52,H*.42,W/2,H*.52,H*.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(12,34,50,.26)');c.fillStyle=vg;c.fillRect(0,0,W,H);
}
function drawStands(c){
  const top=150,bot=330,h=bot-top;
  // 混凝土看台底
  let wall=c.createLinearGradient(0,top,0,bot);wall.addColorStop(0,'#8ea6b7');wall.addColorStop(1,'#aabfcd');c.fillStyle=wall;c.fillRect(0,top,W,h);
  const rows=6,rh=h/rows;
  const shirts=['#e07a6a','#e8b25a','#6bb7d8','#8bc57e','#c99ad6','#dcdfe4','#7f9bc4','#e59aae'];
  const skins=['#f0c8a0','#dda578','#b98a5e'];
  for(let r=0;r<rows;r++){
    const y=top+r*rh;
    // 阶梯座椅
    c.fillStyle=r%2?'#9db3c2':'#a9bdca';c.fillRect(0,y,W,rh);
    c.fillStyle='rgba(255,255,255,.22)';c.fillRect(0,y,W,2);
    c.fillStyle='rgba(40,64,82,.14)';c.fillRect(0,y+rh-3,W,3);
    // 稀疏观众剪影（头 + 肩）
    const sc=.72+r*.055,sp=34-r*1.2,hr=3.6*sc,cy=y+rh*.62;
    for(let x=14,i=r*131;x<W-6;x+=sp,i++){
      if((i*37)%5===0)continue; // 空座，制造稀疏感
      const jx=((i*29)%9)-4,jy=((i*17)%3)-1,cx=x+jx;
      c.fillStyle=shirts[(i*13+r*3)%shirts.length];
      c.beginPath();c.moveTo(cx-hr*1.9,cy+hr*3.4+jy);c.quadraticCurveTo(cx,cy-hr*.3+jy,cx+hr*1.9,cy+hr*3.4+jy);c.closePath();c.fill();
      c.fillStyle=skins[(i*7)%skins.length];c.beginPath();c.arc(cx,cy+jy,hr,0,7);c.fill();
    }
  }
  // 顶部与底部过渡
  let sh=c.createLinearGradient(0,top,0,top+22);sh.addColorStop(0,'rgba(60,86,104,.4)');sh.addColorStop(1,'rgba(60,86,104,0)');c.fillStyle=sh;c.fillRect(0,top,W,22);
  // 护栏
  c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=3;c.beginPath();c.moveTo(0,bot-3);c.lineTo(W,bot-3);c.stroke();
  c.strokeStyle='rgba(120,150,170,.5)';c.lineWidth=1.4;for(let x=22;x<W;x+=44){c.beginPath();c.moveTo(x,bot-3);c.lineTo(x,bot-15);c.stroke()}
}
function drawNet(c){
  const top=NET_HIT_TOP,bot=FLOOR;
  c.strokeStyle='rgba(232,248,240,.38)';c.lineWidth=1;for(let y=top+13;y<bot;y+=13){c.beginPath();c.moveTo(NET_X-7,y);c.lineTo(NET_X+7,y);c.stroke()}
  c.strokeStyle='#eaf8ef';c.lineWidth=5;c.beginPath();c.moveTo(NET_X,top-4);c.lineTo(NET_X,bot+4);c.stroke();
  c.strokeStyle='#d9ff43';c.lineWidth=5;c.beginPath();c.moveTo(NET_X-11,top);c.lineTo(NET_X+11,top);c.stroke();
}
function drawCourt(state){
  if(!bg)buildBackground();
  const cw=canvas.width,ch=canvas.height,sx=cw/W,sy=ch/H;ctx.setTransform(sx,0,0,sy,0,0);ctx.clearRect(0,0,W,H);
  const now=performance.now(),t=now/1000,dt=Math.min(.05,(now-_lastT)/1000);_lastT=now;
  ctx.drawImage(bg,0,0,W,H);
  if(state.shuttle)drawShuttle(state.shuttle);
  (state.players||[]).forEach((p,i)=>drawPlayer(p,i,t));
  updateFx(dt);
}
function limb(x1,y1,x2,y2,x3,y3,w,col){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineTo(x3,y3);ctx.stroke()}
function _disc(x,y,r){ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2)}
function _trap(a,b,wa,wb){const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;ctx.moveTo(a[0]+nx*wa,a[1]+ny*wa);ctx.lineTo(b[0]+nx*wb,b[1]+ny*wb);ctx.lineTo(b[0]-nx*wb,b[1]-ny*wb);ctx.lineTo(a[0]-nx*wa,a[1]-ny*wa);ctx.closePath()}
function limbPath(a,b,c,wa,wb,wc){ctx.beginPath();_disc(a[0],a[1],wa);_disc(b[0],b[1],wb);_disc(c[0],c[1],wc);_trap(a,b,wa,wb);_trap(b,c,wb,wc)}
function pose(p,i,t){
  const face=p.facing??(i?-1:1),jump=Math.max(0,FLOOR-p.y),swing=p.swing||0;
  const moving=Math.abs(p.vx)>25,air=!p.onGround||jump>6,run=moving&&!air,ph=t*13+p.x*.02;
  const s=Math.sin(ph);const KNEE=-58;
  let fFoot,fKnee,bFoot,bKnee;
  if(air){fFoot=[22,-40];fKnee=[24,-78];bFoot=[-20,-20];bKnee=[-14,-70]}
  else if(run){fFoot=[16+s*26,Math.min(0,-Math.max(0,s)*22)];bFoot=[-16-s*26,Math.min(0,-Math.max(0,-s)*22)];fKnee=[fFoot[0]*.5+10,KNEE];bKnee=[bFoot[0]*.5-8,KNEE]}
  else{fFoot=[16,0];fKnee=[14,KNEE];bFoot=[-15,0];bKnee=[-12,KNEE]}
  const shF=[14,-168],shB=[-15,-166];
  const hand=[26+swing*18,-128-swing*92];
  const elbF=[(shF[0]+hand[0])/2+14,(shF[1]+hand[1])/2+(1-swing)*18];
  let backHand;
  if(run)backHand=[-24+s*18,-132+Math.abs(s)*10];else backHand=[-14-swing*10,-100+swing*44];
  const elbB=[(shB[0]+backHand[0])/2-11,(shB[1]+backHand[1])/2+11];
  const ra=0.55-swing*1.65;
  const tip=[hand[0]+84*Math.sin(ra),hand[1]-84*Math.cos(ra)];
  return {face,jump,swing,air,run,fFoot,fKnee,bFoot,bKnee,shF,shB,hand,elbF,backHand,elbB,ra,tip,lean:run?s*4:0}
}
function drawReflection(p,i,t){
  const q=pose(p,i,t);ctx.save();ctx.globalAlpha=.14;ctx.translate(p.x,2*FLOOR-p.y);ctx.scale(q.face,-1);
  drawBody(p,i,q);ctx.restore()
}
function drawBody(p,i,q){
  const T=TEAM[i],OUT='#12201a';
  const limb3=(a,b,c,wa,wb,wc,col,hi)=>{
    limbPath(a,b,c,wa+2.2,wb+2.2,wc+2.2);ctx.fillStyle=OUT;ctx.fill();
    limbPath(a,b,c,wa,wb,wc);ctx.fillStyle=col;ctx.fill();
    if(hi){const g=ctx.createLinearGradient(a[0]-wa,a[1],a[0]+wa,a[1]);g.addColorStop(0,'rgba(255,255,255,.16)');g.addColorStop(.6,'rgba(255,255,255,0)');ctx.fillStyle=g;limbPath(a,b,c,wa,wb,wc);ctx.fill()}
  };
  const sock=(f,k)=>{const a=[k[0]*.35+f[0]*.65,(k[1]+f[1]*3)/4],b=[f[0],f[1]-7];ctx.beginPath();_disc(a[0],a[1],7.4);_disc(b[0],b[1],7.4);_trap(a,b,7.4,7.4);ctx.fillStyle='#eef8f1';ctx.fill();ctx.strokeStyle=T.jersey;ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(a[0]-5,a[1]);ctx.lineTo(a[0]+5,a[1]-1);ctx.stroke()};
  const hipF=[9,-110],hipB=[-9,-108];
  // ===== 后侧肢体（较暗，位于身体后方）=====
  limb3(q.shB,q.elbB,q.backHand,7,5.2,4.3,T.skinD);
  ctx.fillStyle=T.skinD;ctx.beginPath();_disc(q.backHand[0],q.backHand[1],4.6);ctx.fill();
  limb3(hipB,q.bKnee,q.bFoot,8.5,6.3,4.7,T.skinD);
  sock(q.bFoot,q.bKnee);
  drawShoe(q.bFoot,T,.85);
  // ===== 前腿 =====
  limb3(hipF,q.fKnee,q.fFoot,9.2,6.9,5,T.skin,true);
  sock(q.fFoot,q.fKnee);
  drawShoe(q.fFoot,T,1);
  // ===== 短裤 =====
  const sg=ctx.createLinearGradient(-24,0,24,0);sg.addColorStop(0,T.shorts);sg.addColorStop(.5,T.shortsL);sg.addColorStop(1,T.shorts);
  ctx.fillStyle=sg;ctx.strokeStyle=OUT;ctx.lineWidth=2.6;ctx.lineJoin='round';ctx.beginPath();
  ctx.moveTo(-18,-124);ctx.lineTo(18,-124);ctx.quadraticCurveTo(23,-118,22,-98);ctx.quadraticCurveTo(18,-90,12,-82);ctx.lineTo(2,-90);ctx.quadraticCurveTo(0,-97,-2,-90);ctx.lineTo(-12,-82);ctx.quadraticCurveTo(-18,-90,-22,-98);ctx.quadraticCurveTo(-23,-118,-18,-124);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=T.jersey;ctx.lineWidth=3.6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-18,-122);ctx.lineTo(18,-122);ctx.stroke();
  ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(-20,-116);ctx.lineTo(-18,-92);ctx.moveTo(20,-116);ctx.lineTo(18,-92);ctx.stroke();
  // ===== 躯干（球衣）=====
  ctx.save();ctx.translate(q.lean*.4,0);
  const jg=ctx.createLinearGradient(-26,0,28,0);jg.addColorStop(0,T.jerseyD);jg.addColorStop(.5,T.jersey);jg.addColorStop(1,T.jerseyL);
  ctx.fillStyle=jg;ctx.strokeStyle=OUT;ctx.lineWidth=2.8;ctx.lineJoin='round';ctx.beginPath();
  ctx.moveTo(-17,-118);ctx.quadraticCurveTo(-23,-142,-21,-164);ctx.quadraticCurveTo(-19,-171,-11,-172);ctx.quadraticCurveTo(-5,-170,0,-165);ctx.quadraticCurveTo(5,-170,11,-172);ctx.quadraticCurveTo(19,-171,21,-164);ctx.quadraticCurveTo(23,-142,17,-118);ctx.quadraticCurveTo(0,-112,-17,-118);ctx.closePath();ctx.fill();ctx.stroke();
  // 胸肌/腹线柔和阴影
  ctx.strokeStyle='rgba(10,16,13,.13)';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(2,-164);ctx.lineTo(3,-120);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-9,-160);ctx.lineTo(-11,-132);ctx.stroke();
  // 侧缝亮条
  ctx.strokeStyle=T.trim;ctx.lineWidth=2.6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-20,-122);ctx.lineTo(-22,-156);ctx.moveTo(20,-122);ctx.lineTo(22,-156);ctx.stroke();
  // 下摆
  ctx.strokeStyle=T.jerseyD;ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(-17,-119);ctx.quadraticCurveTo(0,-113,17,-119);ctx.stroke();
  // V 领
  ctx.fillStyle=T.jerseyD;ctx.beginPath();ctx.moveTo(-7,-169);ctx.lineTo(0,-158);ctx.lineTo(7,-169);ctx.quadraticCurveTo(0,-164,-7,-169);ctx.closePath();ctx.fill();
  ctx.strokeStyle=T.trim;ctx.lineWidth=2.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-7,-169);ctx.lineTo(0,-159);ctx.lineTo(7,-169);ctx.stroke();
  // 号码
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.font='700 23px "Barlow Condensed",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.save();ctx.translate(2,-138);ctx.scale(q.face,1);ctx.fillText(i?'3':'7',0,0);ctx.restore();
  ctx.restore();
  // ===== 颈 =====
  ctx.beginPath();_disc(2,-168,6.5);_disc(4,-182,6);_trap([2,-168],[4,-182],6.5,6);ctx.fillStyle=T.skinD;ctx.fill();
  // ===== 头（3/4 侧脸带鼻梁）=====
  drawHead(T,3,-197);
  // ===== 前袖（盖住手臂顶端，短袖效果）=====
  const sleeve=(s,dir)=>{ctx.save();ctx.fillStyle=jg;ctx.strokeStyle=OUT;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(s[0]+dir*1.5,s[1]+4,10,8.5,dir*.5,0,7);ctx.fill();ctx.stroke();ctx.strokeStyle=T.trim;ctx.lineWidth=2.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(s[0]-7,s[1]+9);ctx.lineTo(s[0]+7,s[1]+8);ctx.stroke();ctx.restore()};
  // ===== 前手臂 + 手 + 护腕 + 球拍 =====
  limb3(q.shF,q.elbF,q.hand,7.6,5.7,4.6,T.skin,true);
  ctx.fillStyle=T.skin;ctx.beginPath();_disc(q.hand[0],q.hand[1],5.2);ctx.fill();ctx.strokeStyle='rgba(120,80,55,.4)';ctx.lineWidth=1;ctx.stroke();
  ctx.strokeStyle=T.band;ctx.lineWidth=5.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(q.hand[0]-4,q.hand[1]+3);ctx.lineTo(q.hand[0]+2,q.hand[1]-4);ctx.stroke();
  sleeve(q.shF,1);
  drawRacket(q,T);
}
function drawHead(T,hx,hy){
  // 后发轮廓
  ctx.fillStyle=T.hair;ctx.beginPath();ctx.ellipse(hx+1,hy-1,16,17.5,0,0,7);ctx.fill();
  // 脸型（柔和 3/4，轻微鼻梁）
  const fg=ctx.createRadialGradient(hx+5,hy-2,3,hx+2,hy+3,17);fg.addColorStop(0,T.skin);fg.addColorStop(1,T.skinD);
  ctx.fillStyle=fg;ctx.strokeStyle='rgba(80,52,34,.28)';ctx.lineWidth=1;ctx.beginPath();
  ctx.moveTo(hx-2,hy-15);
  ctx.quadraticCurveTo(hx+12,hy-15,hx+13,hy-3);        // 额到眉骨
  ctx.quadraticCurveTo(hx+14,hy-1,hx+14.5,hy+2);       // 轻鼻梁
  ctx.quadraticCurveTo(hx+14,hy+5,hx+12,hy+7);         // 鼻侧回收
  ctx.quadraticCurveTo(hx+13,hy+11,hx+7,hy+15);        // 颊到下巴
  ctx.quadraticCurveTo(hx-1,hy+17,hx-7,hy+13);         // 下颌
  ctx.quadraticCurveTo(hx-13,hy+6,hx-13,hy-4);         // 后颊
  ctx.quadraticCurveTo(hx-13,hy-13,hx-2,hy-15);        // 回顶
  ctx.closePath();ctx.fill();ctx.stroke();
  // 双耳
  ctx.fillStyle=T.skinD;ctx.beginPath();ctx.ellipse(hx-12,hy+1,2.8,4.4,0,0,7);ctx.fill();
  ctx.beginPath();ctx.ellipse(hx+13,hy+1,2.4,3.8,0,0,7);ctx.fill();
  // 下颌柔和阴影
  ctx.fillStyle='rgba(110,72,48,.14)';ctx.beginPath();ctx.moveTo(hx-6,hy+11);ctx.quadraticCurveTo(hx+2,hy+16,hx+10,hy+10);ctx.quadraticCurveTo(hx+2,hy+13,hx-6,hy+9);ctx.closePath();ctx.fill();
  // 头发（顶盖 + 斜刘海，露出额头）
  ctx.fillStyle=T.hair;ctx.beginPath();
  ctx.moveTo(hx-13,hy-3);ctx.quadraticCurveTo(hx-15,hy-16,hx+1,hy-18);ctx.quadraticCurveTo(hx+15,hy-16,hx+14,hy-2);
  ctx.quadraticCurveTo(hx+10,hy-8,hx+3,hy-8);ctx.quadraticCurveTo(hx-3,hy-11,hx-6,hy-6);   // 刘海分缝
  ctx.quadraticCurveTo(hx-10,hy-9,hx-13,hy-3);ctx.closePath();ctx.fill();
  ctx.fillStyle=T.hairL;ctx.beginPath();ctx.moveTo(hx-1,hy-17);ctx.quadraticCurveTo(hx+11,hy-15,hx+13,hy-3);ctx.quadraticCurveTo(hx+6,hy-9,hx-1,hy-8);ctx.closePath();ctx.fill();
  // 鬓角
  ctx.strokeStyle=T.hair;ctx.lineWidth=2.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(hx-12,hy-3);ctx.lineTo(hx-11,hy+3);ctx.moveTo(hx+13,hy-2);ctx.lineTo(hx+12.5,hy+2);ctx.stroke();
  // 细头带（仅额前）
  ctx.strokeStyle=T.band;ctx.lineWidth=3.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(hx-11,hy-4);ctx.quadraticCurveTo(hx+1,hy-8,hx+12,hy-3.5);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(hx-10,hy-5);ctx.quadraticCurveTo(hx+1,hy-8.6,hx+11,hy-4.5);ctx.stroke();
  // 眉（双）
  ctx.strokeStyle='rgba(34,22,15,.9)';ctx.lineWidth=1.9;ctx.beginPath();ctx.moveTo(hx+3,hy);ctx.quadraticCurveTo(hx+6,hy-1.4,hx+9,hy-.2);ctx.moveTo(hx-8,hy+.4);ctx.quadraticCurveTo(hx-5,hy-1,hx-2,hy+.2);ctx.stroke();
  // 眼（双，近大远小）
  const eye=(ex,ey,r)=>{ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(ex,ey,r+.9,r,0,0,7);ctx.fill();ctx.fillStyle='#2a1b12';ctx.beginPath();ctx.arc(ex+.4,ey,r-.5,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.arc(ex+1,ey-.8,.7,0,7);ctx.fill()};
  eye(hx+6,hy+3.2,2.5);eye(hx-5,hy+3.6,2.1);
  // 鼻
  ctx.strokeStyle='rgba(110,72,48,.42)';ctx.lineWidth=1.3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(hx+2,hy+4);ctx.lineTo(hx+3,hy+8);ctx.quadraticCurveTo(hx+1,hy+9,hx-.5,hy+8.2);ctx.stroke();
  // 嘴
  ctx.strokeStyle='rgba(150,72,58,.6)';ctx.lineWidth=1.7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(hx-4,hy+11.4);ctx.quadraticCurveTo(hx+1,hy+12.6,hx+6,hy+11);ctx.stroke();
}
function drawShoe(f,T,lit=1){ctx.save();ctx.lineJoin='round';const x=f[0],y=f[1];
  // 鞋底
  ctx.fillStyle=T.shoeAcc;ctx.strokeStyle='rgba(10,16,13,.6)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x-10,y+3);ctx.lineTo(x+19,y+3);ctx.quadraticCurveTo(x+22,y+3,x+20,y);ctx.lineTo(x-9,y);ctx.closePath();ctx.fill();ctx.stroke();
  // 鞋面
  ctx.fillStyle=lit<1?'#dfe6e1':'#ffffff';
  ctx.beginPath();ctx.moveTo(x-9,y);ctx.quadraticCurveTo(x-12,y-13,x+2,y-13);ctx.quadraticCurveTo(x+18,y-12,x+20,y);ctx.closePath();ctx.fill();ctx.stroke();
  // 鞋头 + 侧标
  ctx.strokeStyle=T.shoeAcc;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-1,y-3);ctx.quadraticCurveTo(x+8,y-2,x+16,y-10);ctx.stroke();
  ctx.strokeStyle='rgba(10,16,13,.4)';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(x-2,y-11);ctx.lineTo(x+1,y-4);ctx.stroke();
  if(lit<1){ctx.fillStyle='rgba(10,16,13,.14)';ctx.beginPath();ctx.moveTo(x-9,y);ctx.quadraticCurveTo(x-12,y-13,x+2,y-13);ctx.quadraticCurveTo(x+18,y-12,x+20,y);ctx.closePath();ctx.fill()}
  ctx.restore()}
function drawRacket(q,T){
  ctx.save();ctx.translate(q.hand[0],q.hand[1]);ctx.rotate(q.ra);
  // 拍柄
  ctx.strokeStyle='#15100c';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,3);ctx.lineTo(0,-30);ctx.stroke();
  ctx.strokeStyle=T.band;ctx.lineWidth=2;for(let g=-5;g>-26;g-=5){ctx.beginPath();ctx.moveTo(-2.5,g);ctx.lineTo(2.5,g-2);ctx.stroke()}
  // T 型接头
  ctx.strokeStyle='#2a221a';ctx.lineWidth=3.4;ctx.beginPath();ctx.moveTo(-1,-30);ctx.lineTo(-10,-48);ctx.moveTo(1,-30);ctx.lineTo(10,-48);ctx.stroke();
  // 拍框
  ctx.strokeStyle='#0e1512';ctx.lineWidth=6.5;ctx.beginPath();ctx.ellipse(0,-70,17,25,0,0,7);ctx.stroke();
  const fg=ctx.createLinearGradient(0,-45,0,-96);fg.addColorStop(0,'#eef6f0');fg.addColorStop(1,T.trim);ctx.strokeStyle=fg;ctx.lineWidth=3.6;ctx.beginPath();ctx.ellipse(0,-70,17,25,0,0,7);ctx.stroke();
  // 网线
  ctx.strokeStyle='rgba(228,244,238,.42)';ctx.lineWidth=.7;for(let o=-12;o<=12;o+=3.8){ctx.beginPath();ctx.moveTo(o,-48);ctx.lineTo(o,-92);ctx.stroke()}for(let o=-90;o<=-50;o+=4.8){ctx.beginPath();ctx.moveTo(-15,o);ctx.lineTo(15,o);ctx.stroke()}
  ctx.restore()
}
function drawPlayer(p,i,t){
  const q=pose(p,i,t),T=TEAM[i];
  // 阴影（随跳跃缩放/位移到地面）
  const sh=Math.max(.32,1-q.jump/420);
  ctx.save();ctx.fillStyle=`rgba(0,0,0,${.34*sh})`;ctx.beginPath();ctx.ellipse(p.x,FLOOR+2,44*sh+6,11*sh+2,0,0,7);ctx.fill();ctx.restore();
  // 挥拍轨迹光弧
  if(q.swing>0.15){ctx.save();ctx.translate(p.x,p.y);ctx.scale(q.face,1);ctx.strokeStyle=T.glow+(q.swing*.5)+')';ctx.lineWidth=6+q.swing*6;ctx.lineCap='round';ctx.beginPath();ctx.arc(q.shF[0],q.shF[1],92,-1.15-q.swing,-.15,false);ctx.stroke();ctx.restore()}
  // 命中冲击边沿检测
  if(q.swing>0.9&&(p._sw||0)<=0.9){const wx=p.x+q.face*q.tip[0],wy=p.y+q.tip[1];spawnHit(wx,wy,T)}p._sw=q.swing;
  // 身体
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(q.face,1);drawBody(p,i,q);ctx.restore()
}
function spawnHit(x,y,T){
  fx.push({kind:'ring',x,y,age:0,life:.32,r0:6,r1:52,col:'255,255,255'});
  fx.push({kind:'ring',x,y,age:0,life:.42,r0:4,r1:40,col:'217,255,120'});
  for(let k=0;k<10;k++){const a=Math.random()*7,sp=120+Math.random()*260;fx.push({kind:'spark',x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-40,age:0,life:.3+Math.random()*.25,size:1.5+Math.random()*2.2,col:T.glow})}
  fx.push({kind:'flash',x,y,age:0,life:.16,r1:34});
}
function updateFx(dt){
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let n=fx.length-1;n>=0;n--){const e=fx[n];e.age+=dt;const k=e.age/e.life;if(k>=1){fx.splice(n,1);continue}
    if(e.kind==='ring'){const r=e.r0+(e.r1-e.r0)*k;ctx.strokeStyle=`rgba(${e.col},${(1-k)*.9})`;ctx.lineWidth=3*(1-k)+.5;ctx.beginPath();ctx.arc(e.x,e.y,r,0,7);ctx.stroke()}
    else if(e.kind==='flash'){ctx.fillStyle=`rgba(255,255,255,${(1-k)*.8})`;ctx.beginPath();ctx.arc(e.x,e.y,e.r1*(1-k*.4),0,7);ctx.fill()}
    else if(e.kind==='spark'){e.vx*=.94;e.vy=e.vy*.94+320*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;ctx.fillStyle=e.col+((1-k))+')';ctx.beginPath();ctx.arc(e.x,e.y,e.size*(1-k*.5),0,7);ctx.fill()}
  }
  ctx.restore()
}
function drawShuttle(s){
  const speed=Math.hypot(s.vx||0,s.vy||0),angle=speed>45?Math.atan2(s.vy,s.vx):Math.PI/2;
  // 发光拖尾
  if(s.trail){ctx.save();ctx.globalCompositeOperation='lighter';s.trail.forEach((tp,i)=>{const a=(1-i/s.trail.length);ctx.fillStyle=`rgba(235,255,190,${.15*a})`;ctx.beginPath();ctx.arc(tp.x,tp.y,10*a+1,0,7);ctx.fill()});ctx.restore()}
  ctx.save();ctx.translate(s.x,s.y);ctx.rotate(angle);
  // 高速光晕
  if(speed>720){ctx.save();ctx.globalCompositeOperation='lighter';const gl=ctx.createRadialGradient(6,0,1,6,0,20);gl.addColorStop(0,'rgba(255,255,220,.55)');gl.addColorStop(1,'rgba(255,255,220,0)');ctx.fillStyle=gl;ctx.beginPath();ctx.arc(6,0,20,0,7);ctx.fill();ctx.restore()}
  // ===== 羽毛裙（软木在 +x，羽毛拖向 -x）=====
  const N=9,BX=-1,TX=-27,R=15;
  const cone=ctx.createLinearGradient(BX,0,TX,0);cone.addColorStop(0,'#eef3f0');cone.addColorStop(1,'#c4d2cb');
  ctx.fillStyle=cone;ctx.beginPath();ctx.moveTo(BX,-5);ctx.lineTo(TX,-R);ctx.quadraticCurveTo(TX-4,0,TX,R);ctx.lineTo(BX,5);ctx.closePath();ctx.fill();
  for(let k=0;k<N;k++){const u=k/(N-1)-.5,by=u*8,ty=u*R*2;
    const g=ctx.createLinearGradient(BX,by,TX,ty);g.addColorStop(0,'#ffffff');g.addColorStop(1,u<0?'#dfe9e3':'#eef4ef');
    ctx.fillStyle=g;ctx.strokeStyle='rgba(120,146,134,.5)';ctx.lineWidth=.6;
    ctx.beginPath();ctx.moveTo(BX,by-2.4);ctx.lineTo(TX+2,ty-2.6);ctx.quadraticCurveTo(TX-3,ty,TX+2,ty+2.6);ctx.lineTo(BX,by+2.4);ctx.closePath();ctx.fill();ctx.stroke()}
  // 双圈缠线
  ctx.strokeStyle='rgba(150,175,163,.85)';ctx.lineWidth=1;
  [[-11,7],[-20,12]].forEach(([cx,rr])=>{ctx.beginPath();ctx.ellipse(cx,0,2.4,rr,0,0,7);ctx.stroke()});
  // ===== 软木头 =====
  ctx.fillStyle='#e33b34';ctx.beginPath();ctx.moveTo(BX-1,-6.6);ctx.lineTo(4,-7.4);ctx.lineTo(4,7.4);ctx.lineTo(BX-1,6.6);ctx.closePath();ctx.fill();
  const hg=ctx.createRadialGradient(9,-3,1,8,0,9);hg.addColorStop(0,'#ffffff');hg.addColorStop(.7,'#f4f8f5');hg.addColorStop(1,'#cdd8d1');
  ctx.fillStyle=hg;ctx.strokeStyle='rgba(70,90,82,.4)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(7.5,0,8.4,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.arc(5.5,-3,2.2,0,7);ctx.fill();
  ctx.restore()
}

const keys={a:false,d:false,w:false};
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['a','d','w','arrowleft','arrowright','arrowup','h','j','k','r','y','u','i',' '].includes(k))e.preventDefault();if(k==='a'||k==='arrowleft')keys.a=true;if(k==='d'||k==='arrowright')keys.d=true;if(k==='w'||k==='arrowup'||k===' ')keys.w=true;if(e.repeat)return;if(k==='h')action('drive','drive');if(k==='j')action('clear','high');if(k==='k')action(current?.players?.[0]?.y<FLOOR-35?'smash':'drop','short');if(k==='r')specialAction();const permanentId={y:'gale',u:'cyclone',i:'starfall'}[k];if(permanentId)permanentSkillAction(permanentId)});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k==='a'||k==='arrowleft')keys.a=false;if(k==='d'||k==='arrowright')keys.d=false;if(k==='w'||k==='arrowup'||k===' ')keys.w=false});
function action(type,serveStyle){if(!current)return;if(current.phase==='serve'){if(current.server!==0)return toast('等待对方发球');if(online){if(!current.serveReady)return toast('发球准备中');if(ws?.readyState===1)ws.send(JSON.stringify({type:'serve',style:serveStyle}))}else if(!current.serve(serveStyle))toast('发球准备中');return}if(online){if(ws?.readyState===1)ws.send(JSON.stringify({type:'hit',shot:type}))}else if(!current.requestHit(0,type))toast('现在不能击球',650)}
function specialAction(){if(!current)return;if(online){if(ws?.readyState===1)ws.send(JSON.stringify({type:'special'}))}else current.useSpecial()}
function permanentSkillAction(id){if(!current)return;const skill=PERMANENT_SKILLS[id];if(!profile.permanentSkills.includes(id))return toast(`请先在装备中心永久解锁 ${skill.name}`);if(online){if(ws?.readyState===1)ws.send(JSON.stringify({type:'permanent-skill',skill:id}))}else current.usePermanentSkill(id)}
function updateControls(){
  if(!current)return;const serve=current.phase==='serve'&&current.server===0,items=$$('.skill-bar .skill').slice(0,3),defs=serve?[['平快发球','快速压向后场'],['高远发球','高弧线到底线'],['网前短发球','贴网落入前场']]:[['平抽','快速压制'],['高远球','拉开空间'],['技巧球','空中杀球 / 网前吊球']];items.forEach((e,i)=>{e.querySelector('strong').textContent=defs[i][0];e.querySelector('small').textContent=defs[i][1]});const id=online?(current.skills?.[0]||null):current.special,used=online?(current.skillUsed?.[0]||false):current.specialUsed,box=$('#specialSkill');box.querySelector('strong').textContent=id?SKILLS[id]?.name||'一次性技能':'未装备';box.querySelector('small').textContent=id?(used?'本场已使用':'每场限用一次'):'在装备中心购买';box.classList.toggle('ready',!!id&&!used);
  Object.entries(PERMANENT_SKILLS).forEach(([skillId,skill])=>{const el=$(`#permanent-${skillId}`),owned=profile.permanentSkills.includes(skillId),cooldown=online?(current.permanentCooldowns?.[0]?.[skillId]||0):(current.permanentCooldowns?.[skillId]||0);el.querySelector('strong').textContent=owned?skill.name:'未解锁';el.querySelector('small').textContent=owned?(cooldown>0?`冷却 ${cooldown.toFixed(1)}s`:'永久技能'):'前往装备中心';el.classList.toggle('ready',owned&&cooldown<=0);el.querySelector('.cool')?.remove();if(owned&&cooldown>0)el.insertAdjacentHTML('beforeend',`<span class="cool">${Math.ceil(cooldown)}</span>`)});
}
let prev=performance.now(),sendAt=0;
function loop(now){const dt=(now-prev)/1000;prev=now;if(current){if(!online)current.update(dt,keys);else if(now-sendAt>33&&ws?.readyState===1){sendAt=now;ws.send(JSON.stringify({type:'input',left:keys.a,right:keys.d,jump:keys.w}))}updateControls();drawCourt(current)}requestAnimationFrame(loop)}

function wsUrl(){const q=new URLSearchParams(location.search).get('ws');if(q)return q;return `${location.protocol==='https:'?'wss':'ws'}://${location.hostname||'localhost'}:${location.protocol==='https:'?'8766':'8766'}`}
function connectServer(queueAfter=false){
  if(ws?.readyState===1){if(queueAfter)joinQueue();return}clearTimeout(reconnectTimer);$('#serverText').textContent=`连接 ${wsUrl()}`;
  try{ws=new WebSocket(wsUrl())}catch(e){return connectionFailed()}
  ws.onopen=()=>{ws.send(JSON.stringify({type:'hello',token:profile.token,name:profile.name}));if(queueAfter)ws._queueAfter=true};ws.onmessage=e=>handleMessage(JSON.parse(e.data));ws.onerror=()=>{};ws.onclose=()=>{if(queueing)connectionFailed();if(online)toast('连接中断，20 秒内可自动重连',5000)}
}
function connectionFailed(){queueing=false;$('#queueTitle').textContent='无法连接服务器';$('#serverText').textContent='请先在服务器运行 python server.py';$('.spinner').style.animationPlayState='paused'}
function joinQueue(){queueing=true;openModal('#queueModal');$('#queueTitle').textContent='寻找附近的球手...';$('.spinner').style.animationPlayState='running';ws.send(JSON.stringify({type:'queue'}))}
function handleMessage(m){
  if(m.type==='profile'){profile={...m.profile,token:m.token||profile.token};saveLocal();if(ws._queueAfter){ws._queueAfter=false;joinQueue()}}
  if(m.type==='queued'){$('#serverText').textContent=`已进入匹配池 · 当前 ${m.count} 人`}
  if(m.type==='match'){queueing=false;online=true;onlineYou=m.you;$('#queueModal').classList.add('hidden');showScreen('#match');resize();current=null;$('#p1name').textContent=m.players[m.you].name;$('#p2name').textContent=m.players[1-m.you].name;$('#p1gear').textContent=RACKETS[m.players[m.you].racket]?.name||'球拍';$('#p2gear').textContent=RACKETS[m.players[1-m.you].racket]?.name||'球拍';banner('匹配成功','服务器权威对战',1200)}
  if(m.type==='state'&&online){current=normaliseState(m,onlineYou);setScoreUI(current)}
  if(m.type==='notice')toast(m.text,2500);
  if(m.type==='gameover'){if(m.profile){profile={...m.profile,token:profile.token};saveLocal()}if(online)finishMatch(m.winner===onlineYou,m.detail||'真人排位赛')}
  if(m.type==='error'){toast(m.message||'操作失败');if(queueing)connectionFailed()}
}
function normaliseState(m,you=m.you){
  const flip=you===1,players=flip?[m.players[1],m.players[0]]:m.players.map(x=>({...x})),sh={...m.shuttle};
  if(flip){players.forEach((p,i)=>{p.x=W-p.x;p.vx=-p.vx;p.facing=-p.facing;p.side=i});sh.x=W-sh.x;sh.vx=-sh.vx}
  sh.trail=current?.shuttle?.trail||[];sh.trail.unshift({x:sh.x,y:sh.y});sh.trail=sh.trail.slice(0,12);return {players,shuttle:sh,scores:flip?[m.scores[1],m.scores[0]]:m.scores,games:flip?[m.games[1],m.games[0]]:m.games,gameNo:m.gameNo,you,phase:m.phase,serveReady:m.serveReady,server:flip?1-m.server:m.server,skills:flip?[m.skills?.[1],m.skills?.[0]]:m.skills,skillUsed:flip?[m.skillUsed?.[1],m.skillUsed?.[0]]:m.skillUsed,permanentSkills:flip?[m.permanentSkills?.[1],m.permanentSkills?.[0]]:m.permanentSkills,permanentCooldowns:flip?[m.permanentCooldowns?.[1],m.permanentCooldowns?.[0]]:m.permanentCooldowns}
}
function beep(freq,duration,vol=.05){if(!sound)return;try{const ac=beep.ac||(beep.ac=new AudioContext),o=ac.createOscillator(),g=ac.createGain();o.frequency.value=freq;o.type='triangle';g.gain.setValueAtTime(vol,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration);o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+duration)}catch{}}

$('#botMode').onclick=()=>openModal('#difficultyModal');$('#onlineMode').onclick=()=>{openModal('#queueModal');connectServer(true)};
$$('[data-open="shop"]').forEach(x=>x.addEventListener('click',()=>openModal('#shopModal')));$$('.close').forEach(x=>x.addEventListener('click',()=>closeModal(x)));$$('.difficulty').forEach(x=>x.onclick=()=>{$$('.difficulty').forEach(y=>y.classList.remove('selected'));x.classList.add('selected');selectedLevel=x.dataset.level});
$('#startBot').onclick=()=>startLocal(selectedLevel);$('#racketGrid').onclick=e=>{const b=e.target.closest('[data-racket]');if(b)buyOrEquip(b.dataset.racket)};$('#skillShopGrid').onclick=e=>{const buy=e.target.closest('[data-buy-skill]'),equip=e.target.closest('[data-equip-skill]');if(buy)buyOrEquipSkill(buy.dataset.buySkill,true);if(equip)buyOrEquipSkill(equip.dataset.equipSkill,false)};$('#permanentSkillGrid').onclick=e=>{const buy=e.target.closest('[data-buy-permanent]');if(buy)buyPermanentSkill(buy.dataset.buyPermanent)};$('#playerName').onchange=e=>{profile.name=e.target.value.trim().slice(0,12)||'球手';saveLocal();if(ws?.readyState===1)ws.send(JSON.stringify({type:'rename',name:profile.name}))};
$('#cancelQueue').onclick=()=>{queueing=false;if(ws?.readyState===1)ws.send(JSON.stringify({type:'cancel'}))};$('#leaveBtn').onclick=leaveMatch;$('#soundBtn').onclick=()=>{sound=!sound;$('#soundBtn').textContent=`声音 ${sound?'开':'关'}`};$('#playAgain').onclick=()=>{$('#resultModal').classList.add('hidden');if(online){current=null;showScreen('#home');joinQueue()}else startLocal(selectedLevel)};$('#backHome').onclick=()=>{$('#resultModal').classList.add('hidden');leaveMatch()};
addEventListener('resize',resize);updateProfile();resize();connectServer(false);requestAnimationFrame(loop);
