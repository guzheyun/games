"""LAN server for Velvet Eight. Serves the game and runs authoritative online matches."""
import asyncio
import json
import math
import os
import random
import secrets
import threading
import time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

import websockets

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "players.json"
R, LEFT, RIGHT, TOP, BOTTOM = 12.5, 105.0, 995.0, 85.0, 515.0
POCKET_R = 27.0
# A 9 ft pool table has a 2.54 m playing length. Convert real-world values to
# the same fixed simulation coordinates used by the browser physics.
TABLE_LENGTH_METERS = 2.54
PIXELS_PER_METER = (RIGHT - LEFT) / TABLE_LENGTH_METERS
MIN_CUE_SPEED_MPS, MAX_CUE_SPEED_MPS = .65, 4.0
BALL_RESTITUTION, CUSHION_RESTITUTION = .93, .72
ROLLING_DECELERATION = .22 * PIXELS_PER_METER
POCKETS = [(LEFT, TOP), (550, TOP - 3), (RIGHT, TOP), (LEFT, BOTTOM), (550, BOTTOM + 3), (RIGHT, BOTTOM)]
CUES = {
    "ash": {"name": "白蜡木练习杆", "price": 0, "accuracy": 1.0},
    "maple": {"name": "枫影", "price": 1200, "accuracy": .72},
    "carbon": {"name": "黑曜碳纤", "price": 3600, "accuracy": .43},
    "master": {"name": "鎏金宗师", "price": 8000, "accuracy": .22},
    "jade": {"name": "翡翠龙脊", "price": 12500, "accuracy": .14},
    "nebula": {"name": "星云幻影", "price": 20000, "accuracy": .08},
    "crown": {"name": "王冠·零度", "price": 32000, "accuracy": .035},
}
clients, queue, rooms, profiles = {}, [], {}, {}


def load_profiles():
    global profiles
    try:
        profiles = json.loads(DB_PATH.read_text("utf-8"))
    except (OSError, ValueError):
        profiles = {}


def save_profiles():
    tmp = DB_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(profiles, ensure_ascii=False, indent=2), "utf-8")
    os.replace(tmp, DB_PATH)


def safe_name(value):
    value = "".join(c for c in str(value).strip() if c.isprintable())[:14]
    return value or "球手"


def public_profile(token):
    p = profiles[token]
    return {"name": p["name"], "wins": p["wins"], "coins": p["coins"], "inventory": p["inventory"], "equipped": p["equipped"]}


def new_ball(i, x, y):
    return {"id": i, "x": x, "y": y, "vx": 0.0, "vy": 0.0, "sx": 0.0, "sy": 0.0, "p": False}


def rack(seed):
    rnd = random.Random(seed)
    lows, highs = list(range(1, 8)), list(range(9, 16))
    rnd.shuffle(lows); rnd.shuffle(highs)
    slots = [None] * 15
    corners = [lows.pop(), highs.pop()] if rnd.random() < .5 else [highs.pop(), lows.pop()]
    slots[10], slots[14], slots[4] = corners[0], corners[1], 8
    rest = lows + highs; rnd.shuffle(rest); k = 0
    for i in range(15):
        if slots[i] is None: slots[i], k = rest[k], k + 1
    balls = [new_ball(0, 315, 300)]; k = 0
    gap, dx = .35, (R * 2 + .35) * .8660254
    for row in range(5):
        for col in range(row + 1):
            balls.append(new_ball(slots[k], 735 + row * dx, 300 + (col - row / 2) * (R * 2 + gap))); k += 1
    return sorted(balls, key=lambda b: b["id"])


def pocket_near(x, y):
    for i, (px, py) in enumerate(POCKETS):
        if (x-px)**2 + (y-py)**2 < POCKET_R**2: return i
    return -1


def escaped_pocket(x, y):
    if LEFT-R <= x <= RIGHT+R and TOP-R <= y <= BOTTOM+R: return -1
    return min(range(len(POCKETS)), key=lambda i: (x-POCKETS[i][0])**2 + (y-POCKETS[i][1])**2)


def opening_h(x): return abs(x-LEFT)<37 or abs(x-550)<34 or abs(x-RIGHT)<37
def opening_v(y): return abs(y-TOP)<37 or abs(y-BOTTOM)<37


class Physics:
    def __init__(self, balls): self.balls, self.active, self.event = balls, False, None
    def cue(self): return self.balls[0]
    def moving(self): return any(not b["p"] and b["vx"]**2+b["vy"]**2 > .12 for b in self.balls)
    def shoot(self, angle, power, sx, sy):
        c = self.cue(); speed = PIXELS_PER_METER * (MIN_CUE_SPEED_MPS + power * (MAX_CUE_SPEED_MPS - MIN_CUE_SPEED_MPS))
        c["vx"], c["vy"], c["sx"], c["sy"] = math.cos(angle)*speed, math.sin(angle)*speed, sx, sy
        self.event = {"firstHit": None, "pocketed": [], "pocketedAt": [], "railAfterContact": False, "rails": 0, "railBalls": set(), "scratch": False, "elapsed": 0.0}
        self.active = True
    def place(self, x, y):
        x, y = max(LEFT+R, min(RIGHT-R, x)), max(TOP+R, min(BOTTOM-R, y))
        if pocket_near(x, y) >= 0: return False
        if any(b["id"] and not b["p"] and math.hypot(x-b["x"], y-b["y"]) < R*2+.5 for b in self.balls): return False
        c=self.cue();c.update(x=x,y=y,vx=0.0,vy=0.0,p=False);return True
    def step(self, dt=1/120):
        e=self.event;e["elapsed"]+=dt
        for b in self.balls:
            if not b["p"]: b["x"]+=b["vx"]*dt;b["y"]+=b["vy"]*dt
        for i,a in enumerate(self.balls):
            if a["p"]: continue
            for b in self.balls[i+1:]:
                if b["p"]: continue
                dx,dy=b["x"]-a["x"],b["y"]-a["y"];d2=dx*dx+dy*dy
                if d2 >= (R*2)**2 or d2 < .00001: continue
                d=math.sqrt(d2);nx,ny=dx/d,dy/d;over=R*2-d
                a["x"]-=nx*over*.5;a["y"]-=ny*over*.5;b["x"]+=nx*over*.5;b["y"]+=ny*over*.5
                rel=(b["vx"]-a["vx"])*nx+(b["vy"]-a["vy"])*ny
                if rel >= 0: continue
                impulse=-(1+BALL_RESTITUTION)*rel*.5
                a["vx"]-=impulse*nx;a["vy"]-=impulse*ny;b["vx"]+=impulse*nx;b["vy"]+=impulse*ny
                if (a["id"]==0 or b["id"]==0) and e["firstHit"] is None: e["firstHit"] = b["id"] if a["id"]==0 else a["id"]
                cue = a if a["id"]==0 else (b if b["id"]==0 else None)
                if cue:
                    obj=b if cue is a else a;tx,ty=-ny,nx;follow,side=cue["sy"]*72,cue["sx"]*30
                    cue["vx"]+=nx*follow+tx*side;cue["vy"]+=ny*follow+ty*side;obj["vx"]-=nx*follow*.04;obj["vy"]-=ny*follow*.04
                    cue["sy"]*=.48;cue["sx"]*=.6
        for b in self.balls:
            if b["p"]: continue
            pocket=pocket_near(b["x"],b["y"])
            if pocket < 0: pocket=escaped_pocket(b["x"],b["y"])
            if pocket >= 0:
                b["p"]=True;b["vx"]=b["vy"]=0;e["pocketed"].append(b["id"]);e["pocketedAt"].append([b["id"],pocket]);e["scratch"] |= b["id"]==0;continue
            rail=False
            if b["x"]-R<LEFT and not opening_v(b["y"]):b["x"]=LEFT+R;b["vx"]=abs(b["vx"])*CUSHION_RESTITUTION;b["vy"]+=b["vx"]*b["sx"]*.055;rail=True
            elif b["x"]+R>RIGHT and not opening_v(b["y"]):b["x"]=RIGHT-R;b["vx"]=-abs(b["vx"])*CUSHION_RESTITUTION;b["vy"]-=b["vx"]*b["sx"]*.055;rail=True
            if b["y"]-R<TOP and not opening_h(b["x"]):b["y"]=TOP+R;b["vy"]=abs(b["vy"])*CUSHION_RESTITUTION;b["vx"]-=b["vy"]*b["sx"]*.055;rail=True
            elif b["y"]+R>BOTTOM and not opening_h(b["x"]):b["y"]=BOTTOM-R;b["vy"]=-abs(b["vy"])*CUSHION_RESTITUTION;b["vx"]+=b["vy"]*b["sx"]*.055;rail=True
            if rail:
                e["rails"]+=1;e["railBalls"].add(b["id"]);e["railAfterContact"] |= e["firstHit"] is not None;b["sx"]*=.72
            speed=math.hypot(b["vx"],b["vy"])
            if speed:
                ns=max(0,speed-ROLLING_DECELERATION*dt);f=ns/speed;b["vx"]*=f;b["vy"]*=f
                if ns<4:b["vx"]=b["vy"]=0
        if e["elapsed"]>22 or not self.moving():
            for b in self.balls:b["vx"]=b["vy"]=0
            self.active=False


def serial_balls(balls):
    return [[b["id"],round(b["x"],3),round(b["y"],3),round(b["vx"],3),round(b["vy"],3),1 if b["p"] else 0] for b in balls]


class Room:
    def __init__(self, a, b):
        self.id=secrets.token_hex(4);self.tokens=[a,b];self.sockets=[clients[a],clients[b]];self.names=[profiles[a]["name"],profiles[b]["name"]]
        self.seed=secrets.randbits(31);self.physics=Physics(rack(self.seed));self.turn=0;self.groups=[None,None];self.breaking=True;self.ball_in_hand=None
        self.phase="aim";self.finished=False;self.last=time.monotonic();self.disconnected=[None,None]
        self.called_pocket=None;self.eight_ready=False;self.remaining_before=0
    async def send_all(self, msg):
        data=json.dumps(msg,ensure_ascii=False)
        await asyncio.gather(*(ws.send(data) for ws in self.sockets if ws),return_exceptions=True)
    def view(self, kind="state"):
        return {"type":kind,"room":self.id,"players":[{"name":self.names[i],"cue":profiles[self.tokens[i]]["equipped"],"group":self.groups[i]} for i in range(2)],
                "turn":self.turn,"phase":self.phase,"ballInHand":self.ball_in_hand,"balls":serial_balls(self.physics.balls),"breaking":self.breaking}
    async def start(self):
        for i, ws in enumerate(self.sockets):
            msg=self.view("match");msg["you"]=i;await send(ws,msg)
        asyncio.create_task(self.loop())
    async def loop(self):
        try:
            while not self.finished:
                start=time.monotonic()
                if self.phase=="moving":
                    for _ in range(4):
                        if self.physics.active:self.physics.step()
                    await self.send_all(self.view())
                    if not self.physics.active: await self.settle()
                for i,t in enumerate(self.disconnected):
                    if t and time.monotonic()-t>20: await self.finish(1-i,"对手断线超时");return
                await asyncio.sleep(max(0,1/30-(time.monotonic()-start)))
        finally: rooms.pop(self.id,None)
    async def shoot(self, idx, data):
        if self.finished or idx!=self.turn or self.phase!="aim" or self.ball_in_hand is not None:return
        try:a=float(data["angle"]);p=float(data["power"]);sx=float(data.get("spinX",0));sy=float(data.get("spinY",0))
        except (KeyError,TypeError,ValueError):return
        if not math.isfinite(a+p+sx+sy):return
        p=max(.03,min(1,p));sx=max(-1,min(1,sx));sy=max(-1,min(1,sy))
        target=self.groups[idx];self.remaining_before=self.remaining(target) if target else 0
        self.eight_ready=bool(target and self.remaining_before==0)
        called=data.get("calledPocket")
        if self.eight_ready and (not isinstance(called,int) or isinstance(called,bool) or not 0<=called<=5):
            await send(self.sockets[idx],{"type":"shotRejected","text":"中式八球：击打黑八前必须指定袋口"});return
        self.called_pocket=called if self.eight_ready else None
        accuracy=CUES[profiles[self.tokens[idx]]["equipped"]]["accuracy"]
        sigma=math.radians(.24+accuracy*1.9)*(1.08-p*.25);error=max(-math.radians(5),min(math.radians(5),random.gauss(0,sigma)))
        actual_p=max(.03,min(1,p+random.gauss(0,.012+accuracy*.055)))
        spin_sigma=.018+accuracy*.085
        actual_sx=max(-1,min(1,sx+random.gauss(0,spin_sigma)));actual_sy=max(-1,min(1,sy+random.gauss(0,spin_sigma)))
        self.phase="striking"
        await self.send_all({"type":"shot","by":idx,"error":error,"angle":a+error,"power":actual_p,"spinX":actual_sx,"spinY":actual_sy})
        await asyncio.sleep(.3)
        if self.finished:return
        self.physics.shoot(a+error,actual_p,actual_sx,actual_sy);self.phase="moving"
    async def place(self, idx, data):
        if idx!=self.turn or self.phase!="aim" or self.ball_in_hand!=idx:return
        try:x,y=float(data["x"]),float(data["y"])
        except (KeyError,ValueError,TypeError):return
        if self.breaking:x=min(x,500)
        if self.physics.place(x,y):self.ball_in_hand=None;await self.send_all(self.view())
    def remaining(self, group):
        ids=range(1,8) if group=="solid" else range(9,16)
        return sum(not self.physics.balls[i]["p"] for i in ids)
    async def settle(self):
        e=self.physics.event;shooter=self.turn;other=1-shooter;potted=list(e["pocketed"]);was_break=self.breaking
        target=self.groups[shooter];first=e["firstHit"];foul_reason=None
        if e["scratch"]:foul_reason="母球落袋"
        elif first is None:foul_reason="未碰到目标球"
        elif target and self.remaining_before>0 and ((target=="solid" and not 1<=first<=7) or (target=="stripe" and not 9<=first<=15)):foul_reason="先碰到了错误球组"
        elif target and self.eight_ready and first!=8:foul_reason="清台后应先击打黑八"
        elif not target and first==8:foul_reason="开放球台不可先击打 8 号球"
        elif not potted and not e["railAfterContact"]:foul_reason="碰球后无球碰库"
        if self.breaking and not potted and len([n for n in e["railBalls"] if n])<4:foul_reason="开球未满足四颗目标球碰库"
        if 8 in potted and was_break:
            self.seed=secrets.randbits(31);self.physics=Physics(rack(self.seed));self.turn=other if foul_reason else shooter
            self.groups=[None,None];self.breaking=True;self.ball_in_hand=None;self.phase="aim";self.called_pocket=None
            msg=self.view();msg.update({"notice":"黑八开球入袋，重新摆球"+("，由对手开球" if foul_reason else "，原开球方重开"),"foul":bool(foul_reason)})
            await self.send_all(msg);return
        elif 8 in potted:
            actual_pocket=next((p for n,p in e["pocketedAt"] if n==8),None)
            legal=not foul_reason and self.eight_ready and self.called_pocket==actual_pocket
            if legal:reason="指定袋打进黑八"
            elif self.eight_ready and not foul_reason:reason="黑八进入非指定袋"
            else:reason="违规打进黑八"
            await self.finish(shooter if legal else other,reason);return
        if not foul_reason and not was_break and self.groups[0] is None:
            first_object=next((n for n in potted if n not in (0,8)),None)
            if first_object is not None:
                self.groups[shooter]="solid" if first_object<=7 else "stripe";self.groups[other]="stripe" if first_object<=7 else "solid"
        own = any((self.groups[shooter]=="solid" and 1<=n<=7) or (self.groups[shooter]=="stripe" and 9<=n<=15) for n in potted)
        if self.groups[shooter] is None:own=any(n not in (0,8) for n in potted)
        self.breaking=False
        if foul_reason:self.turn=other;self.ball_in_hand=other
        elif not own:self.turn=other
        self.phase="aim";self.called_pocket=None;self.physics.cue()["p"]=bool(self.ball_in_hand is not None)
        msg=self.view();msg.update({"notice":foul_reason or ("继续击球" if own else "交换球权"),"foul":bool(foul_reason)})
        await self.send_all(msg)
    async def finish(self, winner, reason):
        if self.finished:return
        self.finished=True;token=self.tokens[winner];profiles[token]["wins"]+=1;profiles[token]["coins"]+=450
        profiles[self.tokens[1-winner]]["coins"]+=120;save_profiles()
        await self.send_all({"type":"gameover","winner":winner,"reason":reason,"profiles":[public_profile(t) for t in self.tokens]})


async def send(ws,msg): await ws.send(json.dumps(msg,ensure_ascii=False))


async def pair_queue():
    while len(queue)>=2:
        a=queue.pop(0);b=queue.pop(0)
        if a not in clients:continue
        if b not in clients:queue.insert(0,a);continue
        room=Room(a,b);rooms[room.id]=room
        clients[a].room_id=room.id;clients[b].room_id=room.id
        await room.start()


async def handler(ws):
    token=None;ws.room_id=None
    try:
        async for raw in ws:
            try:data=json.loads(raw);kind=data.get("type")
            except (ValueError,AttributeError):continue
            if kind=="hello":
                proposed=str(data.get("token", ""))
                token=proposed if proposed in profiles else secrets.token_urlsafe(18)
                if token not in profiles:profiles[token]={"name":safe_name(data.get("name")),"wins":0,"coins":1500,"inventory":["ash"],"equipped":"ash"};save_profiles()
                else: profiles[token]["name"]=safe_name(data.get("name") or profiles[token]["name"]);save_profiles()
                old=clients.get(token)
                if old and old is not ws:
                    try:await old.close(4001,"在另一窗口登录")
                    except Exception:pass
                clients[token]=ws
                for room in rooms.values():
                    if token in room.tokens and not room.finished:
                        i=room.tokens.index(token);room.sockets[i]=ws;room.disconnected[i]=None;ws.room_id=room.id
                        msg=room.view("match");msg["you"]=i
                        await send(ws,msg);await room.send_all({"type":"notice","text":f"{room.names[i]} 已重连"});break
                await send(ws,{"type":"profile","token":token,"profile":public_profile(token),"cues":CUES})
            elif not token:continue
            elif kind=="queue":
                if not ws.room_id and token not in queue:queue.append(token);await send(ws,{"type":"queued","count":len(queue)});await pair_queue()
            elif kind=="cancel":
                if token in queue:queue.remove(token)
            elif kind=="buy":
                cue=data.get("cue");p=profiles[token]
                if cue in CUES and cue not in p["inventory"] and p["coins"]>=CUES[cue]["price"]:
                    p["coins"]-=CUES[cue]["price"];p["inventory"].append(cue);save_profiles()
                await send(ws,{"type":"profile","token":token,"profile":public_profile(token),"cues":CUES})
            elif kind=="equip":
                cue=data.get("cue");p=profiles[token]
                if cue in p["inventory"]:p["equipped"]=cue;save_profiles()
                await send(ws,{"type":"profile","token":token,"profile":public_profile(token),"cues":CUES})
            elif ws.room_id in rooms:
                room=rooms[ws.room_id];idx=room.tokens.index(token)
                if kind=="shot":await room.shoot(idx,data)
                elif kind=="place":await room.place(idx,data)
                elif kind=="forfeit":await room.finish(1-idx,"对手认输")
    except websockets.ConnectionClosed:pass
    finally:
        if token:
            if token in queue:queue.remove(token)
            if clients.get(token) is ws:clients.pop(token,None)
            if ws.room_id in rooms:
                room=rooms[ws.room_id]
                if token in room.tokens:room.disconnected[room.tokens.index(token)]=time.monotonic();await room.send_all({"type":"notice","text":"对手断线，20 秒内可重连"})


def serve_http(port):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
        def log_message(self,fmt,*args):print("HTTP",fmt%args)
    ThreadingHTTPServer(("0.0.0.0",port),Handler).serve_forever()


async def main():
    load_profiles();http_port=int(os.environ.get("HTTP_PORT",8080));ws_port=int(os.environ.get("WS_PORT",8765))
    threading.Thread(target=serve_http,args=(http_port,),daemon=True).start()
    print(f"Velvet Eight: http://0.0.0.0:{http_port}  websocket://0.0.0.0:{ws_port}")
    async with websockets.serve(handler,"0.0.0.0",ws_port,max_size=65536):await asyncio.Future()


if __name__=="__main__":asyncio.run(main())
