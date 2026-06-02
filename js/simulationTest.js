/* simulationTest.js — シミュレーション問題（textarea方式）for check-test-11 */
'use strict';

const SimulationTest = (() => {
  let questions   = [];
  let currentIdx  = 0;
  let onComplete  = null;
  let userInputs  = {};   // key: "qIdx_dIdx" → textarea value

  const $ = id => document.getElementById(id);

  // ---- IOS プロンプト除去 ----
  // R1>, R1#, R1(config)#, R1(config-if)#, SW-1(config-if-range)# 等を除去
  function stripPrompt(line) {
    return line
      .replace(/^[\w-]+(?:\([^)]*\))*[>#]\s*/, '')
      .trim();
  }

  // ---- コマンド正規化 ----
  // 両方向（省略形↔canonical）を同じ形（省略形）に統一する
  // 正解データも入力も同じ関数で正規化するため完全一致が成立する
  function normalize(raw) {
    if (!raw) return '';

    let c = raw.trim();
    // プロンプトを除去（ユーザーが R1> en と入力した場合に対応）
    c = stripPrompt(c);
    // 全角スペース → 半角、小文字化、連続スペース → 1スペース
    c = c.replace(/　/g, ' ').toLowerCase().replace(/\s+/g, ' ').trim();

    if (!c) return '';

    // === canonical → 省略形 の統一 ===
    // ※ 正解データは省略形で格納済みなので、ユーザーが canonical を入力しても一致させる
    if (c === 'enable')                               c = 'en';
    else if (c === 'configure terminal')              c = 'conf t';
    else if (c === 'copy running-config startup-config') c = 'copy run start';
    else if (c === 'write memory')                    c = 'copy run start';
    else if (c === 'no shutdown')                     c = 'no shut';
    // interface range → int range
    else if (c.startsWith('interface range '))        c = 'int range ' + c.slice(16);
    // interface X → int X  (※ "int " で始まる場合は変換不要)
    else if (c.startsWith('interface '))              c = 'int ' + c.slice(10);

    return c;
  }

  // ---- 現在の textarea 値を保存 ----
  function saveCurrentInputs() {
    questions.forEach((q, qi) => {
      q.devices.forEach((_, di) => {
        const key = `${qi}_${di}`;
        const el  = document.querySelector(`[data-input-key="${key}"]`);
        if (el) userInputs[key] = el.value;
      });
    });
  }

  // ---- 採点 ----
  function grade() {
    // 採点直前に現在表示中のtextarea値を保存
    saveCurrentInputs();

    let totalReq = 0, totalCorrect = 0;

    console.log('[sim] grade() called. userInputs keys:', Object.keys(userInputs));
    console.log('[sim] userInputs:', JSON.stringify(userInputs).slice(0, 500));

    const details = questions.map((q, qi) => {
      const devDetails = q.devices.map((dev, di) => {
        const key = `${qi}_${di}`;
        const raw = userInputs[key] || '';

        // ユーザー入力：行単位に分割 → 正規化 → 空行除去
        const entered = raw.split('\n')
                           .map(l => normalize(l))
                           .filter(l => l.length > 0);
        const enteredSet = new Set(entered);

        // 正解コマンド：正規化 → ユニーク化
        const allReq    = dev.requiredCommands.map(normalize);
        const uniqueReq = [...new Set(allReq)].filter(r => r.length > 0);

        // デバッグログ
        console.log(`[sim] Q${qi + 1}/${dev.name} key="${key}"`);
        console.log(`[sim]   raw input (first 200chars):`, raw.slice(0, 200));
        console.log(`[sim]   entered (normalized):`, entered);
        console.log(`[sim]   uniqueReq:`, uniqueReq);

        const hits = uniqueReq.map(req => ({
          req,
          hit: enteredSet.has(req)
        }));

        const correct = hits.filter(h => h.hit).length;
        totalReq     += uniqueReq.length;
        totalCorrect += correct;

        console.log(`[sim]   score: ${correct}/${uniqueReq.length}`);
        hits.filter(h => !h.hit).forEach(h => console.log(`[sim]   MISS: "${h.req}"`));

        return {
          deviceName: dev.name,
          hits,
          correct,
          total:   uniqueReq.length,
          entered
        };
      });

      return { questionId: q.id, title: q.title, devDetails };
    });

    console.log(`[sim] TOTAL: ${totalCorrect}/${totalReq}`);
    return { details, totalReq, totalCorrect };
  }

  // ---- 問題描画 ----
  function renderQuestion(idx) {
    saveCurrentInputs();
    currentIdx = idx;
    const q    = questions[idx];

    $('sim-q-num').textContent   = `問題 ${idx + 1} / ${questions.length}`;
    $('sim-q-title').textContent = q.title;
    $('sim-q-desc').innerHTML    = escHtml(q.description).replace(/\n/g, '<br>');

    const list = $('sim-device-list');
    list.innerHTML = '';

    q.devices.forEach((dev, di) => {
      const key = `${idx}_${di}`;

      const section = document.createElement('div');
      section.className = 'sim-device-section';

      const label = document.createElement('label');
      label.className   = 'sim-device-label';
      label.textContent = `【${dev.name}】に投入するコマンド`;

      const desc = document.createElement('div');
      desc.className   = 'sim-device-desc';
      desc.textContent = dev.description || '';

      const hint = document.createElement('div');
      hint.className = 'sim-device-hint';
      hint.textContent = '※ コマンドのみを1行1コマンドで入力。プロンプト（R1> や R1#）は不要ですが、含めていても自動除去します。';

      const ta = document.createElement('textarea');
      ta.className      = 'sim-textarea';
      ta.setAttribute('data-input-key', key);
      ta.rows           = 14;
      ta.spellcheck     = false;
      ta.autocomplete   = 'off';
      ta.autocorrect    = 'off';
      ta.autocapitalize = 'none';
      ta.placeholder    = buildPlaceholder(dev);
      ta.value          = userInputs[key] || '';

      section.appendChild(label);
      if (dev.description) section.appendChild(desc);
      section.appendChild(hint);
      section.appendChild(ta);
      list.appendChild(section);
    });

    $('sim-prev-btn').disabled = idx === 0;
    $('sim-next-btn').disabled = idx === questions.length - 1;

    const finishWrap = $('sim-finish-wrap');
    if (finishWrap) {
      if (idx === questions.length - 1) finishWrap.classList.remove('hidden');
      else                              finishWrap.classList.add('hidden');
    }

    const card = $('sim-q-card');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- プレースホルダ生成（プロンプトなし例） ----
  function buildPlaceholder(dev) {
    const n = dev.name;
    return [
      `例（コマンドのみ・プロンプト不要）:`,
      `en`,
      `conf t`,
      `int e0/0`,
      `ip address x.x.x.x x.x.x.x`,
      `no shut`,
      `end`,
      `copy run start`,
      ``,
      `※ enable / configure terminal など正式名でも可`,
    ].join('\n');
  }

  // ---- 開始 ----
  function start(simQuestions, completeFn) {
    questions  = simQuestions;
    userInputs = {};
    onComplete = completeFn;

    console.log('[sim] start() — questions:', simQuestions.length);
    simQuestions.forEach((q, qi) => {
      q.devices.forEach((dev, di) => {
        console.log(`[sim]   Q${qi + 1} [${dev.name}] requiredCommands:`, dev.requiredCommands);
      });
    });

    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    $('view-simulation').classList.remove('hidden');

    renderQuestion(0);

    $('sim-prev-btn').onclick = () => {
      if (currentIdx > 0) renderQuestion(currentIdx - 1);
    };
    $('sim-next-btn').onclick = () => {
      if (currentIdx < questions.length - 1) renderQuestion(currentIdx + 1);
    };
    $('sim-finish-btn').onclick = () => {
      console.log('[sim] finish btn clicked');
      const result = grade();
      onComplete(result);
    };
    $('sim-back-btn').onclick = () => {
      if (confirm('シミュレーション問題を中断します。採点結果が不完全になります。よろしいですか？')) {
        const result = grade();
        onComplete(result);
      }
    };

    const logoutBtn = $('sim-logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        if (typeof Auth !== 'undefined') Auth.logout();
        if (typeof App !== 'undefined') App.showView('login');
      };
    }
  }

  // ---- ユーティリティ ----
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return { start, grade };
})();
