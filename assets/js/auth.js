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
  async function logout(redirect = '/login.html') {
    // Sign out dari Supabase jika tersedia
    if (typeof supabase !== 'undefined') {
      try { await supabase.auth.signOut(); } catch (_) {}
    } else if (typeof getSupabase === 'function') {
      try { const sb = await getSupabase(); await sb.auth.signOut(); } catch (_) {}
    }
    clearSession();
    try { sessionStorage.removeItem('resik_post_login'); } catch (_) {}
    window.location.replace(redirect);
  }

  /**
   * Redirect ke /redirect.html setelah login berhasil.
   * Gunakan ini sebagai pengganti window.location langsung.
   * @param {string|null} nextUrl - deep-link opsional (absolute path)
   */
  function redirectAfterLogin(nextUrl) {
    try { sessionStorage.setItem('resik_post_login', '1'); } catch (_) {}
    let target = '/redirect.html';
    if (nextUrl && nextUrl.startsWith('/')) {
      target += '?next=' + encodeURIComponent(nextUrl);
    }
    window.location.replace(target);
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

  /* ---------- Supabase auth state listener ---------- */
  // Auto-kick ke login jika token expired saat berada di halaman role
  (function _initAuthListener() {
    function _attachListener(sb) {
      if (!sb || typeof sb.auth?.onAuthStateChange !== 'function') return;
      sb.auth.onAuthStateChange(function (event, session) {
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          const roleFolders = ['/admin/', '/provider/', '/pengolah/', '/buyer/'];
          const isRolePage = roleFolders.some(function (f) {
            return window.location.pathname.startsWith(f);
          });
          if (isRolePage) window.location.replace('/login.html');
        }
      });
    }
    // Coba attach saat DOM siap
    if (typeof supabase !== 'undefined') {
      _attachListener(supabase);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        if (typeof supabase !== 'undefined') _attachListener(supabase);
        else if (typeof getSupabase === 'function') {
          getSupabase().then(_attachListener).catch(function () {});
        }
      });
    }
  })();

  /* ---------- Expose globally ---------- */

  const SELARASAuth = {
    getToken,
    getUser,
    isAuthenticated,
    setSession,
    clearSession,
    logout,
    requireAuth,
    redirectAfterLogin,
  };

  // Dukung kedua nama: Auth (lama) dan SELARASAuth (baru)
  window.Auth     = SELARASAuth;
  window.SELARASAuth = SELARASAuth;

})();
