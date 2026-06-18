/* app.js — Main SPA controller: view routing, data loading, modal */
'use strict';

const App = (() => {
  let questionsData    = null;
  let checkTestData03  = null;
  let checkTestData04  = null;
  let checkTestData05  = null;
  let midtermTestData  = null;
  let checkTestData06  = null;
  let checkTestData07  = null;
  let checkTestData08  = null;
  let checkTestData09  = null;
  let checkTestData10  = null;
  let checkTestData11  = null;
  let checkTestData12  = null;
  let checkTestData13  = null;
  let checkTestData14  = null;
  let checkTestData15  = null;
  let checkTestData16  = null;
  let checkTestData17  = null;
  let checkTestData18  = null;
  let checkTestData19  = null;
  let checkTestData20  = null;
  let checkTestData21  = null;
  let checkTestData22  = null;
  let checkTestData23  = null;
  let checkTestData24  = null;
  let checkTestData25  = null;
  let checkTestData26  = null;

  // ---- Random utilities ----
  function shuffleArr(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickRandomItems(arr, count) {
    return shuffleArr(arr).slice(0, count);
  }

  // ---- View management ----
  function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const el = document.getElementById('view-' + id);
    if (el) el.classList.remove('hidden');
  }

  // ---- Data loading ----
  async function loadData() {
    if (questionsData) return questionsData;
    const res = await fetch('data/questions.json');
    if (!res.ok) throw new Error('Failed to load questions.json');
    questionsData = await res.json();
    return questionsData;
  }

  async function loadCheckTestData(n) {
    const map = {
      3:         { cache: () => checkTestData03, set: d => { checkTestData03 = d; }, file: 'check-test-03.json' },
      4:         { cache: () => checkTestData04, set: d => { checkTestData04 = d; }, file: 'check-test-04.json' },
      5:         { cache: () => checkTestData05, set: d => { checkTestData05 = d; }, file: 'check-test-05.json' },
      midterm:   { cache: () => midtermTestData, set: d => { midtermTestData = d; }, file: 'midterm-test.json' },
      6:         { cache: () => checkTestData06, set: d => { checkTestData06 = d; }, file: 'check-test-06.json' },
      7:         { cache: () => checkTestData07, set: d => { checkTestData07 = d; }, file: 'check-test-07.json' },
      8:         { cache: () => checkTestData08, set: d => { checkTestData08 = d; }, file: 'check-test-08.json' },
      9:         { cache: () => checkTestData09, set: d => { checkTestData09 = d; }, file: 'check-test-09.json' },
      10:        { cache: () => checkTestData10, set: d => { checkTestData10 = d; }, file: 'check-test-10.json' },
      11:        { cache: () => checkTestData11, set: d => { checkTestData11 = d; }, file: 'check-test-11.json' },
      12:        { cache: () => checkTestData12, set: d => { checkTestData12 = d; }, file: 'check-test-12.json' },
      13:        { cache: () => checkTestData13, set: d => { checkTestData13 = d; }, file: 'check-test-13.json' },
      14:        { cache: () => checkTestData14, set: d => { checkTestData14 = d; }, file: 'check-test-14.json' },
      15:        { cache: () => checkTestData15, set: d => { checkTestData15 = d; }, file: 'check-test-15.json' },
      16:        { cache: () => checkTestData16, set: d => { checkTestData16 = d; }, file: 'check-test-16.json' },
      17:        { cache: () => checkTestData17, set: d => { checkTestData17 = d; }, file: 'check-test-17.json' },
      18:        { cache: () => checkTestData18, set: d => { checkTestData18 = d; }, file: 'check-test-18.json' },
      19:        { cache: () => checkTestData19, set: d => { checkTestData19 = d; }, file: 'check-test-19.json' },
      20:        { cache: () => checkTestData20, set: d => { checkTestData20 = d; }, file: 'check-test-20.json' },
      21:        { cache: () => checkTestData21, set: d => { checkTestData21 = d; }, file: 'check-test-21.json' },
      22:        { cache: () => checkTestData22, set: d => { checkTestData22 = d; }, file: 'check-test-22.json' },
      23:        { cache: () => checkTestData23, set: d => { checkTestData23 = d; }, file: 'check-test-23.json' },
      24:        { cache: () => checkTestData24, set: d => { checkTestData24 = d; }, file: 'check-test-24.json' },
      25:        { cache: () => checkTestData25, set: d => { checkTestData25 = d; }, file: 'check-test-25.json' },
      26:        { cache: () => checkTestData26, set: d => { checkTestData26 = d; }, file: 'check-test-26.json' },
    };
    const entry = map[n] || map[3];
    if (entry.cache()) return entry.cache();
    const res = await fetch('data/' + entry.file);
    if (!res.ok) throw new Error('Failed to load ' + entry.file);
    const data = await res.json();
    entry.set(data);
    return data;
  }

  function getData() { return questionsData; }

  // ---- Image modal ----
  function initModal() {
    const modal    = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    const closeBtn = document.getElementById('modal-close');
    const backdrop = document.getElementById('modal-backdrop');

    function openModal(src, alt) {
      modalImg.src = src;
      modalImg.alt = alt || '拡大画像';
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      modal.classList.add('hidden');
      modalImg.src = '';
      document.body.style.overflow = '';
    }

    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });

    window.openImageModal = openModal;
  }

  // ---- Portal stats ----
  function updatePortalStats() {
    const hist = Quiz.getHistory();
    const answeredCount = Object.keys(hist.answers || {}).length;
    const el = document.getElementById('quiz-stat-answered');
    if (el) el.textContent = answeredCount;

    const masteredEl = document.getElementById('quiz-stat-mastered');
    if (masteredEl) masteredEl.textContent = Quiz.getMasteredTotal();

    const dndHist = DndQuiz.getHistory();
    const dndAnswered = Object.keys(dndHist.answers || {}).length;
    const dndEl = document.getElementById('dnd-stat-answered');
    if (dndEl) dndEl.textContent = dndAnswered;

    const ct03El = document.getElementById('ct03-stat-history');
    if (ct03El) ct03El.textContent = `実施回数: ${CheckTest.getHistory('check-test-03').length}回`;
    const ct04El = document.getElementById('ct04-stat-history');
    if (ct04El) ct04El.textContent = `実施回数: ${CheckTest.getHistory('check-test-04').length}回`;
    const ct05El = document.getElementById('ct05-stat-history');
    if (ct05El) ct05El.textContent = `実施回数: ${CheckTest.getHistory('check-test-05').length}回`;
    const midtermEl = document.getElementById('midterm-stat-history');
    if (midtermEl) midtermEl.textContent = `実施回数: ${CheckTest.getHistory('midterm-test').length}回`;
    const ct06El = document.getElementById('ct06-stat-history');
    if (ct06El) ct06El.textContent = `実施回数: ${CheckTest.getHistory('check-test-06').length}回`;
    const ct07El = document.getElementById('ct07-stat-history');
    if (ct07El) ct07El.textContent = `実施回数: ${CheckTest.getHistory('check-test-07').length}回`;
    const ct08El = document.getElementById('ct08-stat-history');
    if (ct08El) ct08El.textContent = `実施回数: ${CheckTest.getHistory('check-test-08').length}回`;
    const ct09El = document.getElementById('ct09-stat-history');
    if (ct09El) ct09El.textContent = `実施回数: ${CheckTest.getHistory('check-test-09').length}回`;
    const ct10El = document.getElementById('ct10-stat-history');
    if (ct10El) ct10El.textContent = `実施回数: ${CheckTest.getHistory('check-test-10').length}回`;
    const ct11El = document.getElementById('ct11-stat-history');
    if (ct11El) ct11El.textContent = `実施回数: ${CheckTest.getHistory('check-test-11').length}回`;
    const ct12El = document.getElementById('ct12-stat-history');
    if (ct12El) ct12El.textContent = `実施回数: ${CheckTest.getHistory('check-test-12').length}回`;
    const ct13El = document.getElementById('ct13-stat-history');
    if (ct13El) ct13El.textContent = `実施回数: ${CheckTest.getHistory('check-test-13').length}回`;
    const ct14El = document.getElementById('ct14-stat-history');
    if (ct14El) ct14El.textContent = `実施回数: ${CheckTest.getHistory('check-test-14').length}回`;
    const ct15El = document.getElementById('ct15-stat-history');
    if (ct15El) ct15El.textContent = `実施回数: ${CheckTest.getHistory('check-test-15').length}回`;
    const ct16El = document.getElementById('ct16-stat-history');
    if (ct16El) ct16El.textContent = `実施回数: ${CheckTest.getHistory('check-test-16').length}回`;
    const ct17El = document.getElementById('ct17-stat-history');
    if (ct17El) ct17El.textContent = `実施回数: ${CheckTest.getHistory('check-test-17').length}回`;
    const ct18El = document.getElementById('ct18-stat-history');
    if (ct18El) ct18El.textContent = `実施回数: ${CheckTest.getHistory('check-test-18').length}回`;
    const ct19El = document.getElementById('ct19-stat-history');
    if (ct19El) ct19El.textContent = `実施回数: ${CheckTest.getHistory('check-test-19').length}回`;
    const ct20El = document.getElementById('ct20-stat-history');
    if (ct20El) ct20El.textContent = `実施回数: ${CheckTest.getHistory('check-test-20').length}回`;
    const ct21El = document.getElementById('ct21-stat-history');
    if (ct21El) ct21El.textContent = `実施回数: ${CheckTest.getHistory('check-test-21').length}回`;
    const ct22El = document.getElementById('ct22-stat-history');
    if (ct22El) ct22El.textContent = `実施回数: ${CheckTest.getHistory('check-test-22').length}回`;
    const ct23El = document.getElementById('ct23-stat-history');
    if (ct23El) ct23El.textContent = `実施回数: ${CheckTest.getHistory('check-test-23').length}回`;
    const ct24El = document.getElementById('ct24-stat-history');
    if (ct24El) ct24El.textContent = `実施回数: ${CheckTest.getHistory('check-test-24').length}回`;
    const ct25El = document.getElementById('ct25-stat-history');
    if (ct25El) ct25El.textContent = `実施回数: ${CheckTest.getHistory('check-test-25').length}回`;
    const ct26El = document.getElementById('ct26-stat-history');
    if (ct26El) ct26El.textContent = `実施回数: ${CheckTest.getHistory('check-test-26').length}回`;
  }

  // ---- Logout handler ----
  function handleLogout() {
    Auth.logout();
    showView('login');
  }

  // ---- Bootstrap ----
  async function init() {
    initModal();

    // Wire up logout buttons
    ['logout-btn', 'quiz-logout', 'quiz-parts-logout', 'dnd-logout', 'ct-logout', 'ct-result-logout'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', handleLogout);
    });

    // Login form
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const id    = document.getElementById('login-id').value.trim();
      const pw    = document.getElementById('login-pw').value;
      const errEl = document.getElementById('login-error');
      if (Auth.login(id, pw)) {
        errEl.classList.add('hidden');
        goPortal();
      } else {
        errEl.classList.remove('hidden');
      }
    });

    // Portal card navigation
    document.getElementById('card-quiz').addEventListener('click', goQuizParts);
    document.getElementById('card-dnd').addEventListener('click', goDnd);
    document.getElementById('card-check-test-03').addEventListener('click', () => goCheckTest(3));
    document.getElementById('card-check-test-04').addEventListener('click', () => goCheckTest(4));
    document.getElementById('card-check-test-05').addEventListener('click', () => goCheckTest(5));
    document.getElementById('card-midterm-test').addEventListener('click', () => goCheckTest('midterm'));
    document.getElementById('card-check-test-06').addEventListener('click', () => goCheckTest(6));
    document.getElementById('card-check-test-07').addEventListener('click', () => goCheckTest(7));
    document.getElementById('card-check-test-08').addEventListener('click', () => goCheckTest(8));
    document.getElementById('card-check-test-09').addEventListener('click', () => goCheckTest(9));
    document.getElementById('card-check-test-10').addEventListener('click', () => goCheckTest(10));
    document.getElementById('card-check-test-11').addEventListener('click', () => goCheckTest(11));
    document.getElementById('card-check-test-12').addEventListener('click', () => goCheckTest(12));
    document.getElementById('card-check-test-13').addEventListener('click', () => goCheckTest(13));
    document.getElementById('card-check-test-14').addEventListener('click', () => goCheckTest(14));
    document.getElementById('card-check-test-15').addEventListener('click', () => goCheckTest(15));
    document.getElementById('card-check-test-16').addEventListener('click', () => goCheckTest(16));
    document.getElementById('card-check-test-17').addEventListener('click', () => goCheckTest(17));
    document.getElementById('card-check-test-18').addEventListener('click', () => goCheckTest(18));
    document.getElementById('card-check-test-19').addEventListener('click', () => goCheckTest(19));
    document.getElementById('card-check-test-20').addEventListener('click', () => goCheckTest(20));
    document.getElementById('card-check-test-21').addEventListener('click', () => goCheckTest(21));
    document.getElementById('card-check-test-22').addEventListener('click', () => goCheckTest(22));
    document.getElementById('card-check-test-23').addEventListener('click', () => goCheckTest(23));
    document.getElementById('card-check-test-24').addEventListener('click', () => goCheckTest(24));
    document.getElementById('card-check-test-25').addEventListener('click', () => goCheckTest(25));
    document.getElementById('card-check-test-26').addEventListener('click', () => goCheckTest(26));

    // Back buttons
    document.getElementById('quiz-parts-back').addEventListener('click', goPortal);
    document.getElementById('quiz-back').addEventListener('click', goQuizParts);

    // Quiz parts — overall study buttons
    document.getElementById('qp-start-all').addEventListener('click', () =>
      goQuizWithOptions({ shuffle: true }));
    document.getElementById('qp-start-unmastered-all').addEventListener('click', () =>
      goQuizWithOptions({ unmastered: true, shuffle: true }));
    document.getElementById('dnd-back').addEventListener('click', () => {
      if (DndQuiz.isTestMode()) {
        if (!confirm('テスト中です。ポータルへ戻るとD&D結果が失われます。よろしいですか？')) return;
        DndQuiz.endTestMode();
        return;
      }
      goPortal();
    });
    document.getElementById('ct-back').addEventListener('click', goPortal);

    // Check test finish → D&D phase (test 5) or result
    document.getElementById('ct-finish-btn').addEventListener('click', () => {
      CheckTest.handleFinish();
    });

    // D&D test mode finish → combined result
    const dndTestFinishBtn = document.getElementById('dnd-test-finish-btn');
    if (dndTestFinishBtn) {
      dndTestFinishBtn.addEventListener('click', () => {
        DndQuiz.endTestMode();
      });
    }

    // Result view wiring
    CheckTest.initResultButtons();

    // ResultSubmitter pending check
    if (typeof ResultSubmitter !== 'undefined') {
      ResultSubmitter.initPendingCheck();
    }

    if (Auth.isLoggedIn()) {
      await goPortal();
    } else {
      showView('login');
    }
  }

  async function goPortal() {
    showView('portal');
    try {
      await loadData();
      updatePortalStats();
    } catch(e) {
      console.error('Data load error:', e);
    }
  }

  // 4択全体 (オプションなし) — 後方互換で残す
  async function goQuiz() {
    showView('quiz');
    try {
      const data = await loadData();
      Quiz.init(data.selection_questions);
    } catch(e) {
      console.error('Quiz init error:', e);
    }
  }

  // パート選択ビューを表示
  async function goQuizParts() {
    showView('quiz-parts');
    try {
      const data = await loadData();
      renderQuizPartCards(data.selection_questions);
    } catch(e) {
      console.error('QuizParts error:', e);
    }
  }

  // オプション付きで4択クイズを開始（パート別学習用）
  // options: { part?, unmastered?, wrong?, unanswered?, shuffle? }
  async function goQuizWithOptions(options) {
    showView('quiz');
    try {
      const data = await loadData();
      Quiz.init(data.selection_questions, options);
    } catch(e) {
      console.error('Quiz init error:', e);
    }
  }

  // パート別学習カードを描画
  function renderQuizPartCards(questions) {
    // ---- 全体統計 ----
    const totalQ         = questions.length;
    const masteredTotal  = Quiz.getMasteredTotal();
    const unmasteredAll  = totalQ - masteredTotal;
    const overallEl      = document.getElementById('quiz-overall-stats');
    if (overallEl) {
      overallEl.innerHTML =
        `<span class="qp-overall-stat">全問：<strong>${totalQ}問</strong></span>` +
        `<span class="qp-overall-stat qp-stat-mastered">&#11088; 習得済み：<strong>${masteredTotal}問</strong></span>` +
        `<span class="qp-overall-stat qp-stat-unmastered">未習得：<strong>${unmasteredAll}問</strong></span>`;
    }

    // ---- パートごとのカード ----
    const partMap = {};
    questions.forEach(q => {
      const key = q.part || '';
      if (!partMap[key]) partMap[key] = [];
      partMap[key].push(q);
    });

    const container = document.getElementById('quiz-part-cards');
    if (!container) return;
    container.innerHTML = '';

    Object.keys(partMap).sort().forEach(part => {
      const partQs      = partMap[part];
      const total       = partQs.length;
      const mastered    = Quiz.getMasteredCount(partQs);
      const unmastered  = total - mastered;
      const withImage   = partQs.filter(q => q.hasImage).length;
      const pct         = total > 0 ? Math.round(mastered / total * 100) : 0;
      const partDisplay = part.replace('part_', 'Part ');

      const card = document.createElement('div');
      card.className = 'qpc-card';
      card.innerHTML =
        `<div class="qpc-header">` +
          `<h3 class="qpc-title">${escQ(partDisplay)}</h3>` +
          `<span class="qpc-badge-total">${total}問</span>` +
        `</div>` +
        `<div class="qpc-stats-row">` +
          `<span class="qpc-stat qpc-stat-mastered">&#11088; 習得済み：<strong>${mastered}</strong></span>` +
          `<span class="qpc-stat qpc-stat-unmastered">未習得：<strong>${unmastered}</strong></span>` +
          (withImage > 0 ? `<span class="qpc-stat qpc-stat-image">&#128247; 画像付き：<strong>${withImage}</strong></span>` : '') +
        `</div>` +
        `<div class="qpc-progress-wrap"><div class="qpc-progress-bar" style="width:${pct}%"></div></div>` +
        `<p class="qpc-pct-label">習得率 ${pct}%</p>` +
        `<div class="qpc-buttons">` +
          `<button class="btn btn-sm btn-primary qpc-btn-all">全${total}問を学習</button>` +
          `<button class="btn btn-sm btn-outline qpc-btn-unmastered">未習得のみ（${unmastered}問）</button>` +
          `<button class="btn btn-xs btn-ghost qpc-btn-reset">習得リセット</button>` +
        `</div>`;

      card.querySelector('.qpc-btn-all').onclick = () =>
        goQuizWithOptions({ part, shuffle: true });

      card.querySelector('.qpc-btn-unmastered').onclick = () => {
        if (unmastered === 0) {
          alert(`${partDisplay} の未習得問題は0件です。\n習得リセット後、再度お試しください。`);
          return;
        }
        goQuizWithOptions({ part, unmastered: true, shuffle: true });
      };

      card.querySelector('.qpc-btn-reset').onclick = () => {
        if (confirm(`${partDisplay} の習得済みフラグをすべて解除します。よろしいですか？`)) {
          Quiz.resetMastered(partQs);
          renderQuizPartCards(questions);  // カードを再描画
        }
      };

      container.appendChild(card);
    });
  }

  function escQ(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async function goDnd() {
    showView('dnd');
    try {
      const data = await loadData();
      DndQuiz.init(data.dd_questions);
    } catch(e) {
      console.error('DnD init error:', e);
    }
  }

  async function goCheckTest(n) {
    try {
      const data = await loadCheckTestData(n);
      CheckTest.start(data.questions, data.id, data.dd_questions, data.simulation_questions);
    } catch(e) {
      console.error('CheckTest init error:', e);
    }
  }

  return { init, getData, showView, goPortal };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
