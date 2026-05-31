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
    ['logout-btn', 'quiz-logout', 'dnd-logout', 'ct-logout', 'ct-result-logout'].forEach(id => {
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
    document.getElementById('card-quiz').addEventListener('click', goQuiz);
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

    // Back buttons
    document.getElementById('quiz-back').addEventListener('click', goPortal);
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

  async function goQuiz() {
    showView('quiz');
    try {
      const data = await loadData();
      Quiz.init(data.selection_questions);
    } catch(e) {
      console.error('Quiz init error:', e);
    }
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
      CheckTest.start(data.questions, data.id, data.dd_questions);
    } catch(e) {
      console.error('CheckTest init error:', e);
    }
  }

  return { init, getData, showView, goPortal };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
