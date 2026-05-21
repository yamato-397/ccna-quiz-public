/* auth.js — Simple session-based authentication */
'use strict';

const Auth = (() => {
  const SESSION_KEY = 'ccna_logged_in';
  // Credentials stored plaintext — this is a learning gate, not security
  const VALID_ID = 'OVER';
  const VALID_PW = 'OVER0331';

  function isLoggedIn() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  function login(id, pw) {
    if (id === VALID_ID && pw === VALID_PW) {
      sessionStorage.setItem(SESSION_KEY, '1');
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  return { isLoggedIn, login, logout };
})();
