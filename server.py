import asyncio,json,websockets,hashlib,os

DB_FILE='users.json'

def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE,'r',encoding='utf-8') as f:return json.load(f)
    return {}

def save_db(db):
    with open(DB_FILE,'w',encoding='utf-8') as f:json.dump(db,f,ensure_ascii=False,indent=2)

def hash_pw(pw):return hashlib.sha256(pw.encode()).hexdigest()

def init_db():
    db=load_db()
    if 'guzheyun' not in db:db['guzheyun']={'pw':hash_pw('12345'),'wins':0}
    if 'guyang' not in db:db['guyang']={'pw':hash_pw('12345'),'wins':0}
    save_db(db)
    return db

db=init_db()
rooms={}
authed={}

async def handler(ws):
    rid=None;pid=None;username=None
    try:
        async for raw in ws:
            msg=json.loads(raw)

            if msg['type']=='login':
                u=msg.get('user','').strip()
                p=msg.get('pass','')
                if u not in db:
                    await ws.send(json.dumps({'type':'login-fail','msg':'用户不存在'}))
                elif db[u]['pw']!=hash_pw(p):
                    await ws.send(json.dumps({'type':'login-fail','msg':'密码错误'}))
                else:
                    for old_ws,old_u in list(authed.items()):
                        if old_u==u and old_ws!=ws:
                            try:await old_ws.close()
                            except:pass
                    username=u;authed[ws]=u
                    token=hashlib.sha256((u+db[u]['pw']+'salt9000').encode()).hexdigest()
                    await ws.send(json.dumps({'type':'login-ok','user':u,'wins':db[u]['wins'],'token':token}))

            elif msg['type']=='token-login':
                u=msg.get('user','').strip()
                t=msg.get('token','')
                if u in db:
                    expect=hashlib.sha256((u+db[u]['pw']+'salt9000').encode()).hexdigest()
                    if t==expect:
                        for old_ws,old_u in list(authed.items()):
                            if old_u==u and old_ws!=ws:
                                try:await old_ws.close()
                                except:pass
                        username=u;authed[ws]=u
                        await ws.send(json.dumps({'type':'login-ok','user':u,'wins':db[u]['wins'],'token':t}))
                    else:
                        await ws.send(json.dumps({'type':'login-fail','msg':'登录已过期，请重新登录'}))
                else:
                    await ws.send(json.dumps({'type':'login-fail','msg':'用户不存在'}))

            elif msg['type']=='change-pw':
                if not username:
                    await ws.send(json.dumps({'type':'pw-fail','msg':'未登录'}));continue
                old=msg.get('old','');new_=msg.get('new','')
                if db[username]['pw']!=hash_pw(old):
                    await ws.send(json.dumps({'type':'pw-fail','msg':'旧密码错误'}))
                elif len(new_)<4:
                    await ws.send(json.dumps({'type':'pw-fail','msg':'新密码至少4位'}))
                else:
                    db[username]['pw']=hash_pw(new_);save_db(db)
                    token=hashlib.sha256((username+db[username]['pw']+'salt9000').encode()).hexdigest()
                    await ws.send(json.dumps({'type':'pw-ok','token':token}))

            elif msg['type']=='get-stats':
                stats={u:{'wins':db[u]['wins']}for u in db}
                await ws.send(json.dumps({'type':'stats','stats':stats}))

            elif msg['type']=='join':
                if not username:
                    await ws.send(json.dumps({'type':'error','msg':'请先登录'}));continue
                # 先从旧房间移除
                if rid and rid in rooms:
                    if rooms[rid]['p1']==ws:rooms[rid]['p1']=rooms[rid]['p2'];rooms[rid]['u1']=rooms[rid]['u2'];rooms[rid]['p2']=None;rooms[rid]['u2']=None
                    elif rooms[rid]['p2']==ws:rooms[rid]['p2']=None;rooms[rid]['u2']=None
                    if rooms[rid]['p1'] is None:del rooms[rid]
                rid=msg['room'];pid=None
                if rid not in rooms:
                    rooms[rid]={'p1':ws,'p2':None,'u1':username,'u2':None}
                    pid=1
                    await ws.send(json.dumps({'type':'role','pid':1,'msg':'等待对手加入...'}))
                elif rooms[rid]['p2'] is None and rooms[rid]['p1']!=ws:
                    if username==rooms[rid]['u1']:
                        await ws.send(json.dumps({'type':'error','msg':'你已经在房间中'}))
                        continue
                    rooms[rid]['p2']=ws;rooms[rid]['u2']=username
                    pid=2
                    await ws.send(json.dumps({'type':'role','pid':2,'msg':'已连接！'}))
                    await rooms[rid]['p1'].send(json.dumps({'type':'peer-joined','name':username}))
                    await ws.send(json.dumps({'type':'peer-info','name':rooms[rid]['u1']}))
                else:
                    await ws.send(json.dumps({'type':'error','msg':'房间已满'}))
                    rid=None;continue

            elif msg['type']=='win-report':
                winner=msg.get('winner','')
                if winner in db:
                    db[winner]['wins']+=1;save_db(db)
                    if rid and rid in rooms:
                        for s in [rooms[rid].get('p1'),rooms[rid].get('p2')]:
                            if s:
                                try:await s.send(json.dumps({'type':'win-update','user':winner,'wins':db[winner]['wins']}))
                                except:pass

            elif rid and rid in rooms:
                other=rooms[rid]['p2'] if pid==1 else rooms[rid]['p1']
                if other:
                    try:await other.send(raw)
                    except:pass
    except websockets.ConnectionClosed:
        pass
    finally:
        if ws in authed:del authed[ws]
        if rid and rid in rooms:
            if rooms[rid]['p1']==ws:
                rooms[rid]['p1']=rooms[rid]['p2'];rooms[rid]['u1']=rooms[rid]['u2']
                rooms[rid]['p2']=None;rooms[rid]['u2']=None
            elif rooms[rid]['p2']==ws:
                rooms[rid]['p2']=None;rooms[rid]['u2']=None
            if rooms[rid]['p1'] is None:del rooms[rid]
            elif rooms[rid]['p2'] is None:
                try:await rooms[rid]['p1'].send(json.dumps({'type':'peer-left'}))
                except:pass

async def main():
    print("中继服务器启动: ws://0.0.0.0:9000")
    async with websockets.serve(handler,"0.0.0.0",9000):
        await asyncio.Future()

asyncio.run(main())
