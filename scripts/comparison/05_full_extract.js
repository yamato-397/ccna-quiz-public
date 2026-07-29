/**
 * フェーズ4: 参考サイト全件棚卸し（読み取り専用）
 * ユーザー承認済み方式: 内部ログインUIは経由せず、サイト自身のフロントエンドが
 * 呼んでいる読み取り専用GAS関数のみを google.script.run 経由で呼び出す。
 * 書き込み系関数 (saveLog / logUserAction / debugListFiles) は絶対に呼ばない。
 * 過度な連続アクセスを避けるため、各呼び出し間に待機を入れる。
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', '..', 'audit', 'reference-site');
const ASSET_DIR = path.join(__dirname, '..', '..', 'audit', 'assets');
const LOG_DIR = path.join(__dirname, '..', '..', 'audit', 'logs');
for (const d of [OUT_DIR, ASSET_DIR, LOG_DIR, path.join(ASSET_DIR, 'choice-images'), path.join(ASSET_DIR, 'dnd-images'), path.join(ASSET_DIR, 'simulation-images')]) {
  fs.mkdirSync(d, { recursive: true });
}

const APPS = {
  choice: 'https://script.google.com/macros/s/AKfycbzIhnMUOAR5i-bYCyAhNVHT2rEOb2xXFHCReQfNx1hUFBuzfrpQ7IaWmKeH7SF2Lvo8/exec',
  dnd: 'https://script.google.com/macros/s/AKfycbxVX70Z3UhvnzA0EFq9JsAjlwiierFAvVjyGbBW2ZpkBHPGudiNq8BXTAzE2xNJmtM/exec',
  simulation: 'https://script.google.com/macros/s/AKfycbwPy2Rwe2u_VwSBdYmCa9Kg7f0MDBkmEt9CRQTpdNBGBjxniPh0_2fBXZ0Lpy2aMC-BXQ/exec',
};

const errors = [];
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getUiFrame(page) {
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

function saveDataUrlAsFile(dataUrl, destPath) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(dataUrl || '');
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  fs.writeFileSync(destPath, buf);
  return destPath;
}

async function extractChoice(context) {
  console.log('\n=== choice: 全件取得 ===');
  const page = await context.newPage();
  await page.goto(APPS.choice, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await sleep(1500);
  const frame = await getUiFrame(page);

  const dashboard = await callInFrame(frame, 'getDashboardData', '_inventory_');
  const sheets = (dashboard && dashboard.sheets) || [];
  const partSheets = sheets.filter(s => s.id !== 'all_parts' && !/全/.test(s.name || ''));

  const allQuestions = [];
  for (const sheet of partSheets) {
    console.log(`  取得中: ${sheet.name} (${sheet.count}問)`);
    const qs = await callInFrame(frame, 'getQuestions', sheet.name);
    if (!Array.isArray(qs)) {
      errors.push({ type: 'choice', sheet: sheet.name, error: qs });
      console.log(`    エラー: ${JSON.stringify(qs).slice(0, 200)}`);
      continue;
    }
    console.log(`    取得数: ${qs.length}`);
    allQuestions.push(...qs);
    await sleep(700);
  }

  // 画像ダウンロード（imageNameがあるものだけ、重複はスキップ）
  const imageDir = path.join(ASSET_DIR, 'choice-images');
  const downloaded = {};
  let imgOk = 0, imgFail = 0;
  for (const q of allQuestions) {
    if (!q.imageName) continue;
    if (downloaded[q.imageName]) continue;
    const base64 = await callInFrame(frame, 'getImageBase64', q.imageName);
    if (typeof base64 === 'string' && base64.startsWith('data:image')) {
      const ext = (base64.match(/^data:image\/([a-zA-Z0-9.+-]+);/) || [, 'png'])[1].replace('jpeg', 'jpg');
      const safeName = q.imageName.replace(/[\\/]/g, '_');
      const dest = path.join(imageDir, safeName.includes('.') ? safeName : `${safeName}.${ext}`);
      saveDataUrlAsFile(base64, dest);
      downloaded[q.imageName] = dest;
      imgOk++;
    } else {
      downloaded[q.imageName] = null;
      imgFail++;
      errors.push({ type: 'choice-image', imageName: q.imageName, questionId: q.id, error: base64 });
    }
    await sleep(300);
  }
  console.log(`  画像取得: 成功${imgOk} / 失敗${imgFail}`);

  fs.writeFileSync(path.join(OUT_DIR, 'choice.raw.json'), JSON.stringify({
    fetchedAt: new Date().toISOString(),
    sourceUrl: APPS.choice,
    dashboard,
    questions: allQuestions,
    imageFileMap: downloaded,
  }, null, 2), 'utf8');

  console.log(`  合計: ${allQuestions.length}問`);
  await page.close();
  return { total: allQuestions.length, imgOk, imgFail };
}

async function extractDnd(context) {
  console.log('\n=== dnd: 全件取得 ===');
  const page = await context.newPage();
  await page.goto(APPS.dnd, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await sleep(1500);
  const frame = await getUiFrame(page);

  const quizData = await callInFrame(frame, 'getQuizData');
  if (!Array.isArray(quizData)) {
    errors.push({ type: 'dnd', error: quizData });
    console.log('  エラー:', JSON.stringify(quizData).slice(0, 300));
    await page.close();
    return { total: 0, imgOk: 0, imgFail: 0 };
  }
  console.log(`  取得数: ${quizData.length}`);

  const imageDir = path.join(ASSET_DIR, 'dnd-images');
  let imgOk = 0, imgFail = 0;
  const downloaded = {};
  for (const q of quizData) {
    if (!q.imagePath || !q.imagePath.trim()) continue;
    const imgData = await callInFrame(frame, 'getQuizImage', q.imagePath);
    if (typeof imgData === 'string' && imgData.startsWith('data:image')) {
      const ext = (imgData.match(/^data:image\/([a-zA-Z0-9.+-]+);/) || [, 'png'])[1].replace('jpeg', 'jpg');
      const safeName = `dd-${q.id}.${ext}`;
      const dest = path.join(imageDir, safeName);
      saveDataUrlAsFile(imgData, dest);
      downloaded[q.imagePath] = dest;
      imgOk++;
    } else {
      downloaded[q.imagePath] = null;
      imgFail++;
      errors.push({ type: 'dnd-image', imagePath: q.imagePath, questionId: q.id, error: imgData });
    }
    await sleep(300);
  }
  console.log(`  画像取得: 成功${imgOk} / 失敗${imgFail}`);

  fs.writeFileSync(path.join(OUT_DIR, 'dnd.raw.json'), JSON.stringify({
    fetchedAt: new Date().toISOString(),
    sourceUrl: APPS.dnd,
    questions: quizData,
    imageFileMap: downloaded,
  }, null, 2), 'utf8');

  await page.close();
  return { total: quizData.length, imgOk, imgFail };
}

async function extractSimulation(context) {
  console.log('\n=== simulation: 全件取得 ===');
  const page = await context.newPage();
  await page.goto(APPS.simulation, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await sleep(1500);
  const frame = await getUiFrame(page);

  const scenarios = await callInFrame(frame, 'getScenarioData');
  if (!Array.isArray(scenarios)) {
    errors.push({ type: 'simulation', error: scenarios });
    console.log('  エラー:', JSON.stringify(scenarios).slice(0, 300));
    await page.close();
    return { total: 0, imgOk: 0, imgFail: 0 };
  }
  console.log(`  取得数: ${scenarios.length}`);

  const imageDir = path.join(ASSET_DIR, 'simulation-images');
  let imgOk = 0, imgFail = 0;
  const scenariosNoImage = [];
  for (const sc of scenarios) {
    const entry = { ...sc };
    if (sc.image && sc.image.startsWith('data:image')) {
      const ext = (sc.image.match(/^data:image\/([a-zA-Z0-9.+-]+);/) || [, 'png'])[1].replace('jpeg', 'jpg');
      const dest = path.join(imageDir, `${sc.id}.${ext}`);
      saveDataUrlAsFile(sc.image, dest);
      entry.localImagePath = path.relative(path.join(__dirname, '..', '..'), dest);
      imgOk++;
    } else if (sc.imageName) {
      imgFail++;
      errors.push({ type: 'simulation-image', scenarioId: sc.id, imageName: sc.imageName });
    }
    delete entry.image; // 巨大なbase64はraw.jsonから分離（別途画像ファイルとして保存済み）
    scenariosNoImage.push(entry);
  }
  console.log(`  画像: 埋め込み成功${imgOk} / 欠落${imgFail}`);

  fs.writeFileSync(path.join(OUT_DIR, 'simulation.raw.json'), JSON.stringify({
    fetchedAt: new Date().toISOString(),
    sourceUrl: APPS.simulation,
    scenarios: scenariosNoImage,
    note: 'トライアル導入中の機能である旨がサイトのお知らせに明記されている(07/27時点)。採点(validations)は取得できているが、要手動確認。',
  }, null, 2), 'utf8');

  await page.close();
  return { total: scenarios.length, imgOk, imgFail };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const choiceResult = await extractChoice(context);
  await sleep(1500);
  const dndResult = await extractDnd(context);
  await sleep(1500);
  const simResult = await extractSimulation(context);

  await browser.close();

  const summary = { choiceResult, dndResult, simResult, errors };
  fs.writeFileSync(path.join(LOG_DIR, 'full_extract_summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'scraping-errors.json'), JSON.stringify(errors, null, 2), 'utf8');

  console.log('\n=== 完了サマリー ===');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(e => { console.error('致命的エラー:', e); process.exit(1); });
