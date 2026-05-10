import asyncio,json,websockets,hashlib,os,math,random,time

DB_FILE='users.json'
W,H=1200,700
GRAVITY=0.6;JUMP_FORCE=-14;MOVE_SPEED=5;MAX_HP=100;ULT_CHARGE=60
TICK_RATE=30;TICK_S=1/TICK_RATE

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
    save_db(db);return db

db=init_db()
rooms={}
authed={}

CHARACTERS=[
    {'id':'warrior','color':'#4aeadc',
     'skill1':{'cd':1.5,'type':'slash','w':80,'h':40,'dmg':15},
     'skill2':{'cd':4,'type':'shield_charge','dmg':12},
     'ult':{'charge':ULT_CHARGE,'type':'triple_slash','dmg':14}},
    {'id':'mage','color':'#a855f7',
     'skill1':{'cd':2,'type':'projectile','vx':8,'vy':0,'w':30,'h':30,'dmg':18,'color':'#ff6b35','icon':'🔥'},
     'skill2':{'cd':5,'type':'teleport'},
     'ult':{'charge':ULT_CHARGE,'type':'meteor_rain','dmg':7,'count':5}},
    {'id':'ninja','color':'#22c55e',
     'skill1':{'cd':1.5,'type':'triple_shuriken','dmg':5},
     'skill2':{'cd':3,'type':'shadow_step','dmg':0},
     'ult':{'charge':ULT_CHARGE,'type':'ult_combo'}},
    {'id':'archer','color':'#f59e0b',
     'skill1':{'cd':2,'type':'projectile','vx':16,'vy':0,'w':45,'h':6,'dmg':16,'color':'#f59e0b','icon':'→'},
     'skill2':{'cd':3,'type':'backjump_shot'},
     'ult':{'charge':ULT_CHARGE,'type':'arrow_rain'}},
    {'id':'tank','color':'#3b82f6',
     'skill1':{'cd':2,'type':'slash','w':70,'h':50,'dmg':18,'knockback':True},
     'skill2':{'cd':5,'type':'ground_slam','dmg':10},
     'ult':{'charge':ULT_CHARGE,'type':'earthquake','dmg':35}},
    {'id':'spirit','color':'#ec4899',
     'skill1':{'cd':1.5,'type':'projectile','vx':9,'vy':-3,'w':25,'h':25,'dmg':10,'color':'#ec4899','icon':'✦','slow':True},
     'skill2':{'cd':5,'type':'life_drain','dmg':15},
     'ult':{'charge':ULT_CHARGE,'type':'clone_attack','dmg':14}},
]

MAPS=[
    {'id':'dojo','platforms':[{'x':100,'y':550,'w':1000,'h':30},{'x':250,'y':400,'w':250,'h':18},{'x':700,'y':400,'w':250,'h':18},{'x':450,'y':270,'w':300,'h':18}],'hazard':None},
    {'id':'volcano','platforms':[{'x':50,'y':560,'w':400,'h':30},{'x':750,'y':560,'w':400,'h':30},{'x':350,'y':420,'w':300,'h':18},{'x':200,'y':280,'w':200,'h':18},{'x':800,'y':280,'w':200,'h':18}],'hazard':{'y':640,'dmg':2}},
    {'id':'sky','platforms':[{'x':100,'y':500,'w':300,'h':18},{'x':500,'y':400,'w':200,'h':18},{'x':800,'y':500,'w':300,'h':18},{'x':300,'y':280,'w':200,'h':18},{'x':700,'y':280,'w':200,'h':18},{'x':480,'y':160,'w':240,'h':18}],'hazard':None},
    {'id':'arena','platforms':[{'x':50,'y':580,'w':1100,'h':30},{'x':100,'y':430,'w':180,'h':18},{'x':920,'y':430,'w':180,'h':18},{'x':400,'y':320,'w':400,'h':18}],'hazard':None},
]

def mk_player(pid,char_idx,x,facing):
    ch=CHARACTERS[char_idx]
    return{'id':pid,'x':x,'y':100,'vx':0,'vy':0,'w':36,'h':56,'facing':facing,
        'hp':MAX_HP,'charIdx':char_idx,'color':ch['color'],
        'cd1':0,'cd2':0,'ultCharge':0,
        'shield':0,'armor':0,'frozen':0,'invincible':0,'slowTimer':0,
        'onGround':False,'groundY':0,'hitStun':0,
        'ultActive':False,'ultTimer':0,'critNext':False}

def apply_dmg(target,dmg,attacker,game):
    if target['invincible']>0:return
    if target['shield']>0:dmg=int(dmg*0.3);target['shield']=0
    if target['armor']>0:dmg=int(dmg*0.5)
    target['hp']=max(0,target['hp']-dmg)
    target['hitStun']=8;target['vy']=-3
    if attacker:attacker['ultCharge']=min(ULT_CHARGE,attacker['ultCharge']+dmg*0.6)
    game['screenShake']=max(game['screenShake'],4)

def spawn_slash(p,o,w,h,dmg,color,game):
    if p.get('critNext'):dmg*=2;p['critNext']=False
    sx=p['x']+p['facing']*(p['w']/2+w/2-10);sy=p['y']
    game['effects'].append({'type':'slash','x':sx,'y':sy,'w':w,'h':h,'timer':12,'color':color,'facing':p['facing']})
    hit=False
    if abs(o['x']-sx)<(w/2+o['w']/2) and abs(o['y']-sy)<(h/2+o['h']/2):
        apply_dmg(o,dmg,p,game);hit=True
        if CHARACTERS[p['charIdx']]['skill1'].get('knockback') and dmg>=18:
            o['vx']=p['facing']*12;o['vy']=-5
    return hit

def spawn_projectile(p,vx_mult,vy,w,h,dmg,color,icon,game,slow=False):
    if p.get('critNext'):dmg*=2;p['critNext']=False
    game['projectiles'].append({'x':p['x']+p['facing']*30,'y':p['y'],'vx':p['facing']*vx_mult,'vy':vy,
        'w':w,'h':h,'dmg':dmg,'color':color,'icon':icon,'owner':p['id'],'timer':180,'slow':slow})

def exec_skill(p,o,sk_key,game):
    ch=CHARACTERS[p['charIdx']]
    sk=ch[sk_key]
    if sk_key=='skill1':
        if p['cd1']>0 or p['frozen']>0 or p.get('ultActive'):return
        p['cd1']=sk['cd']
    elif sk_key=='skill2':
        if p['cd2']>0 or p['frozen']>0 or p.get('ultActive'):return
        p['cd2']=sk['cd']
    elif sk_key=='ult':
        if p['ultCharge']<ULT_CHARGE or p['frozen']>0 or p.get('ultActive'):return
        p['ultCharge']=0

    t=sk['type']
    cid=ch['id']

    if t=='slash':
        spawn_slash(p,o,sk['w'],sk['h'],sk['dmg'],p['color'],game)
    elif t=='projectile':
        spawn_projectile(p,abs(sk['vx']),sk.get('vy',0),sk['w'],sk['h'],sk['dmg'],sk['color'],sk['icon'],game,sk.get('slow',False))
    elif t=='shield_charge':
        p['shield']=45;p['vx']=p['facing']*16
        game['delayed'].append({'tick':6,'action':'shield_hit','p':p['id'],'o':o['id'],'facing':p['facing'],'dmg':sk['dmg']})
    elif t=='triple_slash':
        p['invincible']=30;game['screenShake']=15
        for i in range(3):
            game['delayed'].append({'tick':i*5,'action':'slash','p':p['id'],'o':o['id'],'w':180,'h':80,'dmg':sk['dmg'],'color':p['color']})
    elif t=='teleport':
        p['x']+=p['facing']*180
        p['x']=max(20,min(W-20,p['x']))
        p['invincible']=15
    elif t=='triple_shuriken':
        for i in range(3):
            game['delayed'].append({'tick':i*3,'action':'projectile','p':p['id'],'vx':13,'vy':(i-1)*2,'w':16,'h':16,'dmg':sk['dmg'],'color':'#22c55e','icon':'⭐'})
    elif t=='shadow_step':
        p['x']=o['x']-o['facing']*60;p['y']=o['y'];p['facing']=-o['facing'];p['critNext']=True
    elif t=='ult_combo':
        p['ultActive']=True;p['ultTimer']=60;p['invincible']=60
    elif t=='backjump_shot':
        p['vx']=-p['facing']*10;p['vy']=-8
        game['delayed'].append({'tick':5,'action':'scatter_shot','p':p['id']})
    elif t=='arrow_rain':
        for i in range(8):
            game['delayed'].append({'tick':i*2,'action':'projectile','p':p['id'],'vx':14,'vy':(i-3.5)*1.5,'w':30,'h':8,'dmg':5,'color':'#f59e0b','icon':'→'})
    elif t=='ground_slam':
        game['screenShake']=8
        game['effects'].append({'type':'groundwave','x':p['x'],'y':p.get('groundY',p['y']+28),'timer':20,'color':p['color'],'w':200})
        if abs(o['x']-p['x'])<200 and abs(o['y']-p['y'])<60:
            apply_dmg(o,sk['dmg'],p,game);o['frozen']=60
    elif t=='earthquake':
        game['screenShake']=25
        dx=o['x']-p['x']
        if abs(dx)<500:
            apply_dmg(o,sk['dmg'],p,game);o['vy']=-12;o['vx']=(1 if dx>0 else -1)*8
    elif t=='meteor_rain':
        for i in range(sk['count']):
            game['delayed'].append({'tick':i*5,'action':'meteor','p':p['id'],'o':o['id'],'dmg':sk['dmg']})
    elif t=='life_drain':
        if abs(o['x']-p['x'])<150 and abs(o['y']-p['y'])<80:
            apply_dmg(o,sk['dmg'],p,game);p['hp']=min(MAX_HP,p['hp']+15)
            game['effects'].append({'type':'drain','x1':o['x'],'y1':o['y'],'x2':p['x'],'y2':p['y'],'timer':20,'color':'#22ff88'})
    elif t=='clone_attack':
        for i in range(3):
            ox=p['x']+(i-1)*80
            game['delayed'].append({'tick':i*6,'action':'clone','p':p['id'],'o':o['id'],'x':ox,'y':p['y'],'dmg':sk['dmg']})

def update_player(p,inp,platforms,hazard,game):
    if p['frozen']>0:p['frozen']-=1;return
    if p['hitStun']>0:p['hitStun']-=1
    if p['shield']>0:p['shield']-=1
    if p['armor']>0:p['armor']-=1
    if p['invincible']>0:p['invincible']-=1
    if p['slowTimer']>0:p['slowTimer']-=1
    if p['cd1']>0:p['cd1']-=TICK_S
    if p['cd2']>0:p['cd2']-=TICK_S

    if p.get('ultActive'):
        p['ultTimer']-=1
        if p['ultTimer']<=0:p['ultActive']=False;p['invincible']=0
        return

    if p['hitStun']<=0:
        spd=MOVE_SPEED*0.4 if p['slowTimer']>0 else MOVE_SPEED
        if inp.get('l'):p['vx']=-spd;p['facing']=-1
        elif inp.get('r'):p['vx']=spd;p['facing']=1
        else:p['vx']*=0.7
        if inp.get('jump') and p['onGround']:
            p['vy']=JUMP_FORCE;p['onGround']=False;inp['jump']=False
    else:
        p['vx']*=0.8

    p['vy']+=GRAVITY;p['x']+=p['vx'];p['y']+=p['vy']
    p['onGround']=False
    for pl in platforms:
        if (p['x']+p['w']/2>pl['x'] and p['x']-p['w']/2<pl['x']+pl['w'] and
            p['y']+p['h']/2>=pl['y'] and p['y']+p['h']/2<=pl['y']+pl['h']+12 and p['vy']>=0):
            p['y']=pl['y']-p['h']/2;p['vy']=0;p['onGround']=True;p['groundY']=pl['y']
    p['x']=max(20,min(W-20,p['x']))
    if p['y']>H+100:p['y']=100;p['x']=W/2;p['vy']=0;apply_dmg(p,15,None,game)
    if hazard and p['y']+p['h']/2>hazard['y']:apply_dmg(p,hazard['dmg'],None,game)

def game_tick(game):
    if not game['playing']:return
    m=MAPS[game['mapIdx']]
    platforms=m['platforms'];hazard=m['hazard']
    p1=game['p1'];p2=game['p2']

    # ult combo logic (ninja)
    for p,o in [(p1,p2),(p2,p1)]:
        if p.get('ultActive') and p['ultTimer']>0 and p['ultTimer']%10==0:
            p['x']+=(o['x']-p['x'])*0.3;p['y']+=(o['y']-p['y'])*0.3
            p['facing']=1 if o['x']>p['x'] else -1
            spawn_slash(p,o,60,50,9,p['color'],game)

    update_player(p1,game['input1'],platforms,hazard,game)
    update_player(p2,game['input2'],platforms,hazard,game)

    # delayed actions
    new_delayed=[]
    for d in game['delayed']:
        d['tick']-=1
        if d['tick']>0:new_delayed.append(d);continue
        if not game['playing']:continue
        pp=p1 if d.get('p')==1 else p2
        oo=p2 if d.get('p')==1 else p1
        act=d['action']
        if act=='slash':spawn_slash(pp,oo,d['w'],d['h'],d['dmg'],d['color'],game)
        elif act=='projectile':spawn_projectile(pp,abs(d['vx']),d.get('vy',0),d['w'],d['h'],d['dmg'],d['color'],d['icon'],game)
        elif act=='shield_hit':
            if abs(pp['x']-oo['x'])<60 and abs(pp['y']-oo['y'])<50:
                apply_dmg(oo,d['dmg'],pp,game);oo['vx']=d['facing']*14;oo['vy']=-8
        elif act=='scatter_shot':
            for i in range(-1,2):spawn_projectile(pp,11,i*3,25,8,8,'#f59e0b','→',game)
        elif act=='meteor':
            mx=oo['x']+(random.random()-0.5)*120
            game['effects'].append({'type':'meteor','x':mx,'y':-50,'vy':12,'dmg':d['dmg'],'hit':False,'color':'#ff4500','target':oo['id'],'attacker':pp['id'],'timer':120})
        elif act=='clone':
            game['effects'].append({'type':'clone','x':d['x'],'y':d['y'],'facing':pp['facing'],'target':oo['id'],'timer':40,'dmg':d['dmg'],'color':pp['color'],'hit':False,'attacker':pp['id']})
    game['delayed']=new_delayed

    # projectiles
    new_pj=[]
    for pr in game['projectiles']:
        pr['x']+=pr['vx'];pr['y']+=pr['vy'];pr['timer']-=1
        target=p2 if pr['owner']==1 else p1
        if abs(pr['x']-target['x'])<(pr['w']/2+target['w']/2) and abs(pr['y']-target['y'])<(pr['h']/2+target['h']/2):
            apply_dmg(target,pr['dmg'],p1 if pr['owner']==1 else p2,game)
            if pr.get('slow'):target['slowTimer']=120
            continue
        if pr['timer']>0 and -50<pr['x']<W+50 and pr['y']<H+50:new_pj.append(pr)
    game['projectiles']=new_pj

    # effects
    new_ef=[]
    for e in game['effects']:
        e['timer']-=1
        if e['type']=='meteor':
            e['y']+=e['vy']
            t=p1 if e['target']==1 else p2
            if not e['hit'] and e['y']>=t['y']-30 and abs(e['x']-t['x'])<50:
                a=p1 if e['attacker']==1 else p2
                apply_dmg(t,e['dmg'],a,game);e['hit']=True
        if e['type']=='clone' and not e['hit'] and e['timer']<20:
            t=p1 if e['target']==1 else p2
            if abs(e['x']-t['x'])<60 and abs(e['y']-t['y'])<60:
                a=p1 if e['attacker']==1 else p2
                apply_dmg(t,e['dmg'],a,game);e['hit']=True
        if e['timer']>0:new_ef.append(e)
    game['effects']=new_ef

    # traps
    new_tr=[]
    for tr in game['traps']:
        tr['timer']-=1
        if tr['timer']<=0:continue
        hit=False
        for p in [p1,p2]:
            if p['id']==tr['owner']:continue
            if abs(p['x']-tr['x'])<30 and abs(p['y']+p['h']/2-tr['y'])<20:
                apply_dmg(p,tr['dmg'],p1 if tr['owner']==1 else p2,game);p['frozen']=60;hit=True;break
        if not hit:new_tr.append(tr)
    game['traps']=new_tr

    # items
    game['itemTimer']+=1
    if game['itemTimer']>=480:
        game['itemTimer']=0
        if len(game['items'])<3:
            plat=random.choice(platforms)
            ix=plat['x']+40+random.random()*(plat['w']-80)
            iy=plat['y']-30
            types=[{'type':'heal','amount':20,'color':'#22ff88','icon':'❤️'},{'type':'heal','amount':35,'color':'#ff4488','icon':'💖'},{'type':'energy','amount':20,'color':'#f5c542','icon':'⚡'}]
            it=random.choice(types)
            game['items'].append({**it,'x':ix,'y':iy,'timer':600,'bobTimer':0})
    new_it=[]
    for it in game['items']:
        it['timer']-=1;it['bobTimer']+=1
        if it['timer']<=0:continue
        picked=False
        for p in [p1,p2]:
            if p['hp']<=0:continue
            if abs(p['x']-it['x'])<30 and abs(p['y']-it['y'])<40:
                if it['type']=='heal':p['hp']=min(MAX_HP,p['hp']+it['amount'])
                elif it['type']=='energy':p['ultCharge']=min(ULT_CHARGE,p['ultCharge']+it['amount'])
                picked=True;break
        if not picked:new_it.append(it)
    game['items']=new_it

    if game['screenShake']>0:game['screenShake']-=1

    # gameover
    if p1['hp']<=0 or p2['hp']<=0:
        game['playing']=False
        winner=1 if p1['hp']>0 else 2
        game['winner']=winner

def build_state(game):
    def ps(p):
        return{'x':int(p['x']),'y':int(p['y']),'hp':p['hp'],'vx':round(p['vx'],1),'vy':round(p['vy'],1),
            'f':p['facing'],'c1':round(p['cd1'],1),'c2':round(p['cd2'],1),'uc':int(p['ultCharge']),
            'fr':p['frozen'],'sh':p['shield'],'ar':p['armor'],'iv':p['invincible'],'og':p['onGround'],
            'ci':p['charIdx'],'hs':p['hitStun'],'sl':p['slowTimer'],'ua':p.get('ultActive',False)}
    pj=[{'x':int(pr['x']),'y':int(pr['y']),'vx':round(pr['vx'],1),'vy':round(pr['vy'],1),'w':pr['w'],'h':pr['h'],'color':pr['color'],'icon':pr.get('icon',''),'timer':pr['timer']} for pr in game['projectiles']]
    ef=[]
    for e in game['effects']:
        ed={'type':e['type'],'x':int(e.get('x',0)),'y':int(e.get('y',0)),'timer':e['timer'],'color':e.get('color','')}
        if 'w' in e:ed['w']=e['w']
        if 'h' in e:ed['h']=e['h']
        if 'facing' in e:ed['facing']=e['facing']
        if 'vy' in e:ed['vy']=e['vy']
        if 'x1' in e:ed['x1']=int(e['x1']);ed['y1']=int(e['y1']);ed['x2']=int(e['x2']);ed['y2']=int(e['y2'])
        ef.append(ed)
    it=[{'x':int(i['x']),'y':int(i['y']),'color':i['color'],'icon':i['icon'],'timer':i['timer'],'bobTimer':i['bobTimer']} for i in game['items']]
    tr=[{'x':int(t['x']),'y':int(t['y']),'color':t['color'],'timer':t['timer']} for t in game['traps']]
    return{'type':'state','p1':ps(game['p1']),'p2':ps(game['p2']),'pj':pj,'ef':ef,'it':it,'tr':tr,'sk':game['screenShake']}

async def game_loop(room):
    game=room['game']
    while game['playing']:
        game_tick(game)
        state=build_state(game)
        s=json.dumps(state)
        for ws in [room.get('ws1'),room.get('ws2')]:
            if ws:
                try:await ws.send(s)
                except:pass
        if not game['playing']:
            winner=game.get('winner',0)
            wname=room.get('u1','') if winner==1 else room.get('u2','')
            if wname in db:db[wname]['wins']+=1;save_db(db)
            msg=json.dumps({'type':'gameover','winner':winner,'winnerName':wname,'wins':db.get(wname,{}).get('wins',0)})
            for ws in [room.get('ws1'),room.get('ws2')]:
                if ws:
                    try:await ws.send(msg)
                    except:pass
            break
        await asyncio.sleep(TICK_S)

def start_game(room):
    mi=room.get('mapIdx',0)
    m=MAPS[mi]
    sl=m['platforms'][0]['x']+80
    sr=m['platforms'][-1]['x']+m['platforms'][-1]['w']-80
    game={
        'playing':True,'mapIdx':mi,
        'p1':mk_player(1,room.get('sel1',0),sl,1),
        'p2':mk_player(2,room.get('sel2',1),sr,-1),
        'projectiles':[],'effects':[],'items':[],'traps':[],'delayed':[],
        'screenShake':0,'itemTimer':300,
        'input1':{'l':False,'r':False,'jump':False},
        'input2':{'l':False,'r':False,'jump':False},
        'winner':0
    }
    room['game']=game
    asyncio.ensure_future(game_loop(room))

async def handler(ws):
    rid=None;pid=None;username=None
    try:
        async for raw in ws:
            msg=json.loads(raw)
            t=msg.get('type','')

            if t=='login':
                u=msg.get('user','').strip();p=msg.get('pass','')
                if u not in db:await ws.send(json.dumps({'type':'login-fail','msg':'用户不存在'}))
                elif db[u]['pw']!=hash_pw(p):await ws.send(json.dumps({'type':'login-fail','msg':'密码错误'}))
                else:
                    for ow,ou in list(authed.items()):
                        if ou==u and ow!=ws:
                            try:await ow.close()
                            except:pass
                    username=u;authed[ws]=u
                    token=hashlib.sha256((u+db[u]['pw']+'salt9000').encode()).hexdigest()
                    await ws.send(json.dumps({'type':'login-ok','user':u,'wins':db[u]['wins'],'token':token}))

            elif t=='token-login':
                u=msg.get('user','').strip();tk=msg.get('token','')
                if u in db:
                    expect=hashlib.sha256((u+db[u]['pw']+'salt9000').encode()).hexdigest()
                    if tk==expect:
                        for ow,ou in list(authed.items()):
                            if ou==u and ow!=ws:
                                try:await ow.close()
                                except:pass
                        username=u;authed[ws]=u
                        await ws.send(json.dumps({'type':'login-ok','user':u,'wins':db[u]['wins'],'token':tk}))
                    else:await ws.send(json.dumps({'type':'login-fail','msg':'登录已过期'}))
                else:await ws.send(json.dumps({'type':'login-fail','msg':'用户不存在'}))

            elif t=='change-pw':
                if not username:await ws.send(json.dumps({'type':'pw-fail','msg':'未登录'}));continue
                old=msg.get('old','');new_=msg.get('new','')
                if db[username]['pw']!=hash_pw(old):await ws.send(json.dumps({'type':'pw-fail','msg':'旧密码错误'}))
                elif len(new_)<4:await ws.send(json.dumps({'type':'pw-fail','msg':'新密码至少4位'}))
                else:
                    db[username]['pw']=hash_pw(new_);save_db(db)
                    token=hashlib.sha256((username+db[username]['pw']+'salt9000').encode()).hexdigest()
                    await ws.send(json.dumps({'type':'pw-ok','token':token}))

            elif t=='join':
                if not username:await ws.send(json.dumps({'type':'error','msg':'请先登录'}));continue
                if rid and rid in rooms:
                    r=rooms[rid]
                    if r.get('ws1')==ws:r['ws1']=r.get('ws2');r['u1']=r.get('u2');r['ws2']=None;r['u2']=None
                    elif r.get('ws2')==ws:r['ws2']=None;r['u2']=None
                    if not r.get('ws1'):del rooms[rid]
                rid=msg.get('room','1234');pid=None
                if rid not in rooms:
                    rooms[rid]={'ws1':ws,'ws2':None,'u1':username,'u2':None,'sel1':0,'sel2':1,'mapIdx':None,'game':None}
                    pid=1
                    await ws.send(json.dumps({'type':'role','pid':1,'msg':'等待对手加入...'}))
                elif rooms[rid].get('ws2') is None and rooms[rid].get('ws1')!=ws:
                    if username==rooms[rid].get('u1'):await ws.send(json.dumps({'type':'error','msg':'你已经在房间中'}));continue
                    rooms[rid]['ws2']=ws;rooms[rid]['u2']=username;pid=2
                    await ws.send(json.dumps({'type':'role','pid':2,'msg':'已连接！'}))
                    await ws.send(json.dumps({'type':'peer-info','name':rooms[rid]['u1']}))
                    try:await rooms[rid]['ws1'].send(json.dumps({'type':'peer-joined','name':username}))
                    except:pass
                else:
                    await ws.send(json.dumps({'type':'error','msg':'房间已满'}));rid=None;continue

            elif t=='input' and rid and rid in rooms and pid:
                r=rooms[rid]
                if r.get('game') and r['game']['playing']:
                    inp=r['game'][f'input{pid}']
                    inp['l']=msg.get('l',False);inp['r']=msg.get('r',False)

            elif t=='jump' and rid and rid in rooms and pid:
                r=rooms[rid]
                if r.get('game') and r['game']['playing']:
                    r['game'][f'input{pid}']['jump']=True

            elif t=='skill' and rid and rid in rooms and pid:
                r=rooms[rid]
                if r.get('game') and r['game']['playing']:
                    g=r['game'];pp=g['p1'] if pid==1 else g['p2'];oo=g['p2'] if pid==1 else g['p1']
                    sk=msg.get('sk','')
                    if sk=='s1':exec_skill(pp,oo,'skill1',g)
                    elif sk=='s2':exec_skill(pp,oo,'skill2',g)
                    elif sk=='ult':exec_skill(pp,oo,'ult',g)

            elif t in ('select','confirmed','map','start','rematch') and rid and rid in rooms:
                r=rooms[rid]
                if t=='select':
                    if pid==1:r['sel1']=msg.get('charIdx',0)
                    else:r['sel2']=msg.get('charIdx',1)
                elif t=='map':r['mapIdx']=msg.get('mapIdx',0)
                elif t=='start':
                    if r.get('ws1') and r.get('ws2') and r.get('mapIdx') is not None:
                        start_game(r)
                # forward to other player
                other=r.get('ws2') if pid==1 else r.get('ws1')
                if other:
                    try:await other.send(raw)
                    except:pass

    except websockets.ConnectionClosed:pass
    finally:
        if ws in authed:del authed[ws]
        if rid and rid in rooms:
            r=rooms[rid]
            if r.get('game'):r['game']['playing']=False
            if r.get('ws1')==ws:
                r['ws1']=r.get('ws2');r['u1']=r.get('u2');r['ws2']=None;r['u2']=None
            elif r.get('ws2')==ws:r['ws2']=None;r['u2']=None
            if not r.get('ws1'):del rooms[rid]
            else:
                try:await r['ws1'].send(json.dumps({'type':'peer-left'}))
                except:pass

async def main():
    print("游戏服务器启动: ws://0.0.0.0:9000")
    async with websockets.serve(handler,"0.0.0.0",9000):
        await asyncio.Future()

asyncio.run(main())
