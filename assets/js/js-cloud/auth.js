/* =========================================
   SELARAS — auth.js
   Handles authentication state management.
   Gabungan: modul lengkap + auto-guard halaman terproteksi.
   ========================================= */
(function () {
  'use strict';

  const TOKEN_KEY   = 'SELARAS_token';
  const USER_KEY    = 'SELARAS_user';
  const SESSION_KEY = 'SELARAS_session';

  /* ---------- Internal helpers ---------- */

  function _getStorage(key) {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || null;
  }

  function _clearKey(key) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  /* ---------- Public API ---------- */

  /** Ambil token dari localStorage atau sessionStorage. */
  function getToken() {
    return _getStorage(TOKEN_KEY);
  }

  /** Ambil data user yang tersimpan. */
  function getUser() {
    try {
      const raw = _getStorage(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** Cek apakah user sudah login. */
  function isAuthenticated() {
    return !!getToken();
  }

  /**
   * Simpan sesi setelah login berhasil.
   * @param {string}  token    - JWT / session token
   * @param {object}  user     - Data user
   * @param {boolean} remember - true = simpan di localStorage (persistent)
   */
  function setSession(token, user, remember = false) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));
  }

  /** Hapus semua data sesi. */
  function clearSession() {
    _clearKey(TOKEN_KEY);
    _clearKey(USER_KEY);
    _clearKey(SESSION_KEY);
  }

  /**
   * Logout: hapus sesi lalu redirect.
   * @param {string} redirect - URL tujuan (default: /login.html)
   */
  function logout(redirect = '/login.html') {
    clearSession();
    window.location.replace(redirect);
  }

  /**
   * Guard halaman terproteksi.
   * Panggil di awal setiap halaman yang memerlukan login.
   * Jika tidak ada token, langsung redirect ke halaman login.
   * @param {string} redirectUrl - URL login (opsional)
   */
  function requireAuth(redirectUrl = '/login.html?reason=unauthenticated') {
    if (!isAuthenticated()) {
      window.location.replace(redirectUrl);
    }
  }

  /* ---------- Expose globally ---------- */

  const SELARASAuth = {
    getToken,
    getUser,
    isAuthenticated,
    setSession,
    clearSession,
    logout,
    requireAuth,
  };

  // Dukung kedua nama: Auth (lama) dan SELARASAuth (baru)
  window.Auth     = SELARASAuth;
  window.SELARASAuth = SELARASAuth;

})();
