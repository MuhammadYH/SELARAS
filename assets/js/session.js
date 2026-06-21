/**
 * session.js
 * Loads and manages the current user session object.
 * Exposes window.__session and helpers.
 */
(function () {
  'use strict';

  function loadSession() {
    try {
      const raw = sessionStorage.getItem('SELARAS_session');
      if (raw) return JSON.parse(raw);
    } catch (_) {}

    // Fallback: decode JWT payload (no signature validation — server must validate)
    const token = localStorage.getItem('SELARAS_token') || sessionStorage.getItem('SELARAS_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload || null;
    } catch (_) {
      return null;
    }
  }

  const session = loadSession();
  window.__session = session;

  // Expose helpers
  window.SELARASSession = {
    get:      function ()  { return window.__session; },
    getUser:  function ()  { return (window.__session || {}).user  || null; },
    getRole:  function ()  { return ((window.__session || {}).role || '').toLowerCase().trim(); },
    getName:  function ()  { return (window.__session || {}).name  || 'Pengguna'; },
    getEmail: function ()  { return (window.__session || {}).email || ''; },
  };

  /* ── Supabase-aware role helper (async) ─────────────────────────
     role-guard.js dan redirect.js membaca role dari Supabase session.
     Fungsi ini menjadi jembatan antara SELARASSession (sync/legacy)
     dan Supabase auth (async).
  ──────────────────────────────────────────────────────────────── */
  window.ResikSession = {
    /**
     * Get role dari Supabase session.
     * Fallback ke SELARASSession jika Supabase tidak tersedia.
     * @returns {Promise<string|null>}
     */
    getRole: async function () {
      // Coba via Supabase
      const sb = (typeof supabase !== 'undefined') ? supabase
               : (typeof getSupabase === 'function') ? await getSupabase().catch(() => null)
               : null;
      if (sb) {
        try {
          const { data: { session } } = await sb.auth.getSession();
          if (session?.user) {
            const role =
              session.user.user_metadata?.role ||
              session.user.app_metadata?.role  ||
              null;
            if (role) return role.toLowerCase().trim();
          }
        } catch (_) {}
      }
      // Fallback ke SELARAS session
      return window.SELARASSession.getRole() || null;
    },

    /**
     * Returns true jika ada session aktif.
     * @returns {Promise<boolean>}
     */
    isAuthenticated: async function () {
      const sb = (typeof supabase !== 'undefined') ? supabase
               : (typeof getSupabase === 'function') ? await getSupabase().catch(() => null)
               : null;
      if (sb) {
        try {
          const { data: { session } } = await sb.auth.getSession();
          if (session) return true;
        } catch (_) {}
      }
      // Fallback ke token lokal
      return !!(localStorage.getItem('SELARAS_token') || sessionStorage.getItem('SELARAS_token'));
    },
  };
})();
