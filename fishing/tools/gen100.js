// 生成 100 条高稀有度新鱼（id 200-299），写入 index.html 的 FISH_DATA，
// 并把 id 接入对应场景 SC[].fish，使其可被钓到。可重复运行（幂等）。
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'index.html');

// ---- 主题定义 ----
const THEMES = {
  volcano: {
    scene: 'volcano', category: '熔岩鱼', legacy: ['deep'],
    emojis: ['🔥','🐟','🦈','🐍','🦐'],
    descPre: '栖息于熔岩深处的',
    names: ['熔岩鲷','火焰刺鱼','岩浆电鳗','硫磺鲨','炽焰鮟鱇','火山口盲鱼','焦鳞龙鱼','熔金鲤','烈焰蝠鲼','火晶水母','炎纹章鱼','熔岩巨骨舌','火脊鲟','赤炎裂唇鱼','火种虾虎','焰尾狮子鱼','熔岩帝王蟹','硫火海鳝','炽热角鮟鱇','火种始祖鲨'],
    rar: ['rare','rare','epic','epic','rare','rare','epic','rare','epic','rare','epic','epic','epic','epic','rare','epic','legendary','epic','legendary','legendary'],
  },
  coral: {
    scene: 'coral', category: '热带鱼', legacy: ['coast'],
    emojis: ['🐠','🐡','🪼','🦐','🦀','🐚'],
    descPre: '游弋在斑斓珊瑚间的',
    names: ['虹光神仙鱼','珊瑚小丑鱼','棱镜蝴蝶鱼','月华刺尾鱼','七彩鹦嘴鱼','琉璃箱鲀','金纹狮子鱼','荧光海马','霓虹鳍鲷','珍珠鲉','翡翠海龙','彩焰隆头鱼','虹膜炮弹鱼','琥珀护士鲨','花纹魟','宝石虾蛄','流光水母','琉光章鱼','霓裳裸鳃','珊瑚王蝶鱼','晶簇刺尾鱼','虹彩燕鳐','梦幻豆丁海马','珊瑚礁帝王鱼'],
    rar: ['rare','rare','rare','rare','epic','rare','epic','rare','epic','rare','epic','rare','epic','rare','epic','epic','rare','epic','rare','epic','epic','epic','rare','legendary'],
  },
  abyss: {
    scene: 'abyss', category: '深海鱼', legacy: ['deep'],
    emojis: ['🐙','🦑','🐟','🦈','🪼','🦐'],
    descPre: '潜伏于无光深渊的',
    names: ['深渊鮟鱇','幽光吞噬鳗','遗迹守卫鱼','渊底盲鲨','磷火水母','黑渊巨口鱼','古神触须鱼','深潜龙涎鱼','遗迹石斑','渊光灯笼鱼','虚空章鱼','深渊帝王蟹','亡灵七鳃鳗','渊墟蝰鱼','幽冥皇带鱼','古碑鲟','吸血鬼乌贼','渊底盾皮鱼','腐光鮟鱇','遗迹魔鳐','深渊蛛蟹','渊核水母','亘古盲鳗','幽渊利维鱼','深墟巨齿鱼','永夜吞天鲸'],
    rar: ['epic','epic','epic','epic','rare','epic','legendary','epic','rare','epic','epic','epic','epic','epic','legendary','epic','legendary','legendary','epic','legendary','legendary','rare','epic','legendary','legendary','legendary'],
  },
  aurora: {
    scene: 'aurora', category: '极地鱼', legacy: ['deep'],
    emojis: ['❄️','🐟','🐳','🦈'],
    descPre: '穿行于极光冰原的',
    names: ['极光水晶鱼','冰川帝王鲑','霜羽天使鱼','寒晶鲟','极夜发光鱿','冰棱狮子鱼','雪魂水母','独角鲸鱼','冰纹龙鱼','银霜刺鲀','极光蝠鲼','冻鳞古鲨','水晶灯笼鱼','霜火双生鱼','冰封始祖鱼','极寒帝王蟹','雪盲鮟鱇','北境海妖鳗','冰晶皇带鱼','极光巨兽'],
    rar: ['epic','epic','rare','epic','epic','epic','rare','epic','legendary','epic','epic','legendary','epic','legendary','legendary','epic','epic','legendary','legendary','legendary'],
  },
  mythic: {
    scene: 'aurora', category: '神话鱼', legacy: ['deep'],
    emojis: ['🐉','🐋','🌟','🐍'],
    descPre: '只存在于传说中的',
    names: ['星辰鲲','时空锦鲤','创世白龙鱼','混沌吞天兽','虚空神鲸','永恒海皇','天穹雷龙鱼','幽冥彼岸鱼','苍龙王','利维坦'],
    rar: ['legendary','legendary','legendary','legendary','legendary','legendary','legendary','legendary','legendary','legendary'],
  },
};

const DESC_SUF = ['珍稀鱼种','强韧巨物','神秘存在','古老血脉','梦幻之影','传奇猎物'];
const SKILL = {
  rare: ['水刃','急流','旋涡','水流冲击'],
  epic: ['深海压力','旋涡','海啸','天罚雷霆','远古咆哮'],
  legendary: ['海啸','远古咆哮','毁灭漩涡','时空裂隙','天罚雷霆'],
};
function rnd(seed){ let x = Math.sin(seed * 99.13 + 7.7) * 10000; return x - Math.floor(x); }
function stats(rar, seed){
  let r1 = rnd(seed), r2 = rnd(seed+1), r3 = rnd(seed+2), r4 = rnd(seed+3);
  let minW, maxMul, price, power;
  if (rar === 'rare'){ minW = 0.3 + r1*2.7; maxMul = 6 + r2*9; price = 60 + Math.round(r3*90); power = 90 + Math.round(r4*75); }
  else if (rar === 'epic'){ minW = 2 + r1*28; maxMul = 6 + r2*8; price = 260 + Math.round(r3*460); power = 300 + Math.round(r4*260); }
  else { minW = 20 + r1*780; maxMul = 5 + r2*7; price = 900 + Math.round(r3*2100); power = 650 + Math.round(r4*470); }
  let maxW = minW * maxMul;
  const fmt = v => v < 1 ? +v.toFixed(2) : v < 10 ? +v.toFixed(1) : Math.round(v);
  return { minWeight: fmt(minW), maxWeight: fmt(maxW), basePrice: price, power };
}
function pick(arr, seed){ return arr[Math.floor(rnd(seed) * arr.length) % arr.length]; }

// ---- 生成条目 ----
let id = 200;
const entries = [];
const sceneAdds = { volcano: [], coral: [], abyss: [], aurora: [] };
for (const key of ['volcano','coral','abyss','aurora','mythic']){
  const th = THEMES[key];
  th.names.forEach((name, i) => {
    const rar = th.rar[i];
    const st = stats(rar, id);
    const desc = th.descPre + pick(DESC_SUF, id+5);
    const emoji = pick(th.emojis, id+2);
    const skill = pick(SKILL[rar], id+3);
    entries.push(`  {id:${id},name:'${name}',desc:'${desc}',category:'${th.category}',rarity:'${rar}',scenes:${JSON.stringify(th.legacy)},minWeight:${st.minWeight},maxWeight:${st.maxWeight},basePrice:${st.basePrice},power:${st.power},skill:'${skill}',emoji:'${emoji}'}`);
    sceneAdds[th.scene].push(id);
    id++;
  });
}
console.log(`生成 ${entries.length} 条鱼 (id 200-${id-1})`);

// ---- 打补丁 ----
let html = fs.readFileSync(FILE, 'utf8');
if (/\{id:200,/.test(html)) { console.log('已存在 id:200，跳过 FISH_DATA 注入'); }
else {
  const m = html.match(/(\{id:199,[^\n]*\})\n\];/);
  if (!m) throw new Error('未找到 FISH_DATA 结尾 (id:199 ... ];)');
  html = html.replace(m[0], `${m[1]},\n${entries.join(',\n')}\n];`);
  console.log('已注入 FISH_DATA');
}
// SC 场景接入
for (const [scene, ids] of Object.entries(sceneAdds)){
  if (!ids.length) continue;
  const re = new RegExp(`(id:'${scene}'[^\\n]*?fish:\\[)([^\\]]*)\\]`);
  const mm = html.match(re);
  if (!mm) { console.log(`[warn] 未找到场景 ${scene} 的 fish 数组`); continue; }
  if (mm[2].includes(String(ids[0]))) { console.log(`[skip] 场景 ${scene} 已含新 id`); continue; }
  html = html.replace(re, `${mm[1]}${mm[2]},${ids.join(',')}]`);
  console.log(`场景 ${scene} += ${ids.length} 条`);
}
fs.writeFileSync(FILE, html);
console.log('完成写入 index.html');
