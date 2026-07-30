(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PoolPhysics = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const W = 1100, H = 600, R = 12.5;
  const LEFT = 105, RIGHT = 995, TOP = 85, BOTTOM = 515;
  const POCKET_R = 27;
  // A 9 ft pool table has a 2.54 m playing length. Keep all tuning in SI units,
  // then convert to this table's fixed simulation coordinates.
  const TABLE_LENGTH_METERS = 2.54;
  const PIXELS_PER_METER = (RIGHT - LEFT) / TABLE_LENGTH_METERS;
  const MIN_CUE_SPEED_MPS = .65, MAX_CUE_SPEED_MPS = 4;
  const BALL_RESTITUTION = .93, CUSHION_RESTITUTION = .72;
  const ROLLING_DECELERATION = .22 * PIXELS_PER_METER;
  const POCKETS = [
    {x: LEFT, y: TOP}, {x: 550, y: TOP - 3}, {x: RIGHT, y: TOP},
    {x: LEFT, y: BOTTOM}, {x: 550, y: BOTTOM + 3}, {x: RIGHT, y: BOTTOM}
  ];
  const COLORS = ['#f6f3e8','#e5b835','#2255a4','#c93d38','#6a3f92','#e97828','#277b52','#7b2330','#151719','#e5b835','#2255a4','#c93d38','#6a3f92','#e97828','#277b52','#7b2330'];
  const SNOOKER_COLORS = ['#f6f3e8',...Array(15).fill('#b9252d'),'#e7c42c','#23804b','#744326','#2870a9','#e884a6','#171918'];

  function seeded(seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  }

  function rack(seed) {
    const rnd = seeded(seed || 1);
    const balls = [{id:0,x:315,y:300,vx:0,vy:0,spinX:0,spinY:0,pocketed:false}];
    let lows=[1,2,3,4,5,6,7], highs=[9,10,11,12,13,14,15];
    for(let i=lows.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[lows[i],lows[j]]=[lows[j],lows[i]];}
    for(let i=highs.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[highs[i],highs[j]]=[highs[j],highs[i]];}
    const slots = new Array(15), corners = rnd()<.5 ? [lows.pop(),highs.pop()] : [highs.pop(),lows.pop()];
    slots[10]=corners[0]; slots[14]=corners[1]; slots[4]=8;
    const rest=lows.concat(highs); for(let i=rest.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]];}
    let k=0; for(let i=0;i<15;i++) if(slots[i]==null) slots[i]=rest[k++];
    const gap=.35, dx=(R*2+gap)*.8660254, startX=735; k=0;
    for(let row=0;row<5;row++) for(let col=0;col<=row;col++) {
      balls.push({id:slots[k++],x:startX+row*dx,y:300+(col-row/2)*(R*2+gap),vx:0,vy:0,spinX:0,spinY:0,pocketed:false});
    }
    balls.sort((a,b)=>a.id-b.id); return balls;
  }

  function rackSnooker() {
    const balls=[{id:0,x:270,y:300,vx:0,vy:0,spinX:0,spinY:0,pocketed:false}],gap=.45,dx=(R*2+gap)*.8660254,startX=715;
    let id=1;for(let row=0;row<5;row++)for(let col=0;col<=row;col++)balls.push({id:id++,x:startX+row*dx,y:300+(col-row/2)*(R*2+gap),vx:0,vy:0,spinX:0,spinY:0,pocketed:false});
    [[16,315,390],[17,315,210],[18,315,300],[19,550,300],[20,665,300],[21,890,300]].forEach(([ballId,x,y])=>balls.push({id:ballId,x,y,vx:0,vy:0,spinX:0,spinY:0,pocketed:false}));
    balls.sort((a,b)=>a.id-b.id);return balls;
  }

  function cloneBalls(balls){return balls.map(b=>({...b}));}
  function moving(balls){return balls.some(b=>!b.pocketed && (b.vx*b.vx+b.vy*b.vy>.12));}
  function pocketNear(x,y){for(let i=0;i<POCKETS.length;i++){const p=POCKETS[i],dx=x-p.x,dy=y-p.y;if(dx*dx+dy*dy<POCKET_R*POCKET_R)return i;}return -1;}
  function escapedPocket(x,y){if(x>=LEFT-R&&x<=RIGHT+R&&y>=TOP-R&&y<=BOTTOM+R)return -1;let best=0,distance=Infinity;for(let i=0;i<POCKETS.length;i++){const p=POCKETS[i],d=(x-p.x)**2+(y-p.y)**2;if(d<distance){best=i;distance=d}}return best;}
  function openingOnHorizontal(x){return Math.abs(x-LEFT)<37||Math.abs(x-550)<34||Math.abs(x-RIGHT)<37;}
  function openingOnVertical(y){return Math.abs(y-TOP)<37||Math.abs(y-BOTTOM)<37;}

  class World {
    constructor(balls){this.balls=cloneBalls(balls||rack(1));this.active=false;this.shot=null;this.acc=0;this.audioEvents=[];}
    reset(seed){this.balls=rack(seed);this.active=false;this.shot=null;this.audioEvents=[];}
    cue(){return this.balls[0];}
    beginShot(angle,power,spinX,spinY,errorRad){
      if(this.active||moving(this.balls)||this.cue().pocketed)return false;
      angle+=errorRad||0; power=Math.max(.03,Math.min(1,power)); spinX=Math.max(-1,Math.min(1,spinX)); spinY=Math.max(-1,Math.min(1,spinY));
      const speed=PIXELS_PER_METER*(MIN_CUE_SPEED_MPS+power*(MAX_CUE_SPEED_MPS-MIN_CUE_SPEED_MPS)),c=this.cue();c.vx=Math.cos(angle)*speed;c.vy=Math.sin(angle)*speed;c.spinX=spinX;c.spinY=spinY;
      this.shot={firstHit:null,pocketed:[],pocketedAt:[],railAfterContact:false,rails:0,railBalls:[],scratch:false,elapsed:0};this.audioEvents=[];this.active=true;return true;
    }
    placeCue(x,y){
      const c=this.cue(); x=Math.max(LEFT+R,Math.min(RIGHT-R,x));y=Math.max(TOP+R,Math.min(BOTTOM-R,y));
      for(const b of this.balls)if(b.id&& !b.pocketed && Math.hypot(x-b.x,y-b.y)<R*2+.5)return false;
      if(pocketNear(x,y)>=0)return false;c.x=x;c.y=y;c.vx=c.vy=0;c.pocketed=false;return true;
    }
    tick(realDt){
      if(!this.active)return null;this.acc+=Math.min(.05,realDt);const dt=1/120;
      while(this.acc>=dt&&this.active){this.step(dt);this.acc-=dt;}
      return this.active?null:this.shot;
    }
    step(dt){
      const s=this.shot;s.elapsed+=dt;
      for(const b of this.balls){if(b.pocketed)continue;b.x+=b.vx*dt;b.y+=b.vy*dt;}
      for(let i=0;i<this.balls.length;i++){
        const a=this.balls[i];if(a.pocketed)continue;
        for(let j=i+1;j<this.balls.length;j++){
          const b=this.balls[j];if(b.pocketed)continue;let dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy,min=R*2;
          if(d2>=min*min||d2<.00001)continue;const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,over=min-d;
          a.x-=nx*over*.5;b.x+=nx*over*.5;a.y-=ny*over*.5;b.y+=ny*over*.5;
          const rel=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rel>=0)continue;
          const impulse=-(1+BALL_RESTITUTION)*rel*.5;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;
          this.audioEvents.push({type:'ball',strength:Math.min(1,-rel/900)});
          if((a.id===0||b.id===0)&&s.firstHit===null){s.firstHit=a.id===0?b.id:a.id;}
          const cue=a.id===0?a:(b.id===0?b:null); if(cue){
            const obj=cue===a?b:a, tangentX=-ny,tangentY=nx;
            const follow=cue.spinY*72, side=cue.spinX*30;
            cue.vx+=nx*follow+tangentX*side;cue.vy+=ny*follow+tangentY*side;obj.vx-=nx*follow*.04;obj.vy-=ny*follow*.04;
            cue.spinY*=.48;cue.spinX*=.6;
          }
        }
      }
      for(const b of this.balls){
        if(b.pocketed)continue;const pi=pocketNear(b.x,b.y),escapePi=escapedPocket(b.x,b.y),impactSpeed=Math.hypot(b.vx,b.vy);
        if(pi>=0){this.audioEvents.push({type:'pocket',strength:Math.min(1,impactSpeed/700),x:b.x,y:b.y,ball:b.id,pocket:pi});b.pocketed=true;b.vx=b.vy=0;s.pocketed.push(b.id);s.pocketedAt.push([b.id,pi]);if(b.id===0)s.scratch=true;continue;}
        if(escapePi>=0){this.audioEvents.push({type:'pocket',strength:Math.min(1,impactSpeed/700),x:b.x,y:b.y,ball:b.id,pocket:escapePi});b.pocketed=true;b.vx=b.vy=0;s.pocketed.push(b.id);s.pocketedAt.push([b.id,escapePi]);if(b.id===0)s.scratch=true;continue;}
        let rail=false;
        if(b.x-R<LEFT&&!openingOnVertical(b.y)){b.x=LEFT+R;b.vx=Math.abs(b.vx)*CUSHION_RESTITUTION;b.vy+=b.vx*b.spinX*.055;rail=true;}
        else if(b.x+R>RIGHT&&!openingOnVertical(b.y)){b.x=RIGHT-R;b.vx=-Math.abs(b.vx)*CUSHION_RESTITUTION;b.vy-=b.vx*b.spinX*.055;rail=true;}
        if(b.y-R<TOP&&!openingOnHorizontal(b.x)){b.y=TOP+R;b.vy=Math.abs(b.vy)*CUSHION_RESTITUTION;b.vx-=b.vy*b.spinX*.055;rail=true;}
        else if(b.y+R>BOTTOM&&!openingOnHorizontal(b.x)){b.y=BOTTOM-R;b.vy=-Math.abs(b.vy)*CUSHION_RESTITUTION;b.vx+=b.vy*b.spinX*.055;rail=true;}
        if(rail){s.rails++;if(!s.railBalls.includes(b.id))s.railBalls.push(b.id);if(s.firstHit!==null)s.railAfterContact=true;b.spinX*=.72;this.audioEvents.push({type:'rail',strength:Math.min(1,impactSpeed/850)});}
        const sp=Math.hypot(b.vx,b.vy);if(sp>0){const dec=ROLLING_DECELERATION*dt,ns=Math.max(0,sp-dec),f=ns/sp;b.vx*=f;b.vy*=f;if(ns<4){b.vx=b.vy=0;}}
      }
      if(s.elapsed>22||!moving(this.balls)){for(const b of this.balls){b.vx=b.vy=0;}this.active=false;}
    }
    state(){return this.balls.map(b=>[b.id,+b.x.toFixed(3),+b.y.toFixed(3),+b.vx.toFixed(3),+b.vy.toFixed(3),b.pocketed?1:0]);}
    loadState(state){this.balls=state.map(v=>({id:v[0],x:v[1],y:v[2],vx:v[3],vy:v[4],spinX:0,spinY:0,pocketed:!!v[5]}));}
    takeAudioEvents(){const events=this.audioEvents;this.audioEvents=[];return events;}
  }
  return {W,H,R,LEFT,RIGHT,TOP,BOTTOM,POCKETS,COLORS,SNOOKER_COLORS,rack,rackSnooker,seeded,moving,World};
});
