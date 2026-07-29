/**
 * フェーズ3 サンプル取得（各形式3問ずつ）
 * ユーザー承認済みの方式: 内部ログインUIは経由せず、
 * サイト自身のフロントエンドが呼んでいるGASサーバー関数を google.script.run 経由で直接呼び出す。
 * 03_discover_functions.js で発見した関数名のみを使用し、推測はしない。
 * 書き込み系関数 (saveLog / logUserAction / debugListFiles) は絶対に呼ばない。
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

async function getUiFrame(page) {
  // 数回リトライ（フレーム生成が遅れることがある）
  for (let i = 0; i < 10; i++) {
    const f = page.frames().find(fr => fr.url().includes('googleusercontent.com/blank'));
    if (f) return f;
    await sleep(500);
  }
  return page.frames()[page.frames().length - 1];
}

async function callInFrame(frame, fnName, ...args) {
  return await frame.evaluate(([fn, argsArray]) => {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script || !google.script.run) {
        reject(new Error('google.script.run not available'));
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(e => reject(new Error(e && e.message ? e.message : String(e))))
        [fn](...argsArray);
    });
  }, [fnName, args]).catch(e => ({ __error: e.message || String(e) }));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const out = {};

  // --- 選択問題 ---
  console.log('\n=== choice ===');
  {
    const page = await context.newPage();
    await page.goto(APPS.choice, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await sleep(1500);
    const frame = await getUiFrame(page);
    console.log('  frame:', frame.url().slice(0, 80));

    const dashboard = await callInFrame(frame, 'getDashboardData', '_probe_');
    const sheets = (dashboard && dashboard.sheets) || [];
    console.log('  sheets:', JSON.stringify(sheets));

    const samples = {};
    for (const sheet of sheets) {
      if (sheet.id === 'all_parts' || /全/.test(sheet.name || '')) continue;
      await sleep(800);
      const qs = await callInFrame(frame, 'getQuestions', sheet.name);
      if (Array.isArray(qs)) {
        samples[sheet.name] = qs.slice(0, 3);
        console.log(`    [${sheet.name}] ${qs.length}問 (サンプル3問取得)`);
      } else {
        samples[sheet.name] = qs;
        console.log(`    [${sheet.name}] エラー/非配列:`, JSON.stringify(qs).slice(0, 200));
      }
    }
    out.choice = { dashboard, samplesPerSheet: samples };
    await page.close();
  }

  await sleep(1500);

  // --- D&D ---
  console.log('\n=== dnd ===');
  {
    const page = await context.newPage();
    await page.goto(APPS.dnd, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await sleep(1500);
    const frame = await getUiFrame(page);
    console.log('  frame:', frame.url().slice(0, 80));

    const quizData = await callInFrame(frame, 'getQuizData');
    if (Array.isArray(quizData)) {
      console.log(`  全${quizData.length}問。サンプル3問:`);
      console.log(JSON.stringify(quizData.slice(0, 3), null, 2).slice(0, 1500));
      out.dnd = { total: quizData.length, sample: quizData.slice(0, 3), all: quizData };
    } else {
      console.log('  エラー:', JSON.stringify(quizData).slice(0, 300));
      out.dnd = { error: quizData };
    }
    await page.close();
  }

  await sleep(1500);

  // --- シミュレーション ---
  console.log('\n=== simulation ===');
  {
    const page = await context.newPage();
    await page.goto(APPS.simulation, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await sleep(1500);
    const frame = await getUiFrame(page);
    console.log('  frame:', frame.url().slice(0, 80));

    const scenarios = await callInFrame(frame, 'getScenarioData');
    if (Array.isArray(scenarios)) {
      console.log(`  全${scenarios.length}シナリオ。サンプル3件:`);
      console.log(JSON.stringify(scenarios.slice(0, 3), null, 2).slice(0, 2000));
      out.simulation = { total: scenarios.length, sample: scenarios.slice(0, 3), all: scenarios };
    } else {
      console.log('  エラー:', JSON.stringify(scenarios).slice(0, 300));
      out.simulation = { error: scenarios };
    }
    await page.close();
  }

  fs.writeFileSync(path.join(OUT_DIR, '05_samples.json'), JSON.stringify(out, null, 2), 'utf8');
  await browser.close();
  console.log('\n完了:', path.join(OUT_DIR, '05_samples.json'));
}

main().catch(e => { console.error('致命的エラー:', e); process.exit(1); });
