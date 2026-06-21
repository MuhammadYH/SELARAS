// admin-auth.js — Auth guard (stub, customise with your backend)
'use strict';

const AdminAuth = (() => {

  const SESSION_KEY = 'SELARAS_admin_session';

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  }

  function setSession(data) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function isLoggedIn() {
    const s = getSession();
    return s && s.token && s.expires > Date.now();
  }

  /** Call on every protected page */
  function guard(redirectUrl = 'admin-login.html') {
    if (!isLoggedIn()) {
      window.location.replace(redirectUrl);
    }
  }

  function logout(redirectUrl = 'admin-login.html') {
    clearSession();
    window.location.replace(redirectUrl);
  }

  return { guard, getSession, setSession, clearSession, isLoggedIn, logout };
})();

// Uncomment to enable auth guard on all admin pages:
// document.addEventListener('DOMContentLoaded', () => AdminAuth.guard());
