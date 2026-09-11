#!/usr/bin/env node
/*
 * generate-random-check-test.js
 *
 * Adds the next sequentially-numbered "確認テストN回目" check test:
 *   - 4択: 100 questions randomly sampled (fresh each run) from Part⑥+Part⑦
 *   - D&D: all 28 questions, in master order
 *   - シミュレーション: 50%を毎回ランダム抽出して固定 (from 確認テスト41回目〜)
 *   - Standard pass rule (4択 95%以上), choice order shuffled at render time
 *     by the existing CheckTest.js logic (no change needed there)
 *
 * Determines N by scanning data/check-test-*.json for the highest existing
 * numeric id, writes data/check-test-{N}.json, and patches js/checkTest.js,
 * js/app.js, and index.html to wire the new test in (appended after the
 * previous numbered test, at the end of the sequential list).
 *
 * Usage: node scripts/generate-random-check-test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextTestNumber() {
  const files = fs.readdirSync(DATA_DIR);
  let max = 0;
  for (const f of files) {
    const m = f.match(/^check-test-(\d+)\.json$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}
function writeFile(rel, content) {
  fs.writeFileSync(path.join(ROOT, rel), content, 'utf-8');
}

function insertAfterAnchor(src, anchor, insertion, label) {
  const idx = src.indexOf(anchor);
  if (idx === -1) throw new Error(`Anchor not found while patching (${label}): ${JSON.stringify(anchor)}`);
  return src.slice(0, idx + anchor.length) + insertion + src.slice(idx + anchor.length);
}
function insertBeforeAnchor(src, anchor, insertion, label) {
  const idx = src.indexOf(anchor);
  if (idx === -1) throw new Error(`Anchor not found while patching (${label}): ${JSON.stringify(anchor)}`);
  return src.slice(0, idx) + insertion + src.slice(idx);
}

const SIMULATION_RATIO = 0.5; // 確認テスト41回目〜: シミュレーション問題の50%を出題

function generateData(n, id, title) {
  const master = JSON.parse(readFile('data/questions.json'));
  const pool = master.selection_questions.filter(q => q.part === 'part_⑥' || q.part === 'part_⑦');
  if (pool.length < 100) throw new Error(`Pool too small: ${pool.length} (need >= 100)`);
  const ddAll = master.dd_questions;
  if (ddAll.length !== 28) throw new Error(`Expected 28 dd_questions in master, got ${ddAll.length}`);

  const simMaster = JSON.parse(readFile('data/simulation-questions.json'));
  const simAll = simMaster.questions;
  if (simAll.length === 0) throw new Error('No simulation questions found in master');
  const simCount = Math.round(simAll.length * SIMULATION_RATIO);

  const sampled = shuffle(pool).slice(0, 100);
  if (new Set(sampled.map(q => q.id)).size !== 100) throw new Error('Internal duplicate in sampled 100 (should not happen)');

  const simSampled = shuffle(simAll).slice(0, simCount);
  if (new Set(simSampled.map(q => q.id)).size !== simCount) throw new Error('Internal duplicate in sampled simulation set (should not happen)');

  const testData = {
    id,
    title,
    description: `Part⑥・Part⑦からランダム抽出した固定100問確認テスト + D&D全28問 + シミュレーション${simCount}問(全${simAll.length}問の${Math.round(SIMULATION_RATIO * 100)}%)`,
    questionCount: 100,
    passingScore: 95,
    questions: JSON.parse(JSON.stringify(sampled)),
    dd_questions: JSON.parse(JSON.stringify(ddAll)),
    simulation_questions: JSON.parse(JSON.stringify(simSampled)),
  };

  writeFile(`data/${id}.json`, JSON.stringify(testData, null, 2) + '\n');

  const part6 = sampled.filter(q => q.part === 'part_⑥').length;
  const part7 = sampled.filter(q => q.part === 'part_⑦').length;
  console.log(`Wrote data/${id}.json — 100問 (Part⑥:${part6} / Part⑦:${part7}), D&D 28問, シミュレーション${simCount}問(全${simAll.length}問中)`);

  return { simCount, simTotal: simAll.length };
}

function patchCheckTestJs(n, id, title) {
  const file = 'js/checkTest.js';
  let src = readFile(file);
  const prevId = `check-test-${String(n - 1).padStart(2, '0')}`;
  const anchorLine = src.split('\n').find(l => l.includes(`'${prevId}':`));
  if (!anchorLine) throw new Error(`checkTest.js: could not find CONFIGS line for ${prevId}`);
  const insertion = `\n    '${id}': { id: '${id}', title: '${title}', historyKey: 'ccna_check_test_${String(n).padStart(2, '0')}_history', hasDnd: true,  hasSimulation: true },`;
  src = insertAfterAnchor(src, anchorLine, insertion, 'checkTest.js CONFIGS');
  writeFile(file, src);
}

function patchAppJs(n, id) {
  const file = 'js/app.js';
  let src = readFile(file);
  const nn = String(n).padStart(2, '0');

  // 1. cache var (insert before the blank line that precedes the comment, so the
  //    blank-line separator between the var block and the comment is preserved)
  src = insertBeforeAnchor(
    src,
    '\n\n  // ---- Random utilities ----',
    `\n  let checkTestData${nn}  = null;`,
    'app.js cache var'
  );

  // 2. loadCheckTestData map entry
  src = insertBeforeAnchor(
    src,
    '\n    };\n    const entry = map[n] || map[3];',
    `\n      ${n}:        { cache: () => checkTestData${nn}, set: d => { checkTestData${nn} = d; }, file: '${id}.json' },`,
    'app.js loadCheckTestData map'
  );

  // 3. portal stat display
  src = insertBeforeAnchor(
    src,
    '\n  }\n\n  // ---- Logout handler ----',
    `\n    const ct${nn}El = document.getElementById('ct${nn}-stat-history');` +
    `\n    if (ct${nn}El) ct${nn}El.textContent = \`実施回数: \${CheckTest.getHistory('${id}').length}回\`;`,
    'app.js portal stats'
  );

  // 4. card click listener
  src = insertBeforeAnchor(
    src,
    '\n\n    // Back buttons',
    `\n    document.getElementById('card-${id}').addEventListener('click', () => goCheckTest(${n}));`,
    'app.js card listener'
  );

  writeFile(file, src);
}

function patchIndexHtml(n, id, title, simCount, simTotal) {
  const file = 'index.html';
  let src = readFile(file);
  const nn = String(n).padStart(2, '0');
  const cardClass = simCount > 0 ? 'portal-card portal-card-test portal-card-sim' : 'portal-card portal-card-test';
  const cardHtml =
`        <div class="${cardClass}" id="card-${id}">
          <div class="card-icon">&#9989;</div>
          <h2 class="card-title">${title}</h2>
          <p class="card-desc">Part⑥・Part⑦からランダム抽出した固定100問 + D&amp;D全28問 + シミュレーション${simCount}問（全${simTotal}問の${Math.round(SIMULATION_RATIO * 100)}%）<br>出題順：4択→D&amp;D→シミュレーション<br>95%以上で合格判定（4択基準）</p>
          <div class="card-stats">
            <span id="ct${nn}-stat-history">実施回数: 0回</span>
          </div>
          <button class="btn btn-primary btn-full card-btn">スタート</button>
        </div>
`;
  src = insertBeforeAnchor(src, '      </div>\n    </main>', cardHtml, 'index.html portal card');
  writeFile(file, src);
}

function validate(id, expectedSimCount) {
  const data = JSON.parse(readFile(`data/${id}.json`));
  if (data.questions.length !== 100) throw new Error(`Validation failed: questions.length=${data.questions.length}`);
  if (data.dd_questions.length !== 28) throw new Error(`Validation failed: dd_questions.length=${data.dd_questions.length}`);
  if (new Set(data.questions.map(q => q.id)).size !== 100) throw new Error('Validation failed: duplicate question ids');
  if (!data.questions.every(q => q.part === 'part_⑥' || q.part === 'part_⑦')) throw new Error('Validation failed: question outside Part⑥/⑦');
  if ((data.simulation_questions || []).length !== expectedSimCount) {
    throw new Error(`Validation failed: simulation_questions.length=${(data.simulation_questions || []).length}, expected ${expectedSimCount}`);
  }
  if (new Set((data.simulation_questions || []).map(q => q.id)).size !== expectedSimCount) {
    throw new Error('Validation failed: duplicate simulation question ids');
  }

  require('child_process').execSync(`node --check ${path.join(ROOT, 'js/checkTest.js')}`, { stdio: 'inherit' });
  require('child_process').execSync(`node --check ${path.join(ROOT, 'js/app.js')}`, { stdio: 'inherit' });

  const html = readFile('index.html');
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  const dupIds = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dupIds.length) throw new Error(`Validation failed: duplicate HTML ids: ${[...new Set(dupIds)].join(', ')}`);

  console.log(`Validation OK: 100 questions, 28 D&D, ${expectedSimCount} simulation, no dup ids, JS syntax OK.`);
}

function main() {
  const n = nextTestNumber();
  const id = `check-test-${String(n).padStart(2, '0')}`;
  const title = `確認テスト${n}回目`;
  console.log(`=== Generating ${id} (${title}) ===`);

  const { simCount, simTotal } = generateData(n, id, title);
  patchCheckTestJs(n, id, title);
  patchAppJs(n, id);
  patchIndexHtml(n, id, title, simCount, simTotal);
  validate(id, simCount);

  console.log(`=== ${id} generated and wired successfully ===`);
}

main();
