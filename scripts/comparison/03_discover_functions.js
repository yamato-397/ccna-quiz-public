/**
 * 各GASアプリの userHtmlFrame のHTML/JSソースから、
 * フロントエンドが実際に呼び出している google.script.run.<関数名> を抽出する。
 * (ユーザー承認済み: 内部ログインUIは経由せず、GASサーバー関数を直接呼び出す従来方式を使用)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', '..', 'audit', 'reference-site');
fs.mkdirSync(OUT_DIR, { recursive: true });

const APPS = {
  choice: 'https://script.google.com/macros/s/AKfycbzIhnMUOAR5i-bYCyAhNVHT2rEOb2xXFHCReQfNx1hUFBuzfrpQ7IaWmKeH7SF2Lvo8/exec',
  dnd: 'https://script.google.com/macros/s/AKfycbxVX70Z3UhvnzA0EFq9JsAjlwiierFAvVjyGbBW2ZpkBHPGudiNq8BXTAzE2xNJmtM/exec',
  simulation: 'https://script.google.com/macros/s/AKfycbwPy2Rwe2u_VwSBdYmCa9Kg7f0MDBkmEt9CRQTpdNBGBjxniPh0_2fBXZ0Lpy2aMC-BXQ/exec',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractFunctionNames(html) {
  const names = new Set();
  const patterns = [
    /google\.script\.run[^;]*?\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(html)) !== null) {
      const fn = m[1];
      if (!['withSuccessHandler', 'withFailureHandler', 'withUserObject'].includes(fn)) {
        names.add(fn);
      }
    }
  }
  return Array.from(names).sort();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const results = {};

  for (const [label, url] of Object.entries(APPS)) {
    console.log(`\n=== ${label}: ${url} ===`);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('goto警告:', e.message));
    await sleep(2000);

    const frames = page.frames();
    // "blank" (googleusercontent) を含む userHtmlFrame 相当を探す
    const uiFrame = frames.find(f => f.url().includes('googleusercontent.com/blank')) || frames[frames.length - 1];
    console.log('  対象フレーム:', uiFrame.url().slice(0, 90));

    const html = await uiFrame.content().catch(() => '');
    fs.writeFileSync(path.join(OUT_DIR, `${label}_ui_frame.html`), html, 'utf8');

    const fnNames = extractFunctionNames(html);
    console.log('  検出された google.script.run 関数名:', fnNames);

    results[label] = { url, uiFrameUrl: uiFrame.url(), functionNames: fnNames };

    await page.close();
    await sleep(1000);
  }

  fs.writeFileSync(path.join(OUT_DIR, '04_discovered_functions.json'), JSON.stringify(results, null, 2), 'utf8');
  await browser.close();
  console.log('\n完了:', path.join(OUT_DIR, '04_discovered_functions.json'));
}

main().catch(e => { console.error(e); process.exit(1); });
