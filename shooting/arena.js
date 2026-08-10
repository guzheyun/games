// ── 室内战场构筑 ─────────────────────────────────────────────────
// 所有对战地图与靶场都改为封闭的室内设施：明亮均匀的照明、干净可读的地面、
// 高低不一的掩体墙（可翻越 / 齐胸 / 全高 / 隔断），彻底去掉灰蒙蒙的户外雾气。
import * as THREE from 'three';

const matCache=new Map();
function M(color,rough=.72,metal=.06,extra){
  const key=`${color}|${rough}|${metal}|${extra?JSON.stringify(extra):''}`;
  let m=matCache.get(key);
  if(!m){m=new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});matCache.set(key,m)}
  return m;
}
function put(geo,material,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m}
const bx=(w,h,d,m,x,y,z)=>put(new THREE.BoxGeometry(w,h,d),m,x,y,z);
function cyl(rt,rb,h,seg,m,x,y,z,axis='y'){const c=put(new THREE.CylinderGeometry(rt,rb,h,seg),m,x,y,z);if(axis==='x')c.rotation.z=Math.PI/2;else if(axis==='z')c.rotation.x=Math.PI/2;return c}
const emissive=(color,intensity=1.6)=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.3,metalness:0});

// 掩体墙的高度分级：可翻越 → 齐胸 → 全身 → 高隔断 → 顶天隔墙
export const WALL_TIERS={vault:.95,chest:1.35,body:1.95,tall:2.7,partition:3.6};

// ── 主题配色（Gemini 室内美术规格 + 可读性微调） ──────────────────
const THEMES={
  foundry:{floor:0x8d959b,floorLine:0xf0a12a,wall:0x39424a,wallAccent:0xf0a12a,ceiling:0x1e242a,trim:0x596570,
    covers:[0x9ba3a8,0xd97c19,0x8a5f36,0x4e5b65],fixture:0xfff2d6,accentLight:0xffb347,haze:0x9aa5ae},
  metro:{floor:0x9aa5aa,floorLine:0x2f9c9a,wall:0x25333a,wallAccent:0x37c7c2,ceiling:0x161e23,trim:0x4a5c66,
    covers:[0xb4bfc3,0xe09a34,0x8a9599,0x3d4d55],fixture:0xe8fbff,accentLight:0x59e3dd,haze:0xa2b3b9},
  datacore:{floor:0xa5aeba,floorLine:0x3f7ff0,wall:0x1f2733,wallAccent:0x4f8dff,ceiling:0x121822,trim:0x3f4c60,
    covers:[0xbcc4cf,0xe07f34,0x939cab,0x323d51],fixture:0xf2f7ff,accentLight:0x6fa8ff,haze:0xa9b4c3},
  hangar:{floor:0x969d96,floorLine:0xe4c93f,wall:0x3a4440,wallAccent:0xe4c93f,ceiling:0x1c221f,trim:0x59645e,
    covers:[0xa4aba3,0xc7ac31,0x77836f,0x47554f],fixture:0xfff6e0,accentLight:0xffd76a,haze:0xa0a8a1},
  range:{floor:0x9fa9ae,floorLine:0xe03b30,wall:0x222b31,wallAccent:0x7ce04f,ceiling:0x141a1f,trim:0x46545e,
    covers:[0xa6aeb3,0x6ac544,0x8b9498,0x36434c],fixture:0xf4fff0,accentLight:0x9dff6b,haze:0xa5b0b5}
};

// ── 地图：全部为封闭室内设施 ─────────────────────────────────────
// walls 元素：[x, z, 长度, 高度, 厚度, 朝向]  朝向 0 = 沿 X 延伸，1 = 沿 Z 延伸
const T=WALL_TIERS;
// 布局按 180° 旋转对称展开，保证红蓝两侧的掩体条件完全一致
const symmetric=list=>list.flatMap(w=>(Math.abs(w[0])<.01&&Math.abs(w[1])<.01)?[w]:[w,[-w[0],-w[1],...w.slice(2)]]);
// 地形同样镜像，朝向要一并翻转（0↔2 沿 X，1↔3 沿 Z）
const symTerrain=list=>list.flatMap(([kind,x,z,dir=0,len])=>[[kind,x,z,dir,len],[kind,-x,-z,(dir+2)%4,len]]);
export const MAPS=[
  {name:'熔炉训练场',sub:'钢铁厂改建 · 室内 CQB 设施',theme:'foundry',size:24,ceilingH:9,
    walls:symmetric([
      [-13,-8,10,T.body,.7,0],
      [-6,-14,8,T.tall,.7,1],
      [-17,3,9,T.partition,.8,1],
      [0,-4.5,7,T.vault,.9,0],
      [8,-8,7,T.chest,.7,1],
      [15,-15,7,T.vault,.8,0],
      [-19,-17,6,T.chest,.7,1],
      [-9,-20,6,T.body,.7,0],
      [17,7,6,T.chest,.7,0],
      [0,0,6,T.tall,.8,1]
    ]),
    terrain:symTerrain([
      ['deck',-14,-13,0],
      ['steps',-3,-17,1],
      ['catwalk',20,-6,1,16]
    ])},
  {name:'枢纽站台',sub:'地下三层 · 换乘大厅',theme:'metro',size:22,ceilingH:8,
    walls:symmetric([
      [-8,-7,11,T.partition,.9,1],
      [-8,7,11,T.partition,.9,1],
      [0,-12,10,T.body,.7,0],
      [-15,-5,8,T.chest,.7,0],
      [-17,10,7,T.tall,.7,1],
      [0,-3.5,5,T.vault,.9,0],
      [-15,15,7,T.body,.7,0],
      [16,-16,6,T.chest,.7,1]
    ]),
    terrain:symTerrain([
      ['catwalk',-18,0,1,20],
      ['steps',-14,-11,3],
      ['deck',4,-14,2]
    ])},
  {name:'数据核心',sub:'一号机房 · 冷通道',theme:'datacore',size:22,ceilingH:7.5,
    walls:symmetric([
      [-12,-7,10,T.tall,.8,1],
      [-12,7,10,T.tall,.8,1],
      [-4,-8,8,T.body,.7,1],
      [0,0,9,T.chest,.8,0],
      [-8,14,7,T.vault,.85,0],
      [0,-15,11,T.body,.7,0],
      [-18,0,8,T.partition,.8,1],
      [15,-18,6,T.chest,.7,0]
    ]),
    terrain:symTerrain([
      ['deck',-16,-12,0],
      ['steps',0,-9,3],
      ['catwalk',8,0,1,14]
    ])},
  {name:'零七机库',sub:'战术空运联队 · 主机库',theme:'hangar',size:28,ceilingH:13,
    walls:symmetric([
      [-14,-11,11,T.chest,.8,0],
      [-14,11,11,T.body,.8,0],
      [0,-7,10,T.tall,.8,1],
      [-22,0,13,T.partition,.9,1],
      [-7,0,7,T.vault,.9,0],
      [0,-19,14,T.body,.8,0],
      [-10,-22,7,T.vault,.9,1],
      [19,-14,8,T.chest,.8,1]
    ]),
    terrain:symTerrain([
      ['deck',-17,-17,0],
      ['steps',-4,-13,1],
      ['catwalk',24,0,1,24],
      ['deck',10,6,2]
    ])}
];
// 60 米纵深让射手线后的 45 米靶位与末端吸弹墙保持充足安全距离。
export const RANGE_MAP={name:'玄武室内靶场',sub:'封闭实弹训练馆 · 五条靶道',theme:'range',size:30,width:13,ceilingH:6.5,range:true,walls:[]};

// ── 程序化贴图 ───────────────────────────────────────────────────
function floorTexture(theme,renderer){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
  const base=new THREE.Color(theme.floor);
  x.fillStyle=`#${base.getHexString()}`;x.fillRect(0,0,512,512);
  // 细微噪点，避免纯色塑料感
  const img=x.getImageData(0,0,512,512);
  for(let i=0;i<img.data.length;i+=4){const n=(Math.random()-.5)*14;img.data[i]+=n;img.data[i+1]+=n;img.data[i+2]+=n}
  x.putImageData(img,0,0);
  // 环氧地坪分格线
  x.strokeStyle='rgba(40,50,58,.28)';x.lineWidth=3;
  for(let i=0;i<=4;i++){const p=i*128;x.beginPath();x.moveTo(p,0);x.lineTo(p,512);x.moveTo(0,p);x.lineTo(512,p);x.stroke()}
  x.strokeStyle='rgba(255,255,255,.3)';x.lineWidth=1;
  for(let i=0;i<=4;i++){const p=i*128+2;x.beginPath();x.moveTo(p,0);x.lineTo(p,512);x.moveTo(0,p);x.lineTo(512,p);x.stroke()}
  // 使用痕迹
  x.globalAlpha=.06;x.fillStyle='#1c2429';
  for(let i=0;i<40;i++){const r=12+Math.random()*46;x.beginPath();x.arc(Math.random()*512,Math.random()*512,r,0,Math.PI*2);x.fill()}
  x.globalAlpha=1;
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;
  t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return t;
}
function ceilingTexture(theme,renderer){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
  const base=new THREE.Color(theme.ceiling).offsetHSL(0,0,.2);
  x.fillStyle=`#${base.getHexString()}`;x.fillRect(0,0,256,256);
  // 吊顶方板与龙骨
  x.strokeStyle='rgba(255,255,255,.16)';x.lineWidth=4;
  for(let i=0;i<=2;i++){const p=i*128;x.beginPath();x.moveTo(p,0);x.lineTo(p,256);x.moveTo(0,p);x.lineTo(256,p);x.stroke()}
  x.strokeStyle='rgba(0,0,0,.4)';x.lineWidth=2;
  for(let i=0;i<=2;i++){const p=i*128+3;x.beginPath();x.moveTo(p,0);x.lineTo(p,256);x.moveTo(0,p);x.lineTo(256,p);x.stroke()}
  x.fillStyle='rgba(255,255,255,.05)';
  for(let i=0;i<24;i++)x.fillRect(Math.random()*256,Math.random()*256,14,4);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
function wallPanelTexture(theme,renderer){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
  const base=new THREE.Color(theme.wall);
  x.fillStyle=`#${base.getHexString()}`;x.fillRect(0,0,256,256);
  x.strokeStyle='rgba(255,255,255,.12)';x.lineWidth=2;
  for(let i=0;i<=2;i++){const p=i*128;x.beginPath();x.moveTo(p,0);x.lineTo(p,256);x.stroke()}
  x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=3;
  for(let i=0;i<=2;i++){const p=i*128+3;x.beginPath();x.moveTo(p,0);x.lineTo(p,256);x.stroke()}
  x.fillStyle='rgba(255,255,255,.05)';
  for(let i=0;i<6;i++)x.fillRect(10+Math.random()*220,10+Math.random()*220,20,3);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;
  t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  return t;
}

// ── 掩体墙：按高度分级，越矮越有翻越感，越高越像隔断 ──────────────
function buildCoverWall(theme,x,z,len,height,thick,axis,index,addSolid){
  const g=new THREE.Group();
  const w=axis?thick:len,d=axis?len:thick;
  const palette=theme.covers,tone=palette[index%palette.length];
  const painted=index%4===1,plywood=index%4===2,metal=index%4===3;
  const bodyMat=M(tone,plywood?.94:metal?.42:.86,metal?.55:.05);
  addSolid(x,z,w,height,d,bodyMat,'cover');
  // 顶部压顶条：矮墙用醒目色，方便判断能否翻越
  const capColor=height<=WALL_TIERS.vault+.01?theme.wallAccent:height<=WALL_TIERS.chest+.01?theme.trim:theme.wall;
  const cap=bx(w+.1,.1,d+.1,M(capColor,.6,.15),x,height+.05,z);g.add(cap);
  // 底部踢脚
  g.add(bx(w+.06,.14,d+.06,M(theme.trim,.8,.12),x,.07,z));
  const along=axis?d:w,ax=axis?'z':'x';
  const at=(t)=>axis?[x,z-d/2+t]:[x-w/2+t,z];
  if(plywood){ // 胶合板靶墙：竖向木纹条与螺栓
    const n=Math.max(2,Math.round(along/1.1));
    for(let i=1;i<n;i++){const [px,pz]=at(along*i/n);g.add(bx(axis?w+.03:.05,height*.94,axis?.05:d+.03,M(0x6d5233,.95),px,height/2,pz))}
    for(let i=0;i<n;i++){const [px,pz]=at(along*(i+.5)/n);for(const hy of[height*.25,height*.75])g.add(bx(axis?w+.04:.07,.07,axis?.07:d+.04,M(0x8d949a,.4,.7),px,hy,pz))}
  }else if(metal){ // 钢制隔板：波纹与铆钉
    const n=Math.max(3,Math.round(along/.55));
    for(let i=0;i<n;i++){const [px,pz]=at(along*(i+.5)/n);g.add(bx(axis?w+.05:.16,height*.9,axis?.16:d+.05,M(new THREE.Color(tone).offsetHSL(0,0,.06).getHex(),.4,.62),px,height/2,pz))}
  }else if(painted){ // 涂装墙：警示斜纹与编号
    for(const side of[-1,1]){
      const off=axis?[x+side*(w/2+.02),z]:[x,z+side*(d/2+.02)];
      for(let i=0;i<Math.max(3,Math.round(along/.8));i++){
        const t=(i+.5)/Math.max(3,Math.round(along/.8)),[px,pz]=at(along*t);
        const stripe=bx(axis?.04:.12,height*.5,axis?.12:.04,M(0x1a1d20,.8),axis?off[0]:px,height*.32,axis?pz:off[1]);
        stripe.rotation[axis?'x':'z']=.5;g.add(stripe);
      }
    }
  }else{ // 混凝土：分块接缝、边角磨损与外露钢筋
    const n=Math.max(2,Math.round(along/1.6));
    for(let i=1;i<n;i++){const [px,pz]=at(along*i/n);g.add(bx(axis?w+.04:.04,height*.98,axis?.04:d+.04,M(theme.trim,.9),px,height/2,pz))}
    if(height>=WALL_TIERS.body)for(let i=0;i<2;i++){const [px,pz]=at(along*(.3+i*.4));g.add(cyl(.018,.018,.28,6,M(0x8a6a4a,.75,.4),px,height+.14,pz,'y'))}
  }
  // 高墙顶部的照明反光带，帮助分辨轮廓
  if(height>=WALL_TIERS.tall){
    for(const side of[-1,1]){
      const stripMat=emissive(theme.accentLight,.55);
      g.add(axis?bx(.02,.06,d*.86,stripMat,x+side*(w/2+.012),height-.22,z):bx(w*.86,.06,.02,stripMat,x,height-.22,z+side*(d/2+.012)));
    }
  }
  return g;
}

// ── 立体地形：可逐级跳上的货箱阶梯、高架平台与检修走道 ────────────
// 玩家抬腿 0.6m、起跳约 1.35m，所以高度梯度按 0.6 / 1.2 / 2.4 / 3.2 设计
const DIR_VEC=[[1,0],[0,1],[-1,0],[0,-1]];
function railing(theme,x,z,w,d,topY,ctx){
  const g=new THREE.Group(),bar=M(theme.wallAccent,.5,.35),post=M(theme.trim,.5,.5);
  const halfW=w/2,halfD=d/2;
  for(const [px,pz] of [[-halfW,-halfD],[halfW,-halfD],[-halfW,halfD],[halfW,halfD]])
    g.add(bx(.09,1,.09,post,x+px,topY+.5,z+pz));
  for(const hy of[topY+.5,topY+.95]){
    g.add(bx(w,.06,.06,bar,x,hy,z-halfD));g.add(bx(w,.06,.06,bar,x,hy,z+halfD));
    g.add(bx(.06,.06,d,bar,x-halfW,hy,z));g.add(bx(.06,.06,d,bar,x+halfW,hy,z));
  }
  ctx.addCollider(x,z-halfD,w,1,.12,'railing',topY);ctx.addCollider(x,z+halfD,w,1,.12,'railing',topY);
  ctx.addCollider(x-halfW,z,.12,1,d,'railing',topY);ctx.addCollider(x+halfW,z,.12,1,d,'railing',topY);
  return g;
}
function crate(theme,x,z,w,h,d,ctx,tone){
  ctx.addSolid(x,z,w,h,d,M(tone,.82,.1),'terrain');
  ctx.worldGroup.add(bx(w+.06,.09,d+.06,M(theme.trim,.6,.3),x,h,z));
  for(const sx of[-1,1])ctx.worldGroup.add(bx(.07,h*.9,d*.96,M(theme.wallAccent,.6,.25),x+sx*(w/2-.05),h/2,z));
}
function buildSteps(theme,x,z,dir,ctx){
  const [dx,dz]=DIR_VEC[dir];
  [[.6,1.7],[1.2,1.6],[1.8,1.7]].forEach(([h,size],i)=>{
    crate(theme,x+dx*i*1.55,z+dz*i*1.55,dz?size:1.7,h,dz?1.7:size,ctx,theme.covers[i%4]);
  });
}
function buildDeck(theme,x,z,dir,ctx){
  const [dx,dz]=DIR_VEC[dir],top=2.4,w=5.4,d=5.4;
  ctx.addSolid(x,z,w,.36,d,M(theme.covers[3],.7,.3),'terrain',top-.36);
  for(const sx of[-1,1])for(const sz of[-1,1])
    ctx.addSolid(x+sx*(w/2-.3),z+sz*(d/2-.3),.24,top-.36,.24,M(theme.trim,.5,.55),'pillar');
  ctx.worldGroup.add(bx(w,.12,d,M(theme.wall,.85),x,top-.44,z));
  ctx.worldGroup.add(railing(theme,x,z,w,d,top,ctx));
  // 上台阶：地面 → 0.6 → 1.2 → 平台
  crate(theme,x-dx*(w/2+.9),z-dz*(d/2+.9),dz?2.6:1.9,1.2,dz?1.9:2.6,ctx,theme.covers[1]);
  crate(theme,x-dx*(w/2+2.9),z-dz*(d/2+2.9),dz?2.4:1.8,.6,dz?1.8:2.4,ctx,theme.covers[0]);
}
function buildCatwalk(theme,x,z,dir,len,ctx){
  const along=dir%2,top=3.2,wide=2.6;
  const w=along?wide:len,d=along?len:wide;
  ctx.addSolid(x,z,w,.3,d,M(theme.covers[3],.6,.45),'terrain',top-.3);
  const n=Math.max(2,Math.round(len/5));
  for(let i=0;i<=n;i++){
    const t=-len/2+len*i/n;
    ctx.addSolid(x+(along?0:t),z+(along?t:0),.26,top-.3,.26,M(theme.trim,.5,.55),'pillar');
  }
  ctx.worldGroup.add(railing(theme,x,z,w,d,top,ctx));
  // 走道端头的两级登高货箱
  const sx=along?(x>0?-1:1):0,sz=along?0:(z>0?-1:1);
  const bx0=x+(along?sx*(wide/2+1.1):0),bz0=z+(along?0:sz*(wide/2+1.1));
  const endT=along?(len/2-1.6)*(dir===1?1:-1):0,endS=along?0:(len/2-1.6)*(dir===0?1:-1);
  crate(theme,bx0+endS,bz0+endT,2.1,2.2,2.1,ctx,theme.covers[3]);
  crate(theme,bx0+endS+(along?sx*1.9:0),bz0+endT+(along?0:sz*1.9),2.1,1.2,2.1,ctx,theme.covers[1]);
}
function buildTerrain(map,theme,ctx){
  for(const [kind,x,z,dir=0,len=14] of map.terrain||[]){
    if(kind==='steps')buildSteps(theme,x,z,dir,ctx);
    else if(kind==='deck')buildDeck(theme,x,z,dir,ctx);
    else if(kind==='catwalk')buildCatwalk(theme,x,z,dir,len,ctx);
  }
}

// ── 室内外壳：地面、天花板、承重柱、桁架、灯具 ────────────────────
function buildShell(map,theme,ctx){
  const {worldGroup,renderer,addSolid}=ctx,S=map.size,W=map.width||map.size,H=map.ceilingH;
  const floorTex=floorTexture(theme,renderer);floorTex.repeat.set(W/3,S/3);
  const floor=put(new THREE.PlaneGeometry(W*2,S*2),new THREE.MeshStandardMaterial({map:floorTex,roughness:.62,metalness:.05}),0,0,0);
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.castShadow=false;worldGroup.add(floor);

  const ceilTex=ceilingTexture(theme,renderer);ceilTex.repeat.set(W/2.5,S/2.5);
  const ceil=put(new THREE.PlaneGeometry(W*2,S*2),new THREE.MeshStandardMaterial({map:ceilTex,roughness:.94,metalness:.03}),0,H,0);
  ceil.rotation.x=Math.PI/2;ceil.receiveShadow=false;ceil.castShadow=false;worldGroup.add(ceil);

  // 外围承重墙
  const wallTex=wallPanelTexture(theme,renderer);wallTex.repeat.set(W/2.5,H/3);
  const wallMat=new THREE.MeshStandardMaterial({map:wallTex,roughness:.86,metalness:.06});
  addSolid(0,-S,W*2,H,.9,wallMat,'wall');addSolid(0,S,W*2,H,.9,wallMat,'wall');
  addSolid(-W,0,.9,H,S*2,wallMat,'wall');addSolid(W,0,.9,H,S*2,wallMat,'wall');
  // 墙面腰线与踢脚
  for(const sign of[-1,1]){
    worldGroup.add(bx(W*2,.16,.12,M(theme.wallAccent,.55,.2),0,2.2,sign*(S-.5)));
    worldGroup.add(bx(W*2,.4,.2,M(theme.trim,.85),0,.2,sign*(S-.5)));
    worldGroup.add(bx(.12,.16,S*2,M(theme.wallAccent,.55,.2),sign*(W-.5),2.2,0));
    worldGroup.add(bx(.2,.4,S*2,M(theme.trim,.85),sign*(W-.5),.2,0));
  }

  // 承重柱：紧贴两侧长墙布置，不阻断中央通道
  const colX=W*.74,colZ=S/2.2;
  for(const px of[-colX,colX])for(let iz=-2;iz<=2;iz++){
    const pz=iz*colZ;
    if(Math.abs(pz)>S-1.8)continue;
    addSolid(px,pz,.7,H,.7,M(theme.trim,.8,.14),'pillar');
    worldGroup.add(bx(1,.22,1,M(theme.wall,.85),px,H-.11,pz));
    worldGroup.add(bx(.95,.28,.95,M(theme.wallAccent,.6,.2),px,.14,pz));
  }
  const trussMat=M(theme.trim,.6,.5);
  for(let i=-3;i<=3;i++){
    worldGroup.add(bx(W*2,.16,.16,trussMat,0,H-.5,i*(S/3.4)));
    worldGroup.add(bx(.16,.3,S*2,trussMat,i*(W/3.4),H-.78,0));
  }
  // 通风管道
  for(const p of[-W*.6,W*.6]){
    worldGroup.add(cyl(.42,.42,S*1.8,12,M(theme.trim,.5,.6),p,H-1.35,0,'z'));
    for(let i=-3;i<=3;i++)worldGroup.add(cyl(.47,.47,.1,12,M(theme.wall,.6,.4),p,H-1.35,i*(S/3.5),'z'));
  }

  // 灯板使用恒定亮度材质，并与灯壳底面留出间距，避免转动视角时发生深度闪烁。
  const lightMat=new THREE.MeshBasicMaterial({color:theme.fixture,toneMapped:false});
  const stepX=W/1.7,stepZ=S/2.6,lamps=[];
  for(let ix=-1;ix<=1;ix++)for(let iz=-2;iz<=2;iz++){
    const px=ix*stepX,pz=iz*stepZ;
    if(Math.abs(px)>W-2||Math.abs(pz)>S-2)continue;
    const panel=put(new THREE.PlaneGeometry(3.2,1.1),lightMat,px,H-.32,pz);
    panel.rotation.x=Math.PI/2;panel.castShadow=false;panel.receiveShadow=false;worldGroup.add(panel);
    worldGroup.add(bx(3.5,.14,1.3,M(theme.trim,.5,.5),px,H-.23,pz));
    lamps.push([px,pz]);
  }
  for(const [px,pz] of lamps.filter((_,i)=>i%2===0).slice(0,8)){
    const l=new THREE.PointLight(theme.fixture,19,S*.85,2);l.position.set(px,H-1,pz);worldGroup.add(l);
  }
  // 地面导向线，增强空间可读性
  const lineMat=new THREE.MeshBasicMaterial({color:theme.floorLine,transparent:true,opacity:.5});
  for(const p of[-S*.5,S*.5]){
    const l=put(new THREE.PlaneGeometry(W*1.7,.14),lineMat,0,.015,p);l.rotation.x=-Math.PI/2;l.castShadow=false;worldGroup.add(l);
  }
  const mid=put(new THREE.PlaneGeometry(.2,S*1.8),new THREE.MeshBasicMaterial({color:theme.wallAccent,transparent:true,opacity:.35}),0,.015,0);
  mid.rotation.x=-Math.PI/2;mid.castShadow=false;worldGroup.add(mid);
  return {H};
}

function buildLighting(map,theme,ctx){
  const {scene,renderer}=ctx;
  scene.background=new THREE.Color(theme.ceiling).lerp(new THREE.Color(theme.wall),.5);
  // 极淡的空气感，保证远处清晰可辨
  scene.fog=new THREE.FogExp2(new THREE.Color(theme.haze).getHex(),.0028);
  scene.add(new THREE.HemisphereLight(0xffffff,new THREE.Color(theme.floor).getHex(),1.18));
  scene.add(new THREE.AmbientLight(0xdfe7ee,.5));
  const key=new THREE.DirectionalLight(0xfff6e8,1.9);
  key.position.set(map.size*.5,map.ceilingH*1.6,map.size*.35);key.castShadow=!map.range;
  key.shadow.mapSize.set(2048,2048);
  const s=map.size+4;
  key.shadow.camera.left=-s;key.shadow.camera.right=s;key.shadow.camera.top=s;key.shadow.camera.bottom=-s;
  key.shadow.camera.far=map.ceilingH*4;key.shadow.bias=-.0006;
  scene.add(key);
  const fill=new THREE.DirectionalLight(new THREE.Color(theme.accentLight).getHex(),.42);
  fill.position.set(-map.size*.6,map.ceilingH,-map.size*.5);scene.add(fill);
  renderer.toneMappingExposure=1.12;
}

// ── 室内道具 ─────────────────────────────────────────────────────
function buildProps(map,theme,ctx){
  const {worldGroup,addSolid,collides}=ctx,S=map.size,W=map.width||map.size;
  const random=ctx.random||Math.random,rnd=(a,b)=>a+random()*(b-a);
  const spots=[];
  for(let i=0;i<90&&spots.length<18;i++){
    const px=rnd(-W+3,W-3),pz=rnd(-S+5,S-5);
    if(Math.abs(pz)>S*.78)continue;
    if(collides(px,pz,1.7))continue;
    if(spots.some(p=>Math.hypot(p[0]-px,p[1]-pz)<4))continue;
    spots.push([px,pz]);
  }
  spots.forEach(([px,pz],i)=>{
    const kind=i%6;
    if(kind===0){ // 模块化路障
      for(let j=0;j<2;j++){
        const b=bx(1.5,.95,.5,M(theme.wallAccent,.7,.05),px,.48,pz+j*.7);worldGroup.add(b);
        worldGroup.add(bx(1.55,.1,.55,M(0x21262a,.8),px,.95,pz+j*.7));
        for(const sx of[-.6,.6])worldGroup.add(bx(.12,.95,.62,M(0x21262a,.8),px+sx,.48,pz+j*.7));
      }
      addSolid(px,pz+.35,1.6,.95,1.3,M(theme.wallAccent,.7),'prop');
    }else if(kind===1){ // 轮胎堆
      for(let j=0;j<3;j++){
        const t=put(new THREE.TorusGeometry(.42,.16,8,16),M(0x1c1f20,.96,.02),px,.18+j*.3,pz);
        t.rotation.x=Math.PI/2;t.rotation.z=j*.7;worldGroup.add(t);
      }
      worldGroup.add(bx(.9,.06,.12,M(theme.floorLine,.6),px,.95,pz));
      addSolid(px,pz,1.1,1,1.1,M(0x1c1f20,.96),'prop');
    }else if(kind===2){ // 弹药箱堆
      const stack=[[0,0,0],[0,.62,0],[.9,0,.1]];
      for(const [dx,dy,dz] of stack){
        worldGroup.add(bx(.85,.6,.62,M(theme.covers[3],.8,.12),px+dx,.3+dy,pz+dz));
        worldGroup.add(bx(.88,.07,.65,M(theme.wallAccent,.6,.2),px+dx,.62+dy,pz+dz));
        worldGroup.add(bx(.3,.03,.66,M(0x0f1315,.8),px+dx,.5+dy,pz+dz));
      }
      addSolid(px+.45,pz,1.9,1.2,.85,M(theme.covers[3],.8),'prop');
    }else if(kind===3){ // 安全锥与警示带
      for(let j=0;j<3;j++){
        const cx=px+(j-1)*.9;
        worldGroup.add(put(new THREE.ConeGeometry(.22,.6,12),M(0xf05a1e,.75),cx,.3,pz));
        worldGroup.add(bx(.42,.05,.42,M(0x14181a,.85),cx,.03,pz));
        const ring=put(new THREE.TorusGeometry(.15,.03,6,12),M(0xf2f2f0,.7),cx,.36,pz);ring.rotation.x=Math.PI/2;worldGroup.add(ring);
      }
      ctx.addCollider(px,pz,2.3,.72,.5,'prop');
    }else if(kind===4){ // 器材架
      const rack=M(theme.trim,.5,.6);
      for(const sx of[-.85,.85])worldGroup.add(bx(.1,2.1,.1,rack,px+sx,1.05,pz));
      for(const hy of[.5,1.15,1.8])worldGroup.add(bx(1.8,.07,.6,rack,px,hy,pz));
      for(let j=0;j<3;j++)worldGroup.add(bx(.35,.34,.45,M(theme.covers[j%4],.75),px-.6+j*.6,.7,pz));
      addSolid(px,pz,1.9,2.1,.7,rack,'prop');
    }else{ // 油桶
      for(let j=0;j<2;j++){
        const bxp=px+j*.72;
        worldGroup.add(cyl(.28,.3,.88,16,M(j?0x2f6f8a:theme.floorLine,.5,.45),bxp,.44,pz,'y'));
        for(const hy of[.2,.68]){const band=put(new THREE.TorusGeometry(.29,.028,6,16),M(0x171b1d,.4,.7),bxp,hy,pz);band.rotation.x=Math.PI/2;worldGroup.add(band)}
        worldGroup.add(cyl(.3,.3,.05,16,M(0x171b1d,.4,.7),bxp,.89,pz,'y'));
      }
      addSolid(px+.36,pz,1.4,.9,.7,M(theme.floorLine,.5),'prop');
    }
  });
  // 墙面细节：显示屏、消防箱、管线
  for(const side of[-1,1]){
    for(let i=-1;i<=1;i++){
      const px=i*(W/1.9);
      if(Math.abs(px)>W-2)continue;
      const z=side*(S-.62);
      worldGroup.add(bx(2.4,1.3,.08,M(0x0b0f12,.4,.5),px,3.2,z));
      worldGroup.add(bx(2.2,1.1,.06,emissive(theme.accentLight,.9),px,3.2,z-side*.03));
    }
    worldGroup.add(bx(.5,.7,.14,M(0xd03a2c,.7),W-1.6,1.6,side*(S-.62)));
  }
  for(const side of[-1,1]){
    const px=side*(W-.75);
    for(const dz of[-S*.45,0,S*.45])worldGroup.add(cyl(.12,.12,S*.55,10,M(theme.trim,.45,.65),px,map.ceilingH-1.9,dz,'z'));
  }
}

// ── 室内靶场：开放靶道、顶部编号牌与安全线 ───────────────────────
function buildRangeInterior(map,theme,ctx){
  const {worldGroup,addSolid}=ctx,S=map.size,W=map.width||map.size,H=map.ceilingH;
  const laneX=[-9,-5.4,-1.8,1.8,5.4];
  // 两侧吸音板
  for(const side of[-1,1])for(let j=0;j<16;j++){
    const z=-S*.85+j*(S*1.7/16);
    worldGroup.add(bx(.16,2.8,S*1.7/17,M(0x1d2427,.99),side*(W-1.1),2.3,z));
  }
  // 地面靶道线、安全线与距离标识
  const lineMat=new THREE.MeshBasicMaterial({color:theme.floorLine,transparent:true,opacity:.6});
  const safety=put(new THREE.PlaneGeometry(W*1.75,.24),lineMat,0,.018,S-7);
  safety.rotation.x=-Math.PI/2;safety.castShadow=false;worldGroup.add(safety);
  for(let d=10;d<=45;d+=5){
    const z=S-5-d;if(z<-S+3)break;
    const mark=put(new THREE.PlaneGeometry(W*1.6,d%10===0?.12:.05),new THREE.MeshBasicMaterial({color:d%10===0?0x4d5960:0x39434a,transparent:true,opacity:d%10===0?.55:.3}),0,.017,z);
    mark.rotation.x=-Math.PI/2;mark.castShadow=false;worldGroup.add(mark);
  }
  // 每条靶道顶部的编号灯牌与状态灯
  laneX.forEach(x=>{
    const y=H-1.5,z=S-10;
    worldGroup.add(bx(1.5,.66,.12,M(0x0a0e10,.4,.5),x,y,z));
    worldGroup.add(bx(1.28,.46,.08,emissive(theme.wallAccent,1.4),x,y,z-.07));
    worldGroup.add(cyl(.03,.03,1.1,6,M(theme.trim,.5,.6),x,y+.88,z,'y'));
    worldGroup.add(put(new THREE.SphereGeometry(.08,10,8),emissive(0x62ff4a,2),x+.6,y+.4,z-.07));
  });
  // 后方弹坑吸收墙
  addSolid(0,-S+1.6,W*2,4.6,1.2,M(0x2a3136,.98),'backstop');
  for(let i=0;i<20;i++)worldGroup.add(bx(W*2/20*.88,4.3,.4,M(i%2?0x232a2e:0x323b45,.99),-W+W*2*(i+.5)/20,2.25,-S+2.4));
  // 射手身后的器材长桌
  worldGroup.add(bx(W*1.7,.12,1.1,M(theme.covers[3],.6,.35),0,1.02,S-2.4));
  for(let i=-4;i<=4;i++)worldGroup.add(bx(.12,1,.9,M(theme.trim,.6,.5),i*(W*1.7/9),.5,S-2.4));
}

// ── 对外主接口 ───────────────────────────────────────────────────
export function buildArena(map,ctx){
  const theme=THEMES[map.theme]||THEMES.foundry;
  buildLighting(map,theme,ctx);
  buildShell(map,theme,ctx);
  if(map.range){
    buildRangeInterior(map,theme,ctx);
  }else{
    (map.walls||[]).forEach((w,i)=>{
      const [x,z,len,height,thick,axis]=w;
      ctx.worldGroup.add(buildCoverWall(theme,x,z,len,height,thick,axis,i,ctx.addSolid));
    });
    buildTerrain(map,theme,ctx);
    buildProps(map,theme,ctx);
  }
  return theme;
}
export function themeOf(map){return THEMES[map.theme]||THEMES.foundry}
export function scaleMap(base,scale,label){
  return {...base,name:`${base.name} · ${label}`,size:Math.max(14,Math.round(base.size*scale)),
    walls:(base.walls||[]).map(([x,z,len,h,t,a])=>[x*scale,z*scale,Math.max(3,len*scale),h,t,a]),
    terrain:(base.terrain||[]).map(([k,x,z,d,len])=>[k,x*scale,z*scale,d,len&&Math.max(8,len*scale)])};
}
