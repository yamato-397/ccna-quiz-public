/**
 * フェーズ3: 3つの入口（選択問題/虎&ドロップ(D&D)/実機問題(シミュレーション)）へ
 * 通常のクリック操作で遷移し、フレーム構成・入力項目・DOM構造を確認する。
 * 非公開APIの直接呼び出しは行わない。
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { requireCredentials } = require('./env');

const TARGET_URL = 'https://baudroie.github.io/ccnatiger_practice/';
const OUT_DIR = path.join(__dirname, '..', '..', 'audit', 'reference-site');
const SHOT_DIR = path.join(__dirname, '..', '..', 'audit', 'screenshots');

for (const d of [OUT_DIR, SHOT_DIR]) fs.mkdirSync(d, { recursive: true });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function describeFrame(frame, label) {
  const url = frame.url();
  let inputs = [];
  let buttons = [];
  let bodyTextSample = '';
  try {
    inputs = await frame.$$eval('input', els => els.map(e => ({
      type: e.type, name: e.name, id: e.id, placeholder: e.placeholder,
    })));
  } catch (_) {}
  try {
    buttons = await frame.$$eval('button, input[type="submit"]', els => els.map(b => ({
      text: (b.textContent || b.value || '').trim(), id: b.id, onclick: b.getAttribute('onclick'),
    })));
  } catch (_) {}
  try {
    bodyTextSample = (await frame.evaluate(() => document.body ? document.body.innerText : '')).slice(0, 1000);
  } catch (_) {}
  return { label, url, inputs, buttons, bodyTextSample };
}

async function exploreSection(context, label, href, outPrefix) {
  console.log(`\n=== [${label}] ${href} ===`);
  const page = await context.newPage();
  const newPagePromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);

  await page.goto(href, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('  goto警告:', e.message));
  await sleep(2000);

  await page.screenshot({ path: path.join(SHOT_DIR, `${outPrefix}_01_initial.png`), fullPage: true }).catch(() => {});

  const frames = page.frames();
  console.log(`  フレーム数: ${frames.length}`);
  const frameDescriptions = [];
  for (let i = 0; i < frames.length; i++) {
    const desc = await describeFrame(frames[i], `frame[${i}] name=${frames[i].name() || '(none)'}`);
    frameDescriptions.push(desc);
    console.log(`  frame[${i}] url=${desc.url.slice(0, 90)}`);
    console.log(`    inputs=${JSON.stringify(desc.inputs)}`);
    console.log(`    buttons=${JSON.stringify(desc.buttons).slice(0, 300)}`);
    console.log(`    text先頭200文字=${desc.bodyTextSample.slice(0, 200).replace(/\n/g, ' / ')}`);
  }

  fs.writeFileSync(
    path.join(OUT_DIR, `${outPrefix}_probe.json`),
    JSON.stringify({ label, href, checkedAt: new Date().toISOString(), frames: frameDescriptions }, null, 2),
    'utf8'
  );

  return { page, frameDescriptions };
}

async function main() {
  const { id, pass } = requireCredentials();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('[Login] トップページへアクセスしてログイン');
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('#username', id);
  await page.fill('#password', pass);
  await page.click('.login-button');
  await sleep(1500);

  const links = await page.$$eval('a', els => els.map(a => ({
    href: a.href, text: a.textContent.trim(),
  })).filter(l => l.href.includes('script.google.com')));

  console.log('練習リンク一覧:', JSON.stringify(links, null, 2));

  const cardTitles = await page.$$eval('.portal-card, [class*="card"]', els =>
    els.map(el => el.textContent.trim().slice(0, 40))
  ).catch(() => []);
  console.log('カードタイトル候補:', cardTitles);

  // カードの見出し画像alt/タイトルから対応するセクション名を推定
  const sectionMeta = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('a').forEach(a => {
      if (!a.href.includes('script.google.com')) return;
      let container = a.closest('div');
      let label = '';
      // 直前の兄弟や親要素からタイトル画像のalt等を探す
      let el = a;
      for (let i = 0; i < 5 && el; i++) {
        el = el.parentElement;
        if (el) {
          const img = el.querySelector('img[alt]');
          if (img && img.alt) { label = img.alt; break; }
          const heading = el.querySelector('h1,h2,h3,h4');
          if (heading && heading.textContent.trim()) { label = heading.textContent.trim(); break; }
        }
      }
      results.push({ href: a.href, label });
    });
    return results;
  });
  console.log('セクション対応:', JSON.stringify(sectionMeta, null, 2));

  fs.writeFileSync(path.join(OUT_DIR, '03_section_links.json'), JSON.stringify({ links, cardTitles, sectionMeta }, null, 2), 'utf8');

  const outPrefixes = ['sectionA', 'sectionB', 'sectionC'];
  const results = [];
  for (let i = 0; i < links.length; i++) {
    const r = await exploreSection(context, links[i].text + `#${i}`, links[i].href, outPrefixes[i] || `section${i}`);
    results.push(r);
    await sleep(1500); // 過度な連続アクセスを避ける
  }

  await browser.close();
  console.log('\n完了。audit/reference-site/ と audit/screenshots/ を確認してください。');
}

main().catch(e => {
  console.error('致命的エラー:', e);
  process.exit(1);
});
