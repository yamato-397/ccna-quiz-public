/* checkTest.js — 確認テスト3回目ロジック */
'use strict';

const CheckTest = (() => {
  const HISTORY_KEY  = 'ccna_check_test_03_history';
  const NAME_KEY     = 'ccna_check_test_name';
  const PASSING_RATE = 95;

  // ---- History ----
  function getHistory()       { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; } }
  function saveHistory(h)     { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }
  function appendHistory(rec) { const h = getHistory(); h.push(rec); saveHistory(h); }

  // ---- Student name ----
  function getStudentName() { return sessionStorage.getItem(NAME_KEY) || ''; }
  function saveStudentName(n) { sessionStorage.setItem(NAME_KEY, n); }

  // ---- Shuffle (Fisher-Yates) ----
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- Per-session choice order cache ----
  const choiceCache = new Map();
  function getShuffledChoices(q) {
    if (!choiceCache.has(q.id)) choiceCache.set(q.id, shuffle(q.choices));
    return choiceCache.get(q.id);
  }

  // ---- State ----
  let allQuestions   = [];
  let displayList    = [];
  let currentIndex   = 0;
  let answered       = false;
  let results        = {};   // id → { selected, correct, isCorrect }
  let shuffleEnabled = false;
  let startTime      = null;
  let studentName    = '';

  // ---- DOM helpers ----
  const $ = id => document.getElementById(id);

  // ---- Init ----
  function init(questions, name) {
    allQuestions = questions || [];
    studentName  = name || getStudentName();
    choiceCache.clear();
    results     = {};
    currentIndex = 0;
    answered    = false;
    startTime   = Date.now();

    displayList = [...allQuestions];

    const shuffleCheck = $('ct-filter-shuffle');
    if (shuffleCheck) {
      shuffleCheck.checked = false;
      shuffleEnabled = false;
      shuffleCheck.onchange = () => {
        shuffleEnabled = shuffleCheck.checked;
        displayList = shuffleEnabled ? shuffle([...allQuestions]) : [...allQuestions];
        currentIndex = 0;
        renderQuestion();
      };
    }

    $('ct-submit-btn').onclick  = submitAnswer;
    $('ct-prev-btn').onclick    = () => { if (currentIndex > 0) { currentIndex--; renderQuestion(); } };
    $('ct-next-btn').onclick    = () => { if (currentIndex < displayList.length - 1) { currentIndex++; renderQuestion(); } };

    renderQuestion();
  }

  // ---- Render question ----
  function renderQuestion() {
    answered = false;

    if (displayList.length === 0) return;
    const q      = displayList[currentIndex];
    const isMulti = q.correctCount > 1;

    $('ct-q-number').textContent = `Q${currentIndex + 1}`;
    $('ct-q-part').textContent   = q.part ? q.part.replace('part_', 'Part ') : '';

    const multiBadge = $('ct-multi-badge');
    isMulti ? multiBadge.classList.remove('hidden') : multiBadge.classList.add('hidden');

    // answered badge
    const rec = results[q.id];
    const statusBadge = $('ct-status-badge');
    if (!rec) {
      statusBadge.textContent = '未回答';
      statusBadge.className   = 'q-status status-unanswered';
    } else if (rec.isCorrect) {
      statusBadge.textContent = '✓ 正解';
      statusBadge.className   = 'q-status status-correct';
    } else {
      statusBadge.textContent = '✗ 不正解';
      statusBadge.className   = 'q-status status-wrong';
    }

    $('ct-q-text').textContent = q.question;

    // Image
    const imgWrap = $('ct-image-wrap');
    const imgEl   = $('ct-image');
    if (q.hasImage && q.localImagePath) {
      imgEl.src = q.localImagePath;
      imgEl.alt = q.question.substring(0, 40);
      imgWrap.classList.remove('hidden');
      imgEl.onerror = () => imgWrap.classList.add('hidden');
      imgEl.onclick = () => window.openImageModal && window.openImageModal(imgEl.src, imgEl.alt);
    } else {
      imgWrap.classList.add('hidden');
    }

    // Choices
    const displayChoices = getShuffledChoices(q);
    const container = $('ct-choices-container');
    container.innerHTML = '';
    displayChoices.forEach((choice) => {
      const item = document.createElement('label');
      item.className      = 'choice-item';
      item.dataset.value  = choice;

      const input = document.createElement('input');
      input.type      = isMulti ? 'checkbox' : 'radio';
      input.name      = 'ct-choice';
      input.value     = choice;
      input.className = isMulti ? 'choice-checkbox' : 'choice-radio';

      const text = document.createElement('span');
      text.className   = 'choice-text';
      text.textContent = choice;

      const indicator = document.createElement('span');
      indicator.className = 'choice-indicator';

      item.appendChild(input);
      item.appendChild(text);
      item.appendChild(indicator);
      container.appendChild(item);
    });

    // Restore already-answered state
    if (rec) restoreAnsweredState(q, rec);

    const submitBtn = $('ct-submit-btn');
    if (rec) {
      submitBtn.disabled    = true;
      submitBtn.textContent = '回答済み';
    } else {
      submitBtn.disabled    = false;
      submitBtn.textContent = '回答する';
    }

    $('ct-feedback-area').classList.add('hidden');
    if (rec) showFeedback(q, rec.selected, rec.isCorrect);

    updateProgress();
    scrollToTop();
  }

  function restoreAnsweredState(q, rec) {
    const items = document.querySelectorAll('#ct-choices-container .choice-item');
    items.forEach(item => {
      item.classList.add('answered');
      const val       = item.dataset.value;
      const indicator = item.querySelector('.choice-indicator');
      const input     = item.querySelector('input');
      if (rec.selected.includes(val)) input.checked = true;
      if (q.correctAnswers.includes(val)) {
        item.classList.add('correct-answer');
        indicator.textContent = '✓';
      } else if (rec.selected.includes(val)) {
        item.classList.add('wrong-answer');
        indicator.textContent = '✗';
      }
    });
  }

  // ---- Submit answer ----
  function submitAnswer() {
    if (answered || displayList.length === 0) return;
    const q      = displayList[currentIndex];
    const inputs = document.querySelectorAll('#ct-choices-container input');
    const selected = [...inputs].filter(i => i.checked).map(i => i.value);

    if (selected.length === 0) {
      const btn = $('ct-submit-btn');
      btn.textContent = '選択肢を選んでください';
      setTimeout(() => { btn.textContent = '回答する'; }, 1500);
      return;
    }

    answered = true;

    const isCorrect = JSON.stringify([...selected].sort()) === JSON.stringify([...q.correctAnswers].sort());
    results[q.id] = { selected, isCorrect };

    // Mark choices
    const items = document.querySelectorAll('#ct-choices-container .choice-item');
    items.forEach(item => {
      item.classList.add('answered');
      const val       = item.dataset.value;
      const indicator = item.querySelector('.choice-indicator');
      if (q.correctAnswers.includes(val)) {
        item.classList.add('correct-answer');
        indicator.textContent = '✓';
      } else if (selected.includes(val)) {
        item.classList.add('wrong-answer');
        indicator.textContent = '✗';
      }
    });

    showFeedback(q, selected, isCorrect);

    const btn = $('ct-submit-btn');
    btn.disabled    = true;
    btn.textContent = '回答済み';

    const statusBadge = $('ct-status-badge');
    statusBadge.textContent = isCorrect ? '✓ 正解' : '✗ 不正解';
    statusBadge.className   = 'q-status ' + (isCorrect ? 'status-correct' : 'status-wrong');

    updateProgress();

    // Check if all answered
    const answeredCount = Object.keys(results).length;
    if (answeredCount === allQuestions.length) {
      setTimeout(showFinishButton, 400);
    }
  }

  function showFeedback(q, selected, isCorrect) {
    const area = $('ct-feedback-area');
    area.classList.remove('hidden');

    const res = $('ct-feedback-result');
    res.textContent = isCorrect ? '✓ 正解！' : '✗ 不正解';
    res.className   = 'feedback-result ' + (isCorrect ? 'correct' : 'incorrect');

    $('ct-feedback-correct').innerHTML =
      '<strong>正解：</strong> ' +
      q.correctAnswers.map(a => `<span>${escHtml(a)}</span>`).join('、');

    $('ct-feedback-explanation').innerHTML =
      '<span class="explanation-label">解説</span>' +
      (q.explanation ? escHtml(q.explanation) : '解説は未登録です。');
  }

  function showFinishButton() {
    const nav = $('ct-finish-wrap');
    if (nav) nav.classList.remove('hidden');
  }

  // ---- Progress ----
  function updateProgress() {
    const total   = displayList.length;
    const pos     = total > 0 ? currentIndex + 1 : 0;
    const answered = Object.keys(results).length;

    $('ct-position').textContent = `${pos} / ${total}`;
    $('ct-answered-count').textContent = `回答済み: ${answered} / ${total}`;

    const pct = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
    $('ct-progress-bar').style.width = pct + '%';
  }

  function scrollToTop() {
    const card = $('ct-card');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- Result screen ----
  function showResult() {
    const correctCount   = Object.values(results).filter(r => r.isCorrect).length;
    const incorrectCount = allQuestions.length - correctCount;
    const scoreRate      = Math.round((correctCount / allQuestions.length) * 100);
    const passed         = scoreRate >= PASSING_RATE;
    const durationSec    = Math.round((Date.now() - startTime) / 1000);

    const wrongIds = allQuestions
      .filter(q => results[q.id] && !results[q.id].isCorrect)
      .map(q => q.id);

    // Save history
    const rec = {
      submittedAt:    new Date().toISOString(),
      testId:         'check-test-03',
      testTitle:      '確認テスト3回目',
      studentName,
      totalQuestions: allQuestions.length,
      correctCount,
      incorrectCount,
      scoreRate,
      passed,
      wrongQuestionIds: wrongIds,
      durationSeconds:  durationSec,
      userAgent:        navigator.userAgent,
    };
    appendHistory(rec);

    // Submit to GAS
    if (typeof ResultSubmitter !== 'undefined') {
      ResultSubmitter.submit(rec);
    }

    // Render result view
    $('ct-result-score').textContent     = `${correctCount} / ${allQuestions.length}`;
    $('ct-result-rate').textContent      = `${scoreRate}%`;
    $('ct-result-incorrect').textContent = `誤答: ${incorrectCount} 問`;
    $('ct-result-duration').textContent  = formatDuration(durationSec);

    const verdictEl = $('ct-result-verdict');
    if (passed) {
      verdictEl.textContent  = '合格　本番受験OKライン達成！';
      verdictEl.className    = 'ct-verdict ct-verdict-pass';
    } else {
      verdictEl.textContent  = '復習推奨。間違えた問題を再演習してください';
      verdictEl.className    = 'ct-verdict ct-verdict-fail';
    }

    // Wrong questions list
    const wrongList = $('ct-wrong-list');
    wrongList.innerHTML = '';
    const wrongQuestions = allQuestions.filter(q => results[q.id] && !results[q.id].isCorrect);
    if (wrongQuestions.length === 0) {
      wrongList.innerHTML = '<p class="ct-no-wrong">全問正解です！</p>';
      $('ct-retry-btn').classList.add('hidden');
    } else {
      wrongQuestions.forEach((q, i) => {
        const li = document.createElement('div');
        li.className = 'ct-wrong-item';
        li.innerHTML = `<span class="ct-wrong-num">${i + 1}</span><span class="ct-wrong-text">${escHtml(q.question.substring(0, 80))}…</span>`;
        wrongList.appendChild(li);
      });
      $('ct-retry-btn').classList.remove('hidden');
      $('ct-retry-btn').onclick = () => startRetry(wrongQuestions);
    }

    // Show result view, hide quiz view
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    $('view-check-test-result').classList.remove('hidden');
  }

  function startRetry(questions) {
    allQuestions  = questions;
    displayList   = [...questions];
    results       = {};
    currentIndex  = 0;
    answered      = false;
    startTime     = Date.now();
    choiceCache.clear();
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    $('view-check-test').classList.remove('hidden');
    $('ct-finish-wrap').classList.add('hidden');
    renderQuestion();
  }

  function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}分${String(s).padStart(2, '0')}秒`;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---- Name entry modal ----
  function showNameModal(onConfirm) {
    const existing = getStudentName();
    if (existing) { onConfirm(existing); return; }

    $('ct-name-modal').classList.remove('hidden');
    const input  = $('ct-name-input');
    const errEl  = $('ct-name-error');
    const btn    = $('ct-name-confirm');

    input.value = '';
    errEl.classList.add('hidden');
    input.focus();

    function confirm() {
      const name = input.value.trim();
      if (!name) { errEl.classList.remove('hidden'); return; }
      saveStudentName(name);
      $('ct-name-modal').classList.add('hidden');
      onConfirm(name);
    }

    btn.onclick = confirm;
    input.onkeydown = e => { if (e.key === 'Enter') confirm(); };
  }

  // ---- Public API ----
  function start(questions) {
    showNameModal(name => {
      document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
      document.getElementById('view-check-test').classList.remove('hidden');
      document.getElementById('ct-finish-wrap').classList.add('hidden');
      init(questions, name);
    });
  }

  // Wire result-view buttons (called from app.js after DOM ready)
  function initResultButtons() {
    const backBtn = $('ct-result-back');
    if (backBtn) backBtn.onclick = () => App.goPortal();

    const resubmitBtn = $('ct-result-resubmit');
    if (resubmitBtn && typeof ResultSubmitter !== 'undefined') {
      resubmitBtn.onclick = () => ResultSubmitter.retryPending();
    }
  }

  return { start, showResult, initResultButtons, getHistory, getStudentName };
})();
