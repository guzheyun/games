// ── 程序化外形库 ─────────────────────────────────────────────────
// 所有枪械 / 投掷物模型都由基础几何体拼装，按 weapon-specs.js 中的真实外形规格驱动，
// 每把枪拥有独立轮廓（无托 / 弹鼓 / 螺旋弹筒 / 弹链盒 / 木制枪身 / 两脚架 …）。
// 坐标约定：枪口指向 +X，上方 +Y，厚度方向 ±Z，原点位于机匣中心的膛线高度。
import * as THREE from 'three';
import {WEAPON_SPECS} from './weapon-specs.js';

export {WEAPON_SPECS};

const matCache=new Map();
function M(color,rough=.55,metal=.25,extra){
  const key=`${color}|${rough}|${metal}|${extra?JSON.stringify(extra):''}`;
  let m=matCache.get(key);
  if(!m){m=new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});matCache.set(key,m)}
  return m;
}
const geoCache=new Map();
function G(kind,...args){
  const key=kind+args.join(',');
  let g=geoCache.get(key);
  if(!g){
    g=kind==='box'?new THREE.BoxGeometry(...args)
      :kind==='cyl'?new THREE.CylinderGeometry(...args)
      :kind==='sph'?new THREE.SphereGeometry(...args)
      :kind==='cone'?new THREE.ConeGeometry(...args)
      :kind==='torus'?new THREE.TorusGeometry(...args)
      :new THREE.CapsuleGeometry(...args);
    geoCache.set(key,g);
  }
  return g;
}
function put(geo,material,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m}
const bx=(w,h,d,m,x,y,z)=>put(G('box',w,h,d),m,x,y,z);
function cyl(rt,rb,len,seg,m,x,y,z,axis='y'){
  const c=put(G('cyl',rt,rb,len,seg),m,x,y,z);
  if(axis==='x')c.rotation.z=Math.PI/2;else if(axis==='z')c.rotation.x=Math.PI/2;
  return c;
}

// ── 材质族：按真实枪械涂装分组 ────────────────────────────────────
const PALETTES={
  'polymer-black':{body:0x4a5257,furn:0x363d41,metal:0x22282b,bright:0x69747a,rough:.6,metalness:.24},
  'polymer-fde'  :{body:0xa88f61,furn:0x87704a,metal:0x33322c,bright:0xc7ac7c,rough:.66,metalness:.16},
  'steel-black'  :{body:0x424b50,furn:0x333a3f,metal:0x1d2226,bright:0x6e797f,rough:.34,metalness:.78},
  'steel-wood'   :{body:0x434c52,furn:0x9a6634,metal:0x22272a,bright:0xc08544,rough:.38,metalness:.66},
  'od-green'     :{body:0x5d6944,furn:0x4c5738,metal:0x262b21,bright:0x7f8c5d,rough:.66,metalness:.14},
  'grey-alloy'   :{body:0x8b939a,furn:0x6b7278,metal:0x343a40,bright:0xacb5bc,rough:.36,metalness:.72}
};
function palette(spec,tint){
  const p=PALETTES[spec.mat]||PALETTES['polymer-black'];
  const mix=c=>{const col=new THREE.Color(c);if(tint!==undefined)col.lerp(new THREE.Color(tint),.14);return col.getHex()};
  return {
    body:M(mix(p.body),p.rough,p.metalness),
    furn:M(mix(p.furn),Math.min(.95,p.rough+.12),p.metalness*.7),
    metal:M(p.metal,.3,.85),
    dark:M(0x14171a,.42,.6),
    bright:M(mix(p.bright),p.rough-.1,p.metalness+.12),
    rubber:M(0x181c1c,.95,.02),
    glassy:M(0x0d1114,.14,.9),
    // 瞄具镜片必须允许视线穿透；关闭深度写入，避免开镜时镜片挡住场景。
    lens:new THREE.MeshStandardMaterial({color:0x67d9ff,emissive:0x0f4a5e,emissiveIntensity:.45,roughness:.08,metalness:.2,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide}),
    brass:M(0xc09a4a,.32,.85),
    tracerRed:new THREE.MeshStandardMaterial({color:0xff5a3c,emissive:0x912a12,emissiveIntensity:.7,roughness:.4})
  };
}

// ── 通用零件 ──────────────────────────────────────────────────────
function railSlots(g,len,x,y,z,mats,width=.028,detail=1){
  g.add(bx(len,.011,width,mats.dark,x,y,z));
  if(!detail)return;
  const n=Math.max(2,Math.round(len/.03));
  for(let i=0;i<n;i++)g.add(bx(.013,.014,width*1.2,mats.metal,x-len/2+len/(2*n)+i*len/n,y+.011,z));
}
function ventSlots(g,count,len,x,y,z,mats,width){
  for(let i=0;i<count;i++){const t=(i+.5)/count;g.add(bx(len/count*.5,.022,width*1.06,mats.dark,x-len/2+t*len,y,z))}
}
function curvedMag(mats,len,depth=.048,width=.052,curve=.11,translucent=false){
  const g=new THREE.Group(),seg=5,sl=len/seg;
  const shell=translucent?new THREE.MeshPhysicalMaterial({color:0x5a4a2c,roughness:.22,metalness:.05,transparent:true,opacity:.62,transmission:.35}):mats.furn;
  let px=0,py=0,ang=0;
  for(let i=0;i<seg;i++){
    ang+=curve;
    px+=Math.sin(ang)*sl*.5;py-=Math.cos(ang)*sl*.5;
    const s=bx(depth*(1-i*.02),sl*1.1,width,shell,px,py,0);s.rotation.z=ang;g.add(s);
    if(translucent){const rounds=bx(depth*.5,sl*.9,width*.55,mats.brass,px,py,0);rounds.rotation.z=ang;g.add(rounds)}
    px+=Math.sin(ang)*sl*.5;py-=Math.cos(ang)*sl*.5;
  }
  const plate=bx(depth*1.1,.016,width*1.08,mats.dark,px,py,0);plate.rotation.z=ang;g.add(plate);
  return g;
}
function buildMagazine(kind,spec,mats,detail){
  const g=new THREE.Group(),len=spec.magL||.18;
  switch(kind){
    case'curved':case'long-curved':g.add(curvedMag(mats,len,.05,.054,kind==='long-curved'?.14:.1));break;
    case'translucent-curved':g.add(curvedMag(mats,len,.05,.054,.09,true));break;
    case'box':{
      const body=bx(.05,len,.056,mats.furn,0,-len/2,0);body.rotation.z=.05;g.add(body);
      g.add(bx(.056,.014,.062,mats.dark,.012,-len-.005,0));
      if(detail)for(let i=1;i<3;i++)g.add(bx(.054,.006,.058,mats.metal,0,-len*i/3,0));
      break;
    }
    case'drum':{
      g.add(cyl(.088,.088,.056,20,mats.furn,0,-.085,0,'z'));
      g.add(cyl(.06,.06,.062,16,mats.dark,0,-.085,0,'z'));
      g.add(bx(.048,.07,.05,mats.furn,0,-.03,0));
      if(detail)for(let i=0;i<6;i++){const a=i/6*Math.PI*2;g.add(bx(.012,.05,.058,mats.metal,Math.cos(a)*.058,-.085+Math.sin(a)*.058,0))}
      break;
    }
    case'pan':{ // DP-28 唱片式弹盘，水平置于机匣上方
      g.add(cyl(.135,.135,.032,26,mats.metal,0,0,0,'y'));
      g.add(cyl(.142,.142,.012,26,mats.body,0,.018,0,'y'));
      g.add(cyl(.032,.032,.05,12,mats.dark,0,.03,0,'y'));
      if(detail)for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.add(bx(.03,.006,.012,mats.bright,Math.cos(a)*.1,.026,Math.sin(a)*.1))}
      break;
    }
    case'topmount':{ // P90 顶部横置透明弹匣
      const shell=new THREE.MeshPhysicalMaterial({color:0x3d4441,roughness:.16,metalness:.02,transparent:true,opacity:.5,transmission:.5});
      g.add(bx(.32,.042,.07,shell,0,0,0));
      g.add(bx(.3,.02,.05,mats.brass,0,0,0));
      g.add(bx(.05,.05,.075,mats.furn,-.16,-.004,0));
      break;
    }
    case'helical':{ // PP-19 螺旋弹筒，沿枪管方向置于下方
      g.add(cyl(.052,.052,.3,18,mats.metal,0,0,0,'x'));
      g.add(cyl(.058,.058,.02,18,mats.dark,-.15,0,0,'x'));
      g.add(cyl(.045,.045,.02,18,mats.dark,.15,0,0,'x'));
      if(detail)for(let i=0;i<7;i++){const t=i/7,a=t*Math.PI*3;const r=put(G('box',.03,.012,.012),mats.bright,-.14+t*.28,Math.cos(a)*.053,Math.sin(a)*.053);r.rotation.x=-a;g.add(r)}
      break;
    }
    case'belt-box':{ // 弹链盒 + 外露弹链
      g.add(bx(.16,len,.11,mats.furn,0,-len/2,0));
      g.add(bx(.166,.02,.116,mats.dark,0,-.012,0));
      g.add(bx(.05,.03,.09,mats.metal,.06,-.03,0));
      if(detail)for(let i=0;i<7;i++){const r=bx(.016,.03,.012,mats.brass,.075+i*.008,-.02+i*.026,-.03+i*.004);r.rotation.z=.25;g.add(r)}
      break;
    }
    default:g.add(bx(.05,.05,.056,mats.dark,0,-.026,0));
  }
  return g;
}
function buildStock(kind,spec,mats,detail){
  const g=new THREE.Group(),L=spec.stockL||.26,h=spec.recH;
  switch(kind){
    case'collapsible-tube':{
      g.add(cyl(.026,.026,L*.78,12,mats.metal,-L*.36,-.01,0,'x'));
      g.add(bx(L*.42,h*.78,.07,mats.furn,-L*.72,-.02,0));
      g.add(bx(.026,h*.92,.075,mats.rubber,-L*.93,-.02,0));
      if(detail)for(let i=0;i<4;i++)g.add(bx(.012,.02,.03,mats.dark,-L*.2-i*.05,.024,0));
      break;
    }
    case'fixed-polymer':{
      const b=bx(L,h*.85,.07,mats.furn,-L/2,-.015,0);b.rotation.z=.035;g.add(b);
      g.add(bx(L*.5,.035,.055,mats.body,-L*.42,h*.42,0));
      g.add(bx(.028,h*1.05,.078,mats.rubber,-L-.012,-.03,0));
      break;
    }
    case'skeleton':{
      for(const zz of[-.028,.028]){const r=bx(L*.9,.018,.014,mats.metal,-L*.5,-.01,zz);r.rotation.z=.06;g.add(r)}
      g.add(bx(.02,h*.9,.075,mats.rubber,-L*.94,-.03,0));
      g.add(bx(.03,h*.55,.06,mats.furn,-L*.28,.02,0));
      break;
    }
    case'folding-wire':{
      for(const zz of[-.03,.03]){const r=bx(L*.92,.012,.012,mats.metal,-L*.5,-.03,zz);g.add(r)}
      g.add(bx(.012,.012,.07,mats.metal,-L*.95,-.03,0));
      g.add(bx(.05,.05,.07,mats.dark,-.03,-.02,0));
      break;
    }
    case'side-folding':{
      g.add(bx(.05,h*.8,.06,mats.dark,-.03,-.01,0));
      const b=bx(L*.86,h*.72,.055,mats.furn,-L*.52,-.015,.012);b.rotation.z=.03;g.add(b);
      g.add(bx(.026,h*.95,.07,mats.rubber,-L*.94,-.025,.012));
      if(detail)g.add(bx(L*.5,.05,.03,mats.body,-L*.5,h*.32,.012));
      break;
    }
    case'wood':{
      const b=bx(L*.82,h*1.05,.062,mats.furn,-L*.46,-.035,0);b.rotation.z=.05;g.add(b);
      g.add(bx(L*.42,.05,.05,mats.furn,-L*.3,h*.5,0));
      g.add(bx(.024,h*1.15,.07,mats.dark,-L*.9,-.06,0));
      if(detail)g.add(bx(.05,.05,.066,mats.metal,-L*.16,-h*.3,0));
      break;
    }
    case'integral':{ // 无托：机匣尾部即托底
      g.add(bx(L,h*.92,.07,mats.furn,-L*.5,-.005,0));
      g.add(bx(.028,h*1.02,.078,mats.rubber,-L-.012,-.01,0));
      g.add(bx(L*.7,.04,.05,mats.body,-L*.45,h*.48,0));
      break;
    }
  }
  return g;
}
function buildMuzzle(kind,spec,mats,detail){
  const g=new THREE.Group(),d=spec.barD;
  switch(kind){
    case'brake':{
      g.add(cyl(d*1.7,d*1.6,.075,12,mats.metal,.038,0,0,'x'));
      if(detail)for(let i=0;i<3;i++)for(const zz of[-1,1])g.add(bx(.012,d*3.4,.008,mats.dark,.016+i*.022,0,zz*d*1.5));
      g.add(cyl(d*1.9,d*1.9,.012,12,mats.dark,.08,0,0,'x'));
      break;
    }
    case'compensator':{
      g.add(cyl(d*1.5,d*1.5,.06,10,mats.metal,.03,0,0,'x'));
      if(detail)for(let i=0;i<3;i++)g.add(bx(.01,.03,d*3.2,mats.dark,.014+i*.019,d*.9,0));
      break;
    }
    case'flashhider':{
      g.add(cyl(d*1.45,d*1.25,.055,10,mats.metal,.028,0,0,'x'));
      if(detail)for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.4;g.add(bx(.03,.01,.01,mats.dark,.038,Math.cos(a)*d*1.3,Math.sin(a)*d*1.3))}
      break;
    }
    case'conical':g.add(cyl(d*2.2,d*1.2,.07,12,mats.metal,.035,0,0,'x'));break;
    case'suppressor':
    case'integral-suppressor':{
      const len=kind==='integral-suppressor'?Math.max(.22,spec.barL):.19;
      g.add(cyl(d*1.9,d*1.9,len,14,mats.metal,len/2-(kind==='integral-suppressor'?len:0),0,0,'x'));
      if(detail){
        const n=kind==='integral-suppressor'?9:5,base=kind==='integral-suppressor'?-len:0;
        for(let i=0;i<n;i++)g.add(cyl(d*2.05,d*2.05,.008,14,mats.dark,base+len*(i+.5)/n,0,0,'x'));
      }
      break;
    }
  }
  return g;
}
function buildSight(kind,mats,detail){
  const g=new THREE.Group();
  if(kind==='iron'){
    g.add(bx(.012,.038,.01,mats.metal,.16,.028,0));
    g.add(bx(.014,.03,.05,mats.metal,-.1,.024,0));
    g.add(cyl(.014,.014,.01,10,mats.dark,-.1,.034,0,'x'));
  }else if(kind==='reddot'){
    // 和平精英风格的微型管式红点：低矮底座、圆形镜筒、双层护圈与调节旋钮。
    // 镜筒使用无端盖圆柱，确保镜片中心真正通透，不会遮住第一人称视线。
    const shell=put(G('cyl',.041,.041,.088,20,1,true),mats.dark,0,.057,0);shell.rotation.z=Math.PI/2;g.add(shell);
    for(const x of[-.046,.046]){const ring=put(G('torus',.037,.0055,6,24),mats.metal,x,.057,0);ring.rotation.y=Math.PI/2;g.add(ring)}
    g.add(cyl(.032,.032,.0025,24,mats.lens,.048,.057,0,'x'));
    const redDot=new THREE.MeshBasicMaterial({color:0xff392f,transparent:true,opacity:.96,depthWrite:false});
    g.add(cyl(.0026,.0026,.001,12,redDot,.0502,.057,0,'x'));
    g.add(bx(.082,.012,.062,mats.metal,0,.009,0));
    g.add(bx(.052,.026,.044,mats.dark,-.004,.028,0));
    g.add(bx(.072,.008,.068,mats.bright,0,.001,0));
    g.add(cyl(.013,.013,.014,12,mats.metal,-.008,.105,0,'y'));
    g.add(cyl(.011,.011,.014,12,mats.metal,-.008,.06,.048,'z'));
    if(detail){
      g.add(bx(.026,.003,.002,mats.bright,-.008,.113,0));
      for(const z of[-.025,.025])g.add(bx(.014,.008,.006,mats.dark,-.024,.016,z));
    }
  }else if(kind==='holo'){
    g.add(bx(.095,.045,.056,mats.dark,0,.03,0));
    g.add(bx(.01,.042,.046,mats.lens,.048,.036,0));
    g.add(bx(.03,.016,.03,mats.metal,-.04,.056,0));
  }else if(kind==='lowscope'){
    g.add(cyl(.028,.028,.19,14,mats.dark,0,.048,0,'x'));
    g.add(cyl(.034,.034,.03,14,mats.metal,.088,.048,0,'x'));
    g.add(cyl(.026,.026,.006,14,mats.lens,.102,.048,0,'x'));
    for(const x of[-.05,.05])g.add(bx(.02,.05,.03,mats.metal,x,.02,0));
    if(detail)g.add(cyl(.014,.014,.022,10,mats.metal,.02,.074,0,'y'));
  }else if(kind==='bigscope'){
    g.add(cyl(.03,.03,.26,16,mats.dark,-.01,.062,0,'x'));
    g.add(cyl(.046,.046,.075,16,mats.dark,.155,.062,0,'x'));
    g.add(cyl(.042,.042,.006,16,mats.lens,.192,.062,0,'x'));
    g.add(cyl(.036,.036,.04,16,mats.dark,-.15,.062,0,'x'));
    g.add(cyl(.03,.03,.006,16,mats.lens,-.168,.062,0,'x'));
    for(const x of[-.07,.07])g.add(bx(.026,.062,.034,mats.metal,x,.026,0));
    if(detail){g.add(cyl(.018,.018,.028,10,mats.metal,.02,.094,0,'y'));g.add(cyl(.018,.018,.028,10,mats.metal,.02,.062,.038,'z'))}
  }
  return g;
}
function buildBipod(mats,x,y){
  const g=new THREE.Group();
  g.add(bx(.05,.04,.045,mats.dark,x,y+.02,0));
  for(const zz of[-1,1]){
    const leg=cyl(.009,.007,.24,8,mats.metal,x-.03,y-.11,zz*.055,'y');
    leg.rotation.x=-zz*.42;leg.rotation.z=.16;g.add(leg);
    g.add(bx(.028,.012,.014,mats.rubber,x-.075,y-.215,zz*.1));
  }
  return g;
}
function buildForegrip(kind,mats,x,y){
  const g=new THREE.Group();
  if(kind==='vertical-grip'){const p=bx(.036,.11,.04,mats.furn,x,y-.06,0);g.add(p);g.add(bx(.044,.016,.05,mats.dark,x,y-.115,0))}
  else if(kind==='angled-grip'){const p=bx(.04,.085,.04,mats.furn,x,y-.05,0);p.rotation.z=.5;g.add(p)}
  else if(kind==='thumb-grip'){g.add(bx(.032,.07,.036,mats.furn,x,y-.04,0));g.add(bx(.05,.026,.036,mats.dark,x+.014,y-.072,0))}
  else if(kind==='light-grip'){g.add(bx(.03,.075,.032,mats.bright,x,y-.042,0))}
  else if(kind==='laser-sight'){g.add(bx(.055,.03,.03,mats.dark,x,y-.014,.042));g.add(cyl(.008,.008,.01,8,new THREE.MeshBasicMaterial({color:0xff3b30}),x+.03,y-.014,.042,'x'))}
  return g;
}

const SIGHT_MAP={'red-dot':'reddot',holo:'holo','scope-2x':'lowscope','scope-3x':'lowscope','scope-4x':'bigscope','scope-6x':'bigscope','scope-8x':'bigscope'};
const MUZZLE_MAP={compensator:'compensator','flash-hider':'flashhider',suppressor:'suppressor'};

// ── 主入口：按 key 生成独一无二的枪械 ────────────────────────────
export function buildWeaponModel(key,opts={}){
  const spec=WEAPON_SPECS[key];
  if(!spec)return new THREE.Group();
  const detail=opts.detail===undefined?1:opts.detail;
  const attach=opts.attachments||{};
  const mats=palette(spec,opts.tint);
  const g=new THREE.Group();
  g.userData.isWeapon=true;g.userData.weaponKey=key;

  const recL=spec.recL,recH=spec.recH,W=.062;
  const front=recL/2,back=-recL/2,hgL=Math.min(spec.hgL,recL*.62),bodyEnd=front-hgL;
  const bullpup=spec.lay==='bullpup';

  // 机匣本体
  if(spec.prof==='tube'){
    g.add(cyl(recH*.42,recH*.42,recL-hgL,16,mats.body,(back+bodyEnd)/2,0,0,'x'));
    g.add(bx((recL-hgL)*.5,recH*.5,W*.92,mats.body,bodyEnd-(recL-hgL)*.28,-recH*.3,0));
  }else if(spec.prof==='rounded'){
    g.add(cyl(recH*.4,recH*.4,recL-hgL,14,mats.body,(back+bodyEnd)/2,recH*.06,0,'x'));
    g.add(bx(recL-hgL,recH*.62,W,mats.body,(back+bodyEnd)/2,-recH*.22,0));
  }else{
    const h=spec.prof==='boxy'?recH:recH*.86;
    g.add(bx(recL-hgL,h,W,mats.body,(back+bodyEnd)/2,0,0));
    if(spec.prof==='slab'){
      g.add(bx(recL-hgL,h*.24,W*1.06,mats.bright,(back+bodyEnd)/2,h*.36,0));
      g.add(bx((recL-hgL)*.9,h*.2,W*1.02,mats.dark,(back+bodyEnd)/2,-h*.34,0));
    }else if(detail){
      g.add(bx((recL-hgL)*.9,h*.18,W*1.05,mats.dark,(back+bodyEnd)/2,h*.3,0));
    }
  }
  // 抛壳口与拉机柄
  const es=spec.eject==='left'?-1:spec.eject==='downward'?0:1;
  if(es!==0){
    g.add(bx(.075,recH*.3,.008,mats.dark,bodyEnd-.1,recH*.16,es*(W/2+.002)));
    if(detail)g.add(bx(.085,recH*.36,.012,mats.metal,bodyEnd-.1,recH*.16,es*(W/2+.008)));
  }
  if(spec.charge==='side')g.add(bx(.05,.02,.024,mats.metal,bodyEnd-.03,recH*.2,es*(W/2+.014)));
  else if(spec.charge==='top')g.add(bx(.05,.024,.03,mats.metal,bodyEnd-.02,recH*.5,0));
  else if(spec.charge==='rear')g.add(bx(.04,.022,.028,mats.metal,back+.02,recH*.22,0));
  if(detail)g.add(bx(.03,.016,.012,mats.bright,bodyEnd-.16,recH*.05,es*(W/2+.006)));

  // 护木 / 前握部
  if(hgL>.01){
    const hx=front-hgL/2;
    if(spec.hg==='railed'){
      g.add(bx(hgL,recH*.6,W*.86,mats.furn,hx,-recH*.04,0));
      railSlots(g,hgL*.94,hx,recH*.3,0,mats,W*.5,detail);
      for(const zz of[-1,1])if(detail)railSlots(g,hgL*.8,hx,-recH*.04,zz*W*.44,mats,.02,0);
    }else if(spec.hg==='polymer'){
      g.add(bx(hgL,recH*.62,W*.9,mats.furn,hx,-recH*.04,0));
      if(detail)for(const zz of[-1,1])ventSlots(g,4,hgL*.8,hx,-recH*.04,zz*W*.4,mats,.012);
    }else if(spec.hg==='wood'){
      g.add(bx(hgL,recH*.66,W*.96,mats.furn,hx,-recH*.12,0));
      g.add(bx(hgL*.9,recH*.3,W*.6,mats.furn,hx,recH*.24,0));
    }else if(spec.hg==='perforated'){
      g.add(cyl(recH*.34,recH*.34,hgL,14,mats.body,hx,0,0,'x'));
      if(detail)for(let i=0;i<Math.round(hgL/.05);i++)for(const zz of[-1,1])g.add(cyl(.011,.011,W,8,mats.dark,front-hgL+.03+i*.05,0,zz*recH*.3,'z'));
    }else if(spec.hg==='tube'){
      g.add(cyl(recH*.36,recH*.36,hgL,16,mats.furn,hx,0,0,'x'));
      if(detail)for(let i=0;i<4;i++)g.add(cyl(recH*.38,recH*.38,.01,16,mats.dark,front-hgL+hgL*(i+.5)/4,0,0,'x'));
    }
  }

  // 枪管与枪口装置
  const muzzleX=front+spec.barL;
  if(spec.barL>.01){
    g.add(cyl(spec.barD,spec.barD*.94,spec.barL,12,mats.metal,front+spec.barL/2,0,0,'x'));
    if(detail&&spec.barL>.2)g.add(bx(.04,recH*.34,.032,mats.metal,front+.03,recH*.12,0)); // 导气块
  }
  const muzzleKind=MUZZLE_MAP[attach.muzzle]||spec.muz;
  if(muzzleKind&&muzzleKind!=='none'){const mz=buildMuzzle(muzzleKind,spec,mats,detail);mz.position.x=muzzleKind==='integral-suppressor'?front+spec.barL:muzzleX;g.add(mz)}

  // 握把与扳机
  const gripX=bullpup?recL*.10:-recL*.13,gripBase=-recH*.5;
  if(spec.grip==='wood'){
    const grip=bx(.06,.15,.058,mats.furn,gripX,gripBase-.06,0);grip.rotation.z=-.22;g.add(grip);
  }else if(spec.grip==='vertical-integral'){
    const grip=bx(.05,.16,.055,mats.furn,gripX,gripBase-.07,0);g.add(grip);
    g.add(bx(.042,.11,.05,mats.furn,gripX+recL*.3,gripBase-.045,0));
  }else{
    const grip=bx(.052,.155,.055,mats.furn,gripX,gripBase-.065,0);grip.rotation.z=-.28;g.add(grip);
    if(detail)for(let i=0;i<3;i++)g.add(bx(.012,.016,.058,mats.dark,gripX+.022+i*.008,gripBase-.05-i*.036,0));
  }
  g.add(bx(.016,.038,.016,mats.metal,gripX+.05,gripBase-.02,0));
  const guard=put(G('torus',.032,.006,6,12,Math.PI),mats.metal,gripX+.05,gripBase-.006,0);
  guard.rotation.y=Math.PI/2;guard.rotation.z=Math.PI;g.add(guard);
  if(detail)g.add(bx(.026,.014,.012,mats.bright,gripX+.03,recH*.1,W/2+.004)); // 快慢机

  // 弹匣
  const magKind=spec.mag,magX=gripX+spec.magF;
  if(magKind!=='none'){
    const magSpec={...spec,magL:spec.magL*(attach.magazine&&attach.magazine.includes('extended')?1.3:1)};
    const magGroup=buildMagazine(magKind,magSpec,mats,detail);
    if(magKind==='pan')magGroup.position.set(magX*.4,recH*.5,0);
    else if(magKind==='topmount')magGroup.position.set(recL*.06,recH*.5+.02,0);
    else if(magKind==='helical')magGroup.position.set(front-hgL*.4,-recH*.55,0);
    else if(magKind==='drum')magGroup.position.set(magX,-recH*.45,0);
    else if(magKind==='belt-box')magGroup.position.set(magX,-recH*.5,0);
    else{magGroup.position.set(magX,-recH*.45,0);magGroup.rotation.z=bullpup?.06:-.03}
    g.add(magGroup);
    if(magKind!=='pan'&&magKind!=='topmount'&&magKind!=='helical')g.add(bx(.07,.03,W*.92,mats.dark,magX,-recH*.45,0));
  }else if(detail){
    g.add(bx(.08,.028,W*.9,mats.metal,gripX+spec.magF,-recH*.5,0)); // 内置弹仓底板
  }

  // 枪托
  const stockKind=attach.stock==='heavy-stock'?'fixed-polymer':spec.stock;
  if(stockKind&&stockKind!=='none'){const st=buildStock(stockKind,spec,mats,detail);st.position.x=back;g.add(st)}
  if(attach.stock==='cheek-pad')g.add(bx(spec.stockL*.55,.04,.056,mats.rubber,back-spec.stockL*.42,recH*.5,0));
  if(attach.stock==='bullet-loops')for(let i=0;i<5;i++)g.add(bx(.014,.03,.012,mats.brass,back-.05-i*.026,-recH*.1,W/2+.01));

  // 顶部导轨 / 提把 / 瞄具
  const railY=spec.prof==='tube'||spec.prof==='rounded'?recH*.42:recH*.5;
  if(spec.rail||attach.sight)railSlots(g,recL*(bullpup?.72:.6),bullpup?recL*.05:back+recL*.32,railY,0,mats,.03,detail);
  if(spec.handle){
    const hx=bullpup?recL*.06:back+recL*.34,hl=recL*.42;
    g.add(bx(hl,.022,.03,mats.body,hx,railY+.075,0));
    for(const dx of[-hl/2,hl/2])g.add(bx(.024,.075,.03,mats.body,hx+dx,railY+.038,0));
  }
  const sightKind=SIGHT_MAP[attach.sight]||spec.scope;
  if(sightKind&&sightKind!=='none'){
    const s=buildSight(sightKind,mats,detail);
    s.position.set(bullpup?recL*.08:back+recL*.36,railY+(spec.handle?.09:.012),0);
    g.add(s);
  }

  if(spec.bipod)g.add(buildBipod(mats,front-hgL*.15,-recH*.5));
  if(attach.grip)g.add(buildForegrip(attach.grip,mats,front-hgL*.4,-recH*.42));

  // 背带环
  if(detail){
    g.add(put(G('torus',.014,.004,5,10),mats.metal,back+.02,-recH*.5,W/2*.7));
    g.add(put(G('torus',.014,.004,5,10),mats.metal,front-hgL*.1,-recH*.42,W/2*.7));
  }

  // 枪口焰
  const flash=put(G('cone',spec.barD*3.4,.26,7),new THREE.MeshBasicMaterial({color:0xffcf6a,transparent:true,opacity:.92,depthWrite:false}),muzzleX+.2,0,0);
  flash.rotation.z=-Math.PI/2;flash.visible=false;flash.castShadow=false;
  const halo=put(G('sph',spec.barD*3.6,8,6),new THREE.MeshBasicMaterial({color:0xffe9a8,transparent:true,opacity:.55,depthWrite:false}),muzzleX+.05,0,0);
  halo.visible=false;halo.castShadow=false;
  g.add(flash,halo);
  g.userData.flash=flash;g.userData.halo=halo;
  g.userData.muzzleX=muzzleX;
  g.userData.length=muzzleX-back-(spec.stockL||0);
  return g;
}

// ── 第一人称手部 ─────────────────────────────────────────────────
export function addFirstPersonHands(g,spec){
  const glove=M(0x1b2220,.86,.06),sleeve=M(0x2c3b34,.94,.04),strap=M(0x131816,.6,.3);
  const recH=spec?spec.recH:.15,recL=spec?spec.recL:.5,bullpup=spec&&spec.lay==='bullpup';
  const mkHand=(x,y,z,rot)=>{
    const h=new THREE.Group();
    h.add(put(G('box',.1,.075,.06),glove,0,0,0));
    for(let i=0;i<4;i++){const f=put(G('capsule',.012,.05,3,6),glove,.02+i*.006,-.03,-.024+i*.016);f.rotation.x=.2;f.rotation.z=1.35;h.add(f)}
    h.add(put(G('capsule',.014,.04,3,6),glove,-.02,-.02,.032));
    const arm=put(G('capsule',.045,.3,4,8),sleeve,-.16,-.05,.01);arm.rotation.z=1.25;h.add(arm);
    h.add(put(G('box',.04,.075,.066),strap,-.055,0,0));
    h.position.set(x,y,z);h.rotation.set(...rot);
    return h;
  };
  const gripX=bullpup?recL*.10:-recL*.13;
  g.add(mkHand(gripX+.01,-recH*.5-.085,.01,[0,0,-.25]));
  g.add(mkHand(recL*(bullpup?.42:.36),-recH*.42-.05,.012,[0,0,.18]));
}

// ── 干员：程序化高细节人物（真实身高约 1.82m，含护具、头盔、夜视支架与装具） ──
// 返回 {root, parts}；parts 带命中分区（head/body/limb/foot），由 game.js 注册为射线目标。
// 头部判定用头盔体积、躯干判定用防弹背心体积，既贴近视觉轮廓又不至于太难命中。
const operatorTemplates=new Map();
function createOperatorTemplate(team){
  const ally=team==='blue';
  const cloth=M(ally?0x35525f:0x5e3b31,.88,.03),clothDark=M(ally?0x263f49:0x452c25,.92,.02);
  const gear=M(0x1e2528,.84,.12),gearLite=M(0x2d383b,.78,.16),hard=M(0x161c1f,.42,.35);
  const skin=M(0x9c7659,.74,.02),rubber=M(0x111416,.96,.02),strap=M(0x24292b,.9,.05);
  const accent=M(ally?0x4fb9f5:0xff6b52,.55,.1),lens=M(0x2a4a52,.16,.6);
  const root=new THREE.Group(),parts=[];
  const zone=(m,z)=>{m.userData.zone=z;parts.push(m);root.add(m);return m};
  const deco=m=>{root.add(m);return m};

  // 腿部：靴 → 小腿 → 护膝 → 大腿
  for(const sx of[-.13,.13]){
    const boot=zone(put(G('box',.17,.13,.31),rubber,sx,.075,-.03),'foot');boot.rotation.x=.04;
    deco(put(G('box',.185,.04,.33),M(0x0b0d0e,.98,.02),sx,.022,-.03));
    deco(put(G('box',.16,.12,.13),clothDark,sx,.17,.02));
    zone(put(G('capsule',.082,.26,4,8),cloth,sx,.4,0),'limb');
    deco(put(G('box',.185,.16,.1),hard,sx,.6,-.075));
    zone(put(G('capsule',.098,.26,4,8),cloth,sx,.84,0),'limb');
  }
  // 髋部与腰带装具
  zone(put(G('box',.35,.2,.24),cloth,0,1.02,0),'body');
  deco(put(G('box',.38,.08,.27),gear,0,1.03,0));
  deco(put(G('box',.1,.19,.08),gear,.19,.9,.03));
  deco(put(G('box',.11,.06,.09),gearLite,.19,.99,.03));
  deco(put(G('box',.12,.13,.09),gear,-.19,.95,-.02));
  // 躯干与防弹背心
  deco(put(G('box',.4,.44,.24),cloth,0,1.28,0));
  zone(put(G('box',.46,.42,.3),gear,0,1.29,0),'body');
  deco(put(G('box',.34,.3,.045),gearLite,0,1.32,-.16));
  deco(put(G('box',.48,.13,.29),gearLite,0,1.09,0));
  for(const px of[-.12,0,.12])deco(put(G('box',.1,.16,.1),gearLite,px,1.16,-.19));
  deco(put(G('box',.19,.09,.07),gear,0,1.44,-.18));
  deco(put(G('box',.08,.15,.07),gear,.2,1.3,-.09));
  deco(put(G('cyl',.012,.012,.16,6),strap,.2,1.44,-.09));
  deco(put(G('box',.34,.36,.17),M(0x1b2124,.94,.04),0,1.28,.2));
  deco(put(G('box',.3,.05,.19),accent,0,1.44,.2));
  for(const sx of[-1,1])deco(put(G('box',.06,.4,.05),strap,sx*.14,1.32,.11));
  // 肩部与手臂（持枪预备姿态）
  for(const sx of[-1,1]){
    deco(put(G('sph',.105,10,8),gearLite,sx*.235,1.44,0));
    const upper=zone(put(G('capsule',.068,.2,4,8),cloth,sx*.235,1.33,-.03),'limb');upper.rotation.x=-.32;
    deco(put(G('box',.13,.1,.11),hard,sx*.235,1.2,-.11));
    const fore=zone(put(G('capsule',.06,.21,4,8),cloth,sx*.21,1.19,-.19),'limb');fore.rotation.x=-1.15;
    deco(put(G('box',.09,.09,.11),M(0x191e20,.9,.06),sx*.185,1.16,-.31));
  }
  deco(put(G('box',.075,.075,.09),accent,.245,1.4,-.02));
  // 头颈：面罩 + 护目镜 + 头盔
  deco(put(G('cyl',.055,.06,.1,10),skin,0,1.53,0));
  deco(put(G('box',.12,.09,.11),clothDark,0,1.55,0));
  deco(put(G('sph',.112,14,11),skin,0,1.63,0));
  deco(put(G('sph',.115,14,10,0,Math.PI*2,Math.PI*.42,Math.PI*.58),clothDark,0,1.63,0));
  zone(put(G('sph',.145,16,12,0,Math.PI*2,0,Math.PI*.62),hard,0,1.645,0),'head');
  const rim=put(G('torus',.143,.016,6,18),hard,0,1.645,0);rim.rotation.x=Math.PI/2;deco(rim);
  deco(put(G('box',.075,.05,.05),gearLite,0,1.72,-.11));
  deco(put(G('box',.05,.04,.11),gearLite,0,1.7,.11));
  for(const sx of[-1,1])deco(put(G('box',.02,.06,.19),gearLite,sx*.128,1.66,-.01));
  deco(put(G('box',.26,.062,.05),lens,0,1.655,-.115));
  deco(put(G('box',.29,.035,.045),strap,0,1.655,-.1));
  for(const sx of[-1,1])deco(put(G('box',.018,.09,.02),strap,sx*.1,1.56,-.05));
  deco(put(G('box',.05,.025,.03),accent,-.09,1.7,-.09));

  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  return root;
}

// 人物层级只拼装一次。实例共享几何体和材质，但动画、倒地和命中状态彼此独立。
function operatorTemplate(team){
  const key=team==='blue'?'blue':'red';
  let template=operatorTemplates.get(key);
  if(!template){template=createOperatorTemplate(key);operatorTemplates.set(key,template)}
  return template;
}
export function prewarmOperatorTemplates(){operatorTemplate('blue');operatorTemplate('red')}
export function buildOperator(team,opts={}){
  const model=operatorTemplate(team).clone(true),root=new THREE.Group(),parts=[],rig=[],castShadow=opts.castShadow!==false;
  root.add(model);model.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=castShadow;o.receiveShadow=true;
    if(o.userData.zone)parts.push(o);
    const x=o.position.x,y=o.position.y,ax=Math.abs(x),kind=y<1.04&&ax>.05?'leg':y>1.07&&y<1.53&&ax>.155?'arm':'core',section=kind==='leg'?(y<.25?'foot':y<.69?'lower':'upper'):kind==='arm'?(y>1.4?'shoulder':y>1.24?'upper':'hand'):'';
    rig.push({mesh:o,kind,side:x<0?-1:1,section,position:o.position.clone(),rotation:o.rotation.clone()});
  });
  root.userData.operatorModel=model;root.userData.operatorRig=rig;
  return {root,model,parts,rig};
}
export function poseOperator(root,{stance='stand',moving=false,gait='walk',reload=0,time=0,dt=1/60}={}){
  const model=root?.userData.operatorModel,rig=root?.userData.operatorRig;if(!model||!rig)return;
  const prone=stance==='prone',crouch=stance==='crouch',run=moving&&gait==='run',stride=moving?(run?.78:.38):0,phase=time*(run?11:7.2),smooth=1-Math.exp(-Math.max(.001,dt)*14);
  const targetY=prone?.56:moving?(run?.035:.018)*Math.abs(Math.sin(phase*2)):0,targetZ=prone?.65:0,targetPitch=prone?-Math.PI/2:run?-.075:moving?-.025:0;
  model.scale.set(1,1,1);model.position.x+=(0-model.position.x)*smooth;model.position.y+=(targetY-model.position.y)*smooth;model.position.z+=(targetZ-model.position.z)*smooth;
  model.rotation.x+=Math.atan2(Math.sin(targetPitch-model.rotation.x),Math.cos(targetPitch-model.rotation.x))*smooth;model.rotation.y*=1-smooth;model.rotation.z*=1-smooth;
  for(const item of rig){
    const {mesh,position,rotation,kind,section,side}=item;let x=position.x,y=position.y,z=position.z,rx=rotation.x,ry=rotation.y,rz=rotation.z;
    if(kind==='arm'&&section!=='shoulder'){
      if(section==='upper'){x*=.82;z-=side<0?.065:.025}
      else{x=side*.09;z+=side<0?-.13:.015}
      y-=reload*.1;z+=reload*.055;rx+=reload*(side<0?.18:-.12);
    }
    if(crouch){
      if(kind==='leg'){
        if(section==='upper'){y-=.21;z-=.1;rx+=.72}
        else if(section==='lower'){y-=.08;z-=.11;rx-=.5}
        else{z-=.035;rx+=.08}
      }else{y-=.3;z-=.025}
    }else if(!prone&&moving){
      const swing=Math.sin(phase+(side>0?Math.PI:0));
      if(kind==='leg'){rx+=swing*stride;z-=swing*(run?.11:.055);y-=Math.abs(swing)*(run?.025:.012);if(section==='foot')rx-=swing*stride*.42}
      else if(kind==='arm'){rx-=swing*(run?.1:.045);y+=Math.abs(swing)*.006}
    }
    mesh.position.x+=(x-mesh.position.x)*smooth;mesh.position.y+=(y-mesh.position.y)*smooth;mesh.position.z+=(z-mesh.position.z)*smooth;
    mesh.rotation.x+=Math.atan2(Math.sin(rx-mesh.rotation.x),Math.cos(rx-mesh.rotation.x))*smooth;mesh.rotation.y+=Math.atan2(Math.sin(ry-mesh.rotation.y),Math.cos(ry-mesh.rotation.y))*smooth;mesh.rotation.z+=Math.atan2(Math.sin(rz-mesh.rotation.z),Math.cos(rz-mesh.rotation.z))*smooth;
  }
}

// ── 投掷物：四种截然不同的外形 ───────────────────────────────────
const THROWABLE_NAMES={3:'M67 破片手雷',4:'燃烧瓶',5:'M18 烟雾弹',6:'M84 闪光弹'};
function safetyLever(mats,r,h){
  const g=new THREE.Group();
  g.add(bx(.012,h*.9,.022,mats.lever,r*.92,-h*.1,0));
  g.add(bx(.03,.012,.022,mats.lever,r*.72,h*.4,0));
  return g;
}
function pullRing(mats,x,y,z){
  const ring=put(G('torus',.019,.0035,6,14),mats.pin,x,y,z);
  ring.rotation.y=Math.PI/2;
  const g=new THREE.Group();g.add(ring);g.add(bx(.022,.005,.005,mats.pin,x-.012,y,z));
  return g;
}
export function buildThrowableModel(type){
  const g=new THREE.Group();
  const mats={
    body:M(0x4b5320,.72,.18),lever:M(0x7d858c,.34,.82),pin:M(0xb9c2c6,.28,.9),
    band:M(0xf0c93c,.5,.2),fuze:M(0x6c757c,.32,.85),dark:M(0x171b18,.6,.4),
    white:M(0xdfe6e2,.7,.05)
  };
  if(type===3){ // M67：橄榄绿球形弹体 + 黄色识别带 + 引信总成 + 保险握片
    const shell=M(0x4f5722,.68,.2);
    const bodyMesh=put(G('sph',.048,16,12),shell,0,0,0);bodyMesh.scale.set(1,1.08,1);g.add(bodyMesh);
    const seam=put(G('torus',.0475,.0035,6,20),M(0x3b4119,.6,.3),0,0,0);seam.rotation.x=Math.PI/2;g.add(seam);
    const band=put(G('torus',.0472,.005,6,20),mats.band,0,.018,0);band.rotation.x=Math.PI/2;band.scale.set(1,1,.98);g.add(band);
    g.add(cyl(.017,.02,.026,12,mats.fuze,0,.055,0,'y'));
    g.add(cyl(.023,.023,.008,12,mats.lever,0,.07,0,'y'));
    const lever=safetyLever({lever:mats.lever},.048,.09);lever.position.y=.012;g.add(lever);
    g.add(pullRing({pin:mats.pin},.032,.072,0));
  }else if(type===4){ // 燃烧瓶：琥珀玻璃瓶 + 可见燃料液面 + 布条引信
    const glass=new THREE.MeshPhysicalMaterial({color:0x8f5a24,roughness:.1,metalness:.02,transparent:true,opacity:.55,transmission:.65,thickness:.4,ior:1.45});
    const fuel=new THREE.MeshPhysicalMaterial({color:0xc8761c,roughness:.16,metalness:0,transparent:true,opacity:.85});
    g.add(cyl(.042,.045,.15,16,glass,0,0,0,'y'));
    g.add(cyl(.0405,.0435,.1,16,fuel,0,-.024,0,'y'));
    g.add(cyl(.045,.042,.012,16,glass,0,.079,0,'y'));
    const neck=put(G('cyl',.016,.038,.06,14),glass,0,.108,0);g.add(neck);
    g.add(cyl(.017,.017,.026,14,glass,0,.15,0,'y'));
    g.add(cyl(.0175,.0175,.012,14,mats.white,0,.163,0,'y'));
    const rag=put(G('capsule',.012,.05,3,8),mats.white,.006,.192,0);rag.rotation.z=-.3;g.add(rag);
    g.add(put(G('capsule',.011,.018,3,8),M(0x2a2320,.9,.05),.02,.222,0));
    const label=put(G('box',.002,.05,.05),mats.white,.045,-.008,0);g.add(label);
  }else if(type===5){ // M18：黑色薄钢圆筒 + 顶部四个喷口 + 绿色顶盖
    const shell=M(0x2f322e,.62,.4);
    g.add(cyl(.03,.03,.13,16,shell,0,0,0,'y'));
    g.add(cyl(.031,.031,.006,16,M(0x24a44a,.5,.3),0,.068,0,'y'));
    g.add(cyl(.031,.031,.008,16,mats.dark,0,-.066,0,'y'));
    for(let i=0;i<4;i++){const a=i/4*Math.PI*2;g.add(cyl(.006,.006,.012,8,mats.dark,Math.cos(a)*.017,.073,Math.sin(a)*.017,'y'))}
    g.add(cyl(.016,.018,.024,12,mats.fuze,0,.086,0,'y'));
    const lever=safetyLever({lever:mats.lever},.031,.1);lever.position.y=.03;g.add(lever);
    g.add(pullRing({pin:mats.pin},.026,.09,0));
    for(let i=0;i<3;i++){const st=put(G('box',.0015,.008,.03),mats.white,.0305,.02-i*.022,0);g.add(st)}
  }else{ // M84：多孔钢外壳（立柱结构）+ 蓝色识别带 + 内层铝筒
    const shell=M(0x33383a,.4,.75);
    g.add(cyl(.017,.017,.115,12,M(0x9aa3a8,.3,.9),0,0,0,'y'));
    g.add(cyl(.026,.026,.012,16,shell,0,.056,0,'y'));
    g.add(cyl(.026,.026,.012,16,shell,0,-.056,0,'y'));
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2;g.add(bx(.009,.106,.009,shell,Math.cos(a)*.023,0,Math.sin(a)*.023))}
    const band=put(G('torus',.0245,.0045,6,16),M(0x2f6fd0,.45,.25),0,0,0);band.rotation.x=Math.PI/2;g.add(band);
    g.add(cyl(.016,.018,.024,12,mats.fuze,0,.072,0,'y'));
    const lever=safetyLever({lever:mats.lever},.027,.09);lever.position.y=.02;g.add(lever);
    g.add(pullRing({pin:mats.pin},.024,.076,0));
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  g.userData.throwType=type;g.userData.label=THROWABLE_NAMES[type]||'';
  return g;
}
