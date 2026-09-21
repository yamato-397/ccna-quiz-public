#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MASTER_PATH = path.join(ROOT, 'data/questions.json');
const SIMULATION_PATH = path.join(ROOT, 'data/simulation-questions.json');
const OUTPUT_PATH = path.join(ROOT, 'data/check-test-takenaka.json');
const SEED = 'madoka-check-test-2026-09-21';

function stableRandomKey(id) {
  return crypto.createHash('sha256').update(`${SEED}:${id}`).digest('hex');
}

const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
const simulationData = JSON.parse(fs.readFileSync(SIMULATION_PATH, 'utf8'));
const pool = master.selection_questions
  .filter(q => q.part === 'part_⑥' || q.part === 'part_⑦')
  .map(q => ({ question: q, key: stableRandomKey(q.id) }))
  .sort((a, b) => a.key.localeCompare(b.key));

if (pool.length < 100) throw new Error(`Part⑥・Part⑦ pool has only ${pool.length} questions`);
if (master.dd_questions.length !== 28) throw new Error(`Expected 28 D&D questions, got ${master.dd_questions.length}`);
if (simulationData.questions.length !== 12) throw new Error(`Expected 12 simulation questions, got ${simulationData.questions.length}`);

const questions = pool.slice(0, 100).map(item => item.question);
const ids = questions.map(q => q.id);
if (new Set(ids).size !== 100) throw new Error('Duplicate selection question IDs');

const output = {
  id: 'check-test-takenaka',
  title: 'まどかさん用確認テスト',
  description: 'Part⑥・Part⑦からランダム抽出した固定100問 + D&D全28問(出題順ランダム) + シミュレーション全12問',
  questionCount: 100,
  passingScore: 95,
  questions,
  dd_questions: master.dd_questions,
  simulation_questions: simulationData.questions,
};

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

const part6 = questions.filter(q => q.part === 'part_⑥').length;
const part7 = questions.filter(q => q.part === 'part_⑦').length;
console.log(`Updated ${path.relative(ROOT, OUTPUT_PATH)}: Part⑥ ${part6}問 / Part⑦ ${part7}問 / D&D 28問 / シミュレーション 12問`);
