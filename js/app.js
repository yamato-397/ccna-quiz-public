/* app.js — Main SPA controller: view routing, data loading, modal */
'use strict';

const App = (() => {
  let questionsData = null;

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

  function getData() { return questionsData; }

  // ---- Image modal ----
  function initModal() {
    const modal   = document.getElementById('image-modal');
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

    // Expose globally so quiz/dnd can call it
    window.openImageModal = openModal;
  }

  // ---- Portal stats ----
  function updatePortalStats(data) {
    const hist = Quiz.getHistory();
    const answeredCount = Object.keys(hist.answers || {}).length;
    const el = document.getElementById('quiz-stat-answered');
    if (el) el.textContent = answeredCount;

    const dndHist = DndQuiz.getHistory();
    const dndAnswered = Object.keys(dndHist.answers || {}).length;
    const dndEl = document.getElementById('dnd-stat-answered');
    if (dndEl) dndEl.textContent = dndAnswered;
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
    ['logout-btn', 'quiz-logout', 'dnd-logout'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', handleLogout);
    });

    // Login form
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const id = document.getElementById('login-id').value.trim();
      const pw = document.getElementById('login-pw').value;
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

    // Quiz back button
    document.getElementById('quiz-back').addEventListener('click', goPortal);
    document.getElementById('dnd-back').addEventListener('click', goPortal);

    // Initial route
    if (Auth.isLoggedIn()) {
      await goPortal();
    } else {
      showView('login');
    }
  }

  async function goPortal() {
    showView('portal');
    try {
      const data = await loadData();
      updatePortalStats(data);
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

  return { init, getData, showView, goPortal };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
