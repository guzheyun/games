"""凌空羽毛球：静态网页 + 服务器权威局域网真人对战。"""
import asyncio
import json
import math
import os
import secrets
import threading
import time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

import websockets

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "players.json"
W, H, FLOOR, NET_X, NET_TOP, NET_HIT_TOP, GRAVITY = 1280.0, 720.0, 620.0, 640.0, 342.0, 430.0, 1150.0
TICK = 1 / 60
RACKETS = {
    "bamboo": {"name": "青竹", "price": 0, "power": 1.0},
    "thunder": {"name": "雷霆 7", "price": 1200, "power": 1.08},
    "carbon": {"name": "黑金碳纤", "price": 3200, "power": 1.16},
    "aurora": {"name": "极光冠军", "price": 6800, "power": 1.24},
    "comet": {"name": "彗星 Z9", "price": 10500, "power": 1.30},
    "dragon": {"name": "赤龙·天击", "price": 16000, "power": 1.36},
    "void": {"name": "虚空 100X", "price": 24000, "power": 1.42},
}
SKILLS = {
    "rescue": {"name": "鹰眼救球", "price": 500},
    "meteor": {"name": "雷霆重杀", "price": 850},
    "feather": {"name": "幻羽吊球", "price": 650},
}
profiles, clients, queue, rooms = {}, {}, [], {}


def load_profiles():
    global profiles
    try:
        profiles = json.loads(DB_PATH.read_text("utf-8"))
    except (OSError, ValueError):
        profiles = {}
    for p in profiles.values():
        p.setdefault("skillInventory", {})
        p.setdefault("equippedSkill", None)


def save_profiles():
    temp = DB_PATH.with_suffix(".tmp")
    temp.write_text(json.dumps(profiles, ensure_ascii=False, indent=2), "utf-8")
    os.replace(temp, DB_PATH)


def clean_name(value):
    name = "".join(c for c in str(value).strip() if c.isprintable())[:12]
    return name or "球手"


def public_profile(token):
    p = profiles[token]
    return {k: p[k] for k in ("name", "wins", "coins", "inventory", "equipped", "skillInventory", "equippedSkill")}


async def send(ws, data):
    await ws.send(json.dumps(data, ensure_ascii=False, separators=(",", ":")))


class Match:
    def __init__(self, first, second):
        self.id = secrets.token_hex(5)
        self.tokens = [first, second]
        self.sockets = [clients[first], clients[second]]
        self.names = [profiles[first]["name"], profiles[second]["name"]]
        self.players = []
        self.shuttle = {}
        self.inputs = [{"left": False, "right": False, "jump": False} for _ in range(2)]
        self.pending = [None, None]
        self.last_action = [0.0, 0.0]
        self.skills = [profiles[t].get("equippedSkill") for t in self.tokens]
        self.skill_used = [False, False]
        for i, token in enumerate(self.tokens):
            skill = self.skills[i]
            if skill:
                inv = profiles[token].setdefault("skillInventory", {})
                if inv.get(skill, 0) > 0:
                    inv[skill] -= 1
                    if inv[skill] <= 0:
                        inv.pop(skill, None)
                        if profiles[token].get("equippedSkill") == skill:
                            profiles[token]["equippedSkill"] = None
                else:
                    self.skills[i] = None
        save_profiles()
        self.scores, self.games = [0, 0], [0, 0]
        self.game_no, self.server, self.phase = 1, secrets.randbelow(2), "serve"
        self.timer, self.rally, self.finished = .9, 0, False
        self.deciding_switched = False
        self.disconnected = [None, None]
        self.winner = None
        self.reset_rally(initial=True)

    def new_player(self, side):
        return {"side": side, "x": 265.0 if side == 0 else 1015.0, "y": FLOOR,
                "vx": 0.0, "vy": 0.0, "onGround": True, "facing": 1 if side == 0 else -1,
                "swing": 0.0, "jumpLock": False, "racket": profiles[self.tokens[side]]["equipped"]}

    def reset_rally(self, initial=False):
        self.phase, self.timer, self.rally = "serve", .9 if initial else 1.0, 0
        self.pending = [None, None]
        if not self.players:
            self.players = [self.new_player(0), self.new_player(1)]
        even = self.scores[self.server] % 2 == 0
        self.players[0]["x"] = (455.0 if even else 250.0) if self.server == 0 else 245.0
        self.players[1]["x"] = (825.0 if even else 1030.0) if self.server == 1 else 1035.0
        for p in self.players:
            p.update(y=FLOOR, vx=0.0, vy=0.0, onGround=True, swing=0.0)
        p = self.players[self.server]
        self.shuttle = {"x": p["x"] + p["facing"] * 38, "y": p["y"] - 110,
                        "vx": 0.0, "vy": 0.0, "gravity": GRAVITY, "last": -1,
                        "prevX": p["x"] + p["facing"] * 38, "prevY": p["y"] - 110}

    def view(self, kind="state"):
        def player(p):
            return {"side": p["side"], "x": round(p["x"], 2), "y": round(p["y"], 2),
                    "vx": round(p["vx"], 2), "vy": round(p["vy"], 2), "onGround": p["onGround"],
                    "facing": p["facing"], "swing": round(p["swing"], 2), "racket": p["racket"]}
        s = self.shuttle
        data = {"type": kind, "room": self.id, "players": [player(p) for p in self.players],
                "shuttle": {"x": round(s["x"], 2), "y": round(s["y"], 2),
                            "vx": round(s["vx"], 2), "vy": round(s["vy"], 2), "last": s["last"]},
                "scores": self.scores, "games": self.games, "gameNo": self.game_no,
                "server": self.server, "phase": self.phase, "serveReady": self.timer <= 0,
                "skills": self.skills, "skillUsed": self.skill_used}
        if kind == "match":
            data["players"] = [{"name": self.names[i], "racket": self.players[i]["racket"]} for i in range(2)]
        return data

    async def broadcast(self, data):
        encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        await asyncio.gather(*(ws.send(encoded) for ws in self.sockets if ws), return_exceptions=True)

    async def start(self):
        for i, ws in enumerate(self.sockets):
            message = self.view("match")
            message["you"] = i
            await send(ws, message)
        asyncio.create_task(self.loop())

    def serve(self, side, style):
        if side != self.server or self.phase != "serve" or self.timer > 0 or style not in ("short", "high", "drive"):
            return False
        p, s = self.players[self.server], self.shuttle
        power = RACKETS[p["racket"]]["power"]
        shots = {"short": (500.0 if side else 780.0, 1.40),
                 "high": (145.0 if side else 1135.0, 1.72),
                 "drive": (260.0 if side else 1020.0, 1.45)}
        target_x, base = shots[style]
        flight = base / power
        start_x, start_y = p["x"] + p["facing"] * 38, p["y"] - 108
        s.update(x=start_x, y=start_y,
                 vx=(target_x - start_x) / flight,
                 vy=(FLOOR - 10 - start_y - .5 * GRAVITY * power * power * flight * flight) / flight,
                 gravity=GRAVITY * power * power,
                 last=self.server)
        self.phase, self.rally = "play", 1
        return True

    def move_player(self, i, dt):
        p, keys = self.players[i], self.inputs[i]
        serving = self.phase == "serve" and i == self.server
        direction = 0 if serving else int(keys["right"]) - int(keys["left"])
        p["vx"] = direction * 290.0
        if not serving and keys["jump"] and not p["jumpLock"] and p["onGround"]:
            p["vy"], p["onGround"], p["jumpLock"] = -550.0, False, True
        if not keys["jump"]:
            p["jumpLock"] = False
        p["x"] += p["vx"] * dt
        p["vy"] += GRAVITY * dt
        p["y"] += p["vy"] * dt
        if p["y"] >= FLOOR:
            p["y"], p["vy"], p["onGround"] = FLOOR, 0.0, True
        p["x"] = max(75.0, min(NET_X - 55, p["x"])) if i == 0 else max(NET_X + 55, min(W - 75, p["x"]))
        p["swing"] = max(0.0, p["swing"] - dt * 4)

    def hit_metric(self, side):
        p, s = self.players[side], self.shuttle
        samples = ((s["x"], s["y"]), (s.get("prevX", s["x"]), s.get("prevY", s["y"])),
                   ((s["x"] + s.get("prevX", s["x"])) / 2, (s["y"] + s.get("prevY", s["y"])) / 2))
        best = 99.0
        for x, y in samples:
            forward = (x - p["x"]) * p["facing"]
            if not -72 <= forward <= 158:
                continue
            u, v = (forward - 38) / 112, (y - (p["y"] - 125)) / 118
            best = min(best, u*u + v*v)
        return best

    def can_hit(self, side, hit_range=1.0):
        if self.phase != "play" or self.shuttle["last"] == side:
            return False
        return self.hit_metric(side) <= hit_range

    def request_hit(self, side, shot):
        now = time.monotonic()
        if now - self.last_action[side] < .10:
            return False
        self.last_action[side] = now
        if self.hit(side, shot):
            return True
        if self.phase == "play" and self.shuttle["last"] != side and not self.pending[side]:
            self.pending[side] = {"shot": shot, "ttl": .17}
            return True
        return False

    def hit(self, side, shot, power_override=None, hit_range=1.0):
        if shot not in ("drive", "clear", "drop", "smash") or not self.can_hit(side, hit_range):
            return False
        p, s = self.players[side], self.shuttle
        power = power_override or RACKETS.get(p["racket"], RACKETS["bamboo"])["power"]
        targets = {
            "clear": (145.0 if side else 1135.0, 1.34),
            "drop": (550.0 if side else 730.0, 1.30),
            "smash": (300.0 if side else 980.0, .47),
            "drive": (205.0 if side else 1075.0, 1.08),
        }
        target_x, flight = targets[shot]
        flight /= power
        s["gravity"] = GRAVITY * power * power
        s["vx"] = (target_x - s["x"]) / flight
        s["vy"] = (FLOOR - 8 - s["y"] - .5 * s["gravity"] * flight * flight) / flight
        s["last"], p["swing"] = side, 1.0
        self.rally += 1
        return True

    def use_special(self, side):
        skill = self.skills[side]
        if not skill or self.skill_used[side] or self.phase != "play" or self.shuttle["last"] == side:
            return False
        base = RACKETS.get(self.players[side]["racket"], RACKETS["bamboo"])["power"]
        config = {"rescue": ("clear", base * 1.05, 3.0), "meteor": ("smash", base * 1.32, 1.25),
                  "feather": ("drop", base * 1.18, 1.8)}.get(skill)
        if not config or not self.hit(side, *config):
            return False
        self.skill_used[side] = True
        return True

    async def point(self, winner, reason):
        if self.phase != "play":
            return
        self.phase = "point"
        self.scores[winner] += 1
        self.server = winner
        a, b = self.scores[winner], self.scores[1 - winner]
        game_won = (a >= 21 and a - b >= 2) or a == 30
        await self.broadcast({"type": "notice", "text": f"{self.names[winner]} 得分 · {reason}"})
        delay = .95
        if game_won:
            self.games[winner] += 1
            delay = 1.55
            if self.games[winner] >= 2:
                await asyncio.sleep(.7)
                await self.finish(winner, f"{self.games[0]} : {self.games[1]} 局")
                return
            self.game_no += 1
            self.scores = [0, 0]
            self.deciding_switched = False
            await self.broadcast({"type": "notice", "text": f"{self.names[winner]} 拿下本局，双方交换场地"})
        elif self.game_no == 3 and not self.deciding_switched and 11 in self.scores:
            self.deciding_switched = True
            await self.broadcast({"type": "notice", "text": "决胜局到达 11 分，双方交换场地"})
        await asyncio.sleep(delay)
        if not self.finished:
            self.reset_rally()

    async def step(self, dt):
        for i in range(2):
            self.move_player(i, dt)
        if self.phase == "serve":
            self.timer = max(0.0, self.timer - dt)
            p = self.players[self.server]
            self.shuttle["x"], self.shuttle["y"] = p["x"] + p["facing"] * 38, p["y"] - 110
            return
        if self.phase != "play":
            return
        for side, pending in enumerate(self.pending):
            if not pending:
                continue
            pending["ttl"] -= dt
            if self.can_hit(side):
                self.pending[side] = None
                self.hit(side, pending["shot"])
            elif pending["ttl"] <= 0:
                self.pending[side] = None
        s = self.shuttle
        s["prevX"], s["prevY"] = s["x"], s["y"]
        s["vy"] += s.get("gravity", GRAVITY) * dt
        s["x"] += s["vx"] * dt
        s["y"] += s["vy"] * dt
        if (s["prevX"] - NET_X) * (s["x"] - NET_X) <= 0 and s["y"] > NET_HIT_TOP:
            await self.point(1 if s["x"] < NET_X else 0, "触网")
        elif s["x"] < 20 or s["x"] > W - 20:
            await self.point(1 if s["x"] < NET_X else 0, "界外")
        elif s["y"] >= FLOOR - 5:
            if not 90 <= s["x"] <= 1190:
                await self.point(1 if s["last"] == 0 else 0, "界外")
            else:
                await self.point(1 if s["x"] < NET_X else 0, "落地")

    async def loop(self):
        try:
            while not self.finished:
                started = time.monotonic()
                await self.step(TICK)
                if int(started * 60) % 2 == 0:
                    await self.broadcast(self.view())
                for i, disconnected in enumerate(self.disconnected):
                    if disconnected and time.monotonic() - disconnected > 20:
                        await self.finish(1 - i, "对手断线超时")
                        break
                await asyncio.sleep(max(0, TICK - (time.monotonic() - started)))
        finally:
            rooms.pop(self.id, None)
            for token in self.tokens:
                client = clients.get(token)
                if client and getattr(client, "room_id", None) == self.id:
                    client.room_id = None

    async def finish(self, winner, detail):
        if self.finished:
            return
        self.finished, self.winner = True, winner
        winner_token, loser_token = self.tokens[winner], self.tokens[1 - winner]
        profiles[winner_token]["wins"] += 1
        profiles[winner_token]["coins"] += 450
        profiles[loser_token]["coins"] += 120
        save_profiles()
        for i, ws in enumerate(self.sockets):
            if ws:
                ws.room_id = None
                await send(ws, {"type": "gameover", "winner": winner, "detail": detail,
                                "profile": public_profile(self.tokens[i])})


async def pair_queue():
    while len(queue) >= 2:
        first, second = queue.pop(0), queue.pop(0)
        if first not in clients:
            if second in clients: queue.insert(0, second)
            continue
        if second not in clients:
            queue.insert(0, first)
            continue
        match = Match(first, second)
        rooms[match.id] = match
        clients[first].room_id = clients[second].room_id = match.id
        await match.start()


async def handler(ws):
    token = None
    ws.room_id = None
    try:
        async for raw in ws:
            try:
                data = json.loads(raw)
                kind = data.get("type")
            except (ValueError, AttributeError):
                continue
            if kind == "hello":
                proposed = str(data.get("token", ""))
                token = proposed if proposed in profiles else secrets.token_urlsafe(20)
                if token not in profiles:
                    profiles[token] = {"name": clean_name(data.get("name")), "wins": 0, "coins": 800,
                                       "inventory": ["bamboo"], "equipped": "bamboo",
                                       "skillInventory": {}, "equippedSkill": None}
                    save_profiles()
                old = clients.get(token)
                if old and old is not ws:
                    try: await old.close(4001, "已在另一窗口连接")
                    except Exception: pass
                clients[token] = ws
                for match in rooms.values():
                    if token in match.tokens and not match.finished:
                        i = match.tokens.index(token)
                        match.sockets[i], match.disconnected[i], ws.room_id = ws, None, match.id
                        message = match.view("match")
                        message["you"] = i
                        await send(ws, message)
                        await match.broadcast({"type": "notice", "text": f"{match.names[i]} 已重新连接"})
                        break
                await send(ws, {"type": "profile", "token": token, "profile": public_profile(token)})
            elif not token:
                await send(ws, {"type": "error", "message": "请先建立玩家身份"})
            elif kind == "rename":
                profiles[token]["name"] = clean_name(data.get("name")); save_profiles()
                await send(ws, {"type": "profile", "token": token, "profile": public_profile(token)})
            elif kind == "queue":
                if not ws.room_id and token not in queue:
                    queue.append(token)
                await send(ws, {"type": "queued", "count": len(queue)})
                await pair_queue()
            elif kind == "cancel":
                if token in queue: queue.remove(token)
            elif kind in ("buy", "equip"):
                racket, p = data.get("racket"), profiles[token]
                if kind == "buy" and racket in RACKETS and racket not in p["inventory"] and p["coins"] >= RACKETS[racket]["price"]:
                    p["coins"] -= RACKETS[racket]["price"]
                    p["inventory"].append(racket)
                    p["equipped"] = racket
                    save_profiles()
                elif kind == "equip" and racket in p["inventory"]:
                    p["equipped"] = racket
                    save_profiles()
                await send(ws, {"type": "profile", "token": token, "profile": public_profile(token)})
            elif kind in ("buy-skill", "equip-skill"):
                skill, p = data.get("skill"), profiles[token]
                inv = p.setdefault("skillInventory", {})
                if kind == "buy-skill" and skill in SKILLS and p["coins"] >= SKILLS[skill]["price"]:
                    p["coins"] -= SKILLS[skill]["price"]
                    inv[skill] = inv.get(skill, 0) + 1
                    p["equippedSkill"] = skill
                    save_profiles()
                elif kind == "equip-skill" and inv.get(skill, 0) > 0:
                    p["equippedSkill"] = skill
                    save_profiles()
                await send(ws, {"type": "profile", "token": token, "profile": public_profile(token)})
            elif kind == "consume-skill":
                skill, p = data.get("skill"), profiles[token]
                inv = p.setdefault("skillInventory", {})
                if skill in SKILLS and inv.get(skill, 0) > 0:
                    inv[skill] -= 1
                    if inv[skill] <= 0:
                        inv.pop(skill, None)
                        if p.get("equippedSkill") == skill:
                            p["equippedSkill"] = None
                    save_profiles()
                await send(ws, {"type": "profile", "token": token, "profile": public_profile(token)})
            elif ws.room_id in rooms:
                match = rooms[ws.room_id]
                side = match.tokens.index(token)
                if kind == "input":
                    match.inputs[side] = {"left": bool(data.get("left")), "right": bool(data.get("right")),
                                          "jump": bool(data.get("jump"))}
                elif kind == "serve":
                    match.serve(side, data.get("style"))
                elif kind == "hit":
                    match.request_hit(side, data.get("shot"))
                elif kind == "special":
                    if match.use_special(side):
                        await match.broadcast({"type": "notice", "text": f"{match.names[side]} 使用了 {SKILLS[match.skills[side]]['name']}"})
                elif kind == "forfeit":
                    await match.finish(1 - side, "对手认输")
    except websockets.ConnectionClosed:
        pass
    finally:
        if token:
            if token in queue: queue.remove(token)
            if clients.get(token) is ws: clients.pop(token, None)
            if ws.room_id in rooms:
                match = rooms[ws.room_id]
                if token in match.tokens:
                    side = match.tokens.index(token)
                    match.disconnected[side] = time.monotonic()
                    match.inputs[side] = {"left": False, "right": False, "jump": False}
                    await match.broadcast({"type": "notice", "text": "对手断线，20 秒内可重连"})


def serve_http(port):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT), **kwargs)
        def log_message(self, fmt, *args):
            print("HTTP", fmt % args)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()


async def main():
    load_profiles()
    http_port = int(os.environ.get("HTTP_PORT", 8082))
    ws_port = int(os.environ.get("WS_PORT", 8766))
    threading.Thread(target=serve_http, args=(http_port,), daemon=True).start()
    print(f"凌空羽毛球已启动：网页 http://0.0.0.0:{http_port}  联机 ws://0.0.0.0:{ws_port}")
    async with websockets.serve(handler, "0.0.0.0", ws_port, max_size=65536):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
