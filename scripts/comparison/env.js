/**
 * .env を最小限読み込む（依存パッケージを増やさないための自前ローダー）。
 * 認証情報はコードに直書きせず、必ずここ経由で process.env から読む。
 */
const fs = require('fs');
const path = require('path');

function loadEnv(envPath) {
  const p = envPath || path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(p)) return;
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

function requireCredentials() {
  loadEnv();
  const id = process.env.CCNA_REF_ID;
  const pass = process.env.CCNA_REF_PASSWORD;
  if (!id || !pass) {
    console.error(
      '\nERROR: CCNA_REF_ID / CCNA_REF_PASSWORD が設定されていません。\n' +
      '以下のいずれかで設定してください:\n' +
      '  1) シェルで export CCNA_REF_ID=... / export CCNA_REF_PASSWORD=...\n' +
      '  2) リポジトリ直下の .env ファイル (Gitにはコミットされません)\n'
    );
    process.exit(1);
  }
  return { id, pass };
}

module.exports = { loadEnv, requireCredentials };
