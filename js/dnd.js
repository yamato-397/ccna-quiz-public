/* dnd.js — Drag-and-Drop quiz logic (Grouping & Matching) */
'use strict';

const DndQuiz = (() => {
  const HISTORY_KEY = 'ccna_dnd_history';

  // ---- History helpers ----
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || { answers: {} };
    } catch { return { answers: {} }; }
  }
  function saveHistory(h) { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }
  function recordAnswer(id, correct) {
    if (testMode) {
      testResults[id] = { correct, ts: Date.now() };
      checkTestCompletion();
      return;
    }
    const h = getHistory();
    h.answers[id] = { correct, ts: Date.now() };
    saveHistory(h);
  }
  function resetHistory() { localStorage.removeItem(HISTORY_KEY); }

  // ---- Test mode state ----
  let testMode       = false;
  let testResults    = {};   // { id: { correct: bool } }  — in-memory only
  let testOnComplete = null;

  function getEffectiveHistory() {
    if (testMode) return { answers: testResults };
    return getHistory();
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

  // ---- Normalize D&D question into unified internal format ----
  function normalizeDndQuestion(q) {
    if (!q || !q.type) {
      console.warn('normalizeDndQuestion: missing type', q);
      return null;
    }

    const normalized = {
      id:        q.id,
      type:      q.type,          // 'Grouping' | 'Matching'
      title:     q.title || q.id,
      question:  q.problemTitle || q.question || '',
      // Filter out empty-string choices (data artifact in dd-17)
      choices:   Array.isArray(q.choices) ? q.choices.filter(c => c && c.trim() !== '') : [],
      imagePath: '',
      groups:    [],
      hasDistractors: false
    };

    // Resolve image path
    if (q.imagePath && typeof q.imagePath === 'string') {
      normalized.imagePath = q.imagePath;
    }

    if (!q.answer) {
      console.warn('normalizeDndQuestion: empty answer field', q.id);
      return null;
    }

    if (q.type === 'Grouping') {
      // answer: "Group1:item1,item2|Group2:item3,item4"
      // grouplimits: "Group1:N|Group2:N"
      const limitsMap = {};
      if (q.grouplimits) {
        q.grouplimits.split('|').forEach(l => {
          const sep = l.indexOf(':');
          if (sep !== -1) limitsMap[l.slice(0, sep).trim()] = parseInt(l.slice(sep + 1)) || 1;
        });
      }

      const answerEntries = q.answer.split('|');
      const placeholders = Array.isArray(q.placeholders) ? q.placeholders : [];

      normalized.groups = placeholders.map((name, i) => {
        const entry = answerEntries.find(e => e.startsWith(name + ':'));
        const correctChoices = entry
          ? entry.slice(name.length + 1).split(',').map(s => s.trim()).filter(Boolean)
          : [];
        return {
          name,
          // Unique internal id — placeholders can repeat the same display name
          // (e.g. "R1|R2|R2|R3"), so `name` alone cannot key state/DOM lookups.
          key: `${name}__${i}`,
          limit: limitsMap[name] || correctChoices.length || 1,
          correctChoices
        };
      });

      if (normalized.groups.length === 0) {
        console.warn('normalizeDndQuestion: no groups parsed for Grouping', q.id);
        return null;
      }
      const totalCapacity = normalized.groups.reduce((s, g) => s + g.limit, 0);
      normalized.hasDistractors = normalized.choices.length > totalCapacity;

    } else if (q.type === 'Matching') {
      // answer: "answer1|answer2|answer3|answer4" — index-based, maps to placeholders
      const answers = q.answer.split('|').map(s => s.trim());
      const placeholders = Array.isArray(q.placeholders) ? q.placeholders : [];

      normalized.groups = placeholders.map((name, i) => ({
        name,
        // Unique internal id — placeholders can repeat the same display name
        // (e.g. "R1|R2|R2|R3"), so `name` alone cannot key state/DOM lookups.
        key: `${name}__${i}`,
        limit: 1,
        correctChoices: [answers[i] || '']
      }));

      if (normalized.groups.length === 0) {
        console.warn('normalizeDndQuestion: no placeholders for Matching', q.id);
        return null;
      }
      normalized.hasDistractors = normalized.choices.length > normalized.groups.length;
    } else {
      console.warn('normalizeDndQuestion: unknown type', q.type, q.id);
      return null;
    }

    return normalized;
  }

  // ---- State ----
  let allQuestions    = [];   // raw questions
  let normalizedList  = [];   // normalized (original order)
  let displayList     = [];   // navigation order (may be shuffled)
  let shuffleEnabled  = false;
  let currentIndex    = 0;
  let currentQ        = null; // normalized current question
  let placements      = {};   // { groupName: [choice, ...] }
  let pool            = [];   // remaining choices in pool (shuffled each question)
  let answered        = false;
  let selectedChip    = null; // { el, value, from: 'pool'|groupName }

  // ---- DOM helpers ----
  const $ = id => document.getElementById(id);

  // ---- Init ----
  function init(rawQuestions) {
    allQuestions = rawQuestions || [];
    normalizedList = allQuestions.map(q => normalizeDndQuestion(q)).filter(Boolean);

    if (normalizedList.length === 0) {
      renderUnsupported('D&D問題が見つかりませんでした');
      return;
    }

    shuffleEnabled = false;
    displayList = [...normalizedList];
    currentIndex = 0;

    // Wire buttons
    $('dnd-submit-btn').onclick = submitAnswer;
    $('dnd-reset-btn').onclick = resetCurrentQuestion;
    $('dnd-prev-btn').onclick = prevQuestion;
    $('dnd-next-btn').onclick = nextQuestion;
    $('dnd-reset-history').onclick = () => {
      if (confirm('D&D回答履歴をリセットしますか？')) {
        resetHistory();
        renderQuestion();
      }
    };

    // Wire shuffle toggle
    const shuffleCheck = $('dnd-filter-shuffle');
    if (shuffleCheck) {
      shuffleCheck.checked = false;
      shuffleCheck.addEventListener('change', () => {
        shuffleEnabled = shuffleCheck.checked;
        displayList = shuffleEnabled ? shuffle([...normalizedList]) : [...normalizedList];
        currentIndex = 0;
        renderQuestion();
      });
    }

    renderQuestion();
  }

  // ---- Render ----
  function renderQuestion() {
    answered     = false;
    selectedChip = null;

    if (displayList.length === 0) {
      renderUnsupported('表示できる問題がありません');
      return;
    }

    currentQ = displayList[currentIndex];
    const hist = getEffectiveHistory();
    const rec  = hist.answers[currentQ.id];

    // Meta
    $('dnd-q-id').textContent = currentQ.title;
    $('dnd-type-badge').textContent = currentQ.type;

    const statusBadge = $('dnd-status-badge');
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

    $('dnd-q-text').textContent = currentQ.question;

    // Image
    const imgWrap = $('dnd-image-wrap');
    const imgEl   = $('dnd-image');
    if (currentQ.imagePath) {
      imgEl.src = currentQ.imagePath;
      imgWrap.classList.remove('hidden');
      imgEl.onerror = () => imgWrap.classList.add('hidden');
      imgEl.onclick = () => window.openImageModal && window.openImageModal(imgEl.src, currentQ.question.substring(0, 40));
    } else {
      imgWrap.classList.add('hidden');
    }

    // Reset placements & pool (pool is shuffled each time)
    resetState();
    renderWorkspace();

    $('dnd-feedback-area').classList.add('hidden');
    $('dnd-submit-btn').disabled = false;
    $('dnd-submit-btn').textContent = '回答する';

    updateProgress();
    scrollToTop();
  }

  function resetState() {
    // Shuffle the choice pool display order each time (judgment is text-based, so safe)
    pool = shuffle([...currentQ.choices]);
    placements = {};
    currentQ.groups.forEach(g => { placements[g.key] = []; });
  }

  function resetCurrentQuestion() {
    answered     = false;
    selectedChip = null;
    resetState();
    renderWorkspace();
    $('dnd-feedback-area').classList.add('hidden');
    $('dnd-submit-btn').disabled = false;
    $('dnd-submit-btn').textContent = '回答する';
  }

  function renderWorkspace() {
    const ws = $('dnd-workspace');
    ws.innerHTML = '';
    if (!currentQ) return;

    if (currentQ.type === 'Grouping') {
      ws.appendChild(buildGroupingUI());
    } else if (currentQ.type === 'Matching') {
      ws.appendChild(buildMatchingUI());
    }
  }

  // ---- Grouping UI ----
  function buildGroupingUI() {
    const wrap = document.createElement('div');
    wrap.className = 'dnd-workspace';

    wrap.appendChild(buildPool());

    const groupsLabel = document.createElement('div');
    groupsLabel.className = 'dnd-pool-label';
    groupsLabel.textContent = 'グループ';
    wrap.appendChild(groupsLabel);

    const grid = document.createElement('div');
    grid.className = 'dnd-grouping-layout';
    currentQ.groups.forEach(g => grid.appendChild(buildZone(g)));
    wrap.appendChild(grid);

    return wrap;
  }

  // ---- Matching UI ----
  function buildMatchingUI() {
    const wrap = document.createElement('div');
    wrap.className = 'dnd-workspace';

    wrap.appendChild(buildPool());

    const matchLabel = document.createElement('div');
    matchLabel.className = 'dnd-pool-label';
    matchLabel.textContent = '対応づけ';
    wrap.appendChild(matchLabel);

    const rows = document.createElement('div');
    rows.className = 'dnd-zones';
    currentQ.groups.forEach(g => {
      const row = document.createElement('div');
      row.className = 'dnd-matching-row';

      const label = document.createElement('div');
      label.className = 'dnd-match-label';
      label.textContent = g.name;

      row.appendChild(label);
      row.appendChild(buildMatchZone(g));
      rows.appendChild(row);
    });
    wrap.appendChild(rows);

    return wrap;
  }

  // ---- Pool builder ----
  function buildPool() {
    const poolWrap = document.createElement('div');
    poolWrap.className = 'dnd-pool';

    const label = document.createElement('div');
    label.className = 'dnd-pool-label';
    label.textContent = currentQ.hasDistractors
      ? '選択肢（余分な選択肢が含まれています）'
      : '選択肢';
    poolWrap.appendChild(label);

    const items = document.createElement('div');
    items.className = 'dnd-pool-items';
    items.dataset.zone = '__pool__';
    setupDropTarget(items, '__pool__');

    // pool is already shuffled in resetState()
    pool.forEach(choice => items.appendChild(buildChip(choice, '__pool__')));

    poolWrap.appendChild(items);
    poolWrap.id = 'dnd-pool-wrap';
    return poolWrap;
  }

  // ---- Zone builders ----
  function buildZone(g) {
    const zoneWrap = document.createElement('div');
    zoneWrap.className = 'dnd-zone';

    const key    = g.key;
    const placed = (placements[key] || []).length;
    const lim    = g.limit;

    const zoneLabel = document.createElement('div');
    zoneLabel.className = 'dnd-zone-label';
    zoneLabel.textContent = `${g.name} (${placed}/${lim})`;
    zoneWrap.appendChild(zoneLabel);

    const items = document.createElement('div');
    items.className = 'dnd-zone-items';
    items.dataset.zone = key;
    setupDropTarget(items, key);

    (placements[key] || []).forEach(choice => items.appendChild(buildChip(choice, key)));
    zoneWrap.appendChild(items);
    return zoneWrap;
  }

  function buildMatchZone(g) {
    const zone = document.createElement('div');
    zone.className = 'dnd-match-zone';

    const key = g.key;

    const items = document.createElement('div');
    items.className = 'dnd-match-zone-items';
    items.dataset.zone = key;
    setupDropTarget(items, key);

    (placements[key] || []).forEach(choice => items.appendChild(buildChip(choice, key)));
    zone.appendChild(items);
    return zone;
  }

  // ---- Chip builder ----
  function buildChip(value, fromZone) {
    const chip = document.createElement('div');
    chip.className = 'dnd-chip';
    chip.textContent = value;
    chip.dataset.value = value;  // text-based, shuffle-safe
    chip.dataset.zone  = fromZone;

    chip.addEventListener('click', e => {
      e.stopPropagation();
      if (answered) return;
      handleChipTap(chip, value, fromZone);
    });

    chip.addEventListener('pointerdown', e => {
      if (answered || e.button !== 0) return;
      startDrag(e, chip, value, fromZone);
    });

    return chip;
  }

  // ---- Tap-select logic ----
  function handleChipTap(chip, value, fromZone) {
    if (selectedChip) {
      if (selectedChip.el === chip) {
        clearSelection();
      } else {
        clearSelection();
        selectChip(chip, value, fromZone);
      }
    } else {
      selectChip(chip, value, fromZone);
    }
  }

  function selectChip(chip, value, fromZone) {
    chip.classList.add('chip-selected');
    selectedChip = { el: chip, value, from: fromZone };
  }

  function clearSelection() {
    if (selectedChip) {
      selectedChip.el.classList.remove('chip-selected');
      selectedChip = null;
    }
  }

  // ---- Drop target setup (tap + pointer) ----
  function setupDropTarget(el, zoneName) {
    el.addEventListener('click', e => {
      if (answered || !selectedChip) return;
      if (e.target.closest('.dnd-chip')) return;
      placeChip(selectedChip.value, selectedChip.from, zoneName);
      clearSelection();
    });

    const zoneContainer = el.closest('.dnd-match-zone') || el.closest('.dnd-zone');
    if (zoneContainer) {
      zoneContainer.addEventListener('click', e => {
        if (answered || !selectedChip) return;
        if (e.target.closest('.dnd-chip')) return;
        placeChip(selectedChip.value, selectedChip.from, zoneName);
        clearSelection();
      });
    }
  }

  // ---- Move a chip ----
  function placeChip(value, fromZone, toZone) {
    if (fromZone === toZone) return;

    if (toZone !== '__pool__') {
      const group = currentQ.groups.find(g => g.key === toZone);
      if (group && (placements[toZone] || []).length >= group.limit) {
        if (group.limit === 1 && placements[toZone].length === 1) {
          // Swap for Matching (limit=1)
          const displaced = placements[toZone][0];
          removeFromZone(displaced, toZone);
          addToZone(displaced, fromZone);
        } else {
          showZoneFlash(toZone);
          return;
        }
      }
    }

    removeFromZone(value, fromZone);
    addToZone(value, toZone);
    renderWorkspace();
  }

  function removeFromZone(value, zoneName) {
    if (zoneName === '__pool__') {
      const idx = pool.indexOf(value);
      if (idx !== -1) pool.splice(idx, 1);
    } else if (placements[zoneName]) {
      const idx = placements[zoneName].indexOf(value);
      if (idx !== -1) placements[zoneName].splice(idx, 1);
    }
  }

  function addToZone(value, zoneName) {
    if (zoneName === '__pool__') {
      pool.push(value);
    } else if (placements[zoneName] !== undefined) {
      placements[zoneName].push(value);
    } else {
      pool.push(value);
    }
  }

  function showZoneFlash(zoneName) {
    const itemsEl = document.querySelector(`[data-zone="${CSS.escape(zoneName)}"]`);
    if (!itemsEl) return;
    const zone = itemsEl.closest('.dnd-zone, .dnd-match-zone');
    if (!zone) return;
    zone.style.outline = '2px solid var(--error)';
    setTimeout(() => { zone.style.outline = ''; }, 400);
  }

  // ---- Pointer-based drag ----
  let dragState = null;
  let ghost     = null;

  function startDrag(e, chip, value, fromZone) {
    e.preventDefault();
    chip.setPointerCapture(e.pointerId);
    chip.classList.add('chip-dragging');

    ghost = chip.cloneNode(true);
    ghost.className = 'dnd-chip drag-ghost';
    ghost.style.left = (e.clientX - 20) + 'px';
    ghost.style.top  = (e.clientY - 16) + 'px';
    document.body.appendChild(ghost);

    dragState = { chip, value, fromZone, pointerId: e.pointerId };

    chip.addEventListener('pointermove',   onDragMove);
    chip.addEventListener('pointerup',     onDragEnd);
    chip.addEventListener('pointercancel', onDragCancel);

    clearSelection();
  }

  function onDragMove(e) {
    if (!ghost) return;
    ghost.style.left = (e.clientX - 20) + 'px';
    ghost.style.top  = (e.clientY - 16) + 'px';

    ghost.style.display = 'none';
    const below = document.elementFromPoint(e.clientX, e.clientY);
    ghost.style.display = '';

    document.querySelectorAll('.dnd-zone-items, .dnd-pool-items, .dnd-match-zone-items')
      .forEach(el => el.classList.remove('drag-over'));
    const target = below && below.closest('.dnd-zone-items, .dnd-pool-items, .dnd-match-zone-items');
    if (target) target.classList.add('drag-over');
  }

  function onDragEnd(e) {
    if (!dragState) return;
    const { value, fromZone } = dragState;
    cleanupDrag();

    ghost.style.display = 'none';
    const below = document.elementFromPoint(e.clientX, e.clientY);
    ghost.style.display = '';

    const target = below && below.closest('.dnd-zone-items, .dnd-pool-items, .dnd-match-zone-items');
    const toZone = target ? target.dataset.zone : null;

    if (toZone && toZone !== fromZone) {
      placeChip(value, fromZone, toZone);
    } else {
      renderWorkspace();
    }

    if (ghost) { ghost.remove(); ghost = null; }
  }

  function onDragCancel() {
    cleanupDrag();
    if (ghost) { ghost.remove(); ghost = null; }
    renderWorkspace();
  }

  function cleanupDrag() {
    if (!dragState) return;
    const { chip, pointerId } = dragState;
    chip.releasePointerCapture(pointerId);
    chip.removeEventListener('pointermove',   onDragMove);
    chip.removeEventListener('pointerup',     onDragEnd);
    chip.removeEventListener('pointercancel', onDragCancel);
    chip.classList.remove('chip-dragging');
    document.querySelectorAll('.dnd-zone-items, .dnd-pool-items, .dnd-match-zone-items')
      .forEach(el => el.classList.remove('drag-over'));
    dragState = null;
  }

  // ---- Submit answer ----
  function submitAnswer() {
    if (answered || !currentQ) return;

    // Require all groups to be at capacity; pool may still have distractors
    const notFilled = currentQ.groups.filter(g => (placements[g.key] || []).length < g.limit);
    if (notFilled.length > 0) {
      alert(`次のグループがまだ埋まっていません: ${notFilled.map(g => g.name).join('、')}`);
      return;
    }

    answered = true;

    // Judge: text-based comparison, shuffle-independent
    let allCorrect = true;
    const results = currentQ.groups.map(g => {
      const placed    = placements[g.key] || [];
      const correct   = g.correctChoices;
      const isCorrect = arraysEqualUnordered(placed, correct);
      if (!isCorrect) allCorrect = false;
      return { name: g.name, key: g.key, placed, correct, isCorrect };
    });

    recordAnswer(currentQ.id, allCorrect);

    // Visual feedback
    if (currentQ.type === 'Grouping') {
      results.forEach(r => {
        const itemsEl = document.querySelector(`.dnd-zone-items[data-zone="${CSS.escape(r.key)}"]`);
        if (!itemsEl) return;
        const zone = itemsEl.closest('.dnd-zone');
        if (zone) zone.classList.add(r.isCorrect ? 'zone-correct' : 'zone-wrong');
        itemsEl.querySelectorAll('.dnd-chip').forEach(c =>
          c.classList.add(r.isCorrect ? 'chip-placed-correct' : 'chip-placed-wrong'));
      });
    } else {
      results.forEach(r => {
        const itemsEl = document.querySelector(`.dnd-match-zone-items[data-zone="${CSS.escape(r.key)}"]`);
        if (!itemsEl) return;
        const zone = itemsEl.closest('.dnd-match-zone');
        if (zone) zone.classList.add(r.isCorrect ? 'zone-correct' : 'zone-wrong');
        itemsEl.querySelectorAll('.dnd-chip').forEach(c =>
          c.classList.add(r.isCorrect ? 'chip-placed-correct' : 'chip-placed-wrong'));
      });
    }

    $('dnd-feedback-area').classList.remove('hidden');

    const feedbackResult = $('dnd-feedback-result');
    feedbackResult.textContent = allCorrect ? '✓ 正解！' : '✗ 不正解';
    feedbackResult.className = 'feedback-result ' + (allCorrect ? 'correct' : 'incorrect');

    $('dnd-feedback-correct').innerHTML =
      '<strong>正解：</strong><div class="dnd-answer-display">' +
      results.map(r =>
        `<div class="dnd-answer-group">` +
        `<span class="dnd-answer-group-name">${escHtml(r.name)}：</span>` +
        r.correct.map(c => escHtml(c)).join('、') +
        (r.isCorrect ? '' :
          `　<span style="color:var(--error)">（あなた：${r.placed.map(c => escHtml(c)).join('、') || '未配置'}）</span>`) +
        `</div>`
      ).join('') + '</div>';

    $('dnd-submit-btn').disabled = true;
    $('dnd-submit-btn').textContent = '回答済み';

    const statusBadge = $('dnd-status-badge');
    statusBadge.textContent = allCorrect ? '✓ 正解済み' : '✗ 不正解';
    statusBadge.className = 'q-status ' + (allCorrect ? 'status-correct' : 'status-wrong');

    updateProgress();
  }

  // ---- Progress ----
  function updateProgress() {
    const total = displayList.length;
    const pos   = total > 0 ? currentIndex + 1 : 0;
    $('dnd-position').textContent = `${pos} / ${total}`;
    $('dnd-progress-bar').style.width = total > 0 ? (pos / total * 100) + '%' : '0%';

    const hist = getEffectiveHistory();
    const recs = Object.values(hist.answers);
    if (recs.length === 0) {
      $('dnd-accuracy-display').textContent = '正答率 - %';
    } else {
      const c = recs.filter(r => r.correct).length;
      const acc = Math.round((c / recs.length) * 100);
      $('dnd-accuracy-display').textContent = `正答率 ${acc}% (${c}/${recs.length})`;
    }
  }

  // ---- Navigation ----
  function prevQuestion() {
    if (currentIndex > 0) { currentIndex--; renderQuestion(); }
  }
  function nextQuestion() {
    if (currentIndex < displayList.length - 1) { currentIndex++; renderQuestion(); }
  }

  function scrollToTop() {
    const card = $('dnd-card');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- Utility ----
  function arraysEqualUnordered(a, b) {
    if (a.length !== b.length) return false;
    const sa = [...a].map(s => s.trim()).sort();
    const sb = [...b].map(s => s.trim()).sort();
    return sa.every((v, i) => v === sb[i]);
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderUnsupported(msg) {
    const ws = $('dnd-workspace');
    if (ws) ws.innerHTML = `<div class="empty-state"><p>${escHtml(msg)}</p></div>`;
  }

  // ---- Test mode functions ----
  function checkTestCompletion() {
    if (!testMode) return;
    if (Object.keys(testResults).length >= displayList.length) {
      const wrap = document.getElementById('dnd-test-finish-wrap');
      if (wrap) wrap.classList.remove('hidden');
    }
  }

  function endTestMode() {
    const results   = { ...testResults };
    testMode        = false;
    testResults     = {};
    const cb        = testOnComplete;
    testOnComplete  = null;
    // Restore UI
    const titleEl = document.getElementById('dnd-header-title');
    if (titleEl) titleEl.textContent = 'D&D問題';
    const resetBtn = document.getElementById('dnd-reset-history');
    if (resetBtn) resetBtn.classList.remove('hidden');
    const wrap = document.getElementById('dnd-test-finish-wrap');
    if (wrap) wrap.classList.add('hidden');
    if (cb) cb(results);
  }

  function initTestMode(rawQuestions, onComplete) {
    testMode       = true;
    testResults    = {};
    testOnComplete = onComplete;

    init(rawQuestions);

    const titleEl = document.getElementById('dnd-header-title');
    if (titleEl) titleEl.textContent = '確認テスト5回目 - D&D編';

    const resetBtn = document.getElementById('dnd-reset-history');
    if (resetBtn) resetBtn.classList.add('hidden');

    const filterCheck = document.getElementById('dnd-filter-shuffle');
    if (filterCheck) filterCheck.parentElement.classList.add('hidden');

    const wrap = document.getElementById('dnd-test-finish-wrap');
    if (wrap) wrap.classList.add('hidden');
  }

  function isTestMode() { return testMode; }

  return { init, initTestMode, endTestMode, isTestMode, getHistory, resetHistory, normalizeDndQuestion };
})();
