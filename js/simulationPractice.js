/* simulationPractice.js — シミュレーション問題 単体学習モード
   既存のSimulationTest(view-simulation / 採点エンジン)をそのまま再利用し、
   確認テストとは独立して全シミュレーション問題を学習できるようにする。 */
'use strict';

const SimulationPractice = (() => {
  const HISTORY_KEY = 'ccna_simulation_history';
  let questions = [];

  const $ = id => document.getElementById(id);

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || { answers: {} };
    } catch (_) {
      return { answers: {} };
    }
  }

  function saveHistory(hist) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  }

  function getAnsweredCount() {
    return Object.keys(getHistory().answers || {}).length;
  }

  function resetHistory() {
    localStorage.removeItem(HISTORY_KEY);
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function shuffleArr(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- 開始 ----
  function start(allQuestions, options) {
    questions = (options && options.shuffle) ? shuffleArr(allQuestions) : allQuestions;
    SimulationTest.start(questions, onComplete);
  }

  // ---- 完了時: 履歴保存 + 結果画面表示 ----
  function onComplete(result) {
    const hist = getHistory();
    hist.answers = hist.answers || {};

    result.details.forEach(qDetail => {
      const total   = qDetail.devDetails.reduce((s, d) => s + d.total, 0);
      const correct = qDetail.devDetails.reduce((s, d) => s + d.correct, 0);
      hist.answers[qDetail.questionId] = {
        correct,
        total,
        allCorrect: total > 0 && correct === total,
        ts: new Date().toISOString(),
      };
    });
    saveHistory(hist);

    renderResult(result);
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    $('view-simulation-result').classList.remove('hidden');
    wireResultButtons();
  }

  function wireResultButtons() {
    const retryBtn = $('sim-result-retry-btn');
    if (retryBtn) retryBtn.onclick = () => start(questions, { shuffle: false });

    const homeBtn = $('sim-result-home-btn');
    if (homeBtn) homeBtn.onclick = () => {
      if (typeof App !== 'undefined') App.goPortal();
    };

    const logoutBtn = $('sim-result-logout');
    if (logoutBtn) logoutBtn.onclick = () => {
      if (typeof Auth !== 'undefined') Auth.logout();
      if (typeof App !== 'undefined') App.showView('login');
    };
  }

  // ---- 結果画面描画 ----
  function renderResult(result) {
    const scoreEl = $('sim-result-score');
    if (scoreEl) {
      const pct = result.totalReq > 0 ? Math.round(result.totalCorrect / result.totalReq * 100) : 0;
      scoreEl.textContent = `${result.totalCorrect} / ${result.totalReq} コマンド正解 (${pct}%)`;
    }

    const listEl = $('sim-result-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    result.details.forEach(qDetail => {
      const qEl = document.createElement('div');
      qEl.className = 'sim-review-question';

      const titleEl = document.createElement('div');
      titleEl.className = 'sim-review-q-title';
      titleEl.textContent = qDetail.title;
      qEl.appendChild(titleEl);

      qDetail.devDetails.forEach(dev => {
        const devEl = document.createElement('div');
        devEl.className = 'sim-review-device';

        const devHeader = document.createElement('div');
        devHeader.className = 'sim-review-device-header';
        devHeader.textContent = `【${dev.deviceName}】 ${dev.correct} / ${dev.total} コマンド正解`;
        devEl.appendChild(devHeader);

        const table = document.createElement('div');
        table.className = 'sim-review-table';

        dev.hits.forEach(h => {
          const row = document.createElement('div');
          row.className = 'sim-review-row ' + (h.hit ? 'sim-hit' : 'sim-miss');
          row.innerHTML =
            `<span class="sim-review-icon">${h.hit ? '✓' : '✗'}</span>` +
            `<code class="sim-review-cmd">${escHtml(h.req)}</code>`;
          table.appendChild(row);
        });

        devEl.appendChild(table);
        qEl.appendChild(devEl);
      });

      listEl.appendChild(qEl);
    });
  }

  return { start, getHistory, getAnsweredCount, resetHistory };
})();
