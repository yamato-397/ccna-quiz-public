/* quiz.js — Selection (4-choice) quiz logic */
'use strict';

const Quiz = (() => {
  const HISTORY_KEY  = 'ccna_quiz_history';
  const MASTERED_KEY = 'ccna_mastered_questions';

  // ---- History helpers ----
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || { answers: {} };
    } catch { return { answers: {} }; }
  }
  function saveHistory(hist) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  }
  function recordAnswer(id, selected, correct) {
    const hist = getHistory();
    hist.answers[id] = { selected, correct, ts: Date.now() };
    saveHistory(hist);
  }
  function resetHistory() {
    localStorage.removeItem(HISTORY_KEY);
  }

  // ---- Mastered helpers ----
  function getMastered() {
    try { return JSON.parse(localStorage.getItem(MASTERED_KEY)) || {}; }
    catch { return {}; }
  }
  function saveMastered(m) {
    localStorage.setItem(MASTERED_KEY, JSON.stringify(m));
  }
  function isQuestionMastered(id) {
    return !!getMastered()[id];
  }
  function setQuestionMastered(id, mastered) {
    const m = getMastered();
    if (mastered) m[id] = true;
    else delete m[id];
    saveMastered(m);
  }
  function getMasteredCount(questions) {
    const m = getMastered();
    return (questions || []).filter(q => m[q.id]).length;
  }
  function getMasteredTotal() {
    try { return Object.keys(JSON.parse(localStorage.getItem(MASTERED_KEY) || '{}')).length; }
    catch { return 0; }
  }
  function resetMastered(scope) {
    if (!scope || scope === 'all') {
      localStorage.removeItem(MASTERED_KEY);
    } else {
      const m = getMastered();
      scope.forEach(q => delete m[q.id]);
      saveMastered(m);
    }
  }

  // ---- Shuffle utility (Fisher-Yates) ----
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- Per-session choice order cache (stable within one page load) ----
  const choiceOrderCache = new Map();
  function getShuffledChoices(q) {
    if (!choiceOrderCache.has(q.id)) {
      choiceOrderCache.set(q.id, shuffle(q.choices));
    }
    return choiceOrderCache.get(q.id);
  }

  // ---- State ----
  let allQuestions      = [];
  let filteredQuestions = [];
  let currentIndex      = 0;
  let answered          = false;

  const $ = id => document.getElementById(id);

  // ---- Compute filtered list ----
  function applyFilters() {
    const part           = $('filter-part').value;
    const onlyUnanswered = $('filter-unanswered').checked;
    const onlyWrong      = $('filter-wrong').checked;
    const onlyUnmastered = $('filter-unmastered') ? $('filter-unmastered').checked : false;
    const random         = $('filter-random').checked;
    const hist = getHistory();

    let list = allQuestions.filter(q => {
      if (part && q.part !== part) return false;
      const rec = hist.answers[q.id];
      if (onlyUnanswered && rec) return false;
      if (onlyWrong && (!rec || rec.correct)) return false;
      if (onlyUnmastered && isQuestionMastered(q.id)) return false;
      return true;
    });

    if (random) {
      list = list.slice().sort(() => Math.random() - 0.5);
    }
    filteredQuestions = list;
    currentIndex = 0;
  }

  // ---- Mastered UI update ----
  function updateMasteredUI() {
    if (filteredQuestions.length === 0) {
      const badge = $('q-mastered-badge');
      if (badge) badge.classList.add('hidden');
      const btn = $('mastered-toggle-btn');
      if (btn) { btn.textContent = '☆ 習得済みにする'; btn.className = 'btn btn-sm btn-mastered-off'; }
      return;
    }
    const q        = filteredQuestions[currentIndex];
    const mastered = isQuestionMastered(q.id);

    const badge = $('q-mastered-badge');
    if (badge) {
      badge.classList.toggle('hidden', !mastered);
    }

    const btn = $('mastered-toggle-btn');
    if (btn) {
      btn.textContent = mastered ? '⭐ 習得済みを解除' : '☆ 習得済みにする';
      btn.className   = mastered ? 'btn btn-sm btn-mastered-on' : 'btn btn-sm btn-mastered-off';
    }
  }

  // ---- Render one question ----
  function renderQuestion() {
    answered = false;

    if (filteredQuestions.length === 0) {
      renderEmpty();
      return;
    }

    const q    = filteredQuestions[currentIndex];
    const hist = getHistory();
    const rec  = hist.answers[q.id];
    const isMulti = q.correctCount > 1;

    // Meta
    $('q-displayId').textContent = 'Q' + q.displayId;
    $('q-part').textContent = q.part ? q.part.replace('part_', 'Part ') : '';
    const multiBadge = $('q-multi-badge');
    isMulti ? multiBadge.classList.remove('hidden') : multiBadge.classList.add('hidden');

    // Status badge (answer history)
    const statusBadge = $('q-status-badge');
    if (!rec) {
      statusBadge.textContent = '未回答';
      statusBadge.className = 'q-status status-unanswered';
    } else if (rec.correct) {
      statusBadge.textContent = '✓ 正解済み';
      statusBadge.className = 'q-status status-correct';
    } else {
      statusBadge.textContent = '✗ 不正解';
      statusBadge.className = 'q-status status-wrong';
    }

    // Question text
    $('q-text').textContent = q.question;

    // Image
    const imgWrap = $('q-image-wrap');
    const imgEl   = $('q-image');
    if (q.hasImage && q.localImagePath) {
      imgEl.src = q.localImagePath;
      imgEl.alt = q.question.substring(0, 40);
      imgWrap.classList.remove('hidden');
      imgEl.onerror = () => imgWrap.classList.add('hidden');
      imgEl.onclick = () => window.openImageModal && window.openImageModal(imgEl.src, imgEl.alt);
    } else {
      imgWrap.classList.add('hidden');
    }

    // Choices — use session-stable shuffled order
    const displayChoices = getShuffledChoices(q);
    const container = $('choices-container');
    container.innerHTML = '';
    displayChoices.forEach((choice, i) => {
      const item = document.createElement('label');
      item.className = 'choice-item';
      item.dataset.index = i;
      item.dataset.value = choice;

      const input = document.createElement('input');
      input.type = isMulti ? 'checkbox' : 'radio';
      input.name = 'quiz-choice';
      input.value = choice;
      input.className = isMulti ? 'choice-checkbox' : 'choice-radio';

      const text = document.createElement('span');
      text.className = 'choice-text';
      text.textContent = choice;

      const indicator = document.createElement('span');
      indicator.className = 'choice-indicator';

      item.appendChild(input);
      item.appendChild(text);
      item.appendChild(indicator);
      container.appendChild(item);
    });

    // Submit button
    const submitBtn = $('submit-btn');
    submitBtn.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = '回答する';

    // Hide feedback
    $('feedback-area').classList.add('hidden');

    // Mastered UI
    updateMasteredUI();

    updateProgress();
    scrollToTop();
  }

  function renderEmpty() {
    const container = $('choices-container');
    container.innerHTML = '<div class="empty-state"><p>条件に一致する問題がありません。</p><p>フィルターを変更してください。</p></div>';
    $('q-displayId').textContent = '-';
    $('q-part').textContent = '';
    $('q-text').textContent = '';
    $('q-multi-badge').classList.add('hidden');
    $('q-status-badge').textContent = '';
    $('q-image-wrap').classList.add('hidden');
    $('submit-btn').classList.add('hidden');
    $('feedback-area').classList.add('hidden');
    const badge = $('q-mastered-badge');
    if (badge) badge.classList.add('hidden');
    updateProgress();
  }

  // ---- Answer submission ----
  function submitAnswer() {
    if (answered || filteredQuestions.length === 0) return;

    const q = filteredQuestions[currentIndex];
    const inputs = document.querySelectorAll('#choices-container input');
    const selected = [...inputs].filter(i => i.checked).map(i => i.value);

    if (selected.length === 0) {
      const submitBtn = $('submit-btn');
      submitBtn.textContent = '選択肢を選んでください';
      setTimeout(() => { submitBtn.textContent = '回答する'; }, 1500);
      return;
    }

    answered = true;

    const sortedSelected = [...selected].sort();
    const sortedCorrect  = [...q.correctAnswers].sort();
    const isCorrect = JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);

    recordAnswer(q.id, selected, isCorrect);

    // Mark choices — uses item.dataset.value (text), not index
    const items = document.querySelectorAll('#choices-container .choice-item');
    items.forEach(item => {
      item.classList.add('answered');
      const val = item.dataset.value;
      const indicator = item.querySelector('.choice-indicator');
      if (q.correctAnswers.includes(val)) {
        item.classList.add('correct-answer');
        indicator.textContent = '✓';
      } else if (selected.includes(val)) {
        item.classList.add('wrong-answer');
        indicator.textContent = '✗';
      }
    });

    // Feedback
    const feedbackArea = $('feedback-area');
    feedbackArea.classList.remove('hidden');

    const feedbackResult = $('feedback-result');
    feedbackResult.textContent = isCorrect ? '✓ 正解！' : '✗ 不正解';
    feedbackResult.className = 'feedback-result ' + (isCorrect ? 'correct' : 'incorrect');

    $('feedback-correct').innerHTML = '<strong>正解：</strong> ' +
      q.correctAnswers.map(a => `<span>${escHtml(a)}</span>`).join('、');

    $('feedback-explanation').innerHTML = '<span class="explanation-label">解説</span>' +
      (q.explanation ? escHtml(q.explanation) : '解説は未登録です。');

    const submitBtn = $('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '回答済み';

    const statusBadge = $('q-status-badge');
    statusBadge.textContent = isCorrect ? '✓ 正解済み' : '✗ 不正解';
    statusBadge.className = 'q-status ' + (isCorrect ? 'status-correct' : 'status-wrong');

    updateProgress();
  }

  // ---- Progress display ----
  function updateProgress() {
    const total = filteredQuestions.length;
    const pos   = total > 0 ? currentIndex + 1 : 0;
    $('quiz-position').textContent = `${pos} / ${total > 0 ? total : allQuestions.length}`;

    const pct = total > 0 ? (pos / total) * 100 : 0;
    $('quiz-progress-bar').style.width = pct + '%';

    const hist = getHistory();
    const recs = Object.values(hist.answers);
    if (recs.length === 0) {
      $('quiz-accuracy-display').textContent = '正答率 - %';
    } else {
      const correct = recs.filter(r => r.correct).length;
      const acc = Math.round((correct / recs.length) * 100);
      $('quiz-accuracy-display').textContent = `正答率 ${acc}% (${correct}/${recs.length})`;
    }

    // Mastered progress
    const masteredEl = $('quiz-mastered-display');
    if (masteredEl) {
      const cnt = getMasteredCount(allQuestions);
      masteredEl.textContent = `⭐ 習得済み ${cnt} / ${allQuestions.length}`;
    }
  }

  // ---- Navigation ----
  function prevQuestion() {
    if (currentIndex > 0) { currentIndex--; renderQuestion(); }
  }
  function nextQuestion() {
    if (currentIndex < filteredQuestions.length - 1) { currentIndex++; renderQuestion(); }
  }

  function scrollToTop() {
    const card = $('quiz-card');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- Utility ----
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---- Init ----
  function init(questions) {
    allQuestions = questions || [];
    choiceOrderCache.clear();

    ['filter-part', 'filter-unanswered', 'filter-wrong', 'filter-unmastered', 'filter-random'].forEach(id => {
      const el = $(id);
      if (el) {
        el.removeEventListener('change', onFilterChange);
        el.addEventListener('change', onFilterChange);
      }
    });

    const submitBtn = $('submit-btn');
    submitBtn.removeEventListener('click', submitAnswer);
    submitBtn.addEventListener('click', submitAnswer);

    $('prev-btn').onclick = prevQuestion;
    $('next-btn').onclick = nextQuestion;

    // Mastered toggle button
    const masteredBtn = $('mastered-toggle-btn');
    if (masteredBtn) {
      masteredBtn.onclick = () => {
        if (filteredQuestions.length === 0) return;
        const q          = filteredQuestions[currentIndex];
        const nowMastered = !isQuestionMastered(q.id);
        setQuestionMastered(q.id, nowMastered);
        updateMasteredUI();
        updateProgress();
        // 未習得フィルタ中に習得済みにした場合 → 次の問題へ（リスト再構築）
        if (nowMastered && $('filter-unmastered') && $('filter-unmastered').checked) {
          applyFilters();
          if (currentIndex >= filteredQuestions.length) {
            currentIndex = Math.max(0, filteredQuestions.length - 1);
          }
          renderQuestion();
        }
      };
    }

    // History reset
    $('quiz-reset-history').onclick = () => {
      if (confirm('回答履歴をリセットしますか？')) {
        resetHistory();
        applyFilters();
        renderQuestion();
      }
    };

    // Mastered reset
    const masteredResetBtn = $('quiz-reset-mastered');
    if (masteredResetBtn) {
      masteredResetBtn.onclick = () => {
        const part = $('filter-part').value;
        if (part) {
          const partName = part.replace('part_', 'Part ');
          const partQs   = allQuestions.filter(q => q.part === part);
          if (confirm(`${partName} の習得済みフラグをすべて解除します。よろしいですか？`)) {
            resetMastered(partQs);
            updateMasteredUI();
            updateProgress();
            renderQuestion();
          }
        } else {
          if (confirm('全partの習得済みフラグをすべて解除します。よろしいですか？')) {
            resetMastered('all');
            updateMasteredUI();
            updateProgress();
            renderQuestion();
          }
        }
      };
    }

    applyFilters();
    renderQuestion();
  }

  function onFilterChange() {
    applyFilters();
    renderQuestion();
  }

  return { init, getHistory, resetHistory, getMasteredTotal, getMasteredCount };
})();
