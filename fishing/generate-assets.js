// Imagen 资产批量生成器
// 用法: GOOGLE_API_KEY=AIza... node generate-assets.js [fish|scenes|menu|ui|all|test]
// 默认: test (生成1张鱼图验证)

const fs = require('fs');
const path = require('path');

// === 代理支持（Node 18+ fetch 不会自动读 HTTPS_PROXY，需要手动注入）===
// 用法: HTTPS_PROXY=http://127.0.0.1:10809 node generate-assets.js all
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
if (proxyUrl) {
  try {
    const { ProxyAgent, setGlobalDispatcher } = require('undici');
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    console.log('[proxy] 使用代理:', proxyUrl);
  } catch (e) {
    console.warn('[proxy] 未安装 undici，代理可能不生效:', e.message);
  }
}

const KEY = process.env.GOOGLE_API_KEY;
if (!KEY) { console.error('请设置 GOOGLE_API_KEY 环境变量'); process.exit(1); }

const MODEL = process.env.IMAGEN_MODEL || 'gemini-2.5-flash-image';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

const ROOT = __dirname;
const DIR_FISH = path.join(ROOT, 'assets', 'fish');
const DIR_SCENES = path.join(ROOT, 'assets', 'scenes');
const DIR_UI = path.join(ROOT, 'assets', 'ui');
fs.mkdirSync(DIR_FISH, { recursive: true });
fs.mkdirSync(DIR_SCENES, { recursive: true });
fs.mkdirSync(DIR_UI, { recursive: true });

// === 从 index.html 提取 FISH_DATA / SCENES ===
function loadGameData() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('无法找到 script');
  const sandbox = { console };
  const code = m[1] + '\nthis.FISH_DATA=FISH_DATA;this.SCENES=SCENES;';
  // 用 vm 而不是 new Function，简单点直接 eval 提取数据段
  const fishMatch = m[1].match(/const FISH_DATA\s*=\s*(\[[\s\S]*?\]);/);
  const sceneMatch = m[1].match(/const SCENES\s*=\s*(\[[\s\S]*?\]);/);
  if (!fishMatch || !sceneMatch) throw new Error('未找到数据');
  return {
    FISH_DATA: eval(fishMatch[1]),
    SCENES: eval(sceneMatch[1])
  };
}

// === Gemini Nano Banana 调用 ===
async function generateImage(prompt, aspectRatio = '1:1') {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio }
    }
  };
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${t.slice(0, 400)}`);
  }
  const data = await resp.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    const inline = p.inlineData || p.inline_data;
    if (inline && inline.data) return Buffer.from(inline.data, 'base64');
  }
  throw new Error('无返回图像: ' + JSON.stringify(data).slice(0, 400));
}

async function genWithRetry(prompt, outPath, aspectRatio, label) {
  if (fs.existsSync(outPath)) { console.log(`[skip] ${label}`); return 'skip'; }
  for (let i = 0; i < 3; i++) {
    try {
      const buf = await generateImage(prompt, aspectRatio);
      fs.writeFileSync(outPath, buf);
      console.log(`[ok]   ${label} (${(buf.length / 1024).toFixed(0)}KB)`);
      return 'ok';
    } catch (e) {
      console.log(`[err]  ${label} 尝试${i + 1}: ${e.message}`);
      if (i < 2) await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  console.log(`[fail] ${label}`);
  return 'fail';
}

// === Prompt 构造 ===
function fishPrompt(f) {
  const styleByRarity = {
    common: 'soft watercolor illustration, natural colors',
    rare: 'detailed digital art, vibrant colors, slight glow',
    epic: 'magical fantasy illustration, glowing aura, dramatic lighting',
    legendary: 'mythical legendary creature illustration, radiant golden aura, epic lighting, intricate details'
  };
  return `A single ${f.name} (${f.desc}) fish, side view profile, swimming gracefully, ${styleByRarity[f.rarity]}, game asset, transparent background, isolated subject, centered composition, no text, no watermark, high detail fish anatomy, scientific accuracy combined with stylized game art`;
}

function scenePrompt(s) {
  const map = {
    pond: 'serene rural pond at golden hour, lily pads, reeds, distant willow trees, soft sunlight, painterly landscape',
    river: 'mountain river with rapids and smooth stones, lush green banks, distant misty mountains, bright daylight, scenic landscape',
    lake: 'crystalline alpine lake surrounded by snow-capped peaks, pine forest reflection, calm water surface, dramatic sky',
    coast: 'tropical seacoast with golden sand beach, turquoise water, distant tropical island, palm tree silhouettes, sunset',
    deep: 'mysterious deep ocean abyss, bioluminescent creatures, shafts of light from above, dark blue gradient, ethereal'
  };
  return `${map[s.id]}, no people, no text, no UI, panoramic widescreen landscape, photorealistic concept art, atmospheric, game background art`;
}

const UI_TARGETS = [
  { name: 'menu', prompt: 'Epic first-person fishing game title screen background, lone fisherman silhouette on dock at golden sunset, calm lake reflecting sky, distant mountains, dramatic clouds, cinematic atmosphere, painterly digital art, no text, no logo, widescreen', aspect: '16:9' },
  { name: 'wood-panel', prompt: 'Seamless old wooden plank texture, dark brown wood grain, vintage tavern style, top down view, no text', aspect: '1:1' },
  { name: 'button-bg', prompt: 'Ornate wooden button background with brass border, fishing themed, weathered texture, centered, no text', aspect: '4:1' },
  { name: 'fish-icon', prompt: 'Simple flat fish silhouette icon, white on dark, minimalist, no text', aspect: '1:1' },
  { name: 'bait', prompt: 'Top-down view of fishing bait and lures collection on wood, colorful artificial flies and worms, game item icon style', aspect: '1:1' }
];

// === 入口 ===
async function main() {
  const arg = process.argv[2] || 'test';
  const { FISH_DATA, SCENES } = loadGameData();
  console.log(`数据: ${FISH_DATA.length} 鱼, ${SCENES.length} 场景`);
  console.log(`模型: ${MODEL}`);

  if (arg === 'test') {
    const f = FISH_DATA[0];
    await genWithRetry(fishPrompt(f), path.join(DIR_FISH, '__test.png'), '1:1', `测试: ${f.name}`);
    return;
  }

  let stats = { ok: 0, skip: 0, fail: 0 };
  const tally = r => stats[r]++;

  if (arg === 'fish' || arg === 'all') {
    console.log(`\n=== 鱼 (${FISH_DATA.length}) ===`);
    for (const f of FISH_DATA) {
      const r = await genWithRetry(fishPrompt(f), path.join(DIR_FISH, `${f.id}.png`), '1:1', `${f.id}.${f.name}`);
      tally(r);
      await new Promise(r => setTimeout(r, 300)); // 限速
    }
  }

  if (arg === 'scenes' || arg === 'all') {
    console.log(`\n=== 场景 (${SCENES.length}) ===`);
    for (const s of SCENES) {
      const r = await genWithRetry(scenePrompt(s), path.join(DIR_SCENES, `${s.id}.png`), '16:9', `scene.${s.id}`);
      tally(r);
      await new Promise(r => setTimeout(r, 300));
    }
  }

  if (arg === 'menu' || arg === 'ui' || arg === 'all') {
    console.log(`\n=== UI/菜单 (${UI_TARGETS.length}) ===`);
    for (const u of UI_TARGETS) {
      const dir = u.name === 'menu' ? path.join(ROOT, 'assets') : DIR_UI;
      const r = await genWithRetry(u.prompt, path.join(dir, `${u.name}.png`), u.aspect, `ui.${u.name}`);
      tally(r);
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log(`\n=== 完成 ===`);
  console.log(`成功: ${stats.ok}  跳过: ${stats.skip}  失败: ${stats.fail}`);
}

main().catch(e => { console.error(e); process.exit(1); });
