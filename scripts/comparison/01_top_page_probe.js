/**
 * フェーズ3: 参考サイトの構造調査（第一段階）
 * 通常のブラウザ操作としてトップページへアクセスし、ログインフォーム・
 * 遷移先候補・フレーム構成を確認する。非公開APIの直接呼び出しは行わない。
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { requireCredentials } = require('./env');

const TARGET_URL = 'https://baudroie.github.io/ccnatiger_practice/';
const OUT_DIR = path.join(__dirname, '..', '..', 'audit', 'reference-site');
const SHOT_DIR = path.join(__dirname, '..', '..', 'audit', 'screenshots');
const LOG_DIR = path.join(__dirname, '..', '..', 'audit', 'logs');

for (const d of [OUT_DIR, SHOT_DIR, LOG_DIR]) fs.mkdirSync(d, { recursive: true });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const { id, pass } = requireCredentials();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const requestLog = [];
  context.on('request', req => {
    requestLog.push({ method: req.method(), url: req.url(), resourceType: req.resourceType() });
  });

  console.log('[1] トップページへアクセス:', TARGET_URL);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1000);

  await page.screenshot({ path: path.join(SHOT_DIR, '01_top_page.png'), fullPage: true });
  fs.writeFileSync(path.join(OUT_DIR, '01_top_page.html'), await page.content(), 'utf8');

  const title = await page.title();
  console.log('    タイトル:', title);

  const inputs = await page.$$eval('input', els => els.map(e => ({
    type: e.type, name: e.name, id: e.id, placeholder: e.placeholder,
  })));
  console.log('    入力フィールド:', JSON.stringify(inputs));

  const links = await page.$$eval('a', els => els.map(a => ({
    href: a.href, text: a.textContent.trim(),
  })).filter(l => l.href));
  console.log('    リンク数:', links.length);

  const buttons = await page.$$eval('button', els => els.map(b => ({
    text: b.textContent.trim(), id: b.id, className: b.className,
  })));
  console.log('    ボタン:', JSON.stringify(buttons));

  let loginAttempted = false;
  const idSel = ['input[name="id"]', '#id', 'input[placeholder*="ID"]', 'input[placeholder*="id"]', 'input[type="text"]'];
  const passSel = ['input[name="password"]', '#password', 'input[type="password"]'];

  let idInput = null, passInput = null;
  for (const s of idSel) { idInput = await page.$(s); if (idInput) break; }
  for (const s of passSel) { passInput = await page.$(s); if (passInput) break; }

  if (idInput && passInput) {
    await idInput.fill(id);
    await passInput.fill(pass);
    const submitBtn = await page.$('button[type="submit"], input[type="submit"], button');
    if (submitBtn) {
      await Promise.all([
        page.waitForLoadState('networkidle').catch(() => {}),
        submitBtn.click(),
      ]);
      loginAttempted = true;
      await sleep(1500);
    }
  }

  console.log('    ログイン試行:', loginAttempted);

  await page.screenshot({ path: path.join(SHOT_DIR, '02_after_login.png'), fullPage: true });
  fs.writeFileSync(path.join(OUT_DIR, '02_after_login.html'), await page.content(), 'utf8');

  const linksAfter = await page.$$eval('a', els => els.map(a => ({
    href: a.href, text: a.textContent.trim(),
  })).filter(l => l.href));
  const buttonsAfter = await page.$$eval('button', els => els.map(b => ({
    text: b.textContent.trim(), onclick: b.getAttribute('onclick'), id: b.id, className: b.className,
  })));

  const frames = page.frames().map(f => ({ name: f.name(), url: f.url() }));

  const storage = await page.evaluate(() => ({
    localStorage: Object.fromEntries(Object.entries(localStorage)),
    sessionStorage: Object.fromEntries(Object.entries(sessionStorage)),
  }));

  const summary = {
    targetUrl: TARGET_URL,
    checkedAt: new Date().toISOString(),
    title,
    loginFormFound: !!(idInput && passInput),
    loginAttempted,
    linksAfterLogin: linksAfter,
    buttonsAfterLogin: buttonsAfter,
    frames,
    storageAfterLogin: storage,
    requestCountDuringLoad: requestLog.length,
  };

  fs.writeFileSync(path.join(OUT_DIR, '00_top_page_probe_summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  fs.writeFileSync(path.join(LOG_DIR, '01_top_page_probe_requests.json'), JSON.stringify(requestLog, null, 2), 'utf8');

  console.log('\n=== サマリー ===');
  console.log(JSON.stringify(summary, null, 2));

  await browser.close();
}

main().catch(e => {
  console.error('致命的エラー:', e);
  process.exit(1);
});
