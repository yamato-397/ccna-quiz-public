/* resultSubmitter.js — GAS への結果送信 */
'use strict';

const ResultSubmitter = (() => {
  const PENDING_KEY = 'ccna_check_test_03_pending';

  function getPending() { try { return JSON.parse(localStorage.getItem(PENDING_KEY)) || []; } catch { return []; } }
  function savePending(p) { localStorage.setItem(PENDING_KEY, JSON.stringify(p)); }
  function addPending(rec) { const p = getPending(); p.push(rec); savePending(p); }
  function clearPending() { localStorage.removeItem(PENDING_KEY); }

  function getConfig() {
    return (window.APP_CONFIG) || { RESULT_POST_URL: '', RESULT_POST_TOKEN: '' };
  }

  async function postData(rec) {
    const cfg = getConfig();
    if (!cfg.RESULT_POST_URL) return { skipped: true };

    const payload = { ...rec, resultToken: cfg.RESULT_POST_TOKEN };

    const res = await fetch(cfg.RESULT_POST_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      mode:    'no-cors',  // GAS Web App requires no-cors
    });
    // no-cors returns opaque response; treat as success if no exception thrown
    return { ok: true };
  }

  async function submit(rec) {
    const cfg = getConfig();
    if (!cfg.RESULT_POST_URL) {
      showStatus('RESULT_POST_URL 未設定のため送信をスキップしました', 'info');
      return;
    }

    showStatus('結果を送信中…', 'info');
    try {
      await postData(rec);
      showStatus('✓ 結果を送信しました', 'success');
      // Clear any previously pending records on success
    } catch (e) {
      console.error('ResultSubmitter: send failed', e);
      addPending(rec);
      showStatus('送信失敗。未送信として保存しました。後で再送できます。', 'error');
      showResubmitButton();
    }
  }

  async function retryPending() {
    const pending = getPending();
    if (pending.length === 0) {
      showStatus('未送信データはありません', 'info');
      return;
    }
    showStatus(`未送信 ${pending.length} 件を再送信中…`, 'info');
    const failed = [];
    for (const rec of pending) {
      try {
        await postData(rec);
      } catch {
        failed.push(rec);
      }
    }
    if (failed.length === 0) {
      clearPending();
      showStatus(`✓ ${pending.length} 件の再送信が完了しました`, 'success');
      hideResubmitButton();
    } else {
      savePending(failed);
      showStatus(`${pending.length - failed.length} 件成功、${failed.length} 件失敗`, 'error');
    }
  }

  function showStatus(msg, type) {
    const el = document.getElementById('ct-submit-status');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'ct-submit-status ct-submit-' + type;
    el.classList.remove('hidden');
  }

  function showResubmitButton() {
    const btn = document.getElementById('ct-result-resubmit');
    if (btn) btn.classList.remove('hidden');
  }

  function hideResubmitButton() {
    const btn = document.getElementById('ct-result-resubmit');
    if (btn) btn.classList.add('hidden');
  }

  // On page load: show resubmit button if pending exists
  function initPendingCheck() {
    if (getPending().length > 0) showResubmitButton();
  }

  return { submit, retryPending, initPendingCheck };
})();
