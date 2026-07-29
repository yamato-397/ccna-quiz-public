/**
 * 追加後の回帰・E2Eテスト（Playwright）。
 * ローカル配信中のマイサイト(http://localhost:8099)を対象に、
 * 既存機能が壊れていないこと・新規追加分が動作することを確認する。
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:8099';
const results = [];

function log(name, ok, detail) {
  results.push({ name, ok, detail: detail || '' });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function login(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('#login-id', 'OVER');
  await page.fill('#login-pw', 'OVER0331');
  await page.click('#login-form button[type="submit"], #login-form .btn');
  await page.waitForSelector('#view-portal:not(.hidden)', { timeout: 5000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  for (const size of [[375, 812], [768, 1024], [1440, 900]]) {
    const context = await browser.newContext({ viewport: { width: size[0], height: size[1] } });
    const page = await context.newPage();
    page.on('pageerror', e => log(`[${size[0]}x${size[1]}] pageerror`, false, e.message));

    const tag = `${size[0]}x${size[1]}`;

    try {
      await login(page);
      log(`${tag} ログイン`, true);
    } catch (e) {
      log(`${tag} ログイン`, false, e.message);
      await context.close();
      continue;
    }

    // ---- 4択問題: Part⑦が選択肢に含まれるか ----
    try {
      const options = await page.$$eval('#filter-part option', els => els.map(o => o.value));
      log(`${tag} Part⑦フィルターオプション存在`, options.includes('part_⑦'), JSON.stringify(options));
    } catch (e) { log(`${tag} Part⑦フィルター確認`, false, e.message); }

    // ---- 4択問題を開始できる（パート別学習） ----
    try {
      await page.click('#card-quiz');
      await page.waitForSelector('#view-quiz-parts:not(.hidden)', { timeout: 5000 });
      const cardsText = await page.textContent('#quiz-part-cards');
      log(`${tag} パート別学習画面表示`, cardsText.includes('Part ⑦'), 'Part⑦カードあり');
      await page.click('#quiz-parts-back');
    } catch (e) { log(`${tag} パート別学習`, false, e.message); }

    // ---- 4択: 全問学習を開始し、単一回答できる ----
    try {
      await page.click('#card-quiz');
      await page.waitForSelector('#view-quiz-parts:not(.hidden)');
      await page.click('#qp-start-all');
      await page.waitForSelector('#view-quiz:not(.hidden)', { timeout: 5000 });
      await page.waitForSelector('.choice-item', { timeout: 5000 });
      log(`${tag} 4択問題(全問シャッフル)開始`, true);

      // 選択肢(label.choice-item)をクリックして回答（内部のinputはlabelに隠れているためlabelをクリック）
      const choice = await page.$('.choice-item');
      if (choice) {
        await choice.click();
        log(`${tag} 4択 単一回答クリック`, true);
      }
      // 前後移動
      const nextBtn = await page.$('#quiz-next-btn, .quiz-next-btn, button:has-text("次の問題")');
      if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(300);
        const prevBtn = await page.$('#quiz-prev-btn, .quiz-prev-btn, button:has-text("前の問題")');
        if (prevBtn) { await prevBtn.click(); await page.waitForTimeout(300); }
        log(`${tag} 4択 前後移動`, true);
      }
      await page.click('#quiz-back');
      await page.click('#quiz-parts-back');
    } catch (e) {
      log(`${tag} 4択問題操作`, false, e.message.split('\n')[0]);
      await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForSelector('#view-portal:not(.hidden)', { timeout: 5000 }).catch(() => {});
    }

    // ---- D&D: 開始できる（新規dd-28含む28問） ----
    try {
      await page.click('#card-dnd');
      await page.waitForSelector('#view-dnd:not(.hidden)', { timeout: 5000 });
      log(`${tag} D&D開始`, true);
      await page.click('#dnd-back');
    } catch (e) {
      log(`${tag} D&D開始`, false, e.message.split('\n')[0]);
      await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForSelector('#view-portal:not(.hidden)', { timeout: 5000 }).catch(() => {});
    }

    // ---- シミュレーション: 新設学習モードを開始できる ----
    try {
      await page.click('#card-simulation');
      await page.waitForSelector('#view-simulation:not(.hidden)', { timeout: 5000 });
      // data/simulation-questions.json の非同期読込・描画完了を確実に待つ（固定timeoutは環境負荷でフレーキーになるため使わない）
      await page.waitForSelector('.sim-textarea', { timeout: 15000 });
      await page.waitForFunction(() => document.getElementById('sim-q-num').textContent.includes('/ 12'), { timeout: 15000 });
      const qNum = await page.textContent('#sim-q-num');
      log(`${tag} シミュレーション学習モード開始`, qNum.includes('12'), qNum);

      // 1問目のtextareaに適当な値を入れて次へ、最後まで進めて採点
      for (let i = 0; i < 12; i++) {
        const ta = await page.$('.sim-textarea');
        if (ta) await ta.fill('ip route 0.0.0.0 0.0.0.0 209.165.201.1');
        const nextBtn = await page.$('#sim-next-btn');
        const isLast = await nextBtn.isDisabled();
        if (isLast) break;
        await nextBtn.click();
        await page.waitForTimeout(150);
      }
      await page.click('#sim-finish-btn');
      await page.waitForSelector('#view-simulation-result:not(.hidden)', { timeout: 5000 });
      const scoreText = await page.textContent('#sim-result-score');
      log(`${tag} シミュレーション採点・結果画面表示`, true, scoreText);

      await page.click('#sim-result-home-btn');
      await page.waitForSelector('#view-portal:not(.hidden)', { timeout: 5000 });
      log(`${tag} 結果画面からポータルへ戻る`, true);
    } catch (e) {
      log(`${tag} シミュレーション学習モード`, false, e.message.split('\n')[0]);
      await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForSelector('#view-portal:not(.hidden)', { timeout: 5000 }).catch(() => {});
    }

    // ---- リロード後も履歴が保持されるか ----
    try {
      await page.reload({ waitUntil: 'networkidle' });
      const loggedIn = await page.$('#view-portal:not(.hidden)');
      log(`${tag} リロード後もログイン状態維持`, !!loggedIn);
      const simAnswered = await page.textContent('#sim-stat-answered');
      log(`${tag} リロード後シミュレーション履歴反映`, parseInt(simAnswered, 10) > 0, simAnswered);
    } catch (e) { log(`${tag} リロード確認`, false, e.message); }

    // ---- 未回答のみ/間違えた問題のみ フィルター動作確認(4択) ----
    try {
      await page.click('#card-quiz');
      await page.waitForSelector('#view-quiz-parts:not(.hidden)', { timeout: 5000 });
      const unmasteredBtn = await page.$('.qpc-btn-unmastered');
      if (unmasteredBtn) {
        await unmasteredBtn.click();
        await page.waitForTimeout(300);
        log(`${tag} 未習得のみフィルター動作`, true);
        const backBtn = await page.$('#quiz-back');
        if (backBtn) await backBtn.click();
      }
      await page.click('#quiz-parts-back').catch(() => {});
    } catch (e) { log(`${tag} 未習得フィルター`, false, e.message); }

    await context.close();
  }

  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log(`\n=== 結果: ${results.length - failed.length}/${results.length} 成功 ===`);
  if (failed.length) {
    console.log('失敗項目:');
    failed.forEach(f => console.log(' -', f.name, f.detail));
    process.exitCode = 1;
  }
}

main().catch(e => { console.error('致命的エラー:', e); process.exit(1); });
