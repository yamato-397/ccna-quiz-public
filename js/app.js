/* app.js — Main SPA controller: view routing, data loading, modal */
'use strict';

const App = (() => {
  let questionsData   = null;
  let checkTestData   = null;

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

  async function loadCheckTestData() {
    if (checkTestData) return checkTestData;
    const res = await fetch('data/check-test-03.json');
    if (!res.ok) throw new Error('Failed to load check-test-03.json');
    checkTestData = await res.json();
    return checkTestData;
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

    const ctHistory = CheckTest.getHistory();
    const ctEl = document.getElementById('ct-stat-history');
    if (ctEl) ctEl.textContent = `実施回数: ${ctHistory.length}回`;
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
    document.getElementById('card-check-test').addEventListener('click', goCheckTest);

    // Back buttons
    document.getElementById('quiz-back').addEventListener('click', goPortal);
    document.getElementById('dnd-back').addEventListener('click', goPortal);
    document.getElementById('ct-back').addEventListener('click', goPortal);

    // Check test finish → result
    document.getElementById('ct-finish-btn').addEventListener('click', () => {
      CheckTest.showResult();
    });

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

  async function goCheckTest() {
    try {
      const data = await loadCheckTestData();
      CheckTest.start(data.questions);
    } catch(e) {
      console.error('CheckTest init error:', e);
    }
  }

  return { init, getData, showView, goPortal };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
