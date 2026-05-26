import asyncio,json,websockets,random,time,os

TICK_RATE=10
PK_DURATION=120
ARENA_DURATION=180  # 1v1 竞技 3 分钟
ARENA_START_GOLD=100

players={}
pk_queue=[]
battle_queue=[]
arena_queue=[]  # [(player, scene)]

class Player:
    def __init__(self,ws):
        self.ws=ws;self.id=id(ws);self.state='lobby'
        self.pk_partner=None;self.pk_score=0;self.pk_catches=[]
        self.battle_team=[];self.battle_partner=None
        self.arena_partner=None;self.arena_gold=0;self.arena_scene=None

async def handler(ws):
    p=Player(ws);players[p.id]=p
    try:
        async for msg in ws:
            data=json.loads(msg)
            await handle_msg(p,data)
    finally:
        del players[p.id]
        if p in pk_queue:pk_queue.remove(p)
        if p in battle_queue:battle_queue.remove(p)
        arena_queue[:]=[x for x in arena_queue if x[0]!=p]
        for partner_attr,msg_text in [('pk_partner','对手断开'),('battle_partner','对手断开'),('arena_partner','对手断开')]:
            partner=getattr(p,partner_attr,None)
            if partner and partner.id in players:
                try:await partner.ws.send(json.dumps({'type':'error','message':msg_text}))
                except:pass

async def handle_msg(p,data):
    t=data.get('type')
    if t=='pk_join':
        if p in pk_queue: pk_queue.remove(p)
        p.state='pk_queue';p.pk_scene=data.get('scene','pond');p.pk_level=data.get('level',1)
        pk_queue.append(p)
        await p.ws.send(json.dumps({'type':'waiting'}))
        if len(pk_queue)>=2:
            p1=pk_queue.pop(0);p2=pk_queue.pop(0)
            p1.pk_partner=p2;p2.pk_partner=p1
            p1.pk_score=0;p2.pk_score=0;p1.pk_catches=[];p2.pk_catches=[]
            p1.state='pk';p2.state='pk'
            scene=p1.pk_scene
            msg=json.dumps({'type':'pk_start','duration':PK_DURATION,'scene':scene})
            await p1.ws.send(msg);await p2.ws.send(msg)
            asyncio.create_task(pk_timer(p1,p2,PK_DURATION))

    elif t=='pk_catch':
        if p.state=='pk' and p.pk_partner:
            p.pk_score+=data.get('score',0)
            p.pk_catches.append(data.get('fishName',''))
            try:await p.pk_partner.ws.send(json.dumps({'type':'pk_opponent_catch','fishName':data.get('fishName','')}))
            except:pass

    elif t=='battle_join':
        p.battle_team=data.get('team',[])
        p.state='battle_queue'
        battle_queue.append(p)
        await p.ws.send(json.dumps({'type':'waiting'}))
        if len(battle_queue)>=2:
            p1=battle_queue.pop(0);p2=battle_queue.pop(0)
            p1.battle_partner=p2;p2.battle_partner=p1
            p1.state='battle';p2.state='battle'
            await p1.ws.send(json.dumps({'type':'battle_start','myTeam':p1.battle_team,'opponentTeam':p2.battle_team}))
            await p2.ws.send(json.dumps({'type':'battle_start','myTeam':p2.battle_team,'opponentTeam':p1.battle_team}))

    elif t=='arena_join':
        scene=data.get('scene','pond')
        p.arena_scene=scene; p.state='arena_queue'; p.arena_gold=ARENA_START_GOLD
        # 找一个同场景的对手
        match=None
        for i,(other,sc) in enumerate(arena_queue):
            if sc==scene and other.id in players:
                match=arena_queue.pop(i); break
        if match:
            p2=match[0]
            p.arena_partner=p2; p2.arena_partner=p
            p.state='arena'; p2.state='arena'
            p.arena_gold=ARENA_START_GOLD; p2.arena_gold=ARENA_START_GOLD
            msg=json.dumps({'type':'arena_start','duration':ARENA_DURATION,'scene':scene,'startGold':ARENA_START_GOLD})
            await p.ws.send(msg); await p2.ws.send(msg)
            asyncio.create_task(arena_timer(p,p2,ARENA_DURATION))
        else:
            arena_queue.append((p,scene))
            await p.ws.send(json.dumps({'type':'waiting','msg':f'匹配同场景 {scene} 的对手中...'}))

    elif t=='arena_gold':
        if p.state=='arena' and p.arena_partner:
            p.arena_gold=data.get('gold',0)
            try:await p.arena_partner.ws.send(json.dumps({'type':'arena_opponent_gold','gold':p.arena_gold}))
            except:pass

    elif t=='arena_quit':
        if p.state=='arena' and p.arena_partner:
            partner=p.arena_partner
            p.state='lobby'; partner.state='lobby'
            try:await partner.ws.send(json.dumps({'type':'arena_end','winner':'you','reason':'对手退出','myGold':partner.arena_gold,'opponentGold':p.arena_gold}))
            except:pass
            try:await p.ws.send(json.dumps({'type':'arena_end','winner':'opponent','reason':'你退出了','myGold':p.arena_gold,'opponentGold':partner.arena_gold}))
            except:pass

async def pk_timer(p1,p2,duration):
    await asyncio.sleep(duration)
    if p1.state!='pk' or p2.state!='pk':return
    p1.state='lobby';p2.state='lobby'
    if p1.pk_score>p2.pk_score:w1,w2='you','opponent'
    elif p2.pk_score>p1.pk_score:w1,w2='opponent','you'
    else:w1=w2='tie'
    try:await p1.ws.send(json.dumps({'type':'pk_result','winner':w1,'myScore':p1.pk_score,'opponentScore':p2.pk_score}))
    except:pass
    try:await p2.ws.send(json.dumps({'type':'pk_result','winner':w2,'myScore':p2.pk_score,'opponentScore':p1.pk_score}))
    except:pass

async def arena_timer(p1,p2,duration):
    await asyncio.sleep(duration)
    if p1.state!='arena' or p2.state!='arena':return
    p1.state='lobby';p2.state='lobby'
    if p1.arena_gold>p2.arena_gold:w1,w2='you','opponent'
    elif p2.arena_gold>p1.arena_gold:w1,w2='opponent','you'
    else:w1=w2='tie'
    try:await p1.ws.send(json.dumps({'type':'arena_end','winner':w1,'reason':'时间到','myGold':p1.arena_gold,'opponentGold':p2.arena_gold}))
    except:pass
    try:await p2.ws.send(json.dumps({'type':'arena_end','winner':w2,'reason':'时间到','myGold':p2.arena_gold,'opponentGold':p1.arena_gold}))
    except:pass

async def main():
    port = int(os.environ.get('PORT', 9001))
    print(f'钓鱼大师联机服务器启动: ws://0.0.0.0:{port}')
    async with websockets.serve(handler,'0.0.0.0',port):
        await asyncio.Future()

if __name__=='__main__':
    asyncio.run(main())
