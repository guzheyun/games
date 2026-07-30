(() => {
'use strict';
const P=window.PoolPhysics,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const canvas=$('#table'),ctx=canvas.getContext('2d');
function syncCanvasResolution(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const dpr=Math.min(3,window.devicePixelRatio||1),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(canvas.width/P.W,0,0,canvas.height/P.H,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high'}
const CUES={ash:{name:'白蜡木练习杆',price:0,accuracy:1,color:['#8e5b32','#26130b']},maple:{name:'枫影',price:1200,accuracy:.72,color:['#ba7545','#422315']},carbon:{name:'黑曜碳纤',price:3600,accuracy:.43,color:['#252c2b','#080a0a']},master:{name:'鎏金宗师',price:8000,accuracy:.22,color:['#b88732','#281b0b']},jade:{name:'翡翠龙脊',price:12500,accuracy:.14,color:['#158064','#092c25']},nebula:{name:'星云幻影',price:20000,accuracy:.08,color:['#6249a5','#17112f']},crown:{name:'王冠·零度',price:32000,accuracy:.035,color:['#d8dce2','#33404c']}};
const DIFF={rookie:{name:'简单机器人',aim:5.2,power:.14,think:1300,reward:120},skilled:{name:'标准机器人',aim:2.1,power:.07,think:950,reward:260},master:{name:'困难机器人',aim:.7,power:.025,think:700,reward:450}};
const GAME_SAVE_KEY='ve_local_game_v1',GAME_SAVE_VERSION=1;
let profile=readProfile(),ws=null,reconnectTimer=0,mode=null,world=null,match=null,onlineIndex=0,botLevel='rookie';
let aim={x:750,y:300,angle:0},spin={x:0,y:0},lastFrame=performance.now(),aiTimer=0,toastTimer=0,nameReady=!!localStorage.getItem('ve_name');
let calledPocket=null,shotCallPocket=null,shotEightReady=false,shotRemainingBefore=0,cueAnimation=null,cueDrag=false,dragPointerAngle=0;
let cueSoundTimer=0,effects=[],ballVisuals=new Map(),gameType='eight',pendingGameType='eight',shotTargetIds=[];
const SNOOKER_REDS=Array.from({length:15},(_,i)=>i+1),SNOOKER_COLORS=[16,17,18,19,20],SNOOKER_CLEARANCE=[16,17,18,19,20,21],SNOOKER_SPOTS={16:[315,390],17:[315,210],18:[315,300],19:[550,300],20:[665,300],21:[890,300]};
const BALL_TEXTURE_SIZE=96,hexRgb=hex=>{const n=parseInt(hex.slice(1),16);return[n>>16,(n>>8)&255,n&255]},EIGHT_RGB=P.COLORS.map(hexRgb),SNOOKER_RGB=P.SNOOKER_COLORS.map(hexRgb);
function isSnooker(){return gameType==='snooker'}
function ballColor(id){return(isSnooker()?P.SNOOKER_COLORS:P.COLORS)[id]||'#888'}
function ballRgb(id){return(isSnooker()?SNOOKER_RGB:EIGHT_RGB)[id]||[136,136,136]}
function finalBallId(){return isSnooker()?21:8}
function ballName(id){if(!isSnooker())return`${id}号球`;if(id>=1&&id<=15)return'红球';return({16:'黄球',17:'绿球',18:'棕球',19:'蓝球',20:'粉球',21:'黑球'})[id]||'母球'}
function snookerValue(id){return id>=1&&id<=15?1:({16:2,17:3,18:4,19:5,20:6,21:7})[id]||0}

function multiplyQuaternion(a,b){return[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]]}
function orientationMatrix(q){const [w,x,y,z]=q,xx=x*x,yy=y*y,zz=z*z,xy=x*y,xz=x*z,yz=y*z,wx=w*x,wy=w*y,wz=w*z;return[1-2*(yy+zz),2*(xy-wz),2*(xz+wy),2*(xy+wz),1-2*(xx+zz),2*(yz-wx),2*(xz-wy),2*(yz+wx),1-2*(xx+yy)]}
function makeBallVisual(b){const texture=document.createElement('canvas');texture.width=texture.height=BALL_TEXTURE_SIZE;const textureCtx=texture.getContext('2d'),textureImage=textureCtx.createImageData(BALL_TEXTURE_SIZE,BALL_TEXTURE_SIZE);return{x:b.x,y:b.y,q:[1,0,0,0],matrix:orientationMatrix([1,0,0,0]),texture,textureCtx,textureImage,lastTime:performance.now(),dirty:true}}
function rotateBallVisual(v,ax,ay,az,angle){if(Math.abs(angle)<.00001)return;const half=angle/2,s=Math.sin(half),dq=[Math.cos(half),ax*s,ay*s,az*s],q=multiplyQuaternion(dq,v.q),length=Math.hypot(...q);v.q=q.map(n=>n/length);v.matrix=orientationMatrix(v.q);v.dirty=true}
function rollBallVisual(v,dx,dy,distance){if(distance<=.0001)return;rotateBallVisual(v,-dy/distance,dx/distance,0,distance/P.R)}
function applyCueSpinVisual(v,b,dt,speed){if(speed<5||dt<=0)return;const side=b.spinX||0,follow=b.spinY||0;if(Math.abs(follow)>.001)rotateBallVisual(v,-b.vy/speed,b.vx/speed,0,follow*dt*5.5);if(Math.abs(side)>.001)rotateBallVisual(v,0,0,1,side*dt*7)}
function updateBallTexture(id,v){if(!v.dirty)return;const data=v.textureImage.data,m=v.matrix,col=ballRgb(id),white=id===0?[246,243,232]:[244,239,227],patch=[248,244,234];for(let py=0;py<BALL_TEXTURE_SIZE;py++)for(let px=0;px<BALL_TEXTURE_SIZE;px++){const i=(py*BALL_TEXTURE_SIZE+px)*4,nx=(px+.5)*2/BALL_TEXTURE_SIZE-1,ny=(py+.5)*2/BALL_TEXTURE_SIZE-1,r2=nx*nx+ny*ny;if(r2>1){data[i+3]=0;continue}const nz=Math.sqrt(1-r2),lx=m[0]*nx+m[3]*ny+m[6]*nz,ly=m[1]*nx+m[4]*ny+m[7]*nz,lz=m[2]*nx+m[5]*ny+m[8]*nz;let rgb;if(id===0)rgb=Math.max(Math.abs(lx),Math.abs(ly),Math.abs(lz))>.972?[194,45,45]:white;else if(isSnooker())rgb=col;else if(Math.abs(lz)>.89)rgb=patch;else rgb=id>=9?(Math.abs(ly)<.52?col:white):col;data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];data[i+3]=255}v.textureCtx.putImageData(v.textureImage,0,0);v.dirty=false}

const audio={
  enabled:localStorage.getItem('ve_sound')!=='off',volume:.9,ctx:null,master:null,noiseBuffer:null,lastBall:0,lastRail:0,
  init(){if(this.ctx)return true;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=this.enabled ? this.volume : 0;this.master.connect(this.ctx.destination);this.noiseBuffer=this.ctx.createBuffer(1,Math.ceil(this.ctx.sampleRate*.3),this.ctx.sampleRate);const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;return true},
  wake(){if(!this.enabled||!this.init())return false;if(this.ctx.state==='suspended')this.ctx.resume();return true},
  tone(from,to,duration,gain,type='sine',delay=0){if(!this.wake())return;const now=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(from,now);o.frequency.exponentialRampToValueAtTime(Math.max(20,to),now+duration);g.gain.setValueAtTime(Math.max(.0001,gain),now);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g).connect(this.master);o.start(now);o.stop(now+duration+.01)},
  noise(duration,gain,frequency,type='bandpass',delay=0){if(!this.wake())return;const now=this.ctx.currentTime+delay,s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();s.buffer=this.noiseBuffer;f.type=type;f.frequency.value=frequency;f.Q.value=.7;g.gain.setValueAtTime(Math.max(.0001,gain),now);g.gain.exponentialRampToValueAtTime(.0001,now+duration);s.connect(f).connect(g).connect(this.master);s.start(now);s.stop(now+duration+.01)},
  cue(power=.5){const v=.045+power*.07;this.noise(.045,v,1100);this.tone(210+power*70,75,.065,v*.8,'triangle')},
  ball(strength=.4){const now=performance.now();if(now-this.lastBall<22)return;this.lastBall=now;const v=.018+strength*.075;this.tone(1750+Math.random()*180,780,.035,v,'sine');this.noise(.025,v*.28,2400)},
  rail(strength=.4){const now=performance.now();if(now-this.lastRail<35)return;this.lastRail=now;const v=.018+strength*.055;this.noise(.055,v,520,'bandpass');this.tone(310,145,.05,v*.55,'triangle')},
  pocket(strength=.5,delay=0){const v=.055+strength*.055;this.noise(.2,v,260,'lowpass',delay);this.tone(145,68,.22,v*.72,'sine',delay);this.tone(92,48,.26,v*.45,'triangle',delay+.025)},
  result(win){if(win){[392,494,587].forEach((n,i)=>this.tone(n,n*1.01,.34,.035,'sine',i*.09))}else{this.tone(190,82,.48,.055,'triangle')}},
  consume(events){if(!events?.length)return;let ball=0,rail=0,pockets=0;for(const e of events){if(e.type==='ball')ball=Math.max(ball,e.strength);else if(e.type==='rail')rail=Math.max(rail,e.strength);else if(e.type==='pocket'){this.pocket(e.strength,pockets++*.045)}}if(ball)this.ball(ball);if(rail)this.rail(rail)},
  fromOnlineState(previous,next,skipImpacts){if(!previous?.length)return;const old=new Map(previous.map(b=>[b.id,b]));let ball=0,rail=0,pockets=0;for(const v of next){const a=old.get(v[0]);if(!a)continue;const speed=Math.hypot(a.vx,a.vy);if(v[5]&&!a.pocketed){this.pocket(Math.min(1,speed/700),pockets++*.045);const pi=P.POCKETS.reduce((best,p,i)=>{const d=Math.hypot(p.x-a.x,p.y-a.y);return d<best.d?{d,i}:best},{d:1e9,i:0}).i;spawnPocket(v[0],a.x,a.y,pi);continue}if(skipImpacts||v[5]||a.pocketed)continue;const nearX=v[1]<P.LEFT+P.R+9||v[1]>P.RIGHT-P.R-9,nearY=v[2]<P.TOP+P.R+9||v[2]>P.BOTTOM-P.R-9,reversed=(a.vx*v[3]<0&&nearX)||(a.vy*v[4]<0&&nearY),change=Math.hypot(v[3]-a.vx,v[4]-a.vy);if(reversed)rail=Math.max(rail,Math.min(1,change/900));else if(change>85)ball=Math.max(ball,Math.min(1,change/900))}if(ball)this.ball(ball);if(rail)this.rail(rail)},
  setEnabled(on){this.enabled=on;localStorage.setItem('ve_sound',on?'on':'off');if(on)this.wake();if(this.master){this.master.gain.cancelScheduledValues(this.ctx.currentTime);this.master.gain.setTargetAtTime(on ? this.volume : 0,this.ctx.currentTime,.015)}updateSoundButtons()}
};

function updateSoundButtons(){$$('.sound-btn').forEach(b=>{b.classList.toggle('muted',!audio.enabled);b.querySelector('span').textContent=audio.enabled?'🔊':'🔇';b.title=b.ariaLabel=audio.enabled?'关闭音效':'开启音效'})}

function readProfile(){try{const p=JSON.parse(localStorage.getItem('ve_profile'));if(p)return p}catch(e){}return{name:localStorage.getItem('ve_name')||'',wins:0,coins:1500,inventory:['ash'],equipped:'ash'};}
function saveLocal(){localStorage.setItem('ve_profile',JSON.stringify(profile));localStorage.setItem('ve_name',profile.name);}
function readGameSave(){try{const data=JSON.parse(localStorage.getItem(GAME_SAVE_KEY)),savedType=data?.gameType==='snooker'?'snooker':'eight',ballCount=savedType==='snooker'?22:16;if(data?.version!==GAME_SAVE_VERSION||!DIFF[data.botLevel]||!Array.isArray(data.balls)||data.balls.length!==ballCount||!Array.isArray(data.match?.players)||data.match.players.length!==2)throw new Error('invalid save');data.gameType=savedType;return data}catch(e){localStorage.removeItem(GAME_SAVE_KEY);return null}}
function formatSaveTime(time){const d=new Date(time);if(Number.isNaN(d.getTime()))return '自动存档';return `保存于 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
function refreshContinue(){const data=readGameSave(),btn=$('#continueBtn');btn.classList.toggle('hidden',!data);if(data)$('#continueMeta').textContent=`${data.gameType==='snooker'?'斯诺克':'中式八球'} · ${DIFF[data.botLevel].name} · ${formatSaveTime(data.savedAt)}`}
function updateSaveControls(savedAt){const btn=$('#saveGameBtn');if(!btn)return;btn.classList.toggle('hidden',mode!=='local');btn.disabled=mode==='local'&&(!match||match.phase!=='aim'||world?.active);if(savedAt){$('#saveStatus').textContent=formatSaveTime(savedAt).replace('保存于 ','');btn.classList.add('saved');clearTimeout(btn._savedTimer);btn._savedTimer=setTimeout(()=>btn.classList.remove('saved'),900)}else if(mode==='local')$('#saveStatus').textContent=btn.disabled?'本杆结束后保存':'自动存档'}
function saveLocalGame(notify=false){if(mode!=='local'||!match||!world||match.phase!=='aim'||world.active)return false;const data={version:GAME_SAVE_VERSION,savedAt:Date.now(),gameType,botLevel,balls:world.state(),match:{players:match.players.map(p=>({...p})),turn:match.turn,phase:'aim',breaking:!!match.breaking,ballInHand:match.ballInHand},aim:{...aim},spin:{...spin},power:+$('#power').value,calledPocket};try{localStorage.setItem(GAME_SAVE_KEY,JSON.stringify(data));refreshContinue();updateSaveControls(data.savedAt);if(notify)toast('球局已保存');return true}catch(e){if(notify)toast('存档失败：浏览器存储不可用');return false}}
function clearLocalGameSave(){localStorage.removeItem(GAME_SAVE_KEY);refreshContinue()}
function gaussian(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function cue(){return CUES[profile.equipped]||CUES.ash}
function toast(s){const e=$('#toast');e.textContent=s;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),2300)}
function modal(id,on=true){$(id).classList.toggle('hidden',!on)}
function closeModals(){$$('.modal').forEach(e=>e.classList.add('hidden'))}
function setScreen(game){$('#lobby').classList.toggle('hidden',game);$('#game').classList.toggle('hidden',!game);$('#game').classList.toggle('snooker-mode',!!game&&isSnooker())}

function refreshLobby(){
  $('#playerName').textContent=profile.name||'球手';$('#winCount').textContent=profile.wins||0;$('#coinCount').textContent=profile.coins||0;
  $('#equippedText').textContent='正在使用 · '+cue().name;$('#cueLabel').textContent=cue().name;renderShop();updateAccuracy();refreshContinue();
}
function renderShop(){
  const tiers=['CLASSIC','REFINED','CARBON','PRESTIGE','MYTHIC','CELESTIAL','ULTIMATE'];
  $('#cueShop').innerHTML=Object.entries(CUES).map(([id,c],i)=>{const own=profile.inventory.includes(id),selected=profile.equipped===id,quality=Math.round((1-c.accuracy*.72)*100),deviation=(.24+c.accuracy*1.9).toFixed(1);
    return `<article class="cue-item ${selected?'selected':''} ${i>=4?'advanced':''}"><small>0${i+1} / ${tiers[i]}</small><div class="cue-art" style="--wood:${c.color[0]};--dark:${c.color[1]}"><i></i></div><h3>${c.name}</h3><div class="cue-stat"><div><span>稳定度</span><b>${quality}</b></div><i><em style="width:${quality}%"></em></i></div><div class="cue-deviation"><span>瞄准偏差</span><b>± ${deviation}°</b></div><button data-cue="${id}" ${selected?'disabled':''}>${selected?'使用中':own?'装备':'◈ '+c.price}</button></article>`}).join('');
  $$('#cueShop button[data-cue]').forEach(b=>b.onclick=()=>shopAction(b.dataset.cue));
}
function shopAction(id){const c=CUES[id];if(profile.inventory.includes(id)){profile.equipped=id;saveLocal();if(ws?.readyState===1)send({type:'equip',cue:id});refreshLobby();toast('已装备 '+c.name)}else if((profile.coins||0)>=c.price){if(ws?.readyState===1)send({type:'buy',cue:id});else{profile.coins-=c.price;profile.inventory.push(id);saveLocal();refreshLobby()}toast('已购买 '+c.name)}else toast('筹码不足');}

function connect(){
  clearTimeout(reconnectTimer);const custom=new URLSearchParams(location.search).get('ws');const host=location.hostname||'127.0.0.1';const url=custom||`${location.protocol==='https:'?'wss':'ws'}://${host}:8765`;
  try{ws=new WebSocket(url)}catch(e){return retryNet()}
  ws.onopen=()=>{setNet(true);if(nameReady)send({type:'hello',name:profile.name,token:localStorage.getItem('ve_token')||''})};
  ws.onmessage=e=>{try{netMessage(JSON.parse(e.data))}catch(err){console.error(err)}};
  ws.onclose=()=>{setNet(false);retryNet()};ws.onerror=()=>setNet(false);
}
function retryNet(){clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connect,2200)}
function setNet(on){$('#netDot').classList.toggle('online',on);$('#netText').textContent=on?'局域网球房已连接':'球房离线 · 可单机'}
function send(o){if(ws?.readyState===1)ws.send(JSON.stringify(o))}
function netMessage(d){
  if(d.type==='profile'){localStorage.setItem('ve_token',d.token);profile={...profile,...d.profile};saveLocal();refreshLobby();return}
  if(d.type==='queued'){$('#queueText').textContent=`等待队列中 · 当前 ${d.count} 人`;return}
  if(d.type==='match'){onlineIndex=d.you;startOnline(d);return}
  if(d.type==='state'&&mode==='online'){applyNetState(d);if(d.notice)notice(d.notice);return}
  if(d.type==='shot'&&mode==='online'){aim.angle=d.angle;match.phase='striking';startCueAnimation(d.angle,d.power,d.by);updateGameUI();return}
  if(d.type==='shotRejected'&&mode==='online'){match.phase='aim';notice(d.text);updateGameUI();return}
  if(d.type==='notice'){notice(d.text);return}
  if(d.type==='gameover'&&mode==='online'){
    if(d.profiles?.[onlineIndex]){profile={...profile,...d.profiles[onlineIndex]};saveLocal();refreshLobby()}
    showResult(d.winner===onlineIndex,d.reason);return;
  }
}

function startLocal(level,type=pendingGameType){
  closeModals();mode='local';gameType=type==='snooker'?'snooker':'eight';botLevel=level;world=new P.World(isSnooker()?P.rackSnooker():P.rack(Date.now()));match={players:[{name:profile.name||'球手',cue:profile.equipped,group:null,score:0},{name:DIFF[level].name,cue:'master',group:null,score:0}],turn:0,phase:'aim',breaking:true,ballInHand:null,balls:world.state()};
  spin={x:0,y:0};calledPocket=null;shotTargetIds=[];effects=[];ballVisuals.clear();setSpinPoint();setScreen(true);$('#connectionBadge').textContent=`单机 · ${isSnooker()?'斯诺克':'中式八球'} · ${DIFF[level].name}`;updateGameUI();saveLocalGame();notice(isSnooker()?'由你开球 · 先击打红球':'由你开球 · 按住球杆拖动瞄准');
}
function restoreLocal(){const data=readGameSave();if(!data)return toast('没有可继续的球局');closeModals();clearTimeout(aiTimer);mode='local';gameType=data.gameType;botLevel=data.botLevel;world=new P.World();world.loadState(data.balls);match={players:data.match.players.map(p=>({...p,score:Number.isFinite(p.score)?p.score:0})),turn:data.match.turn,phase:'aim',breaking:!!data.match.breaking,ballInHand:data.match.ballInHand};match.players[0].name=profile.name||match.players[0].name;aim=data.aim&&Number.isFinite(data.aim.angle)?{...data.aim}:{x:750,y:300,angle:0};spin=data.spin&&Number.isFinite(data.spin.x)?{...data.spin}:{x:0,y:0};calledPocket=Number.isInteger(data.calledPocket)?data.calledPocket:null;shotTargetIds=[];effects=[];ballVisuals.clear();$('#power').value=Number.isFinite(data.power)?data.power:58;$('#powerValue').textContent=$('#power').value+'%';setSpinPoint();setScreen(true);$('#connectionBadge').textContent=`单机 · ${isSnooker()?'斯诺克':'中式八球'} · ${DIFF[botLevel].name}`;updateGameUI();updateSaveControls(data.savedAt);notice('已读取自动存档');if(match.turn===1)scheduleAI()}
function startOnline(d){
  closeModals();mode='online';gameType='eight';world=new P.World();match=d;world.loadState(d.balls);spin={x:0,y:0};calledPocket=null;effects=[];ballVisuals.clear();setSpinPoint();setScreen(true);$('#connectionBadge').textContent='● 局域网实时对战 · 中式八球';updateGameUI();updateSaveControls();notice(onlineIndex===d.turn?'由你开球 · 按住球杆拖动瞄准':'对手开球');
}
function applyNetState(d){const was=match?.phase,previous=world.balls.map(b=>({...b}));audio.fromOnlineState(previous,d.balls,was!=='moving'&&d.phase==='moving');match={...match,...d};world.loadState(d.balls);if(was!=='aim'&&d.phase==='aim')calledPocket=null;updateGameUI()}
function myTurn(){return match&&match.turn===(mode==='online'?onlineIndex:0)}
function canAim(){return myTurn()&&match.phase==='aim'&&match.ballInHand==null}
function needsPocketCall(idx=mode==='online'?onlineIndex:0){if(isSnooker())return legalTargetIds(idx)[0]===21;const g=match?.players?.[idx]?.group;return !!(g&&remaining(g)===0)}
function canShoot(){return canAim()&&(!needsPocketCall()||calledPocket!==null)}
function groupLabel(g){if(isSnooker())return'共同目标';return g==='solid'?'全色球':g==='stripe'?'花色球':'开放球台'}
function snookerTargetIds(){const reds=SNOOKER_REDS.filter(id=>!world.balls[id]?.pocketed);if(reds.length)return reds;const next=SNOOKER_CLEARANCE.find(id=>!world.balls[id]?.pocketed);return next?[next]:[]}
function legalTargetIds(idx=mode==='online'?onlineIndex:0){if(!match||!world)return[];if(isSnooker())return snookerTargetIds();const g=match.players[idx]?.group,groupIds=g==='solid'?[1,2,3,4,5,6,7]:g==='stripe'?[9,10,11,12,13,14,15]:null;if(!groupIds)return Array.from({length:15},(_,i)=>i+1).filter(n=>n!==8&&!world.balls[n]?.pocketed);const left=groupIds.filter(n=>!world.balls[n]?.pocketed);return left.length?left:world.balls[8]?.pocketed?[]:[8]}
function isLegalTarget(id,idx=mode==='online'?onlineIndex:0){return legalTargetIds(idx).includes(id)}
function updateGameUI(){
  if(!match)return;for(let i=0;i<2;i++){const p=match.players[i];$(`#p${i}Name`).textContent=p.name;$(`#p${i}Group`).textContent=groupLabel(p.group);$(`#p${i}Card`).classList.toggle('active',match.turn===i)}
  $('#p0Score').textContent=match.players[0]?.score||0;$('#p1Score').textContent=match.players[1]?.score||0;$('#scoreLine').classList.toggle('hidden',!isSnooker());$('#versusMark').classList.toggle('hidden',isSnooker());
  if(calledPocket===null)$$('#callPocket button').forEach(b=>b.classList.remove('selected'));
  const mine=mode==='online'?onlineIndex:0;$('#turnText').textContent=match.phase==='moving'?'球在滚动':match.phase==='striking'||match.phase==='pending'?'正在出杆':match.turn===mine?'你的回合':'对手回合';$('#shootBtn').disabled=!canShoot();$('#shootBtn').classList.toggle('striking',match.phase==='striking');renderAllBalls();updateSaveControls();
  const needCall=myTurn()&&match.phase==='aim'&&needsPocketCall(mine);$('#callPocket').classList.toggle('hidden',!needCall);$('#callPocketTitle').textContent=isSnooker()?'黑球指定袋':'黑八指定袋';
  const snookerTarget=legalTargetIds(mine)[0],hint=match.ballInHand===mine?'自由球：点击球台任意合法位置放置母球':isSnooker()?(needCall?'斯诺克 · 指定袋口后击打黑球':`斯诺克 · 当前目标：${ballName(snookerTarget)}`):(needCall?'已清台 · 指定袋口后击打黑八':match.players[mine].group?`中式八球 · 目标：${groupLabel(match.players[mine].group)}`:'中式八球 · 开放球台，首颗合法进球定组');$('#ruleHint').textContent=hint;
}
function renderAllBalls(){if(!world)return;const mine=mode==='online'?onlineIndex:0,g=match.players[mine].group,targets=legalTargetIds(mine),targetSet=new Set(targets),ids=world.balls.filter(b=>b.id).map(b=>b.id);$('#targetLabel').textContent=isSnooker()?`当前目标 · ${ballName(targets[0])}`:`你的目标 · ${g?(targets[0]===8?'黑八':groupLabel(g)):'开放球台'}`;$('#allBalls').innerHTML=ids.map(n=>{const potted=world.balls[n]?.pocketed,target=targetSet.has(n),label=isSnooker()?(n<=15?'':ballName(n)[0]):n;return `<i class="mini-ball ${n===finalBallId()?'eight':!isSnooker()&&n>=9?'stripe':'solid'} ${potted?'potted':target?'legal-target':'not-target'}" style="--c:${ballColor(n)}" title="${ballName(n)}${potted?'（已进袋）':target?'（当前目标）':'（非当前目标）'}">${label}</i>`}).join('')}
function updateAccuracy(){const c=cue(),deg=.24+c.accuracy*1.9;$('#accuracyText').textContent=`± ${deg.toFixed(1)}°`;$('#accuracyBar').style.width=(100-c.accuracy*58)+'%'}
function notice(s){const e=$('#tableNotice');e.textContent=s;e.classList.remove('hidden');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.add('hidden'),2600)}

function shoot(){
  if(!canShoot())return;const p=+$('#power').value/100;
  shotTargetIds=legalTargetIds(match.turn);shotEightReady=needsPocketCall();shotRemainingBefore=!isSnooker()&&match.players[0].group?remaining(match.players[0].group):0;shotCallPocket=calledPocket;
  if(mode==='online'){match.phase='pending';updateGameUI();send({type:'shot',angle:aim.angle,power:p,spinX:spin.x,spinY:spin.y,calledPocket});resetSpin()}
  else{
    const a=cue().accuracy,angleErr=gaussian()*(.24+a*1.9)*Math.PI/180,powerErr=gaussian()*(.012+a*.055),spinErr=.018+a*.085;
    const actualP=Math.max(.03,Math.min(1,p+powerErr)),sx=Math.max(-1,Math.min(1,spin.x+gaussian()*spinErr)),sy=Math.max(-1,Math.min(1,spin.y+gaussian()*spinErr));
    const actualAngle=aim.angle+angleErr;resetSpin();match.phase='striking';startCueAnimation(actualAngle,actualP,0);updateGameUI();
    setTimeout(()=>{if(mode!=='local'||match?.phase!=='striking')return;if(world.beginShot(actualAngle,actualP,sx,sy,0)){match.phase='moving';updateGameUI()}},300);
  }
}
function startCueAnimation(angle,power,by=match?.turn||0){cueAnimation={angle,power,by,start:performance.now(),duration:300};clearTimeout(cueSoundTimer);cueSoundTimer=setTimeout(()=>audio.cue(power),275)}

function remaining(group){const ids=group==='solid'?[1,2,3,4,5,6,7]:[9,10,11,12,13,14,15];return ids.filter(i=>!world.balls[i].pocketed).length}
function respotSnookerBall(id){const b=world.balls[id],spot=SNOOKER_SPOTS[id];if(!b||!spot)return;let placed=null;for(let radius=0;radius<=90&&!placed;radius+=15){const steps=radius?12:1;for(let i=0;i<steps;i++){const x=spot[0]+Math.cos(i*Math.PI*2/steps)*radius,y=spot[1]+Math.sin(i*Math.PI*2/steps)*radius,clear=world.balls.every(o=>o===b||o.pocketed||Math.hypot(o.x-x,o.y-y)>=P.R*2+.5);if(clear&&x>P.LEFT+P.R&&x<P.RIGHT-P.R&&y>P.TOP+P.R&&y<P.BOTTOM-P.R){placed=[x,y];break}}}if(placed){b.x=placed[0];b.y=placed[1];b.vx=b.vy=0;b.pocketed=false;ballVisuals.delete(id)}}
function settleSnooker(e){
  const shooter=match.turn,other=1-shooter,potted=[...e.pocketed],targets=shotTargetIds.length?shotTargetIds:legalTargetIds(shooter),targetSet=new Set(targets),wasBreak=match.breaking;let foul='';
  if(e.scratch)foul='母球落袋';else if(e.firstHit==null)foul='未碰到目标球';else if(!targetSet.has(e.firstHit))foul=`应先击打${ballName(targets[0])}`;else if(potted.some(id=>id>=16&&id<=20&&!targetSet.has(id)))foul='非目标彩球落袋';else if(!potted.length&&!e.railAfterContact)foul='碰球后无球碰库';
  if(wasBreak&&!potted.length&&(e.railBalls||[]).filter(n=>n).length<4)foul='开球未满足四颗球碰库';
  if(potted.includes(21)){const actualPocket=(e.pocketedAt||[]).find(v=>v[0]===21)?.[1],legal=targetSet.has(21)&&!foul&&shotCallPocket===actualPocket;if(legal)match.players[shooter].score=(match.players[shooter].score||0)+snookerValue(21);updateGameUI();const reason=legal?'指定袋打进黑球':targetSet.has(21)?'黑球进入非指定袋':'提前打进黑球';showResult((legal?shooter:other)===0,`${reason} · 比分 ${match.players[0].score||0}:${match.players[1].score||0}`);return}
  for(const id of potted)if(id>=16&&id<=20&&!targetSet.has(id))respotSnookerBall(id);
  const own=potted.some(id=>targetSet.has(id));if(!foul&&own)match.players[shooter].score=(match.players[shooter].score||0)+potted.filter(id=>targetSet.has(id)).reduce((sum,id)=>sum+snookerValue(id),0);
  match.breaking=false;if(foul){match.turn=other;match.ballInHand=other;world.cue().pocketed=true;notice('犯规 · '+foul)}else if(!own){match.turn=other;notice('未进目标球 · 交换球权')}else notice(`打进${ballName(targets[0])} · 得分 ${match.players[shooter].score} · 继续击球`);
  match.phase='aim';calledPocket=null;shotTargetIds=[];updateGameUI();saveLocalGame();if(match.turn===1)scheduleAI()
}
function settleLocal(e){
  if(isSnooker())return settleSnooker(e);
  const shooter=match.turn,other=1-shooter,potted=[...e.pocketed],target=match.players[shooter].group,wasBreak=match.breaking;let foul='';
  if(e.scratch)foul='母球落袋';else if(e.firstHit==null)foul='未碰到目标球';
  else if(target&&shotRemainingBefore>0&&((target==='solid'&&!(e.firstHit>=1&&e.firstHit<=7))||(target==='stripe'&&!(e.firstHit>=9&&e.firstHit<=15))))foul='先碰到了错误球组';
  else if(target&&shotEightReady&&e.firstHit!==8)foul='清台后应先击打黑八';else if(!target&&e.firstHit===8)foul='开放球台不可先击打黑八';else if(!potted.length&&!e.railAfterContact)foul='碰球后无球碰库';
  if(match.breaking&&!potted.length&&(e.railBalls||[]).filter(n=>n).length<4)foul='开球未满足四颗目标球碰库';
  if(potted.includes(8)){
    if(wasBreak){world.reset(Date.now());ballVisuals.clear();match.players[0].group=match.players[1].group=null;match.turn=foul?other:shooter;match.breaking=true;match.ballInHand=null;match.phase='aim';calledPocket=null;notice('黑八开球入袋 · '+(foul?'由对手开球':'重新开球'));updateGameUI();saveLocalGame();if(match.turn===1)scheduleAI();return}
    const actualPocket=(e.pocketedAt||[]).find(v=>v[0]===8)?.[1],legal=!foul&&shotEightReady&&shotCallPocket===actualPocket;
    const reason=legal?'指定袋打进黑八':shotEightReady&&!foul?'黑八进入非指定袋':'违规打进黑八';showResult((legal?shooter:other)===0,reason);return;
  }
  if(!foul&&!wasBreak&&!match.players[0].group){const contacted=e.firstHit>=1&&e.firstHit<=7?'solid':e.firstHit>=9&&e.firstHit<=15?'stripe':null,claimed=contacted&&potted.some(n=>contacted==='solid'?n>=1&&n<=7:n>=9&&n<=15);if(claimed){match.players[shooter].group=contacted;match.players[other].group=contacted==='solid'?'stripe':'solid'}}
  let own=potted.some(n=>(match.players[shooter].group==='solid'&&n>=1&&n<=7)||(match.players[shooter].group==='stripe'&&n>=9&&n<=15));if(!match.players[shooter].group)own=potted.some(n=>n!==0&&n!==8);
  match.breaking=false;if(foul){match.turn=other;match.ballInHand=other;world.cue().pocketed=true;notice('犯规 · '+foul)}else if(!own){match.turn=other;notice('未进目标球 · 交换球权')}else notice('合法进球 · 继续击球');
  match.phase='aim';calledPocket=null;updateGameUI();saveLocalGame();if(match.turn===1)scheduleAI();
}

function allowedBalls(idx){if(isSnooker())return legalTargetIds(idx);const g=match.players[idx].group;if(g){const list=(g==='solid'?[1,2,3,4,5,6,7]:[9,10,11,12,13,14,15]).filter(i=>!world.balls[i].pocketed);return list.length?list:[8]}return [...Array(15)].map((_,i)=>i+1).filter(i=>i!==8&&!world.balls[i].pocketed)}
function clearPath(ax,ay,bx,by,ignore){const vx=bx-ax,vy=by-ay,l2=vx*vx+vy*vy;for(const b of world.balls){if(b.pocketed||ignore.includes(b.id)||b.id===0)continue;const t=Math.max(0,Math.min(1,((b.x-ax)*vx+(b.y-ay)*vy)/l2)),x=ax+vx*t,y=ay+vy*t;if(Math.hypot(b.x-x,b.y-y)<P.R*2+1)return false}return true}
function chooseAI(){
  const c=world.cue(),level=DIFF[botLevel],targets=allowedBalls(1);let best=null;
  for(const id of targets){const b=world.balls[id];for(const [pocketIndex,pocket] of P.POCKETS.entries()){const px=pocket.x-b.x,py=pocket.y-b.y,d=Math.hypot(px,py),ux=px/d,uy=py/d,gx=b.x-ux*P.R*2,gy=b.y-uy*P.R*2;if(gx<P.LEFT+P.R||gx>P.RIGHT-P.R||gy<P.TOP+P.R||gy>P.BOTTOM-P.R)continue;if(!clearPath(b.x,b.y,pocket.x,pocket.y,[id])||!clearPath(c.x,c.y,gx,gy,[id]))continue;const cut=Math.abs(Math.atan2(uy,ux)-Math.atan2(b.y-c.y,b.x-c.x));const score=Math.hypot(gx-c.x,gy-c.y)+d*.55+Math.min(cut,Math.PI*2-cut)*180;if(!best||score<best.score)best={angle:Math.atan2(gy-c.y,gx-c.x),distance:Math.hypot(gx-c.x,gy-c.y)+d,score,pocket:pocketIndex}}}
  if(!best){const b=world.balls[targets[Math.floor(Math.random()*targets.length)]],pocket=P.POCKETS.map((p,i)=>({i,d:Math.hypot(p.x-b.x,p.y-b.y)})).sort((a,z)=>a.d-z.d)[0];best={angle:Math.atan2(b.y-c.y,b.x-c.x),distance:Math.hypot(b.x-c.x,b.y-c.y),pocket:pocket.i}}
  const angle=best.angle+gaussian()*level.aim*Math.PI/180,power=Math.max(.25,Math.min(.94,.3+best.distance/1250+gaussian()*level.power));return{angle,power,pocket:best.pocket,spinX:botLevel==='master'?(Math.random()-.5)*.22:0,spinY:botLevel==='master'?.18:0};
}
function scheduleAI(){clearTimeout(aiTimer);if(match.ballInHand===1){aiTimer=setTimeout(()=>{if(mode!=='local'||match?.turn!==1)return;for(let n=0;n<60;n++){const x=230+Math.random()*430,y=120+Math.random()*360;if(world.placeCue(x,y)){match.ballInHand=null;break}}updateGameUI();saveLocalGame();scheduleAI()},600);return}aiTimer=setTimeout(()=>{if(mode!=='local'||match.turn!==1||match.phase!=='aim')return;const s=chooseAI(),g=match.players[1].group;shotTargetIds=legalTargetIds(1);shotRemainingBefore=!isSnooker()&&g?remaining(g):0;shotEightReady=needsPocketCall(1);shotCallPocket=shotEightReady?s.pocket:null;aim.angle=s.angle;match.phase='striking';startCueAnimation(s.angle,s.power,1);updateGameUI();setTimeout(()=>{if(mode==='local'&&match?.phase==='striking'&&world.beginShot(s.angle,s.power,s.spinX,s.spinY,0)){match.phase='moving';updateGameUI()}},300)},DIFF[botLevel].think)}

function showResult(win,reason){clearTimeout(aiTimer);let reward=0;if(mode==='local'){clearLocalGameSave();if(win&&match&&!match.rewardGranted){reward=DIFF[botLevel]?.reward||0;match.rewardGranted=true;profile.coins=(profile.coins||0)+reward;saveLocal();$('#coinCount').textContent=profile.coins}}audio.result(win);$('#resultIcon').textContent=win?'🏆':'◆';$('#resultTitle').textContent=win?'漂亮的胜利':'本局落败';$('#resultReason').textContent=reward?`${reason} · 获得 ◈ ${reward} 筹码`:reason;modal('#resultModal',true)}
function backLobby(){if(mode==='local')saveLocalGame();clearTimeout(aiTimer);closeModals();mode=null;match=null;world=null;setScreen(false);refreshLobby()}

function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*P.W/r.width,y:(e.clientY-r.top)*P.H/r.height}}
function wrapAngle(v){while(v>Math.PI)v-=Math.PI*2;while(v<-Math.PI)v+=Math.PI*2;return v}
function cueHit(q){if(!world)return false;const c=world.cue(),dx=q.x-c.x,dy=q.y-c.y,ux=Math.cos(aim.angle),uy=Math.sin(aim.angle),along=dx*ux+dy*uy,perp=Math.abs(dx*uy-dy*ux);return along<-15&&along>-540&&perp<28}
function clickedObjectBall(q){let found=null,distance=P.R*1.65;for(const b of world?.balls||[]){if(b.id===0||b.pocketed)continue;const d=Math.hypot(q.x-b.x,q.y-b.y);if(d<=distance){found=b;distance=d}}return found}
canvas.addEventListener('pointermove',e=>{const q=canvasPoint(e);aim.x=q.x;aim.y=q.y;if(cueDrag&&world){const c=world.cue(),a=Math.atan2(q.y-c.y,q.x-c.x),delta=wrapAngle(a-dragPointerAngle);aim.angle=wrapAngle(aim.angle+delta*.48);dragPointerAngle=a}});
canvas.addEventListener('pointerdown',e=>{if(!match||match.phase!=='aim')return;const q=canvasPoint(e),mine=mode==='online'?onlineIndex:0;aim.x=q.x;aim.y=q.y;if(match.ballInHand===mine){if(mode==='online')send({type:'place',x:q.x,y:q.y});else if(world.placeCue(q.x,q.y)){match.ballInHand=null;updateGameUI();saveLocalGame();notice('母球已放置')}return}const target=canAim()&&clickedObjectBall(q);if(target){const c=world.cue(),legal=isLegalTarget(target.id,mine),name=ballName(target.id);aim.angle=Math.atan2(target.y-c.y,target.x-c.x);notice(legal?`已对准${name}`:`${name}不是当前目标`);return}if(canAim()&&cueHit(q)){cueDrag=true;dragPointerAngle=Math.atan2(q.y-world.cue().y,q.x-world.cue().x);canvas.setPointerCapture(e.pointerId)}});
canvas.addEventListener('pointerup',()=>cueDrag=false);canvas.addEventListener('pointercancel',()=>cueDrag=false);
function setSpinFrom(e){const r=$('#spinPad').getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.36),y=(e.clientY-r.top-r.height/2)/(r.height*.36),l=Math.hypot(x,y),f=l>1?1/l:1;spin.x=x*f;spin.y=-y*f;setSpinPoint()}
let spinDrag=false;$('#spinPad').onpointerdown=e=>{spinDrag=true;$('#spinPad').setPointerCapture(e.pointerId);setSpinFrom(e)};$('#spinPad').onpointermove=e=>{if(spinDrag)setSpinFrom(e)};$('#spinPad').onpointerup=()=>spinDrag=false;
function setSpinPoint(){const pad=$('#spinPad');$('#spinPoint').style.left=(46.5+spin.x*39)+'px';$('#spinPoint').style.top=(46.5-spin.y*39)+'px';$$('[data-spin-y]').forEach(b=>b.classList.toggle('selected',Math.abs(spin.x)<.01&&Math.abs(spin.y-(+b.dataset.spinY))<.01))}
function resetSpin(){spin={x:0,y:0};setSpinPoint()}
$('#spinReset').onclick=resetSpin;$$('[data-spin-y]').forEach(b=>b.onclick=()=>{spin={x:0,y:+b.dataset.spinY};setSpinPoint()});$('#power').oninput=e=>$('#powerValue').textContent=e.target.value+'%';$('#shootBtn').onclick=shoot;
$$('#callPocket button').forEach(b=>b.onclick=()=>{calledPocket=+b.dataset.pocket;$$('#callPocket button').forEach(x=>x.classList.toggle('selected',x===b));updateGameUI()});
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&mode){e.preventDefault();shoot()}});

function drawTable(){
  const g=ctx.createLinearGradient(0,0,1100,600);g.addColorStop(0,'#432919');g.addColorStop(.5,'#835a32');g.addColorStop(1,'#392116');ctx.fillStyle=g;roundRect(40,20,1020,560,42);ctx.fill();
  ctx.strokeStyle='#bd9160';ctx.lineWidth=3;roundRect(53,33,994,534,33);ctx.stroke();ctx.fillStyle='#102e25';roundRect(74,54,952,492,28);ctx.fill();
  const felt=ctx.createRadialGradient(520,260,30,550,300,530);felt.addColorStop(0,isSnooker()?'#237348':'#17644c');felt.addColorStop(1,isSnooker()?'#0b442b':'#0a3d2e');ctx.fillStyle=felt;ctx.fillRect(P.LEFT,P.TOP,P.RIGHT-P.LEFT,P.BOTTOM-P.TOP);
  ctx.strokeStyle='#205f4a';ctx.lineWidth=2;ctx.strokeRect(P.LEFT,P.TOP,P.RIGHT-P.LEFT,P.BOTTOM-P.TOP);
  if(isSnooker()){ctx.save();ctx.strokeStyle='rgba(225,239,211,.28)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(315,P.TOP);ctx.lineTo(315,P.BOTTOM);ctx.stroke();ctx.beginPath();ctx.arc(315,300,76,Math.PI/2,Math.PI*1.5);ctx.stroke();ctx.fillStyle='rgba(238,235,201,.42)';for(const id of SNOOKER_CLEARANCE){const [x,y]=SNOOKER_SPOTS[id];ctx.beginPath();ctx.arc(x,y,1.7,0,Math.PI*2);ctx.fill()}ctx.restore()}
  for(const {x,y} of P.POCKETS){ctx.beginPath();ctx.arc(x,y,24,0,Math.PI*2);ctx.fillStyle='#020805';ctx.shadowColor='#000';ctx.shadowBlur=12;ctx.fill();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(x,y,27,Math.PI*.1,Math.PI*.9);ctx.strokeStyle='#98714a';ctx.lineWidth=3;ctx.stroke()}
  ctx.fillStyle='#d9be81';for(const x of [216,327,438,662,773,884])for(const y of [66,534])diamond(x,y);for(const y of [192,300,408])for(const x of [85,1015])diamond(x,y);
  const vg=ctx.createRadialGradient(550,300,170,550,300,590);vg.addColorStop(.5,'transparent');vg.addColorStop(1,'rgba(0,0,0,.3)');ctx.fillStyle=vg;ctx.fillRect(74,54,952,492)
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}function diamond(x,y){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillRect(-3,-3,6,6);ctx.restore()}
function drawBall(b){
  if(b.pocketed){ballVisuals.delete(b.id);return}
  let v=ballVisuals.get(b.id);if(!v){v=makeBallVisual(b);ballVisuals.set(b.id,v)}
  const now=performance.now(),dt=Math.min(.05,Math.max(0,(now-v.lastTime)/1000));v.lastTime=now;const dx=b.x-v.x,dy=b.y-v.y,distance=Math.hypot(dx,dy);if(distance<80)rollBallVisual(v,dx,dy,distance);else{v.q=[1,0,0,0];v.matrix=orientationMatrix(v.q);v.dirty=true}v.x=b.x;v.y=b.y;
  const speed=Math.hypot(b.vx,b.vy);if(b.id===0)applyCueSpinVisual(v,b,dt,speed);if(speed>90){const ux=b.vx/speed,uy=b.vy/speed,length=Math.min(20,3+speed*.012),strength=Math.min(.12,(speed-90)/8000),col=b.id===0?'#f5f2e8':ballColor(b.id);ctx.save();ctx.globalAlpha=strength;ctx.strokeStyle=col;ctx.lineWidth=P.R*.82;ctx.lineCap='round';ctx.shadowColor=col;ctx.shadowBlur=5;ctx.beginPath();ctx.moveTo(b.x-ux*length,b.y-uy*length);ctx.lineTo(b.x-ux*5,b.y-uy*5);ctx.stroke();ctx.restore()}
  updateBallTexture(b.id,v);paintBall(b.id,b.x,b.y,P.R,1,v,speed)
}
function firstAimContact(c,dx,dy){let hit=null;const diameter=P.R*2,diameter2=diameter*diameter;for(const b of world.balls){if(b.id===0||b.pocketed)continue;const ox=b.x-c.x,oy=b.y-c.y,along=ox*dx+oy*dy;if(along<=0)continue;const side2=ox*ox+oy*oy-along*along;if(side2>diameter2)continue;const rawT=along-Math.sqrt(Math.max(0,diameter2-side2));if(rawT>=-1){const t=Math.max(0,rawT);if(!hit||t<hit.t)hit={x:c.x+dx*t,y:c.y+dy*t,t,id:b.id}}}return hit}
function drawAimContact(){if(!world||match.ballInHand!=null)return;const striking=match.phase==='striking'&&cueAnimation;if(!canAim()&&!striking)return;const angle=striking?cueAnimation.angle:aim.angle,c=world.cue(),hit=firstAimContact(c,Math.cos(angle),Math.sin(angle));if(!hit)return;const shooter=striking?cueAnimation.by:(mode==='online'?onlineIndex:0),legal=isLegalTarget(hit.id,shooter),color=legal?'#fff':'#ff4b45';ctx.save();ctx.fillStyle=legal?'rgba(255,255,255,.09)':'rgba(255,50,45,.12)';ctx.strokeStyle=color;ctx.lineWidth=legal?2.2:2.8;ctx.shadowColor=color;ctx.shadowBlur=9;ctx.beginPath();ctx.arc(hit.x,hit.y,P.R,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle=legal?'rgba(255,255,255,.38)':'rgba(255,75,69,.9)';ctx.lineWidth=legal?.8:2.2;ctx.beginPath();ctx.arc(hit.x,hit.y,P.R-2.4,0,Math.PI*2);ctx.stroke();if(!legal){const d=P.R*.62;ctx.lineWidth=2.8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(hit.x-d,hit.y+d);ctx.lineTo(hit.x+d,hit.y-d);ctx.stroke()}ctx.restore()}
function paintBall(id,x,y,R,alpha,visual=null,speed=0){const col=ballColor(id),stripe=!isSnooker()&&id>=9,cue=id===0,fs=R/P.R;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);
  ctx.beginPath();ctx.arc(0,0,R,0,Math.PI*2);ctx.shadowColor='rgba(0,0,0,.48)';ctx.shadowBlur=5*fs;ctx.shadowOffsetX=1.8*fs;ctx.shadowOffsetY=3.5*fs;ctx.fillStyle='#070707';ctx.fill();ctx.shadowColor='transparent';
  ctx.save();ctx.beginPath();ctx.arc(0,0,R,0,Math.PI*2);ctx.clip();
  if(visual)ctx.drawImage(visual.texture,-R,-R,R*2,R*2);else{ctx.fillStyle=cue?'#f6f3e8':stripe?'#f4efe3':col;ctx.fillRect(-R,-R,R*2,R*2);if(stripe){ctx.fillStyle=col;ctx.fillRect(-R,-R*.52,R*2,R*1.04)}}
  const sh=ctx.createRadialGradient(-R*.38,-R*.42,R*.12,0,0,R*1.2);sh.addColorStop(0,'rgba(255,255,255,.5)');sh.addColorStop(.42,'rgba(255,255,255,0)');sh.addColorStop(.7,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,0,.55)');ctx.fillStyle=sh;ctx.fillRect(-R,-R,2*R,2*R);
  const sp=ctx.createRadialGradient(-R*.36,-R*.44,0,-R*.36,-R*.44,R*.55);sp.addColorStop(0,'rgba(255,255,255,.9)');sp.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=sp;ctx.fillRect(-R,-R,2*R,2*R);
  ctx.restore();
  ctx.beginPath();ctx.arc(0,0,R-.35*fs,0,Math.PI*2);ctx.lineWidth=1.05*fs;ctx.strokeStyle='rgba(8,14,11,.48)';ctx.stroke();ctx.beginPath();ctx.arc(-R*.08,-R*.1,R*.84,Math.PI*1.08,Math.PI*1.72);ctx.lineWidth=.55*fs;ctx.strokeStyle='rgba(255,255,255,.34)';ctx.stroke();
  if(!cue&&!isSnooker()&&visual){const m=visual.matrix,sign=m[8]>=0?1:-1,facing=Math.abs(m[8]);if(facing>.08){ctx.save();ctx.beginPath();ctx.arc(0,0,R,0,Math.PI*2);ctx.clip();ctx.globalAlpha=alpha*Math.min(1,(facing-.08)/.25);ctx.translate(m[2]*sign*R,m[5]*sign*R);ctx.transform(m[0]*sign,m[3]*sign,m[1],m[4],0,0);ctx.fillStyle='#191f1b';ctx.font=`bold ${8*fs}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(id,0,.5*fs);ctx.restore()}}
  else if(!cue&&!isSnooker()){ctx.beginPath();ctx.arc(0,0,R*.46,0,Math.PI*2);ctx.fillStyle='#f8f4ea';ctx.fill();ctx.fillStyle='#191f1b';ctx.font=`bold ${8*fs}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(id,0,.5*fs)}
  ctx.restore()}function drawAim(){if(!world||match.ballInHand!=null)return;const striking=match.phase==='striking'&&cueAnimation,aiming=canAim();if(!aiming&&!striking)return;const angle=striking?cueAnimation.angle:aim.angle,c=world.cue(),dx=Math.cos(angle),dy=Math.sin(angle);ctx.save();if(aiming){const hit=firstAimContact(c,dx,dy),lineLength=hit?hit.t:700;ctx.setLineDash([8,8]);ctx.strokeStyle='rgba(239,225,180,.72)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(c.x+dx*18,c.y+dy*18);ctx.lineTo(c.x+dx*lineLength,c.y+dy*lineLength);ctx.stroke();ctx.setLineDash([]);const acc=(.24+cue().accuracy*1.9)*Math.PI/180;ctx.fillStyle='rgba(222,194,124,.06)';ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(c.x+Math.cos(angle-acc)*500,c.y+Math.sin(angle-acc)*500);ctx.lineTo(c.x+Math.cos(angle+acc)*500,c.y+Math.sin(angle+acc)*500);ctx.closePath();ctx.fill()}
  const power=striking?cueAnimation.power:+$('#power').value/100,rest=20+power*42;let gap=rest;if(striking){const t=Math.min(1,(performance.now()-cueAnimation.start)/cueAnimation.duration);gap=t<.35?rest+34*Math.sin(t/.35*Math.PI/2):(rest+34)*(1-(t-.35)/.65)-4*((t-.35)/.65)}
  const shownCue=striking?(CUES[match.players[cueAnimation.by]?.cue]||cue()):cue();ctx.translate(c.x-dx*gap,c.y-dy*gap);ctx.rotate(angle);drawCueBody(shownCue);ctx.restore()}
function drawCueBody(cu){
  const L=452,tipR=2.3,buttR=5.9,c0=cu.color[0],c1=cu.color[1];
  const rAt=x=>tipR+(buttR-tipR)*(-x/L);
  const quad=(a,b)=>{ctx.beginPath();ctx.moveTo(a,-rAt(a));ctx.lineTo(b,-rAt(b));ctx.lineTo(b,rAt(b));ctx.lineTo(a,rAt(a));ctx.closePath();};
  ctx.save();
  ctx.save();ctx.shadowColor='rgba(0,0,0,.38)';ctx.shadowBlur=7;ctx.shadowOffsetX=1.4;ctx.shadowOffsetY=4.4;quad(0,-L);ctx.fillStyle='#100a06';ctx.fill();ctx.restore();
  quad(0,-L);ctx.save();ctx.clip();
  const seg=(a,b,fill)=>{quad(a,b);ctx.fillStyle=fill;ctx.fill();};
  seg(0,-3.2,'#2f5fa8');            // 真皮杆头
  seg(-3.2,-6,'#b9b2a0');           // 皮垫
  seg(-6,-15,'#f6f1e3');            // 象牙先角
  const sg=ctx.createLinearGradient(-15,0,-252,0);sg.addColorStop(0,'#f0dcae');sg.addColorStop(1,'#e2c184');seg(-15,-252,sg);
  seg(-252,-258,'#e8e2d0');         // 银色套圈
  seg(-258,-262,'#141414');
  const fg=ctx.createLinearGradient(-262,0,-356,0);fg.addColorStop(0,c0);fg.addColorStop(1,c1);seg(-262,-356,fg);
  seg(-356,-360,'#141414');seg(-360,-364,'#cbb26a');   // 金环
  seg(-364,-430,c1);                // 握把
  for(let x=-368;x>-430;x-=7){quad(x,x-2);ctx.fillStyle='rgba(255,255,255,.07)';ctx.fill();}  // 亚麻缠绕纹
  seg(-430,-434,'#cbb26a');seg(-434,-448,'#0e0a07');seg(-448,-452,'#000');  // 尾环+护胶
  const gloss=ctx.createLinearGradient(0,-buttR,0,buttR);
  gloss.addColorStop(0,'rgba(255,255,255,.30)');gloss.addColorStop(.22,'rgba(255,255,255,.60)');gloss.addColorStop(.5,'rgba(255,255,255,0)');gloss.addColorStop(.78,'rgba(0,0,0,.18)');gloss.addColorStop(1,'rgba(0,0,0,.46)');
  ctx.fillStyle=gloss;ctx.fillRect(-L,-buttR,L,buttR*2);
  ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillRect(-L,-buttR*.52,L,.9);   // 高光棱线
  ctx.restore();
  quad(0,-L);ctx.lineWidth=.7;ctx.strokeStyle='rgba(0,0,0,.32)';ctx.stroke();
  ctx.restore();
}
function render(){syncCanvasResolution();ctx.clearRect(0,0,P.W,P.H);drawTable();if(world){drawAim();for(const b of world.balls)drawBall(b);drawAimContact();drawEffects(performance.now());const mine=mode==='online'?onlineIndex:0;if(match?.ballInHand===mine){ctx.save();ctx.globalAlpha=.55;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(aim.x,aim.y,P.R,0,Math.PI*2);ctx.fill();ctx.restore()}}}

function spawnPocket(ballId,x0,y0,pocketIndex){const p=P.POCKETS[pocketIndex];if(!p)return;const now=performance.now(),cueBall=ballId===0,tint=cueBall?'#f4efe3':ballColor(ballId);
  effects.push({kind:'sink',id:ballId,x0,y0,px:p.x,py:p.y,start:now,dur:360});
  effects.push({kind:'flash',px:p.x,py:p.y,col:cueBall?'#ffffff':tint,start:now,dur:440});
  for(let i=0;i<16;i++){const a=Math.random()*Math.PI*2,sp=70+Math.random()*180;effects.push({kind:'spark',px:p.x,py:p.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-40,col:tint,r:1.4+Math.random()*2.4,start:now,dur:360+Math.random()*260});}}
function spawnFromEvents(events){for(const e of events||[])if(e.type==='pocket'&&e.ball!=null)spawnPocket(e.ball,e.x,e.y,e.pocket)}
function drawEffects(now){for(let i=effects.length-1;i>=0;i--){const e=effects[i],t=(now-e.start)/e.dur;if(t>=1){effects.splice(i,1);continue}
  if(e.kind==='sink'){const k=t*t,x=e.x0+(e.px-e.x0)*k,y=e.y0+(e.py-e.y0)*k;ctx.save();ctx.beginPath();ctx.arc(e.px,e.py,22,0,Math.PI*2);ctx.clip();paintBall(e.id,x,y,P.R*(1-t*.8),1-t*.35);ctx.restore()}
  else if(e.kind==='flash'){const rr=8+t*24,al=(1-t);ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(e.px,e.py,0,e.px,e.py,rr);g.addColorStop(0,e.col);g.addColorStop(.6,e.col);g.addColorStop(1,'transparent');ctx.globalAlpha=al*.55;ctx.fillStyle=g;ctx.beginPath();ctx.arc(e.px,e.py,rr,0,Math.PI*2);ctx.fill();ctx.globalAlpha=al*.9;ctx.strokeStyle=e.col;ctx.lineWidth=1+2*(1-t);ctx.beginPath();ctx.arc(e.px,e.py,rr,0,Math.PI*2);ctx.stroke();ctx.restore()}
  else if(e.kind==='spark'){const dt=(now-e.start)/1000,x=e.px+e.vx*dt,y=e.py+e.vy*dt+150*dt*dt;ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=1-t;ctx.fillStyle=e.col;ctx.beginPath();ctx.arc(x,y,e.r*(1-t*.6),0,Math.PI*2);ctx.fill();ctx.restore()}}}
function loop(now){const dt=Math.min(.04,(now-lastFrame)/1000);lastFrame=now;if(mode==='local'&&world?.active){const done=world.tick(dt);const ev=world.takeAudioEvents();audio.consume(ev);spawnFromEvents(ev);if(done)settleLocal(done)}render();requestAnimationFrame(loop)}

function openSoloMode(type){pendingGameType=type;$('#soloModeEyebrow').textContent=type==='snooker'?'SNOOKER MATCH':'CHOOSE YOUR RIVAL';$('#soloModeTitle').textContent=type==='snooker'?'选择斯诺克对手难度':'选择机器人难度';modal('#soloModal')}
$('#soloBtn').onclick=()=>openSoloMode('eight');$('#snookerBtn').onclick=()=>openSoloMode('snooker');$('#onlineBtn').onclick=()=>{if(ws?.readyState!==1)return toast('联机服务器未连接，请先启动 server.py');modal('#onlineModal')};$('#marketBtn').onclick=()=>{refreshLobby();modal('#marketModal')};
$('#continueBtn').onclick=restoreLocal;$('#saveGameBtn').onclick=()=>saveLocalGame(true);
$$('.difficulty-list button').forEach(b=>b.onclick=()=>startLocal(b.dataset.level));$$('.modal-close').forEach(b=>b.onclick=()=>b.closest('.modal').classList.add('hidden'));
$('#queueBtn').onclick=()=>{$('#onlineIdle').classList.add('hidden');$('#queueState').classList.remove('hidden');send({type:'queue'})};$('#cancelQueue').onclick=()=>{send({type:'cancel'});modal('#onlineModal',false);$('#onlineIdle').classList.remove('hidden');$('#queueState').classList.add('hidden')};
$('#renameBtn').onclick=()=>{$('#nameInput').value=profile.name;modal('#nameModal')};$('#saveName').onclick=()=>{const n=$('#nameInput').value.trim();if(n.length<2)return toast('昵称至少需要 2 个字符');profile.name=n;nameReady=true;saveLocal();modal('#nameModal',false);if(ws?.readyState===1)send({type:'hello',name:n,token:localStorage.getItem('ve_token')||''});refreshLobby()};
$('#leaveBtn').onclick=()=>{if(mode==='online'&&!confirm('退出将判负，确定离开吗？'))return;if(mode==='online')send({type:'forfeit'});backLobby()};$('#resultBack').onclick=backLobby;
$$('.sound-btn').forEach(b=>b.onclick=()=>audio.setEnabled(!audio.enabled));document.addEventListener('pointerdown',()=>audio.wake(),{once:true,capture:true});document.addEventListener('keydown',()=>audio.wake(),{once:true,capture:true});updateSoundButtons();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveLocalGame()});window.addEventListener('pagehide',()=>saveLocalGame());
if(!nameReady){$('#nameInput').value='球手'+Math.floor(100+Math.random()*900);modal('#nameModal')}refreshLobby();connect();requestAnimationFrame(loop);
})();
