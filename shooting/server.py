"""裂隙行动局域网联机服务。

运行: python server.py
浏览器保持通过 HTTP 打开 shooting/，服务默认监听 ws://0.0.0.0:8766。
"""
import asyncio
import hashlib
import json
import os
import random
import string
import time
import websockets

rooms = {}
clients = {}
SERVER_VERSION = 5
ROOM_LIMITS = {"1v1": 2, "1v2": 3, "2v2": 4, "5v5": 10}
TEAM_CAPS = {"1v1": 1, "1v2": 2, "2v2": 2, "5v5": 5}


def code():
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        value = "".join(random.choice(alphabet) for _ in range(6))
        if value not in rooms:
            return value


def fixed_room_code(owner):
    """同一账户跨刷新、跨服务重启始终得到相同的六位房间号。"""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    digest = hashlib.sha256(str(owner).strip().lower().encode("utf-8")).digest()
    return "".join(alphabet[value % len(alphabet)] for value in digest[:6])


def room_view(room):
    return {
        "type": "room",
        "code": room["code"],
        "mode": room["mode"],
        "view": room.get("view", "third"),
        "host": room["host"],
        "players": [
            {"id": pid, "name": p["name"], "team": p["team"]}
            for pid, p in room["players"].items()
        ],
    }


async def send(ws, payload):
    try:
        await ws.send(json.dumps(payload, ensure_ascii=False))
    except websockets.ConnectionClosed:
        pass


async def broadcast(room, payload, exclude=None):
    data = json.dumps(payload, ensure_ascii=False)
    sockets = [p["ws"] for pid, p in room["players"].items() if pid != exclude]
    if sockets:
        await asyncio.gather(*(ws.send(data) for ws in sockets), return_exceptions=True)


async def sync(room):
    await broadcast(room, room_view(room))


async def finish_match(room_code, match_id, delay):
    await asyncio.sleep(delay)
    room = rooms.get(room_code)
    match = room and room.get("match")
    if not match or match.get("id") != match_id:
        return
    match["ended"] = True
    await broadcast(room, {
        "type": "match_end",
        "score": {"blue": match["blue"], "red": match["red"]},
        "final": True,
    })


async def leave(pid):
    meta = clients.pop(pid, None)
    if not meta or not meta.get("room"):
        return
    room = rooms.get(meta["room"])
    if not room:
        return
    room["players"].pop(pid, None)
    if not room["players"]:
        rooms.pop(room["code"], None)
        return
    if room["host"] == pid:
        room["host"] = next(iter(room["players"]))
    await sync(room)


async def handler(ws):
    pid = "P" + "".join(random.choice(string.ascii_uppercase + string.digits) for _ in range(7))
    clients[pid] = {"ws": ws, "room": None}
    await send(ws, {"type": "welcome", "id": pid, "version": SERVER_VERSION})
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            kind = msg.get("type")
            if kind == "create":
                owner = str(msg.get("owner") or msg.get("name", "游客干员")).strip().lower()[:32]
                player_name = str(msg.get("name") or owner).strip()[:12]
                room_code = fixed_room_code(owner)
                mode = msg.get("mode") if msg.get("mode") in ROOM_LIMITS else "1v1"
                view = msg.get("view") if msg.get("view") in ("first", "third") else "third"
                room = rooms.get(room_code)
                if not room or room.get("owner") != owner:
                    room = {"code": room_code, "owner": owner, "mode": mode, "view": view, "host": pid, "players": {}, "created": time.time()}
                    rooms[room_code] = room
                else:
                    old_task = room.get("match", {}).get("task")
                    if old_task:
                        old_task.cancel()
                    room.pop("match", None)
                    room["mode"] = mode
                    room["view"] = view
                    room["host"] = pid
                    for old_pid, player in list(room["players"].items()):
                        if old_pid != pid and player["name"].strip().lower() == owner:
                            room["players"].pop(old_pid, None)
                            if old_pid in clients:
                                clients[old_pid]["room"] = None
                room["players"][pid] = {"ws": ws, "name": player_name, "team": "blue"}
                clients[pid]["room"] = room_code
                await sync(room)
            elif kind == "join":
                room_code = str(msg.get("code", "")).upper()
                room = rooms.get(room_code)
                if not room:
                    await send(ws, {"type": "error", "message": "房间不存在或已解散"})
                    continue
                limit = ROOM_LIMITS[room["mode"]]
                if len(room["players"]) >= limit:
                    await send(ws, {"type": "error", "message": "房间人数已满"})
                    continue
                blue = sum(p["team"] == "blue" for p in room["players"].values())
                red = len(room["players"]) - blue
                room["players"][pid] = {"ws": ws, "name": str(msg.get("name", "游客干员"))[:12], "team": "red" if red <= blue else "blue"}
                clients[pid]["room"] = room_code
                await sync(room)
            else:
                room = rooms.get(clients[pid].get("room"))
                if not room or pid not in room["players"]:
                    continue
                if kind == "team":
                    team = msg.get("team")
                    cap = TEAM_CAPS[room["mode"]]
                    if team in ("blue", "red") and sum(p["team"] == team for p in room["players"].values()) < cap:
                        room["players"][pid]["team"] = team
                    await sync(room)
                elif kind == "start" and room["host"] == pid:
                    teams = {p["team"] for p in room["players"].values()}
                    required = 3 if room["mode"] == "1v2" else 2
                    if len(room["players"]) < required or teams != {"blue", "red"}:
                        message = "1V2 模式需要正好三名玩家，并分成 1 人队和 2 人队" if room["mode"] == "1v2" else "双方阵营至少需要各一名玩家"
                        await send(ws, {"type": "error", "message": message})
                    elif room["mode"] == "1v2" and len(room["players"]) != 3:
                        await send(ws, {"type": "error", "message": "1V2 模式需要正好三名玩家"})
                    else:
                        starts_in = 1.25
                        duration = 300
                        old_task = room.get("match", {}).get("task")
                        if old_task:
                            old_task.cancel()
                        match_id = f"{time.time_ns()}-{random.randrange(1_000_000)}"
                        room["match"] = {
                            "id": match_id,
                            "blue": 0,
                            "red": 0,
                            "ends_at": time.time() + starts_in + duration,
                            "deaths": set(),
                            "ended": False,
                        }
                        room["match"]["task"] = asyncio.create_task(finish_match(room["code"], match_id, starts_in + duration))
                        await broadcast(room, {"type": "start", "mode": room["mode"], "view": room.get("view", "third"), "map": random.randrange(4), "seed": random.randrange(1_000_000), "startsIn": starts_in, "duration": duration})
                elif kind in ("state", "shot", "throw", "hit", "death", "leave_match", "score_request"):
                    msg["from"] = pid
                    match = room.get("match")
                    if kind == "score_request" and match:
                        remaining = max(0, match["ends_at"] - time.time())
                        await send(ws, {"type": "score", "score": {"blue": match["blue"], "red": match["red"]}, "remaining": remaining, "final": match.get("ended", False) or remaining <= 0})
                        continue
                    if kind == "state" and match:
                        msg["score"] = {"blue": match["blue"], "red": match["red"]}
                        msg["remaining"] = max(0, match["ends_at"] - time.time())
                    # 由服务端确认每次阵亡并统一比分，避免双方重复计分。
                    if kind == "death" and match and not match.get("ended") and time.time() < match["ends_at"]:
                        life = max(1, int(msg.get("life", 1)))
                        death_id = f"{pid}:{life}"
                        if death_id in match["deaths"]:
                            continue
                        match["deaths"].add(death_id)
                        victim = room["players"][pid]
                        scoring_team = "red" if victim["team"] == "blue" else "blue"
                        match[scoring_team] += 1
                        attacker_id = msg.get("attacker")
                        attacker = room["players"].get(attacker_id, {})
                        event = {
                            "type": "death", "victim": pid, "victimName": victim["name"],
                            "attacker": attacker_id, "attackerName": attacker.get("name", "敌方干员"),
                            "weapon": str(msg.get("weapon", "步枪"))[:24], "life": life,
                            "score": {"blue": match["blue"], "red": match["red"]},
                        }
                        await broadcast(room, event)
                        continue
                    # 命中只转发给被命中者，其余实时状态转发全房间。
                    if kind == "hit":
                        target = room["players"].get(msg.get("target"))
                        if target:
                            await send(target["ws"], msg)
                    else:
                        await broadcast(room, msg, exclude=pid)
    except websockets.ConnectionClosed:
        pass
    finally:
        await leave(pid)


async def main():
    port = int(os.environ.get("RIFT_WS_PORT", "8766"))
    async with websockets.serve(handler, "0.0.0.0", port, ping_interval=20, ping_timeout=20, max_size=32_768):
        print(f"裂隙行动联机服务已启动: ws://0.0.0.0:{port}")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("联机服务已关闭")
