import * as THREE from 'three';
import {buildWeaponModel,buildThrowableModel,addFirstPersonHands,buildOperator,prewarmOperatorTemplates,WEAPON_SPECS} from './visuals.js';
import {MAPS,RANGE_MAP,buildArena,scaleMap} from './arena.js?v=range-2';

// ── 数据：所有数值同时驱动军械库与实战 ─────────────────────────────
const WEAPONS={
  vector:{name:'VECTOR',type:'冲锋枪',damage:11,rate:1000,recoil:24,spread:72,mag:25,reserve:125,reload:1.8,range:34,auto:true,color:0x262b28,desc:'极高射速的近距离压制武器，后坐可控但单发伤害较低。'},
  mp5:{name:'MP5-SD',type:'冲锋枪',damage:12,rate:800,recoil:18,spread:82,mag:30,reserve:120,reload:2.1,range:40,auto:true,color:0x242927,desc:'内置消音器与稳定弹道，适合绕后和室内连续作战。'},
  p90:{name:'P90',type:'冲锋枪',damage:10,rate:900,recoil:20,spread:76,mag:50,reserve:150,reload:2.6,range:38,auto:true,color:0x343933,desc:'独特的 50 发弹匣提供强大续航，贴身缠斗的可靠选择。'},
  ump45:{name:'UMP45',type:'冲锋枪',damage:16,rate:600,recoil:28,spread:75,mag:25,reserve:100,reload:2.2,range:45,auto:true,color:0x353b37,desc:'低射速、高停止力的重口径冲锋枪，中近距离表现稳定。'},
  mp7:{name:'MP7A2',type:'冲锋枪',damage:11,rate:950,recoil:22,spread:80,mag:40,reserve:160,reload:2.0,range:42,auto:true,color:0x2c302f,desc:'轻巧紧凑的个人防卫武器，40 发弹匣与高射速兼备。'},
  pp19:{name:'PP-19 野牛',type:'冲锋枪',damage:12,rate:700,recoil:24,spread:73,mag:64,reserve:192,reload:2.7,range:43,auto:true,color:0x34372f,desc:'螺旋式大容量弹筒可持续压制，适合多目标近距离作战。'},
  mac10:{name:'MAC-10',type:'冲锋枪',damage:10,rate:1100,recoil:42,spread:56,mag:30,reserve:150,reload:1.9,range:28,auto:true,color:0x272a28,desc:'射速极高但散布和后坐明显，贴身爆发力非常出色。'},
  uzi:{name:'UZI PRO',type:'冲锋枪',damage:13,rate:600,recoil:20,spread:70,mag:32,reserve:128,reload:2.0,range:35,auto:true,color:0x303431,desc:'结构简单可靠，拥有容易掌控的射速和紧凑枪身。'},
  ak12:{name:'AK-12',type:'突击步枪',damage:20,rate:650,recoil:46,spread:66,mag:30,reserve:120,reload:2.35,range:68,auto:true,color:0x34312b,desc:'均衡可靠的制式步枪，适应绝大多数交战距离。'},
  m4:{name:'M4A1',type:'突击步枪',damage:19,rate:750,recoil:30,spread:78,mag:30,reserve:120,reload:2.15,range:65,auto:true,color:0x303a34,desc:'高精度与低后坐的现代卡宾枪，新手也能快速掌握。'},
  aug:{name:'AUG A3',type:'突击步枪',damage:21,rate:680,recoil:36,spread:86,mag:30,reserve:90,reload:2.5,range:72,auto:true,color:0x39433a,desc:'稳定精准的无托步枪，中远距离点射表现突出。'},
  scar:{name:'SCAR-L',type:'突击步枪',damage:22,rate:550,recoil:41,spread:83,mag:30,reserve:120,reload:2.6,range:76,auto:true,color:0x75674d,desc:'射速较慢但单发威力与远距离精度出色，适合稳健推进。'},
  g36:{name:'G36C',type:'突击步枪',damage:18,rate:750,recoil:33,spread:80,mag:30,reserve:120,reload:2.3,range:68,auto:true,color:0x303532,desc:'模块化短步枪，拥有平衡的射速、稳定性和机动性。'},
  famas:{name:'FAMAS F1',type:'突击步枪',damage:18,rate:900,recoil:48,spread:68,mag:25,reserve:125,reload:2.45,range:64,auto:true,color:0x42483e,desc:'高射速无托步枪，近距离爆发强劲但需要控制连续后坐。'},
  qbz95:{name:'QBZ-95-1',type:'突击步枪',damage:20,rate:700,recoil:32,spread:84,mag:30,reserve:120,reload:2.4,range:73,auto:true,color:0x26332c,desc:'紧凑无托结构带来优秀平衡，点射精度和后坐控制突出。'},
  groza:{name:'GROZA',type:'突击步枪',damage:23,rate:650,recoil:55,spread:62,mag:30,reserve:90,reload:2.7,range:60,auto:true,color:0x3e372d,desc:'大口径无托步枪，近距离伤害凶猛但后坐十分明显。'},
  an94:{name:'AN-94',type:'突击步枪',damage:21,rate:720,recoil:38,spread:82,mag:30,reserve:120,reload:2.65,range:78,auto:true,color:0x2e342f,desc:'精密导气结构提供优良的首发控制，中远距离压枪稳定。'},
  awm:{name:'AWM',type:'狙击步枪',damage:92,rate:42,recoil:92,spread:98,mag:5,reserve:25,reload:3.9,range:100,auto:false,bolt:true,color:0x28342d,desc:'威力极高的栓动狙击枪。单发射击，必须拔栓后才能再次开火。'},
  svd:{name:'SVD',type:'狙击步枪',damage:58,rate:120,recoil:75,spread:91,mag:10,reserve:40,reload:3.1,range:92,auto:false,color:0x4a392a,desc:'半自动精确射手步枪，拥有更快的补射能力。'},
  m24:{name:'M24 SWS',type:'狙击步枪',damage:84,rate:48,recoil:84,spread:96,mag:5,reserve:30,reload:3.6,range:98,auto:false,bolt:true,color:0x465344,desc:'稳定可靠的栓动狙击系统，威力与拔栓速度较为均衡。'},
  m82:{name:'M82A1',type:'狙击步枪',damage:110,rate:55,recoil:100,spread:94,mag:10,reserve:20,reload:4.8,range:100,auto:false,color:0x353932,desc:'反器材重型狙击枪，威力冠绝全场但极其笨重、换弹漫长。'},
  kar98:{name:'KAR98K',type:'狙击步枪',damage:88,rate:45,recoil:88,spread:97,mag:5,reserve:25,reload:3.8,range:96,auto:false,bolt:true,color:0x5d4531,desc:'经典栓动步枪，弹道精准且单发伤害极高。'},
  vss:{name:'VSS VINTOREZ',type:'狙击步枪',damage:35,rate:400,recoil:42,spread:88,mag:20,reserve:80,reload:2.8,range:72,auto:false,color:0x493b2f,desc:'亚音速消音精确步枪，伤害较低但补射快速且隐蔽。'},
  m249:{name:'M249',type:'轻机枪',damage:17,rate:780,recoil:58,spread:55,mag:100,reserve:200,reload:5.7,range:70,auto:true,color:0x3e4238,desc:'100 发弹箱带来持续火力，代价是明显的后坐与漫长换弹。'},
  rpk:{name:'RPK-16',type:'轻机枪',damage:20,rate:600,recoil:51,spread:62,mag:75,reserve:150,reload:4.6,range:73,auto:true,color:0x3d3228,desc:'更灵活的班用机枪，高伤害与大弹匣兼备。'},
  pkm:{name:'PKM',type:'轻机枪',damage:22,rate:650,recoil:62,spread:55,mag:100,reserve:200,reload:6.2,range:78,auto:true,color:0x504130,desc:'通用机枪拥有强大单发威力和百发弹链，但操控与换弹困难。'},
  mg3:{name:'MG3',type:'轻机枪',damage:16,rate:1000,recoil:70,spread:45,mag:75,reserve:225,reload:5.9,range:68,auto:true,color:0x313832,desc:'惊人的千发射速形成弹幕压制，弹药消耗与后坐同样惊人。'},
  dp28:{name:'DP-28',type:'轻机枪',damage:23,rate:550,recoil:50,spread:63,mag:47,reserve:141,reload:5.2,range:75,auto:true,color:0x493a2d,desc:'盘式弹匣轻机枪，射速沉稳、威力出色且持续火力可靠。'},
  m60:{name:'M60E4',type:'轻机枪',damage:22,rate:600,recoil:65,spread:52,mag:100,reserve:200,reload:6.5,range:76,auto:true,color:0x3c423a,desc:'重型通用机枪，百发火力强劲但拥有全军械库最长换弹时间。'},
  qbb95:{name:'QBB-95',type:'轻机枪',damage:18,rate:800,recoil:45,spread:66,mag:75,reserve:225,reload:4.4,range:70,auto:true,color:0x2d3a31,desc:'无托班用机枪机动性优秀，兼具高射速和较快换弹。'}
};
const WEAPON_DAMAGE_SCALE=.5;
for(const weapon of Object.values(WEAPONS)){weapon.originalDamage=weapon.damage;weapon.damage*=WEAPON_DAMAGE_SCALE}
const WEAPON_KEYS=Object.keys(WEAPONS);
const weaponLabel=w=>`${w.name} ${w.type}`;
const ATTACHMENT_SLOT_LABELS={sight:'瞄具',muzzle:'枪口',grip:'握把',magazine:'弹匣',stock:'枪托'};
const ATTACHMENTS={
  sight:[
    {id:'red-dot',name:'红点瞄准镜',types:['冲锋枪','突击步枪','轻机枪','狙击步枪'],spread:3},
    {id:'holo',name:'全息瞄准镜',types:['冲锋枪','突击步枪','轻机枪','狙击步枪'],spread:4},
    {id:'scope-2x',name:'2倍镜',types:['冲锋枪','突击步枪','轻机枪','狙击步枪'],spread:5},
    {id:'scope-3x',name:'3倍镜',types:['冲锋枪','突击步枪','轻机枪','狙击步枪'],spread:7},
    {id:'scope-4x',name:'4倍镜',types:['突击步枪','轻机枪','狙击步枪'],spread:9},
    {id:'scope-6x',name:'6倍镜',types:['突击步枪','轻机枪','狙击步枪'],spread:11},
    {id:'scope-8x',name:'8倍镜',types:['狙击步枪'],spread:13}
  ],
  muzzle:[
    {id:'compensator',name:'枪口补偿器',types:['冲锋枪','突击步枪','轻机枪','狙击步枪'],recoil:-12,spread:2},
    {id:'flash-hider',name:'消焰器',types:['冲锋枪','突击步枪','轻机枪','狙击步枪'],recoil:-6,spread:1},
    {id:'suppressor',name:'消音器',types:['冲锋枪','突击步枪','轻机枪','狙击步枪'],recoil:-3,sound:.55}
  ],
  grip:[
    {id:'vertical-grip',name:'垂直握把',types:['冲锋枪','突击步枪','轻机枪'],recoil:-10},
    {id:'angled-grip',name:'直角前握把',types:['冲锋枪','突击步枪','轻机枪'],recoil:-7,spread:3},
    {id:'thumb-grip',name:'拇指握把',types:['冲锋枪','突击步枪','轻机枪'],recoil:-5,reload:.95},
    {id:'light-grip',name:'轻型握把',types:['冲锋枪','突击步枪','轻机枪'],recoil:-4,spread:5},
    {id:'laser-sight',name:'激光瞄准器',types:['冲锋枪','突击步枪'],spread:8}
  ],
  magazine:[
    {id:'quickdraw-mag',name:'快速弹匣',types:['冲锋枪','突击步枪','轻机枪','狙击步枪'],reload:.78},
    {id:'extended-mag',name:'扩容弹匣',types:['冲锋枪','突击步枪','轻机枪','狙击步枪'],mag:.25},
    {id:'extended-quickdraw-mag',name:'快速扩容弹匣',types:['冲锋枪','突击步枪','轻机枪','狙击步枪'],reload:.78,mag:.25}
  ],
  stock:[
    {id:'tactical-stock',name:'战术枪托',types:['冲锋枪','突击步枪','轻机枪'],weapons:['vector','mp5','m4','g36','qbz95','m249'],recoil:-7,spread:3},
    {id:'cheek-pad',name:'托腮板',types:['狙击步枪'],recoil:-9,spread:5},
    {id:'bullet-loops',name:'子弹袋',types:['狙击步枪'],weapons:['kar98','m24'],reload:.72},
    {id:'heavy-stock',name:'重型枪托',types:['冲锋枪','突击步枪','轻机枪'],recoil:-12,reload:1.08}
  ]
};
const attachmentOptions=(slot,key)=>ATTACHMENTS[slot].filter(a=>a.types.includes(WEAPONS[key].type)&&(!a.weapons||a.weapons.includes(key)));
const attachmentById=(slot,id)=>ATTACHMENTS[slot].find(a=>a.id===id);
const MODE={
  '1v1':{label:'对决 1V1',team:1,time:300,limits:[0,0,1,1,1,1]},
  '1v2':{label:'三人战 1V2',team:2,time:300,limits:[0,0,1,1,1,1]},
  '2v2':{label:'闪击 2V2',team:2,time:300,limits:[0,0,1,1,1,1]},
  '5v5':{label:'全面冲突 5V5',team:5,time:300,limits:[0,0,2,1,1,1]},
  training:{label:'靶场',team:0,time:9999,limits:[0,0,99,99,99,99]}
};
// 地图与靶场数据现由 arena.js 提供（全部为封闭室内设施）
const ZONE_MULT={head:2.7,body:1,limb:.72,foot:.55};
function rollWeaponDamage(weapon,zone='body'){return Math.round(weapon.damage*ZONE_MULT[zone]*(.92+Math.random()*.16))}

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// 金币系统已取消，启动时清理旧版本遗留的余额数据。
for(const key of['rf-coins','rf-economy-version','rf-slot-1-coins','rf-slot-2-coins','rf-slot-3-coins'])localStorage.removeItem(key);
// 固定账户只在本机验证；源码仅保存 SHA-256 摘要，不保存或显示明文密码。
const ACCOUNT_CREDENTIALS={
  gyagp:'a54e353e1c94f32a06c20a5b97759db9052ded256e4e8def64f432d5cab4a9f9',
  lucas:'f99bb493d1a7f4aefdec7db5e4cdd682c61f9c21ef650405580a393b07f5e336',
  janet:'b9b3d0ba2582b19cc40bece62a011d25f0fb5cff5499d47ea9c8a980f3c4214f'
};
let activeAccount=null;
const accountStorageKey=name=>activeAccount?`rf-account-${activeAccount}-${name}`:null;
const save={
  get owned(){return[...WEAPON_KEYS]},
  get slots(){try{return JSON.parse((activeAccount&&localStorage.getItem(accountStorageKey('slots')))||'["ak12","vector"]')}catch{return['ak12','vector']}},set slots(v){if(activeAccount)localStorage.setItem(accountStorageKey('slots'),JSON.stringify(v))},
  get attachments(){try{return JSON.parse((activeAccount&&localStorage.getItem(accountStorageKey('attachments')))||'{}')}catch{return{}}},set attachments(v){if(activeAccount)localStorage.setItem(accountStorageKey('attachments'),JSON.stringify(v))},
  get audio(){try{const data=JSON.parse((activeAccount&&localStorage.getItem(accountStorageKey('audio')))||'{}');return{footsteps:data.footsteps!==false,footstepVolume:clamp(Number.isFinite(+data.footstepVolume)?+data.footstepVolume:.7,0,1)}}catch{return{footsteps:true,footstepVolume:.7}}},set audio(v){if(activeAccount)localStorage.setItem(accountStorageKey('audio'),JSON.stringify(v))}
};
let audioSettings=save.audio;
function attachmentStore(){const raw=save.attachments;if((raw?.version===2||raw?.version===3)&&Array.isArray(raw.slots)){const slots=[0,1].map(index=>{const slot=raw.slots[index];if(slot?.weapon)return{[slot.weapon]:{...(slot.config||{})}};const clean={};for(const[key,config]of Object.entries(slot||{}))clean[key]={...(config||{})};return clean}),store={version:3,slots};if(raw.version!==3||raw.presets||raw.slots.some(slot=>slot?.weapon))save.attachments=store;return store}const legacy=raw&&typeof raw==='object'?raw:{},store={version:3,slots:save.slots.map(key=>({[key]:{...(legacy[key]||{})}}))};save.attachments=store;return store}
function weaponAttachments(key,loadoutSlot=activeSlot){return attachmentStore().slots[loadoutSlot]?.[key]||{}}
function ensureSlotAttachments(loadoutSlot,key){const store=attachmentStore();store.slots[loadoutSlot]||={};store.slots[loadoutSlot][key]||={};save.attachments=store;return store.slots[loadoutSlot][key]}
function effectiveWeapon(key,loadoutSlot=activeSlot){const base=WEAPONS[key],result={...base};for(const [slot,id] of Object.entries(weaponAttachments(key,loadoutSlot))){const a=attachmentById(slot,id);if(!a||!attachmentOptions(slot,key).some(x=>x.id===id))continue;result.recoil=clamp(result.recoil+(a.recoil||0),5,100);result.spread=clamp(result.spread+(a.spread||0),1,100);if(a.reload)result.reload*=a.reload;if(a.mag)result.mag=Math.round(result.mag*(1+a.mag));if(a.sound)result.sound=a.sound}return result}
let selectedMode='2v2',selectedWeapon='ak12',activeSlot=0,currentPage='home',preferredView='third';
const soldierStatus='original-operator';
// 程序化空间音效：不依赖外部音频素材，首次交互后自动启用。
let audioCtx=null;
function audio(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}
function noiseBurst(duration=.1,volume=.12,cutoff=1600,delay=0){const a=audio(),buf=a.createBuffer(1,Math.ceil(a.sampleRate*duration),a.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const src=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain();src.buffer=buf;filter.type='lowpass';filter.frequency.value=cutoff;gain.gain.setValueAtTime(volume,a.currentTime+delay);gain.gain.exponentialRampToValueAtTime(.001,a.currentTime+delay+duration);src.connect(filter).connect(gain).connect(a.destination);src.start(a.currentTime+delay)}
let footstepBuffer=null,footstepSide=0;
function getFootstepBuffer(a){if(footstepBuffer&&footstepBuffer.sampleRate===a.sampleRate)return footstepBuffer;const duration=.17,buf=a.createBuffer(1,Math.ceil(a.sampleRate*duration),a.sampleRate),data=buf.getChannelData(0);for(let i=0;i<data.length;i++){const seconds=i/a.sampleRate,t=i/data.length,envelope=Math.sin(Math.min(1,t*8)*Math.PI*.5)*Math.exp(-t*5.1),thump=Math.sin(Math.PI*2*(105-42*t)*seconds)*.72,sole=(Math.random()*2-1)*(.65-.35*t);data[i]=(thump+sole)*envelope*.72}return footstepBuffer=buf}
function emitSoundEvent(type,position,team){if(!position||!game.player||team===game.player.team)return;const maxDistance=type==='gunshot'?90:30,distance=Math.hypot(position.x-game.player.pos.x,position.z-game.player.pos.z);if(distance>maxDistance)return;const now=performance.now()/1000,duration=type==='gunshot'?1.8:1.6,recent=game.soundEvents.find(event=>event.type===type&&event.position.distanceToSquared(position)<1.5&&event.expiresAt-now>.45);if(recent){recent.position.copy(position);recent.expiresAt=now+duration;return}game.soundEvents.push({type,position:position.clone(),expiresAt:now+duration})}
function footstepSound(position=null,gait='walk',sourceTeam=null){
  if(position)emitSoundEvent('footstep',position,sourceTeam);if(!audioSettings.footsteps||audioSettings.footstepVolume<=0)return;const a=audio(),own=!position,maxDistance=30;let distance=0,pan=0,proximity=1;if(position&&game.player){const dx=position.x-game.player.pos.x,dz=position.z-game.player.pos.z;distance=Math.hypot(dx,dz);if(distance>=maxDistance)return;proximity=clamp(1-distance/maxDistance,0,1);const inv=1/(distance||1),rightX=Math.cos(game.yaw),rightZ=-Math.sin(game.yaw);pan=clamp((dx*rightX+dz*rightZ)*inv,-1,1)}const gaitVolume=gait==='run'?1.35:gait==='crouch'?.55:gait==='prone'?.24:1,falloff=own?.72:clamp(1/(1+Math.pow(distance/7.5,2))-.015,0,1),volume=.22*audioSettings.footstepVolume*gaitVolume*falloff;if(volume<.0015)return;
  let occluded=false;if(position&&game.player&&game.colliders.length){const origin=game.player.pos,offset=position.clone().add(new THREE.Vector3(0,1,0)).sub(origin),length=offset.length();occluded=!!nearestSolidHit(new THREE.Ray(origin,offset.normalize()),length-.2)}const src=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain(),panner=a.createStereoPanner?a.createStereoPanner():null;src.buffer=getFootstepBuffer(a);src.playbackRate.value=(gait==='run'?1.13:gait==='crouch'?.86:gait==='prone'?.72:1)*(.94+Math.random()*.1);filter.type='lowpass';filter.frequency.value=(650+1250*proximity)*(occluded?.48:1);filter.Q.value=.6;gain.gain.setValueAtTime(volume*(occluded?.62:1),a.currentTime);gain.gain.exponentialRampToValueAtTime(.001,a.currentTime+.165);src.connect(filter).connect(gain);if(panner){panner.pan.value=clamp(pan+(footstepSide++%2?-.035:.035),-1,1);gain.connect(panner).connect(a.destination)}else gain.connect(a.destination);src.start();src.stop(a.currentTime+.18);game.audioStats.footsteps++;game.audioStats.lastFootstepVolume=volume;game.audioStats.lastFootstepDistance=distance
}
function syncFootstepSettingsUI(){for(const [toggle,slider,output] of [['#footstep-enabled','#footstep-volume','#footstep-volume-value'],['#pause-footstep-enabled','#pause-footstep-volume','#pause-footstep-volume-value']]){const t=$(toggle),s=$(slider),o=$(output);if(!t||!s||!o)continue;t.checked=audioSettings.footsteps;s.value=Math.round(audioSettings.footstepVolume*100);s.disabled=!audioSettings.footsteps;o.textContent=`${s.value}%`}}
function setFootstepSettings(patch,preview=false){audioSettings={...audioSettings,...patch};save.audio=audioSettings;syncFootstepSettingsUI();if(preview&&audioSettings.footsteps)footstepSound(null,'walk')}
function bindFootstepSettings(toggleSelector,sliderSelector){const toggle=$(toggleSelector),slider=$(sliderSelector);toggle.addEventListener('change',()=>setFootstepSettings({footsteps:toggle.checked},toggle.checked));slider.addEventListener('input',()=>setFootstepSettings({footstepVolume:+slider.value/100}));slider.addEventListener('change',()=>footstepSound(null,'walk'))}
function shotSound(w){const volume=w.sound||1;noiseBurst(.09,(w.type==='狙击步枪'?.34:.2)*volume,w.type==='冲锋枪'?2100:1400);const a=audio(),o=a.createOscillator(),g=a.createGain();o.type='triangle';o.frequency.setValueAtTime(w.type==='狙击步枪'?72:w.type==='轻机枪'?88:110,a.currentTime);o.frequency.exponentialRampToValueAtTime(38,a.currentTime+.1);g.gain.setValueAtTime(.18*volume,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.12);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.13)}
function remoteShotSound(position,key,sourceTeam=null){
  if(!game.player||!position)return;emitSoundEvent('gunshot',position,sourceTeam);const distance=position.distanceTo(game.player.pos),maxDistance=90;if(distance>=maxDistance)return;const w=WEAPONS[key]||WEAPONS.ak12,a=audio(),duration=.12,buf=a.createBuffer(1,Math.ceil(a.sampleRate*duration),a.sampleRate),data=buf.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const src=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain(),panner=a.createStereoPanner?a.createStereoPanner():null,proximity=1-distance/maxDistance,dx=position.x-game.player.pos.x,dz=position.z-game.player.pos.z,inv=1/(distance||1),rightX=Math.cos(game.yaw),rightZ=-Math.sin(game.yaw);src.buffer=buf;filter.type='lowpass';filter.frequency.value=(w.type==='冲锋枪'?2600:1800)*(.45+.55*proximity);gain.gain.setValueAtTime((.03+.3*Math.pow(proximity,1.3))*(w.sound||1),a.currentTime);gain.gain.exponentialRampToValueAtTime(.001,a.currentTime+duration);src.connect(filter).connect(gain);if(panner){panner.pan.value=clamp((dx*rightX+dz*rightZ)*inv,-1,1);gain.connect(panner).connect(a.destination)}else gain.connect(a.destination);src.start();src.stop(a.currentTime+duration);game.audioStats.shots++
}
function explosionSound(strength=1){noiseBurst(.72,.38*strength,620);const a=audio(),o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(68,a.currentTime);o.frequency.exponentialRampToValueAtTime(24,a.currentTime+.55);g.gain.setValueAtTime(.25*strength,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.58);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.6)}
function reloadSound(){noiseBurst(.035,.07,4300);noiseBurst(.045,.09,5000,.32)}

// ── 渲染器与共享场景 ──────────────────────────────────────────────
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.BasicShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.05,180);
let world=null,clock=new THREE.Clock(),gameActive=false,menuTime=0;
$('#menu').prepend(renderer.domElement);

function mat(color,rough=.72,metal=.05){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
function mesh(geo,material,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m}
function box(w,h,d,material,x,y,z){return mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z)}

function makeMenuScene(){
  scene.clear();scene.background=new THREE.Color(0x141b21);scene.fog=new THREE.FogExp2(0x141b21,.014);
  scene.add(new THREE.HemisphereLight(0xdce9f2,0x1a2228,1.9));
  scene.add(new THREE.AmbientLight(0xcfdde6,.5));
  const key=new THREE.DirectionalLight(0xfff2dd,2.6);key.position.set(-7,12,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
  const rim=new THREE.PointLight(0x6fe3ff,26,18,2);rim.position.set(7.5,3.4,2);scene.add(rim);
  const back=new THREE.PointLight(0xffb347,22,20,2);back.position.set(2,4.2,-8);scene.add(back);
  // 装备展示间：抛光地坪、灯带背墙与展台
  const floor=mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:0x1c252b,roughness:.34,metalness:.42}),0,0,0);
  floor.rotation.x=-Math.PI/2;scene.add(floor);
  const grid=new THREE.GridHelper(60,40,0x3f5c66,0x25333a);grid.position.y=.01;grid.material.opacity=.35;grid.material.transparent=true;scene.add(grid);
  for(let i=-3;i<=3;i++){
    const panel=box(3.4,7,.4,mat(0x202a31,.86),i*4.2,3.5,-13);scene.add(panel);
    const strip=mesh(new THREE.BoxGeometry(.16,6,.12),new THREE.MeshStandardMaterial({color:0x8ff0ff,emissive:0x2f97b5,emissiveIntensity:1.8,roughness:.3}),i*4.2+1.8,3.5,-12.75);scene.add(strip);
  }
  for(let i=0;i<7;i++){const beam=box(30,.3,.3,mat(0x2b363d,.6,.5),0,7.6,-11+i*3.4);scene.add(beam)}
  const dais=mesh(new THREE.CylinderGeometry(2.5,2.7,.22,40),mat(0x27333a,.5,.4),5.7,.11,-1.5);scene.add(dais);
  const halo=mesh(new THREE.TorusGeometry(2.5,.045,8,48),new THREE.MeshStandardMaterial({color:0x9dffb0,emissive:0x3ea45c,emissiveIntensity:2.4,roughness:.3}),5.7,.24,-1.5);
  halo.rotation.x=Math.PI/2;scene.add(halo);
  const {root:hero}=buildOperator('blue'),gun=buildWorldGun(WEAPONS[save.slots[0]]?.color,save.slots[0],1,weaponAttachments(save.slots[0],0));gun.rotation.y=Math.PI/2;gun.position.set(.16,1.2,-.3);hero.add(gun);hero.scale.setScalar(1.55);
  hero.position.set(5.7,.22,-1.5);hero.rotation.y=-.3;scene.add(hero);scene.userData.hero=hero;
  for(let i=0;i<14;i++){const c=box(1.6+Math.random()*2.4,.9+Math.random()*1.6,1.6+Math.random()*2.2,mat(i%3?0x243038:0x33454e,.82),-19+Math.random()*30,.45,-6-Math.random()*16);scene.add(c)}
  camera.position.set(1.2,2.2,8.5);camera.lookAt(4.5,1.6,-1);
}

// 每把枪都由 visuals.js 依据真实外形规格独立生成，配件也会实时反映在模型上
function buildWorldGun(color,key='ak12',detail=1,attachments={}){
  return buildWeaponModel(WEAPON_SPECS[key]?key:'ak12',{tint:color,detail,attachments});
}

// ── 菜单、军械库与房间 UI ─────────────────────────────────────────
function setPage(id){currentPage=id;$$('.page').forEach(p=>p.classList.toggle('active',p.id===id));$$('.topbar nav .nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===id));if(id==='arsenal')renderArsenal();if(id==='accounts')renderAccountCenter();if(id==='settings')syncFootstepSettingsUI()}
$$('.nav-btn').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));
$$('.mode-card').forEach(c=>c.addEventListener('click',()=>{selectedMode=c.dataset.mode;$$('.mode-card').forEach(x=>x.classList.toggle('selected',x===c));updateModeNote()}));
function updateModeNote(){const m=MODE[selectedMode],n=['手雷','燃烧瓶','烟雾弹','闪光弹'];$('#mode-note').textContent='投掷物：'+n.map((x,i)=>`${x}×${m.limits[i+2]>=99?'∞':m.limits[i+2]}`).join(' · ')}
function renderArsenal(){
  const slots=save.slots;$('#slot1 b').textContent=WEAPONS[slots[0]].name;$('#slot2 b').textContent=WEAPONS[slots[1]].name;
  const filter=$('#weapon-filters .active')?.dataset.filter||'全部';
  $('#weapon-list').innerHTML=WEAPON_KEYS.filter(k=>filter==='全部'||WEAPONS[k].type===filter).map(k=>{const w=WEAPONS[k];return `<button class="weapon-item ${k===selectedWeapon?'active':''}" data-weapon="${k}"><small>${w.type} · ${w.auto?'全自动':'单发'}</small><b>${w.name}</b><em class="locked">已拥有</em></button>`}).join('');
  $$('.weapon-item').forEach(b=>b.onclick=()=>{selectedWeapon=b.dataset.weapon;renderArsenal()});renderWeaponDetail();
}
function attachmentSlotsHTML(key,loadoutSlot=activeSlot){const config=weaponAttachments(key,loadoutSlot);return `<small>第 ${loadoutSlot+1} 栏配件 · 两把枪独立保存</small><div class="attachment-slots">${Object.keys(ATTACHMENT_SLOT_LABELS).filter(slot=>attachmentOptions(slot,key).length).map(slot=>{const a=attachmentById(slot,config[slot]);return `<button type="button" class="attachment-slot ${a?'':'empty'}" data-attachment-slot="${slot}"><small>${ATTACHMENT_SLOT_LABELS[slot]}</small><b>${a?a.name:'＋ 空槽'}</b></button>`}).join('')}</div>`}
function bindAttachmentSlots(container,key,onChange,loadoutSlot=activeSlot){container.querySelectorAll('[data-attachment-slot]').forEach(button=>button.onclick=()=>openAttachmentPicker(key,button.dataset.attachmentSlot,onChange,loadoutSlot))}
let attachmentPickerState=null;
function openAttachmentPicker(key,slot,onChange,loadoutSlot=activeSlot){attachmentPickerState={key,slot,onChange,loadoutSlot};const current=weaponAttachments(key,loadoutSlot)[slot],options=attachmentOptions(slot,key);$('#attachment-picker-title').textContent=`第 ${loadoutSlot+1} 栏 · ${WEAPONS[key].name} · ${ATTACHMENT_SLOT_LABELS[slot]}`;$('#attachment-options').innerHTML=options.map(a=>`<button type="button" class="ghost ${a.id===current?'active':''}" data-attachment-id="${a.id}"><b>${a.name}</b><small>${a.recoil?`后坐 ${a.recoil}`:''}${a.spread?`　精准 +${a.spread}`:''}${a.mag?`　容量 +${Math.round(a.mag*100)}%`:''}${a.reload?`　换弹 ×${a.reload}`:''}</small></button>`).join('');$$('#attachment-options [data-attachment-id]').forEach(button=>button.onclick=()=>setWeaponAttachment(key,slot,button.dataset.attachmentId,loadoutSlot));$('#remove-attachment').style.display=current?'block':'none';$('#attachment-picker').classList.remove('hidden')}
function closeAttachmentPicker(){$('#attachment-picker').classList.add('hidden');attachmentPickerState=null}
function setWeaponAttachment(key,slot,id,loadoutSlot=activeSlot){const store=attachmentStore(),config={...ensureSlotAttachments(loadoutSlot,key)};if(id)config[slot]=id;else delete config[slot];store.slots[loadoutSlot]||={};store.slots[loadoutSlot][key]=config;save.attachments=store;const ammo=game.ammo?.[loadoutSlot];if(ammo?.key===key){const w=effectiveWeapon(key,loadoutSlot);ammo.mag=Math.min(ammo.mag,w.mag)}const done=attachmentPickerState?.onChange;closeAttachmentPicker();done?.();if(gameActive)toast('配件已自动保存到当前账户');else notifyMenu('配件已自动保存到当前账户')}
$('#remove-attachment').onclick=()=>{if(attachmentPickerState)setWeaponAttachment(attachmentPickerState.key,attachmentPickerState.slot,null,attachmentPickerState.loadoutSlot)};$('#close-attachment-picker').onclick=closeAttachmentPicker;
// 军械库武器预览：用独立的小渲染器展示这把枪自己的 3D 外形与已装配件
let preview=null;
function ensurePreview(){
  if(preview)return preview;
  const canvas=document.createElement('canvas');canvas.className='gun-canvas';
  const r=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  r.setPixelRatio(Math.min(devicePixelRatio,1.6));
  r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.24;
  const s=new THREE.Scene();
  s.add(new THREE.HemisphereLight(0xffffff,0x2b3439,2.1));
  const key=new THREE.DirectionalLight(0xffffff,2.5);key.position.set(3,5,4);s.add(key);
  const rim=new THREE.DirectionalLight(0x74d8ff,1.9);rim.position.set(-4,1.5,-3.5);s.add(rim);
  const under=new THREE.DirectionalLight(0xa9ff37,.5);under.position.set(0,-3,2);s.add(under);
  const cam=new THREE.PerspectiveCamera(30,1.9,.05,20);cam.position.set(0,.05,2.6);cam.lookAt(0,0,0);
  preview={canvas,renderer:r,scene:s,camera:cam,model:null,spin:0};
  return preview;
}
function showWeaponPreview(key){
  const p=ensurePreview();
  if(p.model){p.scene.remove(p.model);p.model=null}
  p.model=buildWeaponModel(key,{tint:WEAPONS[key]?.color,detail:1,attachments:weaponAttachments(key,activeSlot)});
  const size=new THREE.Box3().setFromObject(p.model).getSize(new THREE.Vector3());
  p.model.scale.setScalar(clamp(1.55/Math.max(.6,size.x),.9,2.6));
  p.scene.add(p.model);
}
function renderPreviewFrame(dt){
  if(!preview||!preview.model||currentPage!=='arsenal')return;
  const host=$('.gun-visual');if(!host)return;
  const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
  if(preview.canvas.width!==Math.round(w*preview.renderer.getPixelRatio())){preview.renderer.setSize(w,h,false);preview.camera.aspect=w/h;preview.camera.updateProjectionMatrix()}
  preview.spin+=dt*.55;
  preview.model.rotation.y=Math.sin(preview.spin)*.62-.35;
  preview.model.rotation.x=Math.sin(preview.spin*.7)*.09-.06;
  preview.renderer.render(preview.scene,preview.camera);
}
function renderWeaponDetail(){const k=selectedWeapon,w=effectiveWeapon(k,activeSlot);const stats=[['伤害',w.damage,Math.min(100,w.damage)],['射速',w.rate+' RPM',Math.min(100,w.rate/10)],['稳定',100-w.recoil,100-w.recoil],['精准',w.spread,w.spread],['弹匣',w.mag,Math.min(100,w.mag)],['换弹',w.reload.toFixed(2)+' 秒',Math.max(8,100-w.reload*13)]];
  $('#weapon-detail').innerHTML=`<div class="gun-visual"><span class="gun-grid"></span></div><div class="weapon-meta"><div><small>${w.type.toUpperCase()} // ${w.auto?'AUTO':'SEMI'}</small><h3>${w.name}</h3><p>${w.desc}</p></div><span class="unlocked">已解锁</span></div><div class="stat-list">${stats.map(s=>`<div class="stat"><span>${s[0]}</span><i><b style="width:${s[2]}%"></b></i><b>${s[1]}</b></div>`).join('')}</div><div id="arsenal-attachments" class="attachment-loadout">${attachmentSlotsHTML(k,activeSlot)}</div><div class="weapon-actions"><button id="equip" class="primary">装备至第 ${activeSlot+1} 栏</button><button id="try" class="ghost">带入靶场</button></div>`;bindAttachmentSlots($('#arsenal-attachments'),k,renderWeaponDetail,activeSlot);
  $('.gun-visual').append(ensurePreview().canvas);showWeaponPreview(k);
  $('#equip').onclick=()=>{const s=save.slots;s[activeSlot]=k;ensureSlotAttachments(activeSlot,k);if(s[0]===s[1]){const other=1-activeSlot;s[other]=s[other]==='ak12'?'vector':'ak12';ensureSlotAttachments(other,s[other])}save.slots=s;renderArsenal();notifyMenu(`已装备至第 ${activeSlot+1} 栏`)};
  $('#try').onclick=()=>{const s=save.slots;s[activeSlot]=k;ensureSlotAttachments(activeSlot,k);save.slots=s;selectedMode='training';prepareGame()};
}
$$('#weapon-filters button').forEach(b=>b.onclick=()=>{$$('#weapon-filters button').forEach(x=>x.classList.toggle('active',x===b));renderArsenal()});
$$('.slot').forEach((b,i)=>b.onclick=()=>{activeSlot=i;selectedWeapon=save.slots[i];$$('.slot').forEach(x=>x.classList.toggle('active',x===b));renderArsenal()});
let menuNoticeTimer;function notifyMenu(text){clearTimeout(menuNoticeTimer);let n=document.querySelector('.menu-notice');if(!n){n=document.createElement('div');n.className='menu-notice';Object.assign(n.style,{position:'fixed',zIndex:99,bottom:'30px',left:'50%',transform:'translateX(-50%)',background:'#a9ff37',color:'#08100b',padding:'10px 20px',fontSize:'12px',fontWeight:700});document.body.append(n)}n.textContent=text;n.style.display='block';menuNoticeTimer=setTimeout(()=>n.style.display='none',2200)}
const net={ws:null,id:null,room:null,online:false,serverVersion:1,pendingMap:null,pendingSeed:null,pendingView:'third',lastSend:0,seq:0,matchEndsAt:0,awaitingFinalScoreAt:0,peerBots:new Map()};
function connectNetwork(action){
  if(net.ws&&net.ws.readyState===1){action();return}const proto=location.protocol==='https:'?'wss':'ws',port=new URLSearchParams(location.search).get('wsPort')||'8766';net.ws=new WebSocket(`${proto}://${location.hostname||'127.0.0.1'}:${port}`);$('#network-status').innerHTML='<i style="background:#ffba45"></i> 正在连接局域网作战服务…';
  net.ws.onopen=()=>{$('#network-status').innerHTML='<i style="background:#a9ff37"></i> 作战服务已连接';action()};
  net.ws.onerror=()=>{$('#network-status').innerHTML='<i style="background:#ff604e"></i> 无法连接；请先运行 shooting/server.py';notifyMenu('联机服务未启动，单机团队战仍可正常游玩')};
  net.ws.onclose=()=>{if(net.online)toast('联机连接已中断');net.online=false};net.ws.onmessage=e=>handleNetwork(JSON.parse(e.data));
}
function sendNet(data){if(net.ws?.readyState===1)net.ws.send(JSON.stringify(data))}
function handleNetwork(msg){
  if(msg.type==='welcome'){net.id=msg.id;net.serverVersion=Math.max(1,+msg.version||1);if(net.serverVersion<3)notifyMenu('联机服务版本过旧，请重启 server.py 后再开始对战');return}if(msg.type==='error'){notifyMenu(msg.message);return}
  if(msg.type==='room'){net.room=msg;net.pendingView=msg.view==='first'?'first':'third';renderRoomLobby();return}
  if(msg.type==='start'){selectedMode=msg.mode;net.online=true;net.pendingMap=msg.map;net.pendingSeed=+msg.seed||1;net.pendingView=msg.view==='first'?'first':net.room?.view==='first'?'first':'third';net.seq=0;net.awaitingFinalScoreAt=0;net.matchEndsAt=performance.now()/1000+(+msg.duration||MODE[msg.mode].time)+(+msg.startsIn||0);prepareGame();return}
  if((msg.type==='score'||msg.type==='match_end')&&net.online){if(msg.score){game.blue=+msg.score.blue||0;game.red=+msg.score.red||0;updateHUD()}if(msg.type==='match_end'||msg.final){finishNetworkGame()}return}
  if(msg.type==='state'&&net.online){
    const bot=net.peerBots.get(msg.from);
    if(bot&&(+msg.seq||0)>=(bot.netSeq??-1)){
      bot.netSeq=+msg.seq||0;const nextPosition=new THREE.Vector3(msg.x,msg.y||0,msg.z);
      if(!bot.netTarget){bot.netTarget=nextPosition.clone();bot.root.position.copy(nextPosition);bot.lastStep=performance.now()/1000}else bot.netTarget.copy(nextPosition);
      bot.netYaw=msg.yaw;bot.netStance=msg.stance||'stand';bot.netGait=['run','crouch','prone'].includes(msg.gait)?msg.gait:'walk';bot.netMoving=msg.moving!==false;bot.netDeaths=Math.max(bot.netDeaths||0,+msg.deaths||0);bot.hp=msg.hp;bot.armor=msg.armor??bot.armor;setRemoteWeapon(bot,msg.weapon,msg.attachments);
      const life=+msg.life||1;bot.netLife=life;
      if(msg.alive===false){bot.netDeadLife=life;if(bot.alive)beginBotDeath(bot,999)}else if(bot.netDeadLife!==life&&!bot.alive){bot.alive=true;bot.death=null;if(bot.teamMarker)bot.teamMarker.visible=true;bot.root.rotation.x=0;bot.root.rotation.z=0;bot.root.position.y=0;bot.root.visible=true;bot.parts.forEach(p=>p.userData._solid=true);setBotAnimation(bot,'idle')}
    }
    if(msg.score){game.blue=+msg.score.blue||0;game.red=+msg.score.red||0}else{if(msg.localScore){game.blue=Math.max(game.blue,+msg.localScore.blue||0);game.red=Math.max(game.red,+msg.localScore.red||0)}reconcilePeerScore()}if(Number.isFinite(+msg.remaining)){const estimate=performance.now()/1000+Math.max(0,+msg.remaining);net.matchEndsAt=net.matchEndsAt?net.matchEndsAt+(estimate-net.matchEndsAt)*.18:estimate}
  }
  if(msg.type==='hit'&&net.online){damagePlayer(+msg.damage||10,msg.name||'敌方干员',msg.weapon||'步枪',msg.from);sendLocalState()}
  if(msg.type==='death'&&net.online){game.syncedEffects.deaths++;const victimId=msg.victim||msg.from,victim=net.peerBots.get(victimId);if(msg.score){game.blue=+msg.score.blue||0;game.red=+msg.score.red||0}else if(victim){if(victim.team==='red')game.blue++;else game.red++}if(victim){victim.netDeaths=Math.max(victim.netDeaths||0,+msg.life||1);if(victim.alive){victim.netDeadLife=+msg.life||victim.netLife||1;beginBotDeath(victim,999);victim.parts.forEach(p=>p.userData._solid=false)}}if(!msg.score)reconcilePeerScore();if(msg.attacker===net.id)game.kills++;updateHUD();addFeed(msg.attackerName||'敌方干员',msg.victimName||victim?.name||'对手',msg.weapon||'步枪')}
  if(msg.type==='shot'&&net.online){const bot=net.peerBots.get(msg.from);if(bot){game.syncedEffects.shots++;const muzzle=bot.root.position.clone().add(new THREE.Vector3(0,1.4,0)),end=new THREE.Vector3(msg.x,msg.y,msg.z);spawnMuzzleEffect(muzzle,bot.team);spawnBotTracer(muzzle,end,bot.team,0);remoteShotSound(muzzle,msg.weaponKey||bot.netWeapon,bot.team);if(msg.impact)spawnImpact(end,msg.impact==='head'?0xff5140:msg.impact==='body'?0xffd098:0xd4d7c4)}}
  if(msg.type==='throw'&&net.online&&worldGroup){game.syncedEffects.throws++;const item=buildThrowable(+msg.item);item.position.set(msg.x,msg.y,msg.z);worldGroup.add(item);game.throwables.push({mesh:item,type:+msg.item,vel:new THREE.Vector3(msg.vx,msg.vy,msg.vz),timer:msg.timer,rest:false,remote:true})}
}
function reconcilePeerScore(){
  if(!net.online||!game.player)return;let blue=game.player.team==='red'?game.deaths:0,red=game.player.team==='blue'?game.deaths:0;for(const bot of net.peerBots.values()){if(bot.team==='red')blue+=bot.netDeaths||0;else red+=bot.netDeaths||0}game.blue=Math.max(game.blue,blue);game.red=Math.max(game.red,red);updateHUD()
}
function renderRoomLobby(){
  let lobby=$('#room-live');if(!lobby){lobby=document.createElement('section');lobby.id='room-live';lobby.className='room-rules';$('.room-layout').append(lobby)}const r=net.room,me=r.players.find(p=>p.id===net.id),host=r.host===net.id;
  lobby.innerHTML=`<h3>房间 ${r.code} <small style="color:#a9ff37">${MODE[r.mode].label} · ${r.view==='first'?'第一人称':'第三人称'}</small></h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><section><b style="color:#65caff">蓝队</b>${r.players.filter(p=>p.team==='blue').map(p=>`<p>${p.name}${p.id===r.host?' · 房主':''}</p>`).join('')||'<p>等待加入</p>'}</section><section><b style="color:#ff7868">红队</b>${r.players.filter(p=>p.team==='red').map(p=>`<p>${p.name}${p.id===r.host?' · 房主':''}</p>`).join('')||'<p>等待加入</p>'}</section></div><div style="display:flex;gap:8px;margin-top:15px"><button id="join-blue" class="ghost">加入蓝队</button><button id="join-red" class="ghost">加入红队</button>${host?'<button id="room-start" class="primary">房主部署</button>':''}</div>`;
  $('#join-blue').onclick=()=>sendNet({type:'team',team:'blue'});$('#join-red').onclick=()=>sendNet({type:'team',team:'red'});if($('#room-start'))$('#room-start').onclick=()=>sendNet({type:'start'});$('#network-status').innerHTML=`<i style="background:#a9ff37"></i> 已加入房间 ${r.code} · 你在${me?.team==='red'?'红':'蓝'}队`;
}
$('#create-room').onclick=()=>connectNetwork(()=>sendNet({type:'create',owner:activeAccount,name:$('#player-name').value,mode:$('#room-mode').value,view:$('#room-view').value}));
$('#join-room').onclick=()=>connectNetwork(()=>sendNet({type:'join',name:$('#player-name').value,code:$('#room-code').value.trim().toUpperCase()}));
$('#quick-start').onclick=prepareGame;

// ── 战场构建 ──────────────────────────────────────────────────────
const UNLIMITED_AMMO=Infinity;
const game={mode:null,map:null,mapSeed:null,phase:'menu',view:'first',time:0,blue:0,red:0,kills:0,deaths:0,blockedBotShots:0,aiStats:{shots:0,hits:0,blocked:0,targetSwitches:0,pathBuilds:0,pathFailures:0,unstucks:0},syncedEffects:{shots:0,throws:0,deaths:0},entities:[],throwables:[],effects:[],damageNumbers:[],soundEvents:[],audioStats:{footsteps:0,shots:0,lastFootstepVolume:0,lastFootstepDistance:0},colliders:[],rayTargets:[],rangeStations:[],nearStation:null,activeStation:null,playerStartZ:0,weather:null,keys:{},yaw:0,pitch:0,aiming:false,mouseDown:false,lastShot:0,lastStep:0,minimapAt:0,reloading:false,reloadAt:0,boltReady:true,boltCycling:false,boltAt:0,selected:1,lastSelected:1,stance:'stand',feet:0,velY:0,onGround:true,lastSafe:null,unstuckAt:0,playerMoving:false,player:null,playerModel:null,ammo:[],inventory:[],cook:null,spawnProtection:0,rangeDistance:25,rangeInvincible:true,rangeInfiniteMagazine:false,operatorBuildMs:0};
let viewGun=null,viewLight=null,muzzleLight=null,gunKick=0,gunBob=0,worldGroup=null,trajectoryPreview=null;

// 取消旧版局中存档：只保留按账户隔离的装备、设置与已完成比赛记录。
for(const key of Object.keys(localStorage))if(key==='rf-current-game'||/^rf-slot-\d+-current-game$/.test(key))localStorage.removeItem(key);
localStorage.removeItem('rf-active-slot');
function readMatchHistory(){
  if(!activeAccount)return[];
  try{
    const key=accountStorageKey('history'),data=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(data))return[];
    // 旧联机服务曾把已经发生击败/阵亡的对局错误保存为 0:0 平局；加载时自动移除这些无效记录。
    const valid=data.filter(entry=>!(entry?.online&&(+entry.blue||0)===0&&(+entry.red||0)===0&&((+entry.kills||0)>0||(+entry.deaths||0)>0)));
    if(valid.length!==data.length)localStorage.setItem(key,JSON.stringify(valid));return valid
  }catch{return[]}
}
function historyStats(history){const wins=history.filter(x=>x.result==='win').length,losses=history.filter(x=>x.result==='loss').length,draws=history.length-wins-losses,kills=history.reduce((n,x)=>n+(+x.kills||0),0),deaths=history.reduce((n,x)=>n+(+x.deaths||0),0);return{matches:history.length,wins,losses,draws,kills,deaths}}
function recordMatch(result){
  if(!activeAccount||selectedMode==='training'||!game.player)return;if(net.online&&game.blue===0&&game.red===0&&(game.kills>0||game.deaths>0)){toast('比分尚未同步，本局不会写入错误战绩');return}const history=readMatchHistory(),entry={savedAt:Date.now(),mode:selectedMode,modeLabel:game.mode.label,map:game.map.name,result:result===true?'win':result===false?'loss':'draw',blue:game.blue,red:game.red,kills:game.kills,deaths:game.deaths,online:net.online};history.push(entry);try{localStorage.setItem(accountStorageKey('history'),JSON.stringify(history))}catch{toast('比赛记录写入失败 · 浏览器空间不足')}renderAccountCenter()
}
function renderAccountCenter(){
  const history=readMatchHistory(),s=historyStats(history),rate=s.matches?Math.round(s.wins/s.matches*100):0,kd=s.deaths?(s.kills/s.deaths).toFixed(2):s.kills.toFixed(2);$('#current-account').textContent=activeAccount||'—';$('#account-summary').innerHTML=[['比赛',s.matches],['胜 / 负',`${s.wins} / ${s.losses}`],['胜率',`${rate}%`],['击败 / 阵亡',`${s.kills} / ${s.deaths} · ${kd}`]].map(([a,b])=>`<article><small>${a}</small><b>${b}</b></article>`).join('');$('#match-history').innerHTML=history.length?[...history].reverse().map(m=>{const label=m.result==='win'?'胜利':m.result==='loss'?'失败':'平局',date=new Date(m.savedAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});return`<article class="match-row"><b class="${m.result}">${label}</b><span>${m.modeLabel||m.mode}</span><span>${m.map}</span><span>${m.blue} — ${m.red} · ${m.online?'联机':'单机'}</span><span>击败 ${m.kills} / 阵亡 ${m.deaths}<small>${date}</small></span></article>`}).join(''):'<div class="match-empty">当前账户还没有比赛记录</div>'
}
function fallbackPasswordDigest(value){
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2],H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],bytes=new TextEncoder().encode(value),bitLength=bytes.length*8,size=Math.ceil((bytes.length+9)/64)*64,data=new Uint8Array(size),view=new DataView(data.buffer),rotate=(x,n)=>(x>>>n)|(x<<(32-n));data.set(bytes);data[bytes.length]=0x80;view.setUint32(size-8,Math.floor(bitLength/0x100000000));view.setUint32(size-4,bitLength>>>0);
  for(let offset=0;offset<size;offset+=64){const w=new Uint32Array(64);for(let i=0;i<16;i++)w[i]=view.getUint32(offset+i*4);for(let i=16;i<64;i++){const s0=rotate(w[i-15],7)^rotate(w[i-15],18)^(w[i-15]>>>3),s1=rotate(w[i-2],17)^rotate(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0}let[a,b,c,d,e,f,g,h]=H;for(let i=0;i<64;i++){const s1=rotate(e,6)^rotate(e,11)^rotate(e,25),ch=(e&f)^(~e&g),t1=(h+s1+ch+K[i]+w[i])>>>0,s0=rotate(a,2)^rotate(a,13)^rotate(a,22),maj=(a&b)^(a&c)^(b&c),t2=(s0+maj)>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0}H[0]=(H[0]+a)>>>0;H[1]=(H[1]+b)>>>0;H[2]=(H[2]+c)>>>0;H[3]=(H[3]+d)>>>0;H[4]=(H[4]+e)>>>0;H[5]=(H[5]+f)>>>0;H[6]=(H[6]+g)>>>0;H[7]=(H[7]+h)>>>0}return H.map(x=>x.toString(16).padStart(8,'0')).join('')
}
async function passwordDigest(value){if(globalThis.crypto?.subtle)try{const bytes=new TextEncoder().encode(value),digest=await crypto.subtle.digest('SHA-256',bytes);return[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch{}return fallbackPasswordDigest(value)}
function activateAccount(username){if(!ACCOUNT_CREDENTIALS[username])return false;activeAccount=username;activeSlot=0;audioSettings=save.audio;selectedWeapon=save.slots[0];localStorage.setItem('rf-session-account',username);$('.callsign').textContent=username;$('#player-name').value=username;$('#account-login').classList.add('hidden');$('#login-error').textContent='';$$('.slot').forEach((button,i)=>button.classList.toggle('active',i===0));syncFootstepSettingsUI();renderArsenal();renderAccountCenter();makeMenuScene();return true}
async function loginAccount(username,password){username=String(username||'').trim().toLowerCase();const expected=ACCOUNT_CREDENTIALS[username];if(!expected||await passwordDigest(String(password||''))!==expected)return false;return activateAccount(username)}
function showAccountLogin(){if(gameActive)backToMenu();activeAccount=null;audioSettings={footsteps:true,footstepVolume:.7};$('.callsign').textContent='未登录';$('#player-name').value='';$('#login-password').value='';$('#login-error').textContent='';$('#account-login').classList.remove('hidden');setTimeout(()=>$('#login-username').focus(),0)}
function logoutAccount(){localStorage.removeItem('rf-session-account');if(net.ws){net.ws.close();net.ws=null}net.online=false;net.room=null;showAccountLogin()}

function clearWorld(){while(scene.children.length)scene.remove(scene.children[0]);scene.userData.hero=null;scene.userData.menuMixer=null;game.entities=[];game.throwables=[];game.effects=[];game.damageNumbers=[];game.soundEvents=[];game.playerModel=null;$('#damage-numbers')?.replaceChildren();$('#workbench-readouts')?.replaceChildren();game.colliders=[];game.rayTargets=[];game.rangeStations=[];game.nearStation=null;game.activeStation=null;game.weather=null;trajectoryPreview=null;if(worldGroup){worldGroup.clear();worldGroup=null}}
function seededRandom(seed){let value=seed>>>0;return()=>{value=(value+0x6D2B79F5)|0;let t=Math.imul(value^(value>>>15),1|value);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
function modeMap(base){const scale=selectedMode==='1v1'?.82:selectedMode==='1v2'?.9:selectedMode==='2v2'?.95:selectedMode==='5v5'?1.18:1,label=scale<.8?'小型':scale>1.05?'大型':'标准';return scaleMap(base,scale,label)}
// 出生点固定贴着己方端墙，随地图尺寸自动缩放
function spawnZ(team,map=game.map){return (team==='blue'?1:-1)*(map.size-1.8)}
function playerSpawnZ(team,map=game.map){return (team==='blue'?1:-1)*(map.size-(game.view==='third'?5.2:1.8))}
function prepareGame(){
  if(!activeAccount){showAccountLogin();return}const range=selectedMode==='training';if(range){game.rangeDistance=10;game.rangeInvincible=false;game.rangeInfiniteMagazine=false}game.mode=MODE[selectedMode];game.map=range?RANGE_MAP:null;game.view=net.online?net.pendingView:preferredView;game.phase='deploy';game.time=game.mode.time;game.blue=game.red=game.kills=game.deaths=game.blockedBotShots=0;game.operatorBuildMs=0;game.lastBotDamage=null;game.aiStats={shots:0,hits:0,blocked:0,targetSwitches:0,pathBuilds:0,pathFailures:0,unstucks:0};game.audioStats={footsteps:0,shots:0,lastFootstepVolume:0,lastFootstepDistance:0};game.syncedEffects={shots:0,throws:0,deaths:0};
  $('#menu').classList.add('hidden');$('#game').classList.remove('hidden');$('#game').prepend(renderer.domElement);$('#deploy').classList.remove('hidden');$('#pause').classList.add('hidden');$('#workbench-panel').classList.add('hidden');$('#reconnect-panel').classList.add('hidden');$('#map-transition').classList.add('hidden');$('#result-screen').classList.add('hidden');hideDamageIndicator();
  $('#deploy-title').textContent=range?game.map.name:'未知战区';$('#deploy-desc').textContent=range?`${game.map.sub} · 当前靶距 ${game.rangeDistance} 米`:`${game.mode.label} · 地图将在进入战场后随机生成`;
  $('.scoreboard').classList.toggle('hidden',range);$('#team-preview').classList.toggle('range-preview',range);$('#team-preview').innerHTML=range?[1,2,3,4,5].map(i=>`<i>靶 ${i}</i>`).join(''):net.online&&net.room?net.room.players.map(p=>`<i class="${p.team==='red'?'enemy':''}">${p.name} · ${p.team==='red'?'红':'蓝'}</i>`).join(''):[...Array(game.mode.team)].map((_,i)=>`<i>${i?'AI':'你'}</i>`).join('')+[...Array(game.mode.team)].map(()=>'<i class="enemy">敌</i>').join('');
  $('#range-settings').classList.toggle('hidden',!range);$('#range-status').classList.toggle('hidden',!range);$('#objective-text').textContent=range?'五条开放靶道 · 工作台单独设置':'5 分钟内取得更多击败';
  if(range){buildBattlefield(game.map);setupPlayer();spawnTeams();updateRangeUI();updateHUD();enterBattle()}else{$('#range-status').classList.add('hidden')}
}
function updateRangeUI(){
  $('#range-distance').value=game.rangeDistance;$('#range-distance-value').textContent=`${game.rangeDistance} 米`;$('#range-invincible').checked=game.rangeInvincible;$('#range-infinite-mag').checked=game.rangeInfiniteMagazine;$('#workbench-infinite-mag').checked=game.rangeInfiniteMagazine;
  $('#range-status').innerHTML=`按 <b>R</b> 切换无限弹夹：<b>${game.rangeInfiniteMagazine?'开启':'关闭'}</b> · 靠近工作台按 <b>E</b> 设置`;
  if(game.map?.range)$('#deploy-desc').textContent=`${game.map.sub} · 当前靶距 ${game.rangeDistance} 米`;
}
function setRangeDistance(value,announce=false){
  game.rangeDistance=clamp(Math.round(Number(value)/5)*5,10,45);const z=game.player?game.player.pos.z-game.rangeDistance:0;
  for(const target of game.entities.filter(b=>b.rangeTarget)){target.rangeDistance=game.rangeDistance;target.rangeZ=z;target.root.position.x=target.rangeX;target.root.position.z=z}
  updateRangeUI();if(announce&&game.map?.range)toast(`靶标距离：${game.rangeDistance} 米`);
}
function setRangeInvincible(enabled,announce=false){game.rangeInvincible=!!enabled;for(const target of game.entities.filter(b=>b.rangeTarget))target.rangeInvincible=game.rangeInvincible;updateRangeUI();if(announce&&game.map?.range)toast(`无敌靶已${game.rangeInvincible?'开启':'关闭'}`)}
function setRangeInfiniteMagazine(enabled,announce=false){game.rangeInfiniteMagazine=!!enabled;if(game.rangeInfiniteMagazine){game.reloading=false;game.boltCycling=false;game.boltReady=true;game.ammo.forEach((ammo,i)=>{const w=effectiveWeapon(ammo.key,i);ammo.mag=w.mag})}updateRangeUI();updateHUD();if(announce&&game.map?.range)toast(`无限弹夹已${game.rangeInfiniteMagazine?'开启 · 无需换弹':'关闭'}`)}
$('#range-distance').addEventListener('input',e=>setRangeDistance(e.target.value));
$('#range-invincible').addEventListener('change',e=>setRangeInvincible(e.target.checked));
$('#range-infinite-mag').addEventListener('change',e=>setRangeInfiniteMagazine(e.target.checked,true));
function setTargetDistance(target,value){target.rangeDistance=clamp(Math.round(Number(value)),10,45);target.rangeZ=game.playerStartZ-target.rangeDistance;target.root.position.x=target.rangeX;target.root.position.z=target.rangeZ;if(game.activeStation?.target===target)$('#target-distance-value').textContent=`${target.rangeDistance} 米`}
function setTargetInvincible(target,enabled){target.rangeInvincible=!!enabled;if(target.rangeInvincible)target.takedownStartedAt=null}
function updateRangeInteraction(){
  if(!game.map?.range||game.phase!=='playing'){$('#interaction').textContent='';game.nearStation=null;return}let nearest=null,best=Infinity;for(const station of game.rangeStations){const d=Math.hypot(game.player.pos.x-station.x,game.player.pos.z-station.z);if(d<best){best=d;nearest=station}}
  game.nearStation=best<=2.35?nearest:null;$('#interaction').textContent=game.nearStation?`按 E 使用 ${game.nearStation.target.name} 工作台`:'靠近工作台可单独设置靶标';
}
function openWorkbench(station){
  if(!station||game.phase!=='playing')return;setAiming(false,true);game.activeStation=station;game.phase='workbench';game.mouseDown=false;document.exitPointerLock?.();$('#workbench-title').textContent=`${station.target.name} 工作台`;$('#target-last-takedown').textContent=Number.isFinite(station.target.lastTakedownSeconds)?`${station.target.lastTakedownSeconds.toFixed(2)} 秒`:'暂无记录';$('#target-distance').value=station.target.rangeDistance;$('#target-distance-value').textContent=`${station.target.rangeDistance} 米`;$('#target-invincible').checked=station.target.rangeInvincible;$('#workbench-infinite-mag').checked=game.rangeInfiniteMagazine;$('#workbench-weapon').innerHTML=WEAPON_KEYS.map(k=>`<option value="${k}">${weaponLabel(WEAPONS[k])}</option>`).join('');const slot=Math.max(0,Math.min(1,(game.selected<=2?game.selected:game.lastSelected)-1));game.workbenchSlot=slot;$('#workbench-weapon').value=game.ammo[slot].key;renderWorkbenchAttachments();$('#workbench-panel').classList.remove('hidden');$('#interaction').textContent='';
}
function updateWorkbenchDisplay(target){
  const display=target?.workbenchDisplay;if(!display)return;display.value.textContent=Number.isFinite(target.lastTakedownSeconds)?`${target.lastTakedownSeconds.toFixed(2)} 秒`:'暂无记录';
}
function updateWorkbenchReadouts(){
  if(!game.map?.range||!game.player)return;for(const station of game.rangeStations){const element=station.target.workbenchDisplay?.element;if(!element)continue;const distance=Math.hypot(game.player.pos.x-station.x,game.player.pos.z-station.z),point=new THREE.Vector3(station.x,1.18,station.z).project(camera),visible=distance<7&&point.z>-1&&point.z<1;if(!visible){element.style.display='none';continue}element.style.display='block';element.style.left=`${(point.x*.5+.5)*innerWidth}px`;element.style.top=`${(-point.y*.5+.5)*innerHeight}px`;element.style.opacity=String(clamp(1-(distance-5.5)/1.5,.25,1))}
}
function closeWorkbench(){if(game.phase!=='workbench')return;$('#workbench-panel').classList.add('hidden');game.phase='playing';game.activeStation=null;renderer.domElement.requestPointerLock();clock.getDelta()}
function equipRangeWeapon(slot){const key=$('#workbench-weapon').value;game.workbenchSlot=slot;ensureSlotAttachments(slot,key);const w=effectiveWeapon(key,slot);if(!w)return;game.ammo[slot]={key,mag:w.mag,reserve:UNLIMITED_AMMO};game.selected=slot+1;game.lastSelected=slot+1;game.reloading=false;game.boltReady=true;game.boltCycling=false;renderWorkbenchAttachments();rebuildViewGun();updateHUD();toast(`已装备到第 ${slot+1} 栏 · 配件独立保存`)}
function renderWorkbenchAttachments(){const key=$('#workbench-weapon').value,loadoutSlot=game.workbenchSlot??0,container=$('#workbench-attachments');if(!key||!container)return;container.innerHTML=attachmentSlotsHTML(key,loadoutSlot);bindAttachmentSlots(container,key,()=>{renderWorkbenchAttachments();rebuildViewGun();updateHUD()},loadoutSlot)}
$('#target-distance').addEventListener('input',e=>{if(game.activeStation)setTargetDistance(game.activeStation.target,e.target.value)});
$('#target-invincible').addEventListener('change',e=>{if(game.activeStation)setTargetInvincible(game.activeStation.target,e.target.checked)});
$('#workbench-infinite-mag').addEventListener('change',e=>setRangeInfiniteMagazine(e.target.checked,true));
$('#workbench-weapon').addEventListener('change',renderWorkbenchAttachments);
$('#equip-range-slot1').onclick=()=>equipRangeWeapon(0);$('#equip-range-slot2').onclick=()=>equipRangeWeapon(1);$('#close-workbench').onclick=closeWorkbench;
function buildBattlefield(map,seed=null){
  clearWorld();worldGroup=new THREE.Group();scene.add(worldGroup);
  const addSolid=(x,z,w,h,d,material,kind='cover',baseY=0)=>{
    const m=box(w,h,d,material,x,baseY+h/2,z);m.userData.solid=true;m.userData.kind=kind;
    worldGroup.add(m);game.colliders.push({x,z,w,d,base:baseY,top:baseY+h,kind,mesh:m});game.rayTargets.push(m);return m;
  };
  game.mapSeed=seed;buildArena(map,{scene,worldGroup,renderer,addSolid,collides,random:seed==null?Math.random:seededRandom(seed)});
  buildViewModel();
}

function setupPlayer(){
  const slots=save.slots,me=net.online?net.room?.players.find(p=>p.id===net.id):null,team=me?.team||'blue',startZ=game.map.range?game.map.size-5:playerSpawnZ(team);game.playerStartZ=startZ;game.feet=0;game.velY=0;game.player={pos:new THREE.Vector3(game.map.range?1.8:0,1.68,startZ),hp:100,armor:50,alive:true,life:1,team,name:me?.name||activeAccount||'你'};game.lastSafe={x:game.player.pos.x,z:game.player.pos.z,feet:0};camera.position.copy(game.player.pos);game.yaw=team==='blue'?0:Math.PI;game.pitch=0;camera.rotation.order='YXZ';
  game.ammo=slots.map((k,i)=>{ensureSlotAttachments(i,k);const w=effectiveWeapon(k,i);return{key:k,mag:w.mag,reserve:UNLIMITED_AMMO}});game.selected=1;game.lastSelected=1;game.stance='stand';game.inventory=[0,0,...game.mode.limits.slice(2)];game.reloading=false;game.boltReady=true;game.boltCycling=false;game.cook=null;hideTrajectoryPreview();setAiming(false,true);setupPlayerAvatar();applyViewMode(game.view,false);
}
// 视角武器锚点：按每把枪的真实尺寸推算握把与瞄具位置，保证任何枪型都握持自然、开镜居中
const VM_SCALE=.55;
function viewGunAnchors(key){
  const s=WEAPON_SPECS[key]||WEAPON_SPECS.ak12,S=VM_SCALE;
  const bullpup=s.lay==='bullpup',gripX=(bullpup?s.recL*.10:-s.recL*.13)*S,gripY=(-s.recH*.5-.065)*S;
  const railY=(s.prof==='tube'||s.prof==='rounded')?s.recH*.42:s.recH*.5;
  const sightX=(bullpup?s.recL*.08:-s.recL/2+s.recL*.36)*S;
  const sightY=(railY+(s.scope==='bigscope'?.062:s.scope==='lowscope'?.048:.034)+(s.handle?.09:.012))*S;
  return{
    rest:{x:.155,y:-.205-gripY,z:-.42+gripX},
    ads:{x:0,y:-sightY,z:-.3+sightX}
  };
}
function mountViewGun(key){
  if(viewGun)camera.remove(viewGun);
  const w=WEAPONS[key]||WEAPONS.ak12;
  const loadoutSlot=Math.max(0,Math.min(1,(game.selected<=2?game.selected:game.lastSelected)-1));viewGun=buildWorldGun(w.color,key,1,weaponAttachments(key,loadoutSlot));
  addFirstPersonHands(viewGun,WEAPON_SPECS[key]);
  viewGun.scale.setScalar(VM_SCALE);
  viewGun.rotation.set(-.025,Math.PI/2+.05,.02);
  const anchors=viewGunAnchors(key);
  viewGun.userData.anchors=anchors;
  viewGun.position.set(anchors.rest.x,anchors.rest.y,anchors.rest.z);
  camera.add(viewGun);
  muzzleLight=new THREE.PointLight(0xffc46a,0,5,2);
  muzzleLight.position.set((viewGun.userData.muzzleX||.5)+.12,0,0);
  viewGun.add(muzzleLight);
  return viewGun;
}
function buildViewModel(){
  mountViewGun(save.slots[0]);scene.add(camera);
  if(!viewLight){viewLight=new THREE.PointLight(0xe7f1f8,7,4.5,2);viewLight.position.set(-.5,.7,.7);camera.add(viewLight)}
}
function rebuildPlayerWorldGun(){const avatar=game.playerModel;if(!avatar)return;if(avatar.gun)avatar.root.remove(avatar.gun);avatar.gun=null;if(game.selected<1||game.selected>2)return;const key=game.ammo[game.selected-1]?.key;if(!key)return;const gun=buildWorldGun(WEAPONS[key].color,key,0,weaponAttachments(key,game.selected-1));gun.rotation.y=Math.PI/2;gun.position.set(.16,1.2,-.3);avatar.root.add(gun);avatar.gun=gun}
function rebuildViewGun(){const sel=game.selected;if(sel===0||sel>2){if(viewGun)viewGun.visible=false;rebuildPlayerWorldGun();return}mountViewGun(game.ammo[sel-1].key);viewGun.visible=game.view!=='third';rebuildPlayerWorldGun()}
function setupPlayerAvatar(){const {root}=buildOperator(game.player.team,{castShadow:false});root.position.set(game.player.pos.x,game.feet,game.player.pos.z);worldGroup.add(root);game.playerModel={root,gun:null};rebuildPlayerWorldGun()}
function applyViewMode(mode,announce=false){game.view=mode==='third'?'third':'first';if(!net.online)preferredView=game.view;if(game.playerModel)game.playerModel.root.visible=game.view==='third'&&game.player.alive;if(viewGun)viewGun.visible=game.view==='first'&&game.selected>=1&&game.selected<=2;const label=game.view==='third'?'第三人称':'第一人称';$('#view-status').textContent=net.online?`${label} · 房间统一`:`${label} · V 切换`;if(announce)toast(net.online?`联机房间统一为${label}`:`已切换为${label}`)}
function toggleViewMode(){if(net.online){toast(`联机对战统一使用${game.view==='third'?'第三人称':'第一人称'}`);return}applyViewMode(game.view==='third'?'first':'third',true)}


function spawnTeams(){
  const n=game.mode.team,map=game.map;if(map.range){const z=game.playerStartZ-game.rangeDistance;[-9,-5.4,-1.8,1.8,5.4].forEach((x,i)=>{const target=createBot('red',x,z,`靶标 ${i+1}`);target.rangeTarget=true;target.rangeX=x;target.rangeZ=z;target.rangeDistance=game.rangeDistance;target.rangeInvincible=game.rangeInvincible;target.armor=0;target.root.rotation.y=Math.PI;setBotAnimation(target,'idle');createRangeWorkbench(target,i)});return}if(net.online&&net.room){net.peerBots.clear();let bi=0,ri=0;for(const p of net.room.players){if(p.id===net.id)continue;const idx=p.team==='blue'?bi++:ri++,z=spawnZ(p.team)-(p.team==='blue'?2:-2),b=createBot(p.team,-5+idx*3,z,p.name);b.remote=true;b.peerId=p.id;addTeamMarker(b);net.peerBots.set(p.id,b)}return}
  for(let i=0;i<n;i++)if(i>0){const b=createBot('blue',-6+i*3,spawnZ('blue')-2-Math.floor(i/3)*2.5,`蓝队-${i+1}`);addTeamMarker(b)}
  for(let i=0;i<n;i++){const b=createBot('red',-6+i*3,spawnZ('red')+2+Math.floor(i/3)*2.5,`红队-${i+1}`);addTeamMarker(b)}
}
function createRangeWorkbench(target,index){
  const root=new THREE.Group(),z=game.playerStartZ-4.5;root.position.set(target.rangeX,0,z);const metal=mat(0x26342e,.72,.55),edge=mat(0x53655c,.55,.7),screenMat=new THREE.MeshStandardMaterial({color:0x18251f,emissive:0x2f6b48,emissiveIntensity:.8,roughness:.25,metalness:.45});
  const top=box(2.15,.12,.88,metal,0,1,0);top.userData.solid=true;root.add(top);for(const x of[-.88,.88])for(const zz of[-.3,.3])root.add(box(.1,.92,.1,edge,x,.48,zz));
  const consoleBase=box(.94,.12,.42,edge,0,1.12,-.08);consoleBase.rotation.x=-.2;root.add(consoleBase);const screen=box(.72,.035,.27,screenMat,0,1.21,-.12);screen.rotation.x=-.2;root.add(screen);const element=document.createElement('div');element.className='workbench-readout';element.innerHTML=`<small>${target.name}工作台</small><b>暂无记录</b><span>上次击倒用时</span>`;$('#workbench-readouts').append(element);target.workbenchDisplay={element,value:element.querySelector('b')};updateWorkbenchDisplay(target);
  const light=mesh(new THREE.SphereGeometry(.035,7,5),new THREE.MeshBasicMaterial({color:0xa9ff37}),.34,1.24,-.2);root.add(light);worldGroup.add(root);game.rayTargets.push(top,consoleBase,screen);game.colliders.push({x:target.rangeX,z,w:2.15,d:.88,base:0,top:1.06,kind:'prop',mesh:top});
  game.rangeStations.push({index,target,root,x:target.rangeX,z});
}
function createBot(team,x,z,name){
  const started=performance.now(),{root,parts}=buildOperator(team,{castShadow:false});
  game.operatorBuildMs+=performance.now()-started;
  root.position.set(x,0,z);
  parts.forEach(p=>{p.userData.bot=null;game.rayTargets.push(p)});
  const botKey=['ak12','m4','scar','qbz95','aug','g36','ump45','m249','rpk','an94'][Math.floor(Math.random()*10)];
  const gun=buildWorldGun(undefined,botKey,0);gun.rotation.y=Math.PI/2;gun.position.set(.16,1.2,-.3);root.add(gun);
  const botWeapon=WEAPONS[botKey],bot={root,parts,worldGun:gun,spawn:new THREE.Vector3(x,0,z),lastSafe:new THREE.Vector3(x,0,z),team,name,hp:100,armor:50,alive:true,life:1,netLife:1,netSeq:-1,netWeapon:botKey,weaponKey:botKey,mag:botWeapon.mag,reloading:false,reloadTimer:0,spawnProtection:0,target:null,cooldown:Math.random()*60/botWeapon.rate,think:0,strafe:Math.random()>.5?1:-1,skill:.9+Math.random()*.09,targetVelocity:new THREE.Vector3(),trackedPosition:null,respawn:0,flash:0,fire:0,anim:'none',idlePhase:Math.random()*6.283,lastStep:performance.now()/1000-Math.random()*.4,navPath:null,navIndex:0,navRepath:0,navGoal:null,navHeading:new THREE.Vector2(0,1),avoidSide:Math.random()>.5?1:-1,stuckTime:0,escapeTimer:0};
  parts.forEach(p=>p.userData.bot=bot);worldGroup.add(root);game.entities.push(bot);return bot;
}
function addTeamMarker(bot){const ally=bot.team===game.player.team,c=document.createElement('canvas');c.width=384;c.height=64;const x=c.getContext('2d');x.fillStyle=ally?'rgba(20,82,110,.88)':'rgba(116,35,31,.88)';x.fillRect(0,5,384,54);x.strokeStyle=ally?'#66d4ff':'#ff7468';x.lineWidth=3;x.strokeRect(2,7,380,50);x.fillStyle='#fff';x.font='700 26px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(`${ally?'队友':'对手'} · ${bot.name}`,192,32);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const marker=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false,sizeAttenuation:true}));marker.position.set(0,2.5,0);marker.scale.set(.6,.1,1);bot.root.add(marker);bot.teamMarker=marker}
function setRemoteWeapon(bot,key,attachments={}){
  key=WEAPONS[key]?key:null;attachments=attachments&&typeof attachments==='object'?attachments:{};const attachmentKey=JSON.stringify(attachments);if(bot.netWeapon===key&&bot.netAttachmentsKey===attachmentKey)return;if(bot.worldGun)bot.worldGun.parent?.remove(bot.worldGun);bot.worldGun=null;bot.netWeapon=key;bot.netAttachmentsKey=attachmentKey;if(!key)return;const gun=buildWorldGun(WEAPONS[key].color,key,0,attachments);bot.worldGun=gun;gun.scale.setScalar(1);gun.rotation.y=Math.PI/2;gun.position.set(.18,1.35,-.3);bot.root.add(gun)
}
function setBotAnimation(bot,wanted){bot.anim=wanted}

// ── 操作输入 ──────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  game.keys[e.code]=true;if(!gameActive)return;
  if(game.phase==='workbench'){if(e.code==='KeyR'&&!e.repeat){e.preventDefault();setRangeInfiniteMagazine(!game.rangeInfiniteMagazine,true)}else if(e.code==='Escape')closeWorkbench();return}
  if(e.code==='KeyR'&&!e.repeat&&game.map?.range&&game.phase==='playing'){e.preventDefault();setRangeInfiniteMagazine(!game.rangeInfiniteMagazine,true);return}
  if(e.code==='KeyE'&&!e.repeat&&game.map?.range&&game.phase==='playing'&&game.nearStation){e.preventDefault();openWorkbench(game.nearStation);return}
  if(e.code==='Escape'&&game.phase==='playing')pauseGame();
  if(e.code==='KeyF'&&!e.repeat&&game.onGround&&game.stance!=='prone'){game.velY=6.4;game.onGround=false}
  if(e.code==='KeyG'&&!e.repeat)setStance(game.stance==='crouch'?'stand':'crouch');
  if(e.code==='KeyH'&&!e.repeat)setStance(game.stance==='prone'?'stand':'prone');
  if(e.code==='KeyV'&&!e.repeat)toggleViewMode();
  if(e.code==='KeyQ'&&!e.repeat)setAiming(!game.aiming);
  if(e.code==='KeyE')startReload();
  if(/^Digit[1-6]$/.test(e.code)&&!e.repeat)selectItem(+e.code.slice(-1));
});
document.addEventListener('keyup',e=>game.keys[e.code]=false);
document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==renderer.domElement||game.phase!=='playing')return;const aimScale=game.aiming?Math.max(.22,aimFov()/72):1;game.yaw-=e.movementX*.0019*aimScale;game.pitch=clamp(game.pitch-e.movementY*.0018*aimScale,-1.48,1.48);camera.rotation.set(game.pitch,game.yaw,0,'YXZ')});
renderer.domElement.addEventListener('mousedown',e=>{if(game.phase!=='playing'||document.pointerLockElement!==renderer.domElement)return;if(e.button===2){if(game.cook)cancelThrow();else startReload();return}if(e.button!==0)return;game.mouseDown=true;if(game.selected>=3)startCook();else tryShoot(performance.now()/1000)});
document.addEventListener('mouseup',e=>{if(e.button===0){game.mouseDown=false;if(game.cook)throwItem()}});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
function setStance(s){game.stance=s;$$('#stance span').forEach(x=>x.classList.toggle('active',x.dataset.stance===s));toast(s==='stand'?'站立姿态':s==='crouch'?'蹲伏：散布降低':'卧倒：降低受弹面积')}
function selectItem(n){setAiming(false);if(game.selected===n){game.selected=0;game.cook=null;toast('收起装备 · 移速提升')}else{game.selected=n;game.lastSelected=n;game.cook=null;if(n>=3&&game.inventory[n-1]<=0){toast('该投掷物已耗尽');game.selected=0}}hideTrajectoryPreview();game.reloading=false;rebuildViewGun();updateHUD()}

function enterBattle(){if(game.phase!=='deploy')return;gameActive=true;$('#deploy').classList.add('hidden');renderer.domElement.requestPointerLock();clock.getDelta();if(game.map?.range){game.phase='playing';toast('靶场开放 · 靠近工作台按 E 设置');return}startRandomDeployment()}
function startRandomDeployment(){
  game.phase='transition';const transition=$('#map-transition'),label=$('#map-transition-name'),names=MAPS.map(m=>m.name);transition.classList.remove('hidden');let index=0;label.textContent='正在随机生成战区';const cycling=setInterval(()=>{label.textContent=names[index++%names.length]},110);
  setTimeout(()=>{clearInterval(cycling);const mapIndex=net.online&&net.pendingMap!=null?net.pendingMap:Math.floor(Math.random()*MAPS.length);game.map=modeMap(MAPS[mapIndex]);buildBattlefield(game.map,net.online?net.pendingSeed:null);setupPlayer();spawnTeams();updateHUD();label.textContent=`战区锁定 · ${game.map.name}`},650);
  setTimeout(()=>{transition.classList.add('hidden');game.phase='playing';clock.getDelta();toast('游戏开始 · 5 分钟内取得更多击败');if(document.pointerLockElement!==renderer.domElement)showReconnectMode()},1250);
}
$('#deploy-btn').onclick=enterBattle;
$('#deploy-back').onclick=backToMenu;$('#resume').onclick=()=>{$('#pause').classList.add('hidden');game.phase='playing';renderer.domElement.requestPointerLock()};$('#leave-game').onclick=backToMenu;
$('#pause-guide').onclick=()=>toast(game.map?.range?'Q 开镜 · R 无限弹夹 · E 工作台 · 鼠标右键换弹':'WASD 移动 · Q 开镜 · F/G/H 姿态 · E / 鼠标右键换弹');
function pauseGame(){setAiming(false,true);game.phase='paused';syncFootstepSettingsUI();document.exitPointerLock?.();$('#pause').classList.remove('hidden')}
function showReconnectMode(){if(!gameActive||game.phase!=='playing'||!game.player?.alive)return;setAiming(false,true);game.phase='reconnecting';game.keys={};game.mouseDown=false;game.cook=null;hideTrajectoryPreview();$('#cook').style.display='none';$('#reconnect-panel').classList.remove('hidden')}
function reconnectGame(){if(game.phase!=='reconnecting')return;game.keys={};$('#reconnect-panel').classList.add('hidden');game.phase='playing';clock.getDelta();const request=renderer.domElement.requestPointerLock();request?.catch?.(()=>showReconnectMode());setTimeout(()=>{if(game.phase==='playing'&&document.pointerLockElement!==renderer.domElement)showReconnectMode()},350)}
$('#reconnect-game').onclick=reconnectGame;$('#reconnect-home').onclick=backToMenu;
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==renderer.domElement)setTimeout(showReconnectMode,0)});
document.addEventListener('visibilitychange',()=>{if(document.hidden)showReconnectMode()});
function backToMenu(){setAiming(false,true);hideDamageIndicator();gameActive=false;game.phase='menu';net.online=false;net.pendingMap=null;net.pendingSeed=null;document.exitPointerLock?.();$('#workbench-panel').classList.add('hidden');$('#game').classList.add('hidden');$('#menu').classList.remove('hidden');$('#menu').prepend(renderer.domElement);makeMenuScene();setPage('home')}
$('#result-home').onclick=backToMenu;$('#play-again').onclick=prepareGame;

// ── 移动、碰撞与姿态 ──────────────────────────────────────────────
// ── 立体碰撞：支持踩上掩体、货箱与高架平台 ────────────────────────
const STEP_UP=.6;
// 脚下能站住的最高平面（超过抬腿高度的算障碍，不算地面）
function groundAt(x,z,feet,r=.36){
  let g=0;
  for(const c of game.colliders){
    if(Math.abs(x-c.x)>=c.w/2+r||Math.abs(z-c.z)>=c.d/2+r)continue;
    if(c.top<=feet+STEP_UP&&c.top>g)g=c.top;
  }
  return g;
}
// 只有高出抬腿高度、且确实挡在身体高度区间内的实体才阻挡移动
function blocked(x,z,feet,r=.36,height=1.8){
  for(const c of game.colliders){
    if(Math.abs(x-c.x)>=c.w/2+r||Math.abs(z-c.z)>=c.d/2+r)continue;
    if(c.top>feet+STEP_UP&&c.base<feet+height)return true;
  }
  return false;
}
function recoverPlayerFromGeometry(){
  if(!game.player)return false;const p=game.player.pos,eye=game.stance==='stand'?1.68:game.stance==='crouch'?1.15:.55,bodyH=game.stance==='prone'?.7:game.stance==='crouch'?1.3:1.8,feet=game.feet||0;
  if(Number.isFinite(p.x)&&Number.isFinite(p.z)&&!blocked(p.x,p.z,feet,.36,bodyH)){if(game.onGround)game.lastSafe={x:p.x,z:p.z,feet};return false}
  const limitX=(game.map?.width||game.map?.size||30)-1,limitZ=(game.map?.size||30)-1;let safe=null;for(let radius=.3;radius<=4&&!safe;radius+=.3)for(let i=0;i<24;i++){const angle=i*Math.PI/12,x=p.x+Math.cos(angle)*radius,z=p.z+Math.sin(angle)*radius;if(Math.abs(x)>limitX||Math.abs(z)>limitZ)continue;const g=groundAt(x,z,feet,.36),nextFeet=Math.max(feet,g);if(g<=feet+STEP_UP+.05&&!blocked(x,z,nextFeet,.36,bodyH)){safe={x,z,feet:nextFeet};break}}
  safe||=game.lastSafe||{x:game.map?.range?1.8:0,z:game.playerStartZ||0,feet:0};p.x=safe.x;p.z=safe.z;game.feet=safe.feet;p.y=safe.feet+eye;game.velY=0;game.onGround=true;game.lastSafe={...safe};const now=performance.now();if(now-game.unstuckAt>1200){game.unstuckAt=now;toast('检测到卡位 · 已自动脱困')}return true
}
function collides(x,z,r=.36){return blocked(x,z,0,r)}
function updatePlayer(dt){
  if(!game.player.alive){if(game.playerModel)game.playerModel.root.visible=false;return}let f=(game.keys.KeyW?1:0)-(game.keys.KeyS?1:0),r=(game.keys.KeyD?1:0)-(game.keys.KeyA?1:0);const len=Math.hypot(f,r)||1;f/=len;r/=len;
  let speed=game.selected===0?5.3:4.7;if(game.keys.ShiftLeft&&f>0&&game.stance==='stand'&&!game.aiming)speed*=1.34;if(game.aiming)speed*=.76;if(game.stance==='crouch')speed*=.58;if(game.stance==='prone')speed*=.24;
  const sx=(-Math.sin(game.yaw)*f+Math.cos(game.yaw)*r)*speed*dt,sz=(-Math.cos(game.yaw)*f-Math.sin(game.yaw)*r)*speed*dt;
  const p=game.player.pos;
  const eye=game.stance==='stand'?1.68:game.stance==='crouch'?1.15:.55,bodyH=game.stance==='prone'?.7:game.stance==='crouch'?1.3:1.8;
  recoverPlayerFromGeometry();const oldX=p.x,oldZ=p.z;
  let feet=game.feet;
  if(!blocked(p.x+sx,p.z,feet,.36,bodyH))p.x+=sx;
  if(!blocked(p.x,p.z+sz,feet,.36,bodyH))p.z+=sz;
  game.velY-=15*dt;feet+=game.velY*dt;
  const ground=groundAt(p.x,p.z,feet);
  if(feet<=ground){feet=ground;game.velY=0;game.onGround=true}else game.onGround=false;
  game.feet=feet;
  // 站上台阶或落地时镜头平滑跟随，跳跃过程保持真实弧线
  const targetY=feet+eye;
  p.y+=(targetY-p.y)*Math.min(1,dt*(game.onGround?14:26));
  if(game.playerModel){const avatar=game.playerModel.root;avatar.visible=game.view==='third';avatar.position.set(p.x,feet,p.z);avatar.rotation.y=game.yaw;const stanceScale=game.stance==='prone'?.34:game.stance==='crouch'?.7:1;avatar.scale.y+=(stanceScale-avatar.scale.y)*Math.min(1,dt*14)}
  if(game.view==='third'){const forward=new THREE.Vector3(-Math.sin(game.yaw),0,-Math.cos(game.yaw)),right=new THREE.Vector3(Math.cos(game.yaw),0,-Math.sin(game.yaw)),focus=new THREE.Vector3(p.x,feet+Math.max(.7,eye*.78),p.z),distance=game.aiming?2.25:4.35,desired=focus.clone().addScaledVector(forward,-distance).addScaledVector(right,game.aiming?.52:.92);desired.y+=game.aiming?.62:.95;const offset=desired.clone().sub(focus),length=offset.length(),hit=nearestSolidHit(new THREE.Ray(focus,offset.normalize()),length);if(hit)desired.copy(focus).addScaledVector(offset,Math.max(.18,hit.distance-.18));camera.position.lerp(desired,Math.min(1,dt*18))}else camera.position.copy(p);camera.rotation.set(game.pitch,game.yaw,0,'YXZ');const targetFov=game.aiming?aimFov():72,nextFov=camera.fov+(targetFov-camera.fov)*Math.min(1,dt*15);if(Math.abs(nextFov-camera.fov)>.005){camera.fov=nextFov;camera.updateProjectionMatrix()}
  const moving=Math.hypot(p.x-oldX,p.z-oldZ)>.0001;game.playerMoving=moving;if(game.onGround&&!blocked(p.x,p.z,feet,.36,bodyH))game.lastSafe={x:p.x,z:p.z,feet};gunBob+=dt*(moving?speed*1.8:1.5);gunKick=Math.max(0,gunKick-dt*7);
  if(viewGun&&viewGun.visible){const a=viewGun.userData.anchors||viewGunAnchors('ak12'),base=game.aiming?a.ads:a.rest,stanceY=game.aiming?0:game.stance==='prone'?.1:0,targetX=base.x,targetY=base.y+stanceY,targetZ=base.z,w=currentWeapon(),reloadP=game.reloading&&w?clamp(1-(game.reloadAt-performance.now()/1000)/w.reload,0,1):0,reloadArc=Math.sin(reloadP*Math.PI),boltArc=w?.bolt&&game.boltCycling?Math.sin(clamp((performance.now()/1000-(game.boltAt-BOLT_CYCLE_TIME))/BOLT_CYCLE_TIME,0,1)*Math.PI):0,bobScale=game.aiming?.15:1,smooth=Math.min(1,dt*18);viewGun.position.x+=(targetX+Math.sin(gunBob)*.007*(moving?1:0)*bobScale+boltArc*.05-viewGun.position.x)*smooth;viewGun.position.y+=(targetY+Math.abs(Math.cos(gunBob))*-.006*(moving?1:0)*bobScale-gunKick*.022-reloadArc*.16-viewGun.position.y)*smooth;viewGun.position.z+=(targetZ+gunKick*.02-viewGun.position.z)*smooth;viewGun.rotation.x=-.025-gunKick*.07+reloadArc*.16;viewGun.rotation.z=.02+Math.sin(gunBob*.5)*.005*inputAimScale(game.aiming)+reloadArc*.38}
  const gait=game.stance==='prone'?'prone':game.stance==='crouch'?'crouch':game.keys.ShiftLeft&&f>0&&!game.aiming?'run':'walk',stepNow=performance.now()/1000,stepGap=gait==='run'?.3:gait==='crouch'?.58:gait==='prone'?.78:.42;if(moving&&game.onGround&&stepNow-game.lastStep>stepGap){game.lastStep=stepNow;footstepSound(null,gait)}
  if(game.mouseDown&&game.selected<=2&&game.selected>0&&currentWeapon()?.auto)tryShoot(performance.now()/1000);
}

// ── 枪械、命中分区与换弹 ──────────────────────────────────────────
const raycaster=new THREE.Raycaster();
const shotBox=new THREE.Box3(),shotBlockPoint=new THREE.Vector3();
const sniperHitBox=new THREE.Box3(),sniperHitPoint=new THREE.Vector3();
const BOLT_CYCLE_TIME=1.05;
function nearestSolidHit(ray,maxDistance){let nearest=maxDistance,found=false;for(const c of game.colliders){shotBox.min.set(c.x-c.w/2,c.base,c.z-c.d/2);shotBox.max.set(c.x+c.w/2,c.top,c.z+c.d/2);const point=ray.intersectBox(shotBox,new THREE.Vector3());if(!point)continue;const distance=ray.origin.distanceTo(point);if(distance<nearest){nearest=distance;shotBlockPoint.copy(point);found=true}}return found?{distance:nearest,point:shotBlockPoint.clone()}:null}
// 狙击枪只在原始射线没有命中时启用极小的轮廓容差，消除远距离浮点误差和模型缝隙。
// 候选点仍必须位于最近墙体之前；队友同样会挡住子弹，不能借此穿墙或穿人。
function nearestSniperEdgeHit(ray,maxDistance,blockDistance=maxDistance){
  let best=null,nearest=Math.min(maxDistance,blockDistance-.003);
  for(const bot of game.entities){
    if(!bot.alive)continue;
    bot.root.updateWorldMatrix(true,true);
    for(const part of bot.parts){
      sniperHitBox.setFromObject(part).expandByScalar(.035);
      const point=ray.intersectBox(sniperHitBox,sniperHitPoint);
      if(!point)continue;
      const distance=ray.origin.distanceTo(point);
      if(distance<nearest){nearest=distance;best={bot,point:point.clone(),zone:part.userData.zone||'body'}}
    }
  }
  return best;
}
function currentWeapon(){return game.selected>0&&game.selected<=2?effectiveWeapon(game.ammo[game.selected-1].key,game.selected-1):null}
function inputAimScale(aiming){return aiming?.18:1}
function equippedSight(){const loadoutSlot=game.selected-1,key=game.ammo[loadoutSlot]?.key;return key?weaponAttachments(key,loadoutSlot).sight:null}
function aimFov(){return{'red-dot':50,holo:50,'scope-2x':40,'scope-3x':32,'scope-4x':25,'scope-6x':18,'scope-8x':13}[equippedSight()]||54}
function setAiming(enabled,instant=false){const active=!!enabled&&!!currentWeapon()&&game.player?.alive!==false&&!game.reloading,overlay=$('#scope-overlay');game.aiming=active;if(viewGun)viewGun.visible=!active&&game.selected>=1&&game.selected<=2;overlay.dataset.sight=equippedSight()||'iron';overlay.classList.toggle('active',active);$('#crosshair').style.opacity=active?0:1;if(instant){camera.fov=active?aimFov():72;camera.updateProjectionMatrix()}}
function tryShoot(now){
  if(game.reloading||!game.player.alive)return;const w=currentWeapon();if(!w)return;const ammo=game.ammo[game.selected-1];
  const infiniteMagazine=!!game.map?.range&&game.rangeInfiniteMagazine;
  if(w.bolt&&(game.boltCycling||!game.boltReady)){toast('正在拉栓 · 动作结束前无法开枪');return}
  const interval=60/w.rate;if(now-game.lastShot<interval)return;
  if(!infiniteMagazine&&ammo.mag<=0){game.lastShot=now;if(ammo.reserve>0)startReload();else toast('弹药已耗尽');return}
  if(!infiniteMagazine)ammo.mag--;game.lastShot=now;shotSound(w);gunKick=Math.min(1.8,gunKick+.52);muzzleLight.intensity=26;const flash=viewGun?.userData.flash,halo=viewGun?.userData.halo;if(flash){flash.visible=true;flash.rotation.x=Math.random()*Math.PI;flash.scale.setScalar(.8+Math.random()*.5)}if(halo)halo.visible=true;setTimeout(()=>{if(muzzleLight)muzzleLight.intensity=0;if(flash)flash.visible=false;if(halo)halo.visible=false},38);
  let spread=(100-w.spread)*.00034+(game.keys.ShiftLeft?.006:0);if(game.stance==='crouch')spread*=.58;if(game.stance==='prone')spread*=1;if(game.aiming)spread*=w.type==='狙击步枪'?0:.24;spread*=1+gunKick*.28;
  // 输入事件可能发生在渲染帧之间，射击前同步一次人物世界坐标，避免命中上一帧的位置。
  for(const bot of game.entities)bot.root.updateWorldMatrix(true,true);
  const aim=new THREE.Vector2((Math.random()-.5)*spread,(Math.random()-.5)*spread);raycaster.setFromCamera(aim,camera);raycaster.far=w.range;
  const hits=raycaster.intersectObjects(game.rayTargets,false),block=nearestSolidHit(raycaster.ray,w.range),end=block?block.point.clone():raycaster.ray.at(w.range,new THREE.Vector3());let hitBot=false,stoppedByBody=false,impact=null;
  for(const h of hits){if(block&&h.distance>=block.distance-.002)break;const bot=h.object.userData.bot;if(bot&&bot.alive){end.copy(h.point);stoppedByBody=true;impact=(h.object.userData.zone||'body')==='head'?'head':'body';if(bot.team!==game.player.team){const zone=h.object.userData.zone||'body',damage=rollWeaponDamage(w,zone);damageBot(bot,damage,zone,game.player.name,w.name);hitBot=true;spawnImpact(h.point,zone==='head'?0xff5140:0xffd098)}break}}
  if(!stoppedByBody&&w.type==='狙击步枪'){
    const edgeHit=nearestSniperEdgeHit(raycaster.ray,w.range,block?.distance??w.range);
    if(edgeHit){const {bot,point,zone}=edgeHit;end.copy(point);stoppedByBody=true;impact=zone==='head'?'head':'body';if(bot.team!==game.player.team){const damage=rollWeaponDamage(w,zone);damageBot(bot,damage,zone,game.player.name,w.name);hitBot=true;spawnImpact(point,zone==='head'?0xff5140:0xffd098)}}
  }
  if(block&&!stoppedByBody){impact='wall';spawnImpact(block.point,0xd4d7c4)}
  const tracerStart=(game.view==='third'?game.player.pos:camera.position).clone().add(new THREE.Vector3(.18,-.12,0).applyQuaternion(camera.quaternion));spawnBotTracer(tracerStart,end,game.player.team,0);if(net.online)sendNet({type:'shot',x:end.x,y:end.y,z:end.z,weapon:w.name,weaponKey:game.ammo[game.selected-1].key,impact});
  recoilCamera(w);if(w.bolt){game.boltReady=false;game.boltCycling=true;game.boltAt=now+BOLT_CYCLE_TIME;setAiming(false);toast('正在拉栓 · 暂时无法开枪')}updateHUD();if(!infiniteMagazine&&ammo.mag===0&&ammo.reserve>0){game.boltCycling=false;startReload()}
  if(!hitBot)document.querySelector('#hitmarker').style.opacity=0;
}
function recoilCamera(w){game.pitch+=w.recoil*.0005*(.65+Math.random()*.5);game.yaw+=(Math.random()-.5)*w.recoil*.00018}
function damageBot(bot,amount,zone,attacker,weapon){
  if(!bot.alive||(!bot.rangeTarget&&bot.spawnProtection>0))return;const flashHit=()=>{showHit(zone==='head');bot.root.traverse(o=>{if(o.material&&o.userData.zone){const old=o.material.emissive?.getHex()||0;if(o.material.emissive)o.material.emissive.setHex(0x9a160e);setTimeout(()=>o.material?.emissive?.setHex(old),70)}})};
  if(bot.rangeTarget)spawnRangeDamageNumber(bot,amount,zone);if(bot.rangeTarget&&(bot.rangeInvincible??game.rangeInvincible)){flashHit();return}if(bot.rangeTarget&&!Number.isFinite(bot.takedownStartedAt))bot.takedownStartedAt=performance.now()/1000;if(bot.remote){sendNet({type:'hit',target:bot.peerId,damage:amount,zone,weapon,name:game.player.name});flashHit();return}if(bot.armor>0){const absorb=Math.min(bot.armor,amount*.4);bot.armor-=absorb;amount-=absorb}bot.hp-=amount;flashHit();
  if(bot.hp<=0){if(bot.rangeTarget){const now=performance.now()/1000;bot.lastTakedownSeconds=Math.max(.01,now-bot.takedownStartedAt);bot.takedownStartedAt=null;updateWorkbenchDisplay(bot)}beginBotDeath(bot,bot.rangeTarget?1.5:5);bot.parts.forEach(p=>{p.userData._solid=false});if(bot.rangeTarget){game.kills++;addFeed(attacker,bot.name,weapon);return}if(bot.team==='red')game.blue++;else game.red++;if(attacker===game.player.name)game.kills++;addFeed(attacker,bot.name,weapon)}
}
function beginBotDeath(bot,respawn){bot.alive=false;bot.respawn=respawn;if(bot.teamMarker)bot.teamMarker.visible=false;bot.death={elapsed:0,duration:.78,direction:Math.random()<.5?-1:1,lean:(Math.random()-.5)*.18,baseY:bot.root.position.y};if(bot.actions)Object.values(bot.actions).forEach(action=>action.fadeOut(.16))}
function updateBotDeath(bot,dt){if(!bot.death)return;bot.death.elapsed=Math.min(bot.death.duration,bot.death.elapsed+dt);const t=bot.death.elapsed/bot.death.duration,e=t*t*(3-2*t);bot.root.rotation.x=bot.death.direction*e*Math.PI*.48;bot.root.rotation.z=bot.death.lean*e;bot.root.position.y=bot.death.baseY+.2*e}
function respawnBot(bot){bot.alive=true;bot.death=null;bot.hp=100;bot.armor=bot.rangeTarget?0:50;bot.takedownStartedAt=null;bot.target=null;bot.lastStep=performance.now()/1000;bot.spawnProtection=bot.rangeTarget?0:2;const weapon=WEAPONS[bot.weaponKey];if(weapon){bot.mag=weapon.mag;bot.reloading=false;bot.reloadTimer=0;bot.cooldown=0}bot.navPath=null;bot.navIndex=0;bot.navRepath=0;bot.navGoal=null;bot.stuckTime=0;bot.escapeTimer=0;if(bot.teamMarker)bot.teamMarker.visible=true;bot.root.rotation.set(0,0,0);bot.root.scale.set(1,1,1);bot.root.position.set(bot.rangeTarget?bot.rangeX:bot.spawn.x,0,bot.rangeTarget?bot.rangeZ:bot.spawn.z);bot.lastSafe=bot.root.position.clone();bot.parts.forEach(p=>{p.userData._solid=true});setBotAnimation(bot,'idle')}
let damageIndicatorTimer;
function hideDamageIndicator(){clearTimeout(damageIndicatorTimer);const indicator=$('#damage-indicator');indicator.classList.remove('active','directional')}
function showDamageIndicator(attacker,amount,attackerId){const source=attackerId?net.peerBots.get(attackerId):game.entities.find(b=>b.name===attacker),indicator=$('#damage-indicator');let angle=0;if(source&&game.player){const dx=source.root.position.x-game.player.pos.x,dz=source.root.position.z-game.player.pos.z;angle=Math.atan2(dx,-dz)+game.yaw}indicator.classList.toggle('directional',!!source);indicator.style.setProperty('--angle',`${angle}rad`);indicator.querySelector('b').textContent=`受到 ${attacker} 攻击 · ${Math.max(1,Math.round(amount))} 伤害`;indicator.classList.remove('active');void indicator.offsetWidth;indicator.classList.add('active');clearTimeout(damageIndicatorTimer);damageIndicatorTimer=setTimeout(()=>indicator.classList.remove('active'),780)}
function damagePlayer(amount,attacker,weapon='AK-12',attackerId=null){
  if(!game.player.alive||game.spawnProtection>0)return;const incoming=amount;if(game.player.armor>0){const absorb=Math.min(game.player.armor,amount*.4);game.player.armor-=absorb;amount-=absorb}game.player.hp-=amount;showDamageIndicator(attacker,incoming,attackerId);$('#damage-flash').style.opacity=.72;setTimeout(()=>$('#damage-flash').style.opacity=0,100);updateHUD();
  if(game.player.hp<=0){game.player.alive=false;setAiming(false,true);game.player.respawn=selectedMode==='training'?1.7:5;game.deaths++;game.boltCycling=false;if(net.online){if(game.player.team==='blue')game.red++;else game.blue++;updateHUD();sendNet({type:'death',life:game.player.life,attacker:attackerId,weapon});sendLocalState()}else{if(game.player.team==='blue')game.red++;else game.blue++;addFeed(attacker,'你',weapon)}game.keys={};game.mouseDown=false;game.cook=null;hideTrajectoryPreview();$('#cook').style.display='none'}
}
function startReload(){if(game.selected<1||game.selected>2||game.reloading)return;if(game.map?.range&&game.rangeInfiniteMagazine){toast('无限弹夹已开启 · 无需换弹');return}const a=game.ammo[game.selected-1],w=currentWeapon();if(a.mag>=w.mag||a.reserve<=0)return;setAiming(false);game.boltCycling=false;game.reloading=true;game.reloadAt=performance.now()/1000+w.reload;reloadSound();toast(`正在换弹 · ${w.reload.toFixed(1)} 秒`)}
function finishReload(){const a=game.ammo[game.selected-1],w=currentWeapon(),take=Math.min(w.mag-a.mag,a.reserve);a.mag+=take;a.reserve-=take;game.reloading=false;game.boltCycling=false;game.boltReady=true;updateHUD();toast('换弹完成')}
function updateBoltCycle(){if(!game.boltCycling||performance.now()/1000<game.boltAt)return;game.boltCycling=false;game.boltReady=true;updateHUD();toast('拉栓完成 · 可以射击')}
function respawnPlayer(){const z=game.map.range?game.map.size-5:playerSpawnZ(game.player.team);game.player.hp=100;game.player.armor=50;game.player.alive=true;game.player.life=(game.player.life||1)+1;game.player.respawn=0;game.player.pos.set(game.map.range?1.8:(Math.random()-.5)*4,1.68,z);game.feet=0;game.velY=0;game.lastSafe={x:game.player.pos.x,z,feet:0};game.ammo=game.ammo.map((a,i)=>{const w=effectiveWeapon(a.key,i);return{key:a.key,mag:w.mag,reserve:UNLIMITED_AMMO}});game.inventory=[0,0,...game.mode.limits.slice(2)];game.boltCycling=false;game.boltReady=true;game.spawnProtection=2;camera.position.copy(game.player.pos);$('#interaction').textContent='';sendLocalState();toast(selectedMode==='training'?'靶场重生 · 2 秒保护':'重新投入战斗 · 2 秒保护')}
function showHit(head){const h=$('#hitmarker');h.style.borderColor=head?'#ff604e':'#fff';h.style.opacity=1;setTimeout(()=>h.style.opacity=0,90)}

// ── 投掷物：拔栓计时与实时抛物线预览 ──────────────────────────────
const THROW_INFO={3:{name:'手雷',fuse:7,color:0x53654d},4:{name:'燃烧瓶',fuse:99,color:0x7b4928},5:{name:'烟雾弹',fuse:5,color:0x73917f},6:{name:'闪光弹',fuse:5,color:0xc8c9bd}};
const TRAJECTORY_COLORS={3:0xa9ff37,4:0xff8a32,5:0xa7c8b3,6:0xf3fbff};
function throwableLaunch(){const dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion),origin=game.view==='third'?game.player.pos:camera.position,pos=origin.clone().addScaledVector(dir,.7);pos.y-=.2;return{pos,vel:dir.clone().multiplyScalar(10).add(new THREE.Vector3(0,3.2,0))}}
function ensureTrajectoryPreview(){
  if(trajectoryPreview||!worldGroup)return trajectoryPreview;const positions=new Float32Array(52*3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setDrawRange(0,0);const line=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:0xa9ff37,dashSize:.28,gapSize:.16,transparent:true,opacity:.95,depthTest:false,depthWrite:false,toneMapped:false}));line.renderOrder=1000;const dotMaterial=new THREE.MeshBasicMaterial({color:0xa9ff37,transparent:true,opacity:.9,depthTest:false,depthWrite:false,toneMapped:false}),dotGeometry=new THREE.SphereGeometry(.032,7,5),dots=[];for(let i=0;i<20;i++){const dot=new THREE.Mesh(dotGeometry,dotMaterial);dot.visible=false;dot.renderOrder=1001;dots.push(dot)}const markerMaterial=new THREE.MeshBasicMaterial({color:0xa9ff37,transparent:true,opacity:.95,depthTest:false,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}),marker=new THREE.Mesh(new THREE.SphereGeometry(.1,10,8),markerMaterial),landingRing=new THREE.Mesh(new THREE.RingGeometry(.18,.3,24),markerMaterial);marker.renderOrder=1002;landingRing.rotation.x=-Math.PI/2;landingRing.renderOrder=1002;const group=new THREE.Group();group.visible=false;group.add(line,...dots,marker,landingRing);worldGroup.add(group);trajectoryPreview={group,line,dots,dotMaterial,marker,landingRing,positions};return trajectoryPreview
}
function hideTrajectoryPreview(){if(trajectoryPreview)trajectoryPreview.group.visible=false}
function updateTrajectoryPreview(){
  if(!game.cook){hideTrajectoryPreview();return}const preview=ensureTrajectoryPreview();if(!preview)return;const color=TRAJECTORY_COLORS[game.cook.type]||0xa9ff37;preview.line.material.color.setHex(color);preview.dotMaterial.color.setHex(color);preview.marker.material.color.setHex(color);const launch=throwableLaunch(),p=launch.pos.clone(),v=launch.vel.clone(),step=.08,left=Math.max(.05,game.cook.fuse-(performance.now()/1000-game.cook.start)),limit=Math.min(4,left);let count=0;
  for(let t=0;t<=limit&&count<52;t+=step){const o=count*3;preview.positions[o]=p.x;preview.positions[o+1]=p.y;preview.positions[o+2]=p.z;count++;v.y-=12*step;p.addScaledVector(v,step);if(p.y<=.12){p.y=.12;const end=(count-1)*3;preview.positions[end]=p.x;preview.positions[end+1]=p.y;preview.positions[end+2]=p.z;break}}
  preview.line.geometry.attributes.position.needsUpdate=true;preview.line.geometry.setDrawRange(0,count);preview.line.computeLineDistances();for(let i=0;i<preview.dots.length;i++){const point=Math.min(3+i*2,count-1),visible=3+i*2<count;preview.dots[i].visible=visible;if(visible){const o=point*3;preview.dots[i].position.set(preview.positions[o],preview.positions[o+1],preview.positions[o+2])}}const end=(count-1)*3,endY=preview.positions[end+1];preview.marker.position.set(preview.positions[end],endY,preview.positions[end+2]);preview.marker.scale.setScalar(.88+Math.sin(performance.now()*.008)*.12);preview.landingRing.visible=endY<=.14;preview.landingRing.position.set(preview.positions[end],.13,preview.positions[end+2]);preview.landingRing.scale.setScalar(.9+Math.sin(performance.now()*.008)*.08);preview.group.visible=true
}
function startCook(){const n=game.selected;if(n<3||game.inventory[n-1]<=0)return;const info=THROW_INFO[n];game.cook={type:n,start:performance.now()/1000,fuse:info.fuse};$('#cook span').textContent=`${info.name} · 已拔栓 · 右键取消`;$('#cook').style.display='block';updateTrajectoryPreview();toast(`${info.name}已拔栓 · 松开左键投掷，按右键取消`)}
function cancelThrow(){if(!game.cook)return;game.cook=null;game.mouseDown=false;hideTrajectoryPreview();$('#cook').style.display='none';updateHUD();toast('已取消投掷 · 投掷物未消耗')}
function buildThrowable(type){return buildThrowableModel(type)}
function throwItem(){const c=game.cook;if(!c)return;const elapsed=performance.now()/1000-c.start,{pos,vel}=throwableLaunch(),ball=buildThrowable(c.type),timer=Math.max(.05,c.fuse-elapsed);ball.position.copy(pos);worldGroup.add(ball);game.throwables.push({mesh:ball,type:c.type,vel:vel.clone(),timer,rest:false});if(net.online)sendNet({type:'throw',item:c.type,x:pos.x,y:pos.y,z:pos.z,vx:vel.x,vy:vel.y,vz:vel.z,timer});game.inventory[c.type-1]--;game.cook=null;hideTrajectoryPreview();$('#cook').style.display='none';game.selected=game.lastSelected<=2?game.lastSelected:1;rebuildViewGun();updateHUD()}
function updateThrowables(dt){
  if(game.cook){const info=THROW_INFO[game.cook.type],left=Math.max(0,info.fuse-(performance.now()/1000-game.cook.start));$('#cook b').textContent=left.toFixed(1);$('#cook em').style.transform=`scaleX(${left/info.fuse})`;updateTrajectoryPreview();if(left<=0){throwItem()}}else hideTrajectoryPreview();
  for(let i=game.throwables.length-1;i>=0;i--){const t=game.throwables[i];if(!t.rest){t.vel.y-=12*dt;t.mesh.position.addScaledVector(t.vel,dt);if(t.mesh.position.y<=.12){t.mesh.position.y=.12;t.vel.y*=-.32;t.vel.x*=.62;t.vel.z*=.62;if(Math.abs(t.vel.y)<.5)t.rest=true}}
    t.timer-=dt;if(t.type===4&&t.mesh.position.y<=.13){detonate(t);game.throwables.splice(i,1);continue}if(t.timer<=0){detonate(t);game.throwables.splice(i,1)}
  }
}
function detonate(t){const p=t.mesh.position.clone();worldGroup.remove(t.mesh);if(t.type===3){explosionSound();spawnBlast(p,0xffa03c,5.5);if(!t.remote){game.entities.forEach(b=>{if(b.alive&&b.team!==game.player.team){const d=b.root.position.distanceTo(p);if(d<6)damageBot(b,Math.round(88*(1-d/7)),'body',game.player.name,'手雷')}});const pd=game.player.pos.distanceTo(p);if(pd<5)damagePlayer(Math.max(5,55*(1-pd/6)),'自己的手雷','手雷')}}
  if(t.type===4){noiseBurst(.14,.22,5400);noiseBurst(.55,.15,760,.02);spawnShatter(p);spawnBlast(p,0xff8a2a,2.4);spawnArea(p,'fire',8,t.remote)}if(t.type===5){noiseBurst(.4,.08,1200);spawnArea(p,'smoke',13,t.remote)}if(t.type===6){noiseBurst(.12,.22,6000);spawnBlast(p,0xffffff,2);const to=p.clone().sub(camera.position);if(to.length()<13&&camera.getWorldDirection(new THREE.Vector3()).dot(to.normalize())>.05){$('#flashbang').style.transition='opacity .08s';$('#flashbang').style.opacity=1;setTimeout(()=>{$('#flashbang').style.transition='opacity 2.7s';$('#flashbang').style.opacity=0},700)}game.entities.forEach(b=>{if(b.root.position.distanceTo(p)<11)b.flash=4})}}
function spawnBlast(p,color,r){const light=new THREE.PointLight(color,80,r*2,2);light.position.copy(p);worldGroup.add(light);const ring=mesh(new THREE.SphereGeometry(.3,12,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75}),p.x,p.y,p.z);worldGroup.add(ring);game.effects.push({type:'blast',mesh:ring,light,life:.45,max:.45,r})}
// ── 区域效果：燃烧瓶火场与烟雾弹烟幕 ─────────────────────────────
const FIRE_RADIUS=3.4,SMOKE_RADIUS=6.6;
const additive=color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
const softMat=color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false});
function flatDecal(radius,material,y){const d=mesh(new THREE.CircleGeometry(radius,30),material,0,y,0);d.rotation.x=-Math.PI/2;d.castShadow=false;d.receiveShadow=false;return d}
// 燃烧瓶：焦痕 + 燃料池 + 双层火舌 + 上升余烬 + 黑烟柱 + 跳动的火光
function buildFireField(group){
  const scorch=flatDecal(FIRE_RADIUS*1.08,new THREE.MeshBasicMaterial({color:0x120a06,transparent:true,opacity:0,depthWrite:false}),.015);
  const pool=flatDecal(FIRE_RADIUS*.82,additive(0xff7a1e),.03);
  group.add(scorch,pool);
  const flames=[];
  for(let i=0;i<32;i++){
    const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*FIRE_RADIUS*.94;
    const h=.75+Math.random()*1.55,w=.2+Math.random()*.3,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const phase=Math.random()*6.283,speed=5.5+Math.random()*5.5;
    // 外焰用普通混合保住橙红色，内焰用叠加混合做出高温核心
    const outer=mesh(new THREE.ConeGeometry(w,h,6),softMat(0xf2540c),x,h/2,z);
    outer.castShadow=false;outer.userData={phase,speed,peak:.6};group.add(outer);flames.push(outer);
    const inner=mesh(new THREE.ConeGeometry(w*.48,h*.55,5),additive(0xff9c12),x,h*.28,z);
    inner.castShadow=false;inner.userData={phase:phase+1.2,speed:speed*1.25,peak:.34};group.add(inner);flames.push(inner);
    const base=mesh(new THREE.ConeGeometry(w*1.25,h*.3,6),softMat(0xffc23a),x,h*.14,z);
    base.castShadow=false;base.userData={phase:phase+2.4,speed:speed*.8,peak:.5};group.add(base);flames.push(base);
  }
  const emberCount=70,ep=new Float32Array(emberCount*3),espeed=new Float32Array(emberCount);
  for(let i=0;i<emberCount;i++){
    const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*FIRE_RADIUS;
    ep[i*3]=Math.cos(a)*r;ep[i*3+1]=Math.random()*3.4;ep[i*3+2]=Math.sin(a)*r;espeed[i]=1.1+Math.random()*1.6;
  }
  const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.BufferAttribute(ep,3));
  const embers=new THREE.Points(eg,new THREE.PointsMaterial({color:0xffb347,size:.085,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
  group.add(embers);
  const plumes=[];
  for(let i=0;i<10;i++){
    const a=Math.random()*Math.PI*2,r=Math.random()*FIRE_RADIUS*.55;
    const s=mesh(new THREE.SphereGeometry(.75+Math.random()*.6,7,6),new THREE.MeshLambertMaterial({color:0x2a2420,transparent:true,opacity:0,depthWrite:false}),Math.cos(a)*r,2+Math.random()*2.4,Math.sin(a)*r);
    s.castShadow=false;s.userData={rise:.32+Math.random()*.3,top:5.4+Math.random()*1.6};group.add(s);plumes.push(s);
  }
  const light=new THREE.PointLight(0xff8420,0,FIRE_RADIUS*3.2,2);light.position.y=1.1;group.add(light);
  group.userData={scorch,pool,flames,embers,emberSpeed:espeed,plumes,light};
}
// 烟雾弹：大量重叠烟团形成真正遮蔽视线的烟墙
function buildSmokeCloud(group){
  const puffs=[];
  for(let i=0;i<84;i++){
    const a=Math.random()*Math.PI*2,r=Math.pow(Math.random(),.5)*SMOKE_RADIUS*.92;
    const y=.35+Math.pow(Math.random(),1.4)*3.6,rad=.85+Math.random()*1.5;
    const tone=new THREE.Color(0xdfe6e4).offsetHSL(0,0,(Math.random()-.5)*.08);
    const s=mesh(new THREE.SphereGeometry(rad,9,7),new THREE.MeshLambertMaterial({color:tone,transparent:true,opacity:0,depthWrite:false}),Math.cos(a)*r,y,Math.sin(a)*r);
    s.castShadow=false;s.receiveShadow=false;
    s.userData={phase:Math.random()*6.283,rise:.05+Math.random()*.13,spin:(Math.random()-.5)*.5,
      delay:Math.random()*.7,peak:.3+Math.random()*.2,dx:(Math.random()-.5)*.16,dz:(Math.random()-.5)*.16};
    group.add(s);puffs.push(s);
  }
  group.userData={puffs};
}
function spawnArea(p,type,life,remote=false){
  const group=new THREE.Group();
  group.position.set(p.x,type==='fire'?0:Math.max(0,p.y-.15),p.z);
  worldGroup.add(group);
  if(type==='fire')buildFireField(group);else buildSmokeCloud(group);
  game.effects.push({type,mesh:group,life,max:life,tick:0,age:0,remote});
}
function spawnImpact(p,color){const s=mesh(new THREE.SphereGeometry(.035,5,4),new THREE.MeshBasicMaterial({color}),p.x,p.y,p.z);worldGroup.add(s);game.effects.push({type:'impact',mesh:s,life:.18,max:.18})}
function spawnRangeDamageNumber(bot,amount,zone){
  if(!game.map?.range||!bot?.rangeTarget)return;const container=$('#damage-numbers'),element=document.createElement('span'),value=Math.max(1,Math.round(amount));element.className=`damage-number${zone==='head'||value>=80?' critical':''}`;element.textContent=value;container.append(element);game.damageNumbers.push({element,position:bot.root.position.clone().add(new THREE.Vector3(0,1.72,0)),offsetX:(Math.random()-.5)*28,age:0,life:.9,max:.9})
}
const damageNumberProjection=new THREE.Vector3();
function updateDamageNumbers(dt){
  const width=renderer.domElement.clientWidth||innerWidth,height=renderer.domElement.clientHeight||innerHeight;
  for(let i=game.damageNumbers.length-1;i>=0;i--){const item=game.damageNumbers[i];item.age+=dt;item.life-=dt;item.position.y+=dt*.62;damageNumberProjection.copy(item.position).project(camera);const visible=damageNumberProjection.z>=-1&&damageNumberProjection.z<=1,x=(damageNumberProjection.x*.5+.5)*width+item.offsetX,y=(-damageNumberProjection.y*.5+.5)*height,fade=clamp(item.life/.34,0,1),pop=.72+.28*clamp(item.age/.11,0,1);item.element.style.opacity=visible?fade:0;item.element.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%) scale(${pop})`;if(item.life<=0){item.element.remove();game.damageNumbers.splice(i,1)}}
}
// 燃烧瓶砸碎时飞散的玻璃碎片
function spawnShatter(p){
  const g=new THREE.Group();g.position.copy(p);worldGroup.add(g);
  const glass=new THREE.MeshStandardMaterial({color:0xb0762e,roughness:.12,metalness:.15,transparent:true,opacity:.9});
  const shards=[];
  for(let i=0;i<14;i++){
    const s=mesh(new THREE.TetrahedronGeometry(.045+Math.random()*.05),glass,0,.12,0);
    const a=Math.random()*Math.PI*2,sp=2.2+Math.random()*3.4;
    s.userData={v:new THREE.Vector3(Math.cos(a)*sp,1.8+Math.random()*2.6,Math.sin(a)*sp),spin:4+Math.random()*8};
    g.add(s);shards.push(s);
  }
  game.effects.push({type:'shards',mesh:g,life:1.2,max:1.2,shards,shardMat:glass});
}

// ── 小队 AI：寻找目标、利用散布射击、绕开掩体 ─────────────────────
function updateEntityFootstep(entity,moving,gait='walk'){
  if(!moving)return;const now=performance.now()/1000,gap=gait==='run'?.3:gait==='crouch'?.58:gait==='prone'?.78:.42;if(now-(entity.lastStep||0)<gap)return;entity.lastStep=now;footstepSound(entity.root.position,gait,entity.team)
}
const BOT_RADIUS=.4,BOT_NAV_CELL=1.25,BOT_NAV_DIRS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const BOT_MOVE_SPEED={path:2.65,chase:2.4,search:2.65,retreat:1.6,hold:.18,pathStrafe:.18,combatStrafe:.85,searchStrafe:.72,max:2.85};
function recoverBotFromGeometry(bot,feet){
  const p=bot.root.position;if(Number.isFinite(p.x)&&Number.isFinite(p.z)&&!blocked(p.x,p.z,feet,BOT_RADIUS)){bot.lastSafe=p.clone();return false}
  const limitX=(game.map.width||game.map.size)-BOT_RADIUS-.15,limitZ=game.map.size-BOT_RADIUS-.15;let safe=null;
  for(let radius=.3;radius<=5&&!safe;radius+=.3)for(let i=0;i<24;i++){const angle=i*Math.PI/12,x=p.x+Math.cos(angle)*radius,z=p.z+Math.sin(angle)*radius;if(Math.abs(x)>limitX||Math.abs(z)>limitZ)continue;const g=groundAt(x,z,feet,BOT_RADIUS);if(g<=feet+STEP_UP+.05&&!blocked(x,z,g,BOT_RADIUS)){safe=new THREE.Vector3(x,g,z);break}}
  if(!safe&&bot.lastSafe&&!blocked(bot.lastSafe.x,bot.lastSafe.z,bot.lastSafe.y,BOT_RADIUS))safe=bot.lastSafe.clone();
  if(!safe)safe=bot.spawn.clone();p.copy(safe);bot.lastSafe=safe.clone();bot.navPath=null;bot.navIndex=0;bot.navRepath=0;bot.stuckTime=0;bot.escapeTimer=.65;bot.avoidSide*=-1;game.aiStats.unstucks++;return true
}
function botPathClear(a,b,feet,r=BOT_RADIUS){
  const dx=b.x-a.x,dz=b.z-a.z,distance=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(distance/.48));
  for(let i=1;i<=steps;i++){const t=i/steps;if(blocked(a.x+dx*t,a.z+dz*t,feet,r))return false}
  return true;
}
function buildBotPath(start,goal,feet){
  game.aiStats.pathBuilds++;
  if(botPathClear(start,goal,feet))return[goal.clone()];
  const limitX=(game.map.width||game.map.size)-.7,limitZ=game.map.size-.7,cell=BOT_NAV_CELL,nx=Math.floor(limitX*2/cell)+1,nz=Math.floor(limitZ*2/cell)+1,total=nx*nz;
  const gx=x=>clamp(Math.round((x+limitX)/cell),0,nx-1),gz=z=>clamp(Math.round((z+limitZ)/cell),0,nz-1),wx=x=>-limitX+x*cell,wz=z=>-limitZ+z*cell,index=(x,z)=>z*nx+x;
  let sx=gx(start.x),sz=gz(start.z),tx=gx(goal.x),tz=gz(goal.z);
  const walk=new Int8Array(total);walk.fill(-1);const canWalk=(x,z)=>{if(x<0||z<0||x>=nx||z>=nz)return false;const i=index(x,z);if(walk[i]<0)walk[i]=blocked(wx(x),wz(z),feet,BOT_RADIUS)?0:1;return walk[i]===1};
  if(!canWalk(sx,sz)){sx=gx(start.x+(goal.x-start.x)*.08);sz=gz(start.z+(goal.z-start.z)*.08)}
  if(!canWalk(tx,tz)){let found=false;for(let radius=1;radius<=5&&!found;radius++)for(let dz=-radius;dz<=radius&&!found;dz++)for(let dx=-radius;dx<=radius;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==radius||!canWalk(tx+dx,tz+dz))continue;tx+=dx;tz+=dz;found=true;break}if(!found){game.aiStats.pathFailures++;return null}}
  if(!canWalk(sx,sz)){game.aiStats.pathFailures++;return null}
  const startIndex=index(sx,sz),targetIndex=index(tx,tz),cost=new Float32Array(total),came=new Int32Array(total),closed=new Uint8Array(total),heap=[];cost.fill(Infinity);came.fill(-1);cost[startIndex]=0;
  const heuristic=(x,z)=>{const dx=Math.abs(tx-x),dz=Math.abs(tz-z);return Math.max(dx,dz)+.4142*Math.min(dx,dz)},push=(i,f)=>{let n=heap.length;heap.push({i,f});while(n){const p=(n-1)>>1;if(heap[p].f<=f)break;heap[n]=heap[p];n=p;heap[n]={i,f}}},pop=()=>{const top=heap[0],last=heap.pop();if(heap.length&&last){let n=0;heap[0]=last;for(;;){let c=n*2+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[n].f<=heap[c].f)break;[heap[n],heap[c]]=[heap[c],heap[n]];n=c}}return top};
  push(startIndex,heuristic(sx,sz));let reached=false,iterations=0;
  while(heap.length&&iterations++<2600){const node=pop(),i=node.i;if(closed[i])continue;closed[i]=1;if(i===targetIndex){reached=true;break}const x=i%nx,z=Math.floor(i/nx);for(const [dx,dz]of BOT_NAV_DIRS){const xx=x+dx,zz=z+dz;if(!canWalk(xx,zz))continue;if(dx&&dz&&(!canWalk(x+dx,z)||!canWalk(x,z+dz)))continue;const ni=index(xx,zz),next=cost[i]+(dx&&dz?1.4142:1);if(next>=cost[ni])continue;cost[ni]=next;came[ni]=i;push(ni,next+heuristic(xx,zz))}}
  if(!reached){game.aiStats.pathFailures++;return null}
  const raw=[];for(let i=targetIndex;i!==startIndex&&i>=0;i=came[i])raw.push(new THREE.Vector3(wx(i%nx),feet,wz(Math.floor(i/nx))));raw.reverse();
  const result=[];let anchor=start,j=0;while(j<raw.length){let far=j;for(let k=j+1;k<raw.length&&botPathClear(anchor,raw[k],feet);k++)far=k;result.push(raw[far]);anchor=raw[far];j=far+1}if(botPathClear(anchor,goal,feet))result.push(goal.clone());return result;
}
function moveBotWithAvoidance(bot,desired,speed,dt,feet){
  if(desired.lengthSq()<.0001)return false;desired.normalize();if(bot.escapeTimer>0){bot.escapeTimer-=dt;desired.set(desired.y*bot.avoidSide-desired.x*.2,-desired.x*bot.avoidSide-desired.y*.2).normalize()}
  const angles=[0,.3,-.3,.62,-.62,1,-1,1.4,-1.4,1.75,-1.75,Math.PI],origin=bot.root.position,preferred=bot.avoidSide,best=new THREE.Vector2(),probe=new THREE.Vector2();let bestScore=-Infinity,bestClear=0;
  for(const angle0 of angles){const angle=angle0===0?0:Math.abs(angle0)*Math.sign(angle0)*preferred,c=Math.cos(angle),s=Math.sin(angle);probe.set(desired.x*c-desired.y*s,desired.x*s+desired.y*c);let clearance=0;for(const distance of[.42,.8,1.25,1.85,2.5]){if(blocked(origin.x+probe.x*distance,origin.z+probe.y*distance,feet,BOT_RADIUS))break;clearance=distance}let separation=0;for(const other of game.entities){if(other===bot||!other.alive||other.rangeTarget||other.remote)continue;const px=origin.x+probe.x*.8-other.root.position.x,pz=origin.z+probe.y*.8-other.root.position.z,d=Math.hypot(px,pz);if(d<.85)separation+=(.85-d)*4}const alignment=probe.dot(desired),inertia=probe.dot(bot.navHeading),sideBias=angle===0?0:(Math.sign(angle)===preferred?.12:0),score=clearance*3.4+alignment*1.8+inertia*.65+sideBias-separation;if(clearance>=speed*dt+.05&&score>bestScore){bestScore=score;best.copy(probe);bestClear=clearance}}
  if(bestClear<=0)return false;const step=speed*dt,ox=origin.x,oz=origin.z,nx=ox+best.x*step,nz=oz+best.y*step;let moved=false;if(!blocked(nx,nz,feet,BOT_RADIUS)){origin.x=nx;origin.z=nz;moved=true}else{if(!blocked(nx,oz,feet,BOT_RADIUS)){origin.x=nx;moved=true}if(!blocked(origin.x,nz,feet,BOT_RADIUS)){origin.z=nz;moved=true}}
  if(moved){bot.navHeading.lerp(best,.24).normalize();const cross=desired.x*best.y-desired.y*best.x;if(Math.abs(cross)>.18)bot.avoidSide=Math.sign(cross)}return moved;
}
function updateBots(dt){
  const idleT=performance.now()*.0018;
  for(const b of game.entities){
    if(b.mixer)b.mixer.update(dt);

    if(b.teamMarker?.visible){const d=Math.max(1,b.root.position.distanceTo(camera.position)),w=clamp(d*.2,.48,2);b.teamMarker.scale.set(w,w/6,1)}
    if(b.rangeTarget){b.root.position.x=b.rangeX;b.root.position.z=b.rangeZ;if(!b.alive){updateBotDeath(b,dt);if((b.respawn-=dt)<=0)respawnBot(b)}else{b.root.rotation.x=0;b.root.rotation.z=0;setBotAnimation(b,'idle')}continue}
    if(b.remote){if(!b.alive){updateBotDeath(b,dt);continue}b.root.rotation.x=0;b.root.rotation.z=0;if(b.netTarget){const moving=b.netMoving!==false&&b.root.position.distanceToSquared(b.netTarget)>.0025,smooth=1-Math.exp(-dt*16);setBotAnimation(b,moving?'walk':'idle');b.root.position.lerp(b.netTarget,smooth);const modelYaw=(b.netYaw??b.root.rotation.y)+Math.PI,turn=Math.atan2(Math.sin(modelYaw-b.root.rotation.y),Math.cos(modelYaw-b.root.rotation.y));b.root.rotation.y+=turn*smooth;const sy=b.netStance==='prone'?.34:b.netStance==='crouch'?.7:1;b.root.scale.y+=(sy-b.root.scale.y)*smooth;updateEntityFootstep(b,moving,b.netGait||b.netStance||'walk')}continue}
    if(!b.alive){updateBotDeath(b,dt);if((b.respawn-=dt)<=0)respawnBot(b);continue}
    // 程序化干员没有骨骼动画，用轻微的重心摆动避免完全僵直
    b.root.rotation.x=b.model?0:Math.sin(idleT*.9+b.idlePhase)*.013;
    b.root.rotation.z=b.model?0:Math.sin(idleT*.7+b.idlePhase)*.019;
    b.cooldown-=dt;b.think-=dt;b.flash=Math.max(0,b.flash-dt);b.fire=Math.max(0,b.fire-dt);b.spawnProtection=Math.max(0,(b.spawnProtection||0)-dt);if(b.reloading){b.reloadTimer-=dt;if(b.reloadTimer<=0){const weapon=WEAPONS[b.weaponKey];b.mag=weapon.mag;b.reloading=false;b.reloadTimer=0}}
    if(b.think<=0){b.think=.11+Math.random()*.09;const next=findBotTarget(b);if(next!==b.target){b.target=next;b.trackedPosition=null;b.targetVelocity.set(0,0,0);b.navPath=null;b.navIndex=0;b.navRepath=0;b.navGoal=null;game.aiStats.targetSwitches++}if(Math.random()<.12)b.strafe*=-1}
    const target=b.target;if(!target)continue;const tp=botTargetPosition(target),delta=tp.clone().sub(b.root.position),dist=delta.length();if(b.trackedPosition&&dt>0){const sample=tp.clone().sub(b.trackedPosition).multiplyScalar(1/dt);sample.y=0;if(sample.length()>9)sample.setLength(9);b.targetVelocity.lerp(sample,.18)}b.trackedPosition=tp.clone();delta.y=0;const dir=delta.normalize(),visible=botCanSeeTarget(b,target);
    b.root.rotation.y=Math.atan2(dir.x,dir.z)+Math.PI;let bf=b.root.position.y;recoverBotFromGeometry(b,bf);bf=b.root.position.y;const oldX=b.root.position.x,oldZ=b.root.position.z;b.navRepath-=dt;
    const needsPath=!visible||b.stuckTime>.32,goalMoved=!b.navGoal||b.navGoal.distanceToSquared(tp)>9;
    if(needsPath&&(b.navRepath<=0||goalMoved)){b.navPath=buildBotPath(b.root.position,tp,bf);b.navIndex=0;b.navGoal=tp.clone();b.navRepath=.72+Math.random()*.32}
    let waypoint=null;if(b.navPath?.length){while(b.navIndex<b.navPath.length&&b.root.position.distanceToSquared(b.navPath[b.navIndex])<.55)b.navIndex++;waypoint=b.navPath[b.navIndex]||null;if(!waypoint)b.navPath=null}
    const moveDir=waypoint?new THREE.Vector2(waypoint.x-b.root.position.x,waypoint.z-b.root.position.z):new THREE.Vector2(dir.x,dir.z),advance=waypoint?BOT_MOVE_SPEED.path:visible?(dist>15?BOT_MOVE_SPEED.chase:dist<7?-BOT_MOVE_SPEED.retreat:BOT_MOVE_SPEED.hold):BOT_MOVE_SPEED.search,strafeSpeed=waypoint?BOT_MOVE_SPEED.pathStrafe:visible?BOT_MOVE_SPEED.combatStrafe:BOT_MOVE_SPEED.searchStrafe,desired=new THREE.Vector2(moveDir.x*advance+moveDir.y*b.strafe*strafeSpeed,moveDir.y*advance-moveDir.x*b.strafe*strafeSpeed),wantedSpeed=Math.min(BOT_MOVE_SPEED.max,Math.max(.3,desired.length())),moved=moveBotWithAvoidance(b,desired,wantedSpeed,dt,bf);
    // AI 也会踩上矮掩体与货箱平台
    const bg=groundAt(b.root.position.x,b.root.position.z,bf,BOT_RADIUS);
    b.root.position.y+=(bg-b.root.position.y)*Math.min(1,dt*10);
    const movedDistance=Math.hypot(b.root.position.x-oldX,b.root.position.z-oldZ),moving=movedDistance>.0001;if(wantedSpeed>.8&&(!moved||movedDistance<dt*.18))b.stuckTime+=dt;else b.stuckTime=Math.max(0,b.stuckTime-dt*2.4);if(b.stuckTime>.48){b.avoidSide*=-1;b.escapeTimer=.75+Math.random()*.45;b.navPath=null;b.navRepath=0;b.stuckTime=0;game.aiStats.unstucks++}setBotAnimation(b,moving?'walk':'idle');updateEntityFootstep(b,moving,'walk');
    const botWeapon=WEAPONS[b.weaponKey]||WEAPONS.m4;if(dist<=botWeapon.range&&b.cooldown<=0&&b.flash<=0&&!b.reloading){if(b.mag<=0){b.reloading=true;b.reloadTimer=botWeapon.reload}else{b.mag--;b.cooldown=60/botWeapon.rate;botShoot(b,target,dist,botWeapon);if(b.mag===0){b.reloading=true;b.reloadTimer=botWeapon.reload}}}
  }
}
function botTargetPosition(target){return target===game.player?game.player.pos:target.root.position}
function botTargetAimPoint(target){return target===game.player?game.player.pos.clone().add(new THREE.Vector3(0,-.24,0)):target.root.position.clone().add(new THREE.Vector3(0,1.35,0))}
function botCanSeeTarget(b,target){const muzzle=b.root.position.clone().add(new THREE.Vector3(0,1.35,0)),point=botTargetAimPoint(target),distance=muzzle.distanceTo(point),wall=nearestSolidHit(new THREE.Ray(muzzle,point.clone().sub(muzzle).normalize()),distance);return!wall||wall.distance>=distance-.12}
function findBotTarget(b){const choices=[];if(b.team==='red'&&game.player.alive)choices.push(game.player);for(const x of game.entities)if(x.alive&&x.team!==b.team)choices.push(x);let best=null,bestScore=Infinity;for(const target of choices){const position=botTargetPosition(target),distance=b.root.position.distanceTo(position),health=target===game.player?game.player.hp+game.player.armor:target.hp+target.armor,visible=botCanSeeTarget(b,target),focused=game.entities.filter(ally=>ally!==b&&ally.alive&&ally.team===b.team&&ally.target===target).length,score=distance+(visible?-13:10)+health*.025+focused*2.2;if(score<bestScore){bestScore=score;best=target}}return best}
function botShoot(b,target,dist,weapon=WEAPONS[b.weaponKey]||WEAPONS.m4){
  game.aiStats.shots++;b.fire=.08;const muzzle=b.root.position.clone().add(new THREE.Vector3(0,1.35,0)),lead=clamp(dist/85,.06,.28),targetPoint=botTargetAimPoint(target).addScaledVector(b.targetVelocity||new THREE.Vector3(),lead),shotDistance=muzzle.distanceTo(targetPoint),shotRay=new THREE.Ray(muzzle,targetPoint.clone().sub(muzzle).normalize()),wall=nearestSolidHit(shotRay,shotDistance),occluded=!!wall&&wall.distance<shotDistance-.12;spawnMuzzleEffect(muzzle,b.team);remoteShotSound(muzzle,b.weaponKey,b.team);if(occluded){spawnBotTracer(muzzle,wall.point,b.team,.08);game.blockedBotShots++;game.aiStats.blocked++;return}
  const targetMoving=(b.targetVelocity?.length()||0)>1.1,stanceMod=target===game.player?(game.stance==='prone'?.63:game.stance==='crouch'?.86:1):1,motionMod=targetMoving?.9:1,accuracy=clamp((weapon.spread-weapon.recoil*.18)/100,.28,.95),rangeMod=clamp(1-dist/weapon.range*.48,.42,1),hitChance=clamp((.46+accuracy*.54)*rangeMod*b.skill,.24,.94)*stanceMod*motionMod;if(Math.random()>hitChance){const missRadius=(100-weapon.spread)*.018+weapon.recoil*.006,miss=targetPoint.clone().add(new THREE.Vector3((Math.random()-.5)*missRadius,(Math.random()-.5)*missRadius*.55,(Math.random()-.5)*missRadius));spawnBotTracer(muzzle,miss,b.team,.08);return}game.aiStats.hits++;spawnBotTracer(muzzle,targetPoint,b.team,.05);const zone=Math.random()<.13?'head':'body',damage=rollWeaponDamage(weapon,zone);game.lastBotDamage={weaponKey:b.weaponKey,weapon:weapon.name,base:weapon.damage,zone,damage};
  if(target===game.player)damagePlayer(damage,b.name,weapon.name);else damageBot(target,damage,zone,b.name,weapon.name);
}
function spawnBotTracer(a,b,team,jitter=.35){const end=b.clone().add(new THREE.Vector3((Math.random()-.5)*jitter,(Math.random()-.5)*jitter,(Math.random()-.5)*jitter)),geo=new THREE.BufferGeometry().setFromPoints([a,end]),line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:team==='red'?0xff7b48:0x66c9ff,transparent:true,opacity:.68}));worldGroup.add(line);game.effects.push({type:'tracer',mesh:line,life:.07,max:.07})}
function spawnMuzzleEffect(position,team){const color=team==='red'?0xff9a52:0x72d8ff,flash=mesh(new THREE.SphereGeometry(.075,6,4),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}),position.x,position.y,position.z),light=new THREE.PointLight(color,16,4,2);light.position.copy(position);worldGroup.add(flash,light);game.effects.push({type:'muzzle',mesh:flash,light,life:.065,max:.065})}

function updateEffects(dt){
  if(game.weather){const p=game.weather.points.geometry.attributes.position.array;for(let i=1;i<p.length;i+=3){p[i]-=game.weather.speed*dt;if(p[i]<.05)p[i]=game.weather.height}game.weather.points.geometry.attributes.position.needsUpdate=true}
  for(let i=game.effects.length-1;i>=0;i--){const e=game.effects[i];e.life-=dt;if(e.type==='blast'){const k=1-e.life/e.max;e.mesh.scale.setScalar(1+k*e.r*3);e.mesh.material.opacity=(1-k)*.75;e.light.intensity=(1-k)*80}
    if(e.type==='impact'||e.type==='tracer')e.mesh.material.opacity=Math.max(0,e.life/e.max);
    if(e.type==='shards'){
      for(const s of e.shards){
        s.userData.v.y-=15*dt;
        s.position.addScaledVector(s.userData.v,dt);
        if(s.position.y<.04){s.position.y=.04;s.userData.v.set(0,0,0)}
        s.rotation.x+=s.userData.spin*dt;s.rotation.z+=s.userData.spin*.7*dt;
      }
      e.shardMat.opacity=.9*clamp(e.life/e.max,0,1);
    }
    if(e.type==='smoke'){
      e.age+=dt;
      const grow=Math.min(1,e.age/1.7),fade=clamp(e.life/2.5,0,1),now=performance.now()*.0006;
      e.mesh.scale.setScalar(.34+grow*.9);
      e.mesh.rotation.y+=dt*.05;
      for(const s of e.mesh.userData.puffs){
        const u=s.userData;
        s.material.opacity=u.peak*clamp((e.age-u.delay)/.55,0,1)*fade;
        s.position.y+=u.rise*dt;s.position.x+=u.dx*dt;s.position.z+=u.dz*dt;
        s.rotation.y+=u.spin*dt;
        s.scale.setScalar(1+Math.sin(now+u.phase)*.07);
      }
    }
    if(e.type==='fire'){
      e.age+=dt;e.tick-=dt;
      const u=e.mesh.userData,inP=clamp(e.age/.35,0,1),fade=Math.min(inP,clamp(e.life/1.8,0,1)),t=performance.now()*.001;
      u.scorch.material.opacity=.72*inP;
      u.pool.material.opacity=(.26+Math.sin(t*7)*.08)*fade;
      u.pool.scale.setScalar(.9+Math.sin(t*3.4)*.05);
      for(const f of u.flames){
        const d=f.userData,wave=Math.sin(t*d.speed+d.phase);
        f.scale.set(.86+Math.cos(t*d.speed*.6+d.phase)*.17,.66+wave*.36,.86+Math.sin(t*d.speed*.7+d.phase)*.17);
        f.material.opacity=(d.peak+wave*.22)*fade;
      }
      const ep=u.embers.geometry.attributes.position.array;
      for(let i=0,j=0;i<ep.length;i+=3,j++){
        ep[i+1]+=u.emberSpeed[j]*dt;ep[i]+=Math.sin(t*2+j)*dt*.16;
        if(ep[i+1]>3.6){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*FIRE_RADIUS;ep[i]=Math.cos(a)*r;ep[i+1]=.05;ep[i+2]=Math.sin(a)*r}
      }
      u.embers.geometry.attributes.position.needsUpdate=true;
      u.embers.material.opacity=.85*fade;
      for(const s of u.plumes){
        s.position.y+=s.userData.rise*dt;
        if(s.position.y>s.userData.top)s.position.y=2;
        s.material.opacity=.3*fade*clamp((s.userData.top-s.position.y)/2.2,0,1);
      }
      u.light.intensity=(21+Math.sin(t*13)*7+Math.sin(t*31)*4)*fade;
      if(e.tick<=0){e.tick=.45;if(!e.remote){for(const b of game.entities)if(b.alive&&b.team!==game.player.team&&b.root.position.distanceTo(e.mesh.position)<FIRE_RADIUS)damageBot(b,7,'body',game.player.name,'燃烧瓶');if(game.player.pos.distanceTo(e.mesh.position)<FIRE_RADIUS*.85)damagePlayer(5,'燃烧区域','燃烧瓶')}}
    }
    if(e.life<=0){worldGroup.remove(e.mesh);if(e.light)worldGroup.remove(e.light);game.effects.splice(i,1)}
  }
}
function updateRespawns(dt){if(!game.player||game.player.alive)return;game.player.respawn=Math.max(0,(game.player.respawn||0)-dt);$('#interaction').textContent=`${game.player.respawn.toFixed(1)} 秒后复活`;if(game.player.respawn<=0)respawnPlayer()}

// ── HUD、回合与结果 ───────────────────────────────────────────────
function updateHUD(){
  if(!game.player)return;$('#map-label').textContent=game.map.name+' · '+game.map.sub.split(' · ')[0];$('#mode-label').textContent=game.mode.label;$('#blue-score').textContent=game.blue;$('#red-score').textContent=game.red;$('#health').textContent=Math.max(0,Math.ceil(game.player.hp));$('#health-bar').style.width=clamp(game.player.hp,0,100)+'%';$('#armor').textContent=Math.ceil(game.player.armor);
  const sel=game.selected,w=currentWeapon();if(w){const a=game.ammo[sel-1],infiniteMagazine=!!game.map?.range&&game.rangeInfiniteMagazine;$('#weapon-name').textContent=weaponLabel(w);$('#ammo').textContent=infiniteMagazine?'∞':a.mag;$('#reserve').textContent=infiniteMagazine?'∞':Number.isFinite(a.reserve)?a.reserve:'∞';$('#firemode').textContent=game.reloading?'自动换弹中':game.boltCycling?'正在拉栓 · 禁止开枪':infiniteMagazine?'无限弹夹':w.bolt?'栓动单发':w.auto?'全自动':'半自动'}else{$('#weapon-name').textContent=sel===0?'空手':THROW_INFO[sel]?.name||'装备';$('#ammo').textContent=sel>=3?game.inventory[sel-1]:'—';$('#reserve').textContent='';$('#firemode').textContent=sel===0?'轻装移动':'长按左键准备 · 松开投掷'}
  const equipment=[...game.ammo.map(a=>weaponLabel(WEAPONS[a.key])),...Object.values(THROW_INFO).map(x=>x.name)],inventoryHTML=equipment.map((name,i)=>{const n=i+1,count=i<2?'':game.inventory[i];return `<div class="inv ${i<2?'gun':'throwable t'+n} ${game.selected===n?'active':''} ${i>=2&&count<=0?'empty':''}"><b>${n}</b><i>${name}</i><em>${count}</em></div>`}).join('');if($('#inventory').innerHTML!==inventoryHTML)$('#inventory').innerHTML=inventoryHTML;
  const wNow=currentWeapon(),spread=wNow?(100-wNow.spread)*.32*(game.stance==='crouch'?.58:1)+gunKick*7:2;$('#crosshair').style.transform=`translate(-50%,-50%) scale(${1+spread/30})`;
}
function addFeed(a,v,w){const ally=name=>name===game.player?.name||name==='你'||name.includes('蓝'),f=document.createElement('div');f.className='feed';f.innerHTML=`<span class="${ally(a)?'ally':'enemy'}">${a}</span>　${w}　<span class="${ally(v)?'ally':'enemy'}">${v}</span>`;$('#killfeed').prepend(f);setTimeout(()=>f.remove(),4200);updateHUD()}
let toastTimer;function toast(text){const t=$('#toast');t.textContent=text;t.style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.style.opacity=0,1700)}
function finishGame(win){if(game.phase==='result')return;setAiming(false,true);game.phase='result';recordMatch(win);document.exitPointerLock?.();$('#result-title').textContent=win===null?'本局平局':win?'行动胜利':'行动失败';$('#result-title').style.color=win===null?'var(--amber)':win?'var(--green)':'var(--red)';$('#result-blue').textContent=game.blue;$('#result-red').textContent=game.red;$('#result-note').textContent=`击倒 ${game.kills} · 阵亡 ${game.deaths} · ${game.map.name}`;$('#result-screen').classList.remove('hidden')}
function finishNetworkGame(){if(!game.player||game.phase==='result')return;const mine=game.player.team==='blue'?game.blue:game.red,theirs=game.player.team==='blue'?game.red:game.blue;finishGame(mine===theirs?null:mine>theirs)}

function updateMinimap(){const c=$('#minimap canvas'),x=c.getContext('2d'),S=c.width,map=game.map;x.clearRect(0,0,S,S);
  const g=x.createRadialGradient(S/2,S/2,10,S/2,S/2,S*.55);g.addColorStop(0,'rgba(12,20,26,.9)');g.addColorStop(1,'rgba(5,10,14,.92)');x.fillStyle=g;x.fillRect(0,0,S,S);
  const W=map.width||map.size,cx=v=>(v/W*.46+.5)*S,cz=v=>(v/map.size*.46+.5)*S;
  // 掩体按高度着色：越矮越亮，帮助判断能否翻越
  for(const o of game.colliders){
    const h=o.top||2,tone=o.kind;
    x.fillStyle=tone==='terrain'?'rgba(96,214,255,.6)':tone==='wall'||tone==='pillar'?'rgba(126,150,168,.5)':h<=1?'rgba(126,232,138,.62)':h<=1.5?'rgba(232,214,110,.55)':h<=2.2?'rgba(232,150,96,.5)':'rgba(200,206,214,.42)';
    x.fillRect(cx(o.x-o.w/2),cz(o.z-o.d/2),Math.max(1.5,(o.w/W*.46)*S),Math.max(1.5,(o.d/map.size*.46)*S));
  }
  for(const b of game.entities){if(!b.alive)continue;const ally=b.team===game.player.team;x.fillStyle=ally?'#5fd9ff':'#ff6b58';x.beginPath();x.arc(cx(b.root.position.x),cz(b.root.position.z),3.2,0,Math.PI*2);x.fill()}
  const soundNow=performance.now()/1000;game.soundEvents=game.soundEvents.filter(event=>event.expiresAt>soundNow);for(const event of game.soundEvents){const px=cx(event.position.x),pz=cz(event.position.z),duration=event.type==='gunshot'?1.8:1.6,fade=clamp((event.expiresAt-soundNow)/duration,0,1),pulse=1+Math.sin(soundNow*15)*.12;x.save();x.translate(px,pz);x.globalAlpha=.3+.7*fade;if(event.type==='footstep'){x.fillStyle='#ffd75a';x.strokeStyle='rgba(255,215,90,.45)';x.lineWidth=1.2;x.beginPath();x.arc(0,0,8*pulse,0,Math.PI*2);x.stroke();x.rotate(-.42);x.beginPath();x.ellipse(-2.2,-1.7,1.5,3.2,0,0,Math.PI*2);x.ellipse(2.2,1.7,1.5,3.2,0,0,Math.PI*2);x.fill()}else{x.strokeStyle='#ff6a3c';x.lineWidth=2;for(let radius=3;radius<=9;radius+=3){x.beginPath();x.arc(0,0,radius*pulse,-.72,.72);x.stroke()}x.fillStyle='#ffad55';x.fillRect(-2,-2,4,4)}x.restore()}
  x.save();x.translate(cx(game.player.pos.x),cz(game.player.pos.z));x.rotate(-game.yaw);
  x.fillStyle='rgba(122,240,180,.18)';x.beginPath();x.moveTo(0,0);x.arc(0,0,26,-Math.PI/2-.55,-Math.PI/2+.55);x.closePath();x.fill();
  x.fillStyle='#8ef7c0';x.beginPath();x.moveTo(0,-7);x.lineTo(4.6,5);x.lineTo(0,2.4);x.lineTo(-4.6,5);x.closePath();x.fill();
  x.restore();
  x.strokeStyle='rgba(150,190,210,.22)';x.lineWidth=1;x.strokeRect(.5,.5,S-1,S-1);
}

function tickGame(dt){
  if(game.phase!=='playing')return;if(net.online&&net.matchEndsAt)game.time=Math.max(0,net.matchEndsAt-performance.now()/1000);else game.time-=dt;if(selectedMode!=='training'&&game.time<=0){if(net.online){const now=performance.now()/1000;if(!net.awaitingFinalScoreAt){net.awaitingFinalScoreAt=now;sendNet({type:'score_request'})}if(now-net.awaitingFinalScoreAt<2)return;finishNetworkGame()}else{const mine=game.player.team==='blue'?game.blue:game.red,theirs=game.player.team==='blue'?game.red:game.blue;finishGame(mine===theirs?null:mine>theirs)}return}if(game.spawnProtection>0)game.spawnProtection-=dt;
  updateBoltCycle();updatePlayer(dt);updateRangeInteraction();updateWorkbenchReadouts();updateRespawns(dt);updateBots(dt);updateThrowables(dt);updateEffects(dt);updateDamageNumbers(dt);if(net.online&&performance.now()/1000-net.lastSend>.05){net.lastSend=performance.now()/1000;sendLocalState()}if(game.reloading&&performance.now()/1000>=game.reloadAt)finishReload();
  $('#round-time').textContent=selectedMode==='training'?'':`${String(Math.max(0,Math.floor(game.time/60))).padStart(2,'0')}:${String(Math.max(0,Math.floor(game.time%60))).padStart(2,'0')}`;$('#objective-bar').style.width=(selectedMode==='training'?1:game.time/game.mode.time)*100+'%';updateHUD();const now=performance.now();if(now-game.minimapAt>=100){game.minimapAt=now;updateMinimap()}
}

function sendLocalState(){if(!net.online||!game.player)return;const slot=game.selected>=1&&game.selected<=2?game.selected-1:null,weapon=slot==null?null:game.ammo[slot]?.key,attachments=weapon?weaponAttachments(weapon,slot):{},gait=game.stance==='prone'?'prone':game.stance==='crouch'?'crouch':game.keys.ShiftLeft&&game.keys.KeyW&&!game.aiming?'run':'walk';sendNet({type:'state',seq:++net.seq,x:game.player.pos.x,y:0,z:game.player.pos.z,yaw:game.yaw,hp:game.player.hp,armor:game.player.armor,alive:game.player.alive,life:game.player.life||1,deaths:game.deaths,localScore:{blue:game.blue,red:game.red},stance:game.stance,gait,moving:!!game.playerMoving,weapon,attachments,aiming:game.aiming,reloading:game.reloading,boltCycling:game.boltCycling})}

// 只读诊断快照，供自动化端到端测试确认网络实体确实进入了 3D 世界。
function colliderSignature(){let hash=2166136261;for(const c of game.colliders){const value=[c.x,c.z,c.w,c.d,c.base,c.top,c.kind].join(',');for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619)}}return(hash>>>0).toString(16)}
window.__RIFT_DEBUG__=()=>({phase:game.phase,view:game.view,account:activeAccount,map:game.map?.name||null,mapSeed:game.mapSeed,colliderSignature:colliderSignature(),syncedEffects:{...game.syncedEffects},damageNumbers:game.damageNumbers.map(item=>+item.element.textContent),bolt:{ready:game.boltReady,cycling:game.boltCycling,remaining:Math.max(0,game.boltAt-performance.now()/1000)},aiming:game.aiming,fov:camera.fov,online:net.online,clientId:net.id,room:net.room?.code||null,roomView:net.room?.view||null,soldierStatus,operatorBuildMs:+game.operatorBuildMs.toFixed(2),operatorParts:game.entities.map(b=>b.parts.length),audio:{...audioSettings},audioStats:{...game.audioStats},soundEvents:game.soundEvents.map(event=>({type:event.type,x:event.position.x,z:event.position.z,remaining:event.expiresAt-performance.now()/1000})),score:{blue:game.blue,red:game.red,time:game.time},blockedBotShots:game.blockedBotShots,aiStats:{...game.aiStats},keys:{...game.keys},playerMoving:game.playerMoving,selected:game.selected,ammo:game.ammo.map((a,i)=>({...a,attachments:weaponAttachments(a.key,i)})),inventory:[...game.inventory],cook:game.cook?{type:game.cook.type,start:game.cook.start}:null,trajectoryVisible:!!trajectoryPreview?.group.visible,player:game.player?{hp:game.player.hp,armor:game.player.armor,team:game.player.team,alive:game.player.alive,respawn:game.player.respawn||0,x:game.player.pos.x,y:game.player.pos.y,z:game.player.pos.z,feet:game.feet}:null,entities:game.entities.length,bots:game.entities.filter(b=>!b.rangeTarget&&!b.remote).map(b=>({name:b.name,alive:b.alive,x:+b.root.position.x.toFixed(2),z:+b.root.position.z.toFixed(2),stuck:+b.stuckTime.toFixed(2),waypoints:Math.max(0,(b.navPath?.length||0)-b.navIndex),escaping:b.escapeTimer>0,insideWall:blocked(b.root.position.x,b.root.position.z,b.root.position.y,BOT_RADIUS)})),teamMarkers:game.entities.filter(b=>!!b.teamMarker).length,highDetailModels:game.entities.filter(b=>!!b.model).length,range:game.map?.range?{map:game.map.name,distance:game.rangeDistance,invincible:game.rangeInvincible,workstations:game.rangeStations.length,activeStation:game.activeStation?.target.name||null,backWallZ:-game.map.size,targets:game.entities.filter(b=>b.rangeTarget).map(b=>({name:b.name,hp:b.hp,alive:b.alive,distance:b.rangeDistance,invincible:b.rangeInvincible,x:b.root.position.x,y:b.root.position.y,z:b.root.position.z,fall:b.death?b.death.elapsed/b.death.duration:0}))}:null,peers:[...net.peerBots].map(([id,b])=>({id,name:b.name,team:b.team,hp:b.hp,alive:b.alive,deaths:b.netDeaths||0,gait:b.netGait,moving:b.netMoving,yaw:b.root.rotation.y,netYaw:b.netYaw,x:b.root.position.x,z:b.root.position.z})),throwables:game.throwables.map(t=>({type:t.type,remote:!!t.remote,timer:t.timer,x:t.mesh.position.x,z:t.mesh.position.z}))});

window.__RIFT_COMBAT_DEBUG__=()=>({lastBotDamage:game.lastBotDamage?{...game.lastBotDamage}:null,bots:game.entities.filter(b=>!b.rangeTarget&&!b.remote).map(b=>({name:b.name,weaponKey:b.weaponKey,weapon:WEAPONS[b.weaponKey]?.name,hp:b.hp,armor:b.armor,mag:b.mag,magSize:WEAPONS[b.weaponKey]?.mag,reloading:b.reloading,reloadTimer:b.reloadTimer,rate:WEAPONS[b.weaponKey]?.rate,range:WEAPONS[b.weaponKey]?.range,damage:WEAPONS[b.weaponKey]?.damage,spawnProtection:b.spawnProtection}))});
function animate(){requestAnimationFrame(animate);const dt=Math.min(.033,clock.getDelta());if(gameActive){tickGame(dt)}else if(game.phase==='menu'){menuTime+=dt;if(scene.userData.menuMixer)scene.userData.menuMixer.update(dt);const hero=scene.userData.hero;if(hero){hero.position.y=.22+Math.sin(menuTime*.8)*.018;camera.position.x=1.2+Math.sin(menuTime*.16)*.18;camera.lookAt(4.5,1.6,-1)}renderPreviewFrame(dt)}renderer.render(scene,camera)}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1))});

// 初始启动
const unlockAudio=()=>audio();addEventListener('pointerdown',unlockAudio,{once:true});addEventListener('keydown',unlockAudio,{once:true});
bindFootstepSettings('#footstep-enabled','#footstep-volume');bindFootstepSettings('#pause-footstep-enabled','#pause-footstep-volume');syncFootstepSettingsUI();
makeMenuScene();(globalThis.requestIdleCallback||((fn)=>setTimeout(fn,0)))(()=>prewarmOperatorTemplates());renderArsenal();updateModeNote();renderAccountCenter();$('#account-login-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter||$('#account-login-form button.primary');button.disabled=true;try{const ok=await loginAccount($('#login-username').value,$('#login-password').value);if(!ok){$('#login-error').textContent='用户名或密码错误';$('#login-password').select()}}catch{$('#login-error').textContent='当前浏览器无法完成账户验证'}finally{button.disabled=false}});$('#toggle-password').onclick=()=>{const input=$('#login-password'),show=input.type==='password';input.type=show?'text':'password';$('#toggle-password').textContent=show?'隐藏':'显示';$('#toggle-password').setAttribute('aria-pressed',String(show));input.focus()};$('#account-logout').onclick=logoutAccount;$('#account-logout-page').onclick=logoutAccount;animate();
setTimeout(()=>{$('#boot').style.opacity=0;setTimeout(()=>{$('#boot').remove();$('#menu').classList.remove('hidden');const remembered=localStorage.getItem('rf-session-account');if(!remembered||!activateAccount(remembered))showAccountLogin()},500)},900);
