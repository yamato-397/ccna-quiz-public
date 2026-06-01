/* simulationTest.js — シミュレーション問題（textarea方式）for check-test-11 */
'use strict';

const SimulationTest = (() => {
  let questions   = [];
  let currentIdx  = 0;
  let onComplete  = null;
  let userInputs  = {};   // key: "qIdx_dIdx" → textarea value

  const $ = id => document.getElementById(id);

  // ---- コマンド正規化 ----
  function normalize(raw) {
    let c = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (c === 'en')                  c = 'enable';
    else if (c === 'conf t')         c = 'configure terminal';
    else if (c === 'copy run start') c = 'copy running-config startup-config';
    else if (c === 'no shut')        c = 'no shutdown';
    else if (c.startsWith('int range '))
      c = 'interface range ' + c.slice(10);
    else if (c.startsWith('int ') && !c.startsWith('interface'))
      c = 'interface ' + c.slice(4);
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
    saveCurrentInputs();
    let totalReq = 0, totalCorrect = 0;

    const details = questions.map((q, qi) => {
      const devDetails = q.devices.map((dev, di) => {
        const key        = `${qi}_${di}`;
        const raw        = userInputs[key] || '';
        const entered    = raw.split('\n')
                             .map(l => normalize(l))
                             .filter(l => l.length > 0);

        // 必須コマンドを正規化してユニーク化
        const allReq     = dev.requiredCommands.map(normalize);
        const uniqueReq  = [...new Set(allReq)];

        const hits = uniqueReq.map(req => ({
          req,
          hit: entered.some(e => e === req)
        }));

        const correct = hits.filter(h => h.hit).length;
        totalReq     += uniqueReq.length;
        totalCorrect += correct;

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

      const ta = document.createElement('textarea');
      ta.className            = 'sim-textarea';
      ta.setAttribute('data-input-key', key);
      ta.rows                 = 14;
      ta.spellcheck           = false;
      ta.autocomplete         = 'off';
      ta.autocorrect          = 'off';
      ta.autocapitalize       = 'none';
      ta.placeholder          = `例:\n${dev.name}> en\n${dev.name}# conf t\n${dev.name}(config)# ...\n\n※ 1行1コマンドで入力してください`;
      ta.value                = userInputs[key] || '';

      section.appendChild(label);
      if (dev.description) section.appendChild(desc);
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

  // ---- 開始 ----
  function start(simQuestions, completeFn) {
    questions  = simQuestions;
    userInputs = {};
    onComplete = completeFn;

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
