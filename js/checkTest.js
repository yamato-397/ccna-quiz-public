/* checkTest.js — 確認テスト（テスト3/4/5共用）+ 答え合わせ画面 */
'use strict';

const CheckTest = (() => {
  const NAME_KEY     = 'ccna_check_test_name';
  const PASSING_RATE = 95;

  // ---- Test configs ----
  const CONFIGS = {
    'check-test-03': { id: 'check-test-03', title: '確認テスト3回目',  historyKey: 'ccna_check_test_03_history', hasDnd: false, hasSimulation: false },
    'check-test-04': { id: 'check-test-04', title: '確認テスト4回目',  historyKey: 'ccna_check_test_04_history', hasDnd: false, hasSimulation: false },
    'check-test-05': { id: 'check-test-05', title: '確認テスト5回目',  historyKey: 'ccna_check_test_05_history', hasDnd: true,  hasSimulation: false },
    'midterm-test':  { id: 'midterm-test',  title: '中間テスト',        historyKey: 'ccna_midterm_test_history',  hasDnd: true,  hasSimulation: false },
    'check-test-06': { id: 'check-test-06', title: '確認テスト6回目',  historyKey: 'ccna_check_test_06_history', hasDnd: true,  hasSimulation: false },
    'check-test-07': { id: 'check-test-07', title: '確認テスト7回目',  historyKey: 'ccna_check_test_07_history', hasDnd: true,  hasSimulation: false },
    'check-test-08': { id: 'check-test-08', title: '確認テスト8回目',  historyKey: 'ccna_check_test_08_history', hasDnd: true,  hasSimulation: false },
    'check-test-09': { id: 'check-test-09', title: '確認テスト9回目',  historyKey: 'ccna_check_test_09_history', hasDnd: true,  hasSimulation: false },
    'check-test-10': { id: 'check-test-10', title: '確認テスト10回目', historyKey: 'ccna_check_test_10_history', hasDnd: true,  hasSimulation: false },
    'check-test-11': { id: 'check-test-11', title: '確認テスト11回目', historyKey: 'ccna_check_test_11_history', hasDnd: true,  hasSimulation: true  },
    'check-test-12': { id: 'check-test-12', title: '確認テスト12回目', historyKey: 'ccna_check_test_12_history', hasDnd: true,  hasSimulation: true  },
    'check-test-13': { id: 'check-test-13', title: '確認テスト13回目', historyKey: 'ccna_check_test_13_history', hasDnd: true,  hasSimulation: true, simulationSampleSize: 5 },
    'check-test-14': { id: 'check-test-14', title: '確認テスト14回目', historyKey: 'ccna_check_test_14_history', hasDnd: true,  hasSimulation: true, simulationSampleSize: 5 },
    'check-test-15': { id: 'check-test-15', title: '確認テスト15回目', historyKey: 'ccna_check_test_15_history', hasDnd: true,  hasSimulation: true, simulationSampleSize: 5 },
    'check-test-16': { id: 'check-test-16', title: '確認テスト16回目', historyKey: 'ccna_check_test_16_history', hasDnd: true,  hasSimulation: true, simulationSampleSize: 5 },
    'check-test-17': { id: 'check-test-17', title: '確認テスト17回目', historyKey: 'ccna_check_test_17_history', hasDnd: true,  hasSimulation: true },
    'check-test-18': { id: 'check-test-18', title: '確認テスト18回目', historyKey: 'ccna_check_test_18_history', hasDnd: true,  hasSimulation: true },
    'check-test-19': { id: 'check-test-19', title: '確認テスト19回目', historyKey: 'ccna_check_test_19_history', hasDnd: true,  hasSimulation: true },
    'check-test-20': { id: 'check-test-20', title: '確認テスト20回目', historyKey: 'ccna_check_test_20_history', hasDnd: true,  hasSimulation: true },
    'check-test-21': { id: 'check-test-21', title: '確認テスト21回目', historyKey: 'ccna_check_test_21_history', hasDnd: true,  hasSimulation: true },
    'check-test-22': { id: 'check-test-22', title: '確認テスト22回目', historyKey: 'ccna_check_test_22_history', hasDnd: true,  hasSimulation: true },
    'check-test-23': { id: 'check-test-23', title: '確認テスト23回目', historyKey: 'ccna_check_test_23_history', hasDnd: true,  hasSimulation: true },
    'check-test-24': { id: 'check-test-24', title: '確認テスト24回目', historyKey: 'ccna_check_test_24_history', hasDnd: true,  hasSimulation: true },
    'check-test-25': { id: 'check-test-25', title: '確認テスト25回目', historyKey: 'ccna_check_test_25_history', hasDnd: true,  hasSimulation: true },
    'check-test-26': { id: 'check-test-26', title: '確認テスト26回目', historyKey: 'ccna_check_test_26_history', hasDnd: true,  hasSimulation: true },
    'check-test-27': { id: 'check-test-27', title: '確認テスト27回目', historyKey: 'ccna_check_test_27_history', hasDnd: true,  hasSimulation: true },
    'check-test-28': { id: 'check-test-28', title: '確認テスト28回目', historyKey: 'ccna_check_test_28_history', hasDnd: true,  hasSimulation: true },
    'check-test-29': { id: 'check-test-29', title: '確認テスト29回目', historyKey: 'ccna_check_test_29_history', hasDnd: true,  hasSimulation: true },
    'check-test-30': { id: 'check-test-30', title: '確認テスト30回目', historyKey: 'ccna_check_test_30_history', hasDnd: true,  hasSimulation: true },
    'check-test-31': { id: 'check-test-31', title: '確認テスト31回目', historyKey: 'ccna_check_test_31_history', hasDnd: true,  hasSimulation: true },
    'check-test-32': { id: 'check-test-32', title: '確認テスト32回目', historyKey: 'ccna_check_test_32_history', hasDnd: true,  hasSimulation: true },
  };

  // ---- History ----
  function getHistory(id) {
    const key = CONFIGS[id] ? CONFIGS[id].historyKey : 'ccna_check_test_history';
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  }
  function appendHistory(cfg, rec) {
    const h = getHistory(cfg.id);
    h.push(rec);
    localStorage.setItem(cfg.historyKey, JSON.stringify(h));
  }

  // ---- Student name ----
  function getStudentName()   { return sessionStorage.getItem(NAME_KEY) || ''; }
  function saveStudentName(n) { sessionStorage.setItem(NAME_KEY, n); }

  // ---- Shuffle ----
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- Choice cache ----
  const choiceCache = new Map();
  function getShuffledChoices(q) {
    if (!choiceCache.has(q.id)) choiceCache.set(q.id, shuffle(q.choices));
    return choiceCache.get(q.id);
  }

  // ---- State ----
  let allQuestions = [];
  let displayList  = [];
  let currentIndex = 0;
  let answered     = false;
  let results      = {};
  let startTime    = null;
  let studentName  = '';
  let activeConfig = null;
  let dndQuestions = [];    // D&D questions
  let dndResults   = null;  // { id: { correct } } from DndQuiz
  let simQuestions = [];    // Simulation questions
  let simResult    = null;  // { details, totalReq, totalCorrect } from SimulationTest

  const $ = id => document.getElementById(id);

  // ---- Init ----
  function init(questions, name, cfg, ddQuestions, simulationQuestions) {
    allQuestions = questions || [];
    studentName  = name || getStudentName();
    activeConfig = cfg;
    dndQuestions = ddQuestions || [];
    dndResults   = null;
    simQuestions = simulationQuestions || [];
    simResult    = null;
    choiceCache.clear();
    results      = {};
    currentIndex = 0;
    answered     = false;
    startTime    = Date.now();
    displayList  = [...allQuestions];

    const headerTitle = $('ct-header-title');
    if (headerTitle) headerTitle.textContent = cfg.title;

    const shuffleCheck = $('ct-filter-shuffle');
    if (shuffleCheck) {
      shuffleCheck.checked  = false;
      shuffleCheck.onchange = () => {
        displayList  = shuffleCheck.checked ? shuffle([...allQuestions]) : [...allQuestions];
        currentIndex = 0;
        renderQuestion();
      };
    }

    $('ct-submit-btn').onclick = submitAnswer;
    $('ct-prev-btn').onclick   = () => { if (currentIndex > 0) { currentIndex--; renderQuestion(); } };
    $('ct-next-btn').onclick   = () => { if (currentIndex < displayList.length - 1) { currentIndex++; renderQuestion(); } };

    renderQuestion();
  }

  // ---- Render question ----
  function renderQuestion() {
    answered = false;
    if (displayList.length === 0) return;

    const q       = displayList[currentIndex];
    const isMulti = q.correctCount > 1;

    $('ct-q-number').textContent = `Q${currentIndex + 1}`;
    $('ct-q-part').textContent   = q.part ? q.part.replace('part_', 'Part ') : '';

    const multiBadge = $('ct-multi-badge');
    isMulti ? multiBadge.classList.remove('hidden') : multiBadge.classList.add('hidden');

    const rec         = results[q.id];
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

    const displayChoices = getShuffledChoices(q);
    const container = $('ct-choices-container');
    container.innerHTML = '';
    displayChoices.forEach(choice => {
      const item = document.createElement('label');
      item.className     = 'choice-item';
      item.dataset.value = choice;

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

    if (rec) restoreAnsweredState(q, rec);

    const submitBtn = $('ct-submit-btn');
    submitBtn.disabled    = !!rec;
    submitBtn.textContent = rec ? '回答済み' : '回答する';

    $('ct-feedback-area').classList.add('hidden');
    if (rec) showFeedback(q, rec.selected, rec.isCorrect);

    updateProgress();
    scrollToTop();
  }

  function restoreAnsweredState(q, rec) {
    document.querySelectorAll('#ct-choices-container .choice-item').forEach(item => {
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

  // ---- Submit ----
  function submitAnswer() {
    if (answered || displayList.length === 0) return;
    const q        = displayList[currentIndex];
    const inputs   = document.querySelectorAll('#ct-choices-container input');
    const selected = [...inputs].filter(i => i.checked).map(i => i.value);

    if (selected.length === 0) {
      const btn = $('ct-submit-btn');
      btn.textContent = '選択肢を選んでください';
      setTimeout(() => { btn.textContent = '回答する'; }, 1500);
      return;
    }

    answered      = true;
    const isCorrect = JSON.stringify([...selected].sort()) === JSON.stringify([...q.correctAnswers].sort());
    results[q.id]   = { selected, isCorrect };

    document.querySelectorAll('#ct-choices-container .choice-item').forEach(item => {
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
    if (Object.keys(results).length === allQuestions.length) setTimeout(showFinishButton, 400);
  }

  function showFeedback(q, selected, isCorrect) {
    $('ct-feedback-area').classList.remove('hidden');
    const res = $('ct-feedback-result');
    res.textContent = isCorrect ? '✓ 正解！' : '✗ 不正解';
    res.className   = 'feedback-result ' + (isCorrect ? 'correct' : 'incorrect');
    $('ct-feedback-correct').innerHTML =
      '<strong>正解：</strong> ' + q.correctAnswers.map(a => `<span>${escHtml(a)}</span>`).join('、');
    $('ct-feedback-explanation').innerHTML =
      '<span class="explanation-label">解説</span>' +
      (q.explanation ? escHtml(q.explanation) : '解説は未登録です。');
  }

  function showFinishButton() {
    const wrap = $('ct-finish-wrap');
    const btn  = $('ct-finish-btn');
    if (!wrap || !btn) return;
    if (activeConfig && activeConfig.hasDnd && dndQuestions.length > 0) {
      btn.textContent = 'D&D問題へ進む →';
    } else {
      btn.textContent = '100問完了 — 結果を見る';
    }
    wrap.classList.remove('hidden');
  }

  // ---- D&D phase ----
  function startDndPhase() {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    $('view-dnd').classList.remove('hidden');
    DndQuiz.initTestMode(dndQuestions, onDndComplete);
  }

  function onDndComplete(ddResults) {
    dndResults = ddResults;
    // D&D完了後: シミュレーション問題があればシミュレーションへ
    if (activeConfig && activeConfig.hasSimulation && simQuestions.length > 0) {
      startSimulationPhase();
    } else {
      showResult();
    }
  }

  // ---- Simulation phase ----
  function startSimulationPhase() {
    const sampleSize = activeConfig.simulationSampleSize || null;
    SimulationTest.start(simQuestions, onSimulationComplete, sampleSize);
  }

  function onSimulationComplete(result) {
    simResult = result;
    showResult();
  }

  // ---- Progress ----
  function updateProgress() {
    const total = displayList.length;
    const done  = Object.keys(results).length;
    $('ct-position').textContent       = `${currentIndex + 1} / ${total}`;
    $('ct-answered-count').textContent = `回答済み: ${done} / ${total}`;
    $('ct-progress-bar').style.width   = (total > 0 ? ((currentIndex + 1) / total) * 100 : 0) + '%';
  }

  function scrollToTop() {
    const card = $('ct-card');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- Result screen ----
  function showResult() {
    const selCorrect   = Object.values(results).filter(r => r.isCorrect).length;
    const selIncorrect = allQuestions.length - selCorrect;
    const selRate      = Math.round((selCorrect / allQuestions.length) * 100);
    const passed       = selRate >= PASSING_RATE;
    const durationSec  = Math.round((Date.now() - startTime) / 1000);
    const cfg          = activeConfig;

    // D&D score
    const hasDnd     = cfg.hasDnd && dndResults !== null;
    const dndCorrect = hasDnd ? Object.values(dndResults).filter(r => r.correct).length : 0;
    const dndTotal   = hasDnd ? Object.keys(dndResults).length : 0;
    const dndRate    = dndTotal > 0 ? Math.round((dndCorrect / dndTotal) * 100) : 0;

    // Simulation score
    const hasSim     = cfg.hasSimulation && simResult !== null;
    const simCorrect = hasSim ? simResult.totalCorrect : 0;
    const simTotal   = hasSim ? simResult.totalReq    : 0;
    const simRate    = simTotal > 0 ? Math.round((simCorrect / simTotal) * 100) : 0;

    const wrongIds = allQuestions.filter(q => results[q.id] && !results[q.id].isCorrect).map(q => q.id);

    const rec = {
      submittedAt:      new Date().toISOString(),
      testId:           cfg.id,
      testTitle:        cfg.title,
      studentName,
      totalQuestions:   allQuestions.length,
      correctCount:     selCorrect,
      incorrectCount:   selIncorrect,
      scoreRate:        selRate,
      passed,
      wrongQuestionIds: wrongIds,
      durationSeconds:  durationSec,
      userAgent:        navigator.userAgent,
      dndCorrectCount:  dndCorrect,
      dndTotalCount:    dndTotal,
      simCorrectCount:  simCorrect,
      simTotalCount:    simTotal,
    };
    appendHistory(cfg, rec);
    if (typeof ResultSubmitter !== 'undefined') ResultSubmitter.submit(rec);

    // ---- 4択スコア ----
    $('ct-result-title').textContent     = cfg.title + ' — 結果';
    $('ct-result-score').textContent     = `${selCorrect} / ${allQuestions.length}`;
    $('ct-result-rate').textContent      = `${selRate}%`;
    $('ct-result-incorrect').textContent = `誤答: ${selIncorrect} 問`;
    $('ct-result-duration').textContent  = formatDuration(durationSec);

    // ---- D&Dスコア ----
    const dndSection = $('ct-dnd-score-wrap');
    if (dndSection) {
      if (hasDnd) {
        $('ct-dnd-result-score').textContent = `${dndCorrect} / ${dndTotal}`;
        $('ct-dnd-result-rate').textContent  = `${dndRate}%`;
        dndSection.classList.remove('hidden');
      } else {
        dndSection.classList.add('hidden');
      }
    }

    // ---- シミュレーションスコア ----
    const simSection = $('ct-sim-score-wrap');
    if (simSection) {
      if (hasSim) {
        $('ct-sim-result-score').textContent = `${simCorrect} / ${simTotal}`;
        $('ct-sim-result-rate').textContent  = `${simRate}%`;
        simSection.classList.remove('hidden');
      } else {
        simSection.classList.add('hidden');
      }
    }

    // ---- 合否バナー（4択基準） ----
    const verdictEl = $('ct-result-verdict');
    if (passed) {
      verdictEl.textContent = '合格　本番受験OKライン達成！';
      verdictEl.className   = 'ct-verdict ct-verdict-pass';
    } else {
      verdictEl.textContent = '復習推奨。間違えた問題を再演習してください';
      verdictEl.className   = 'ct-verdict ct-verdict-fail';
    }

    // ---- 不正解リスト＋再演習 ----
    const wrongList      = $('ct-wrong-list');
    wrongList.innerHTML  = '';
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
      $('ct-retry-btn').onclick = () => startRetry(wrongQuestions, cfg);
    }

    // ---- 4択答え合わせ ----
    renderReview();

    // ---- シミュレーション答え合わせ ----
    renderSimReview(hasSim ? simResult : null);

    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    $('view-check-test-result').classList.remove('hidden');
  }

  // ---- 4択 Answer Review ----
  function renderReview() {
    const listEl = $('ct-review-list');
    if (!listEl) return;

    const items = allQuestions.map((q, idx) => {
      const rec       = results[q.id] || { selected: [], isCorrect: false };
      const isCorrect = rec.isCorrect;
      const part      = q.part ? q.part.replace('part_', 'Part ') : '';

      const el = document.createElement('div');
      el.className       = 'ct-review-item ' + (isCorrect ? 'review-correct' : 'review-wrong');
      el.dataset.correct = isCorrect ? '1' : '0';

      el.innerHTML = `
        <div class="ct-review-header">
          <div class="ct-review-qnum">
            <span class="ct-review-seq">Q${idx + 1}</span>
            <span class="ct-review-ref">対策資料 No.${q.displayId}</span>
            <span class="ct-review-part">${escHtml(part)}</span>
          </div>
          <span class="ct-review-badge ${isCorrect ? 'badge-correct' : 'badge-wrong'}">${isCorrect ? '○ 正解' : '✗ 不正解'}</span>
        </div>
        <div class="ct-review-question">${escHtml(q.question)}</div>
        <div class="ct-review-answers">
          <div class="ct-review-my ${isCorrect ? '' : 'my-wrong'}">
            <span class="ct-review-label">あなたの回答</span>
            <span class="ct-review-val">${rec.selected.length ? rec.selected.map(s => escHtml(s)).join('、') : '（未回答）'}</span>
          </div>
          ${!isCorrect ? `<div class="ct-review-correct-ans">
            <span class="ct-review-label">正解</span>
            <span class="ct-review-val">${q.correctAnswers.map(a => escHtml(a)).join('、')}</span>
          </div>` : ''}
        </div>`;
      return el;
    });

    const filterBtns = document.querySelectorAll('.ct-review-filter-btn');
    function applyFilter(filter) {
      filterBtns.forEach(b => b.classList.toggle('active', b.dataset.f === filter));
      listEl.innerHTML = '';
      items.forEach(el => {
        if (filter === 'all' ||
            (filter === 'correct' && el.dataset.correct === '1') ||
            (filter === 'wrong'   && el.dataset.correct === '0')) {
          listEl.appendChild(el);
        }
      });
    }

    const selCorrect   = Object.values(results).filter(r => r.isCorrect).length;
    const selIncorrect = allQuestions.length - selCorrect;
    filterBtns.forEach(b => {
      if (b.dataset.f === 'all')     b.textContent = `全問 (${allQuestions.length})`;
      if (b.dataset.f === 'correct') b.textContent = `正解 (${selCorrect})`;
      if (b.dataset.f === 'wrong')   b.textContent = `不正解 (${selIncorrect})`;
    });

    applyFilter('all');
  }

  // ---- シミュレーション答え合わせ ----
  function renderSimReview(result) {
    const section = $('ct-sim-review-section');
    const listEl  = $('ct-sim-review-list');
    if (!section || !listEl) return;

    if (!result) { section.classList.add('hidden'); return; }

    section.classList.remove('hidden');
    listEl.innerHTML = '';

    result.details.forEach(qDetail => {
      const qEl = document.createElement('div');
      qEl.className = 'sim-review-question';

      const titleEl = document.createElement('div');
      titleEl.className   = 'sim-review-q-title';
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

  function startRetry(questions, cfg) {
    allQuestions = questions;
    displayList  = [...questions];
    dndQuestions = [];
    dndResults   = null;
    simQuestions = [];
    simResult    = null;
    results      = {};
    currentIndex = 0;
    answered     = false;
    startTime    = Date.now();
    choiceCache.clear();
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    $('view-check-test').classList.remove('hidden');
    $('ct-finish-wrap').classList.add('hidden');
    renderQuestion();
  }

  function formatDuration(sec) {
    return `${Math.floor(sec / 60)}分${String(sec % 60).padStart(2, '0')}秒`;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---- Name modal ----
  function showNameModal(onConfirm) {
    const existing = getStudentName();
    if (existing) { onConfirm(existing); return; }
    $('ct-name-modal').classList.remove('hidden');
    const input = $('ct-name-input');
    const errEl = $('ct-name-error');
    const btn   = $('ct-name-confirm');
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
    btn.onclick     = confirm;
    input.onkeydown = e => { if (e.key === 'Enter') confirm(); };
  }

  // ---- Public API ----
  function start(questions, configId, ddQuestions, simulationQuestions) {
    const cfg = CONFIGS[configId];
    if (!cfg) { console.error('Unknown test config:', configId); return; }
    showNameModal(name => {
      document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
      $('view-check-test').classList.remove('hidden');
      $('ct-finish-wrap').classList.add('hidden');
      init(questions, name, cfg, ddQuestions || [], simulationQuestions || []);
    });
  }

  // Called by ct-finish-btn click
  function handleFinish() {
    if (activeConfig && activeConfig.hasDnd && dndQuestions.length > 0) {
      startDndPhase();
    } else if (activeConfig && activeConfig.hasSimulation && simQuestions.length > 0) {
      startSimulationPhase();
    } else {
      showResult();
    }
  }

  function initResultButtons() {
    const backBtn = $('ct-result-back');
    if (backBtn) backBtn.onclick = () => App.goPortal();

    const resubmitBtn = $('ct-result-resubmit');
    if (resubmitBtn && typeof ResultSubmitter !== 'undefined') {
      resubmitBtn.onclick = () => ResultSubmitter.retryPending();
    }
  }

  return { start, handleFinish, showResult, initResultButtons, getHistory };
})();
