import asyncio,json,websockets,random,time

TICK_RATE=10
PK_DURATION=120

players={}
pk_queue=[]
battle_queue=[]

class Player:
    def __init__(self,ws):
        self.ws=ws;self.id=id(ws);self.state='lobby'
        self.pk_partner=None;self.pk_score=0;self.pk_catches=[]
        self.battle_team=[];self.battle_partner=None

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
        if p.pk_partner and p.pk_partner.id in players:
            try:await p.pk_partner.ws.send(json.dumps({'type':'error','message':'对手断开连接'}))
            except:pass

async def handle_msg(p,data):
    t=data.get('type')
    if t=='pk_join':
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

async def main():
    print('钓鱼大师联机服务器启动: ws://0.0.0.0:9001')
    async with websockets.serve(handler,'0.0.0.0',9001):
        await asyncio.Future()

if __name__=='__main__':
    asyncio.run(main())
