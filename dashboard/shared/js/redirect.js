/**
 * redirect.js
 * ─────────────────────────────────────────────
 * SELARAS Redirect Manager
 *
 * Mengelola alur redirect setelah login berhasil:
 *   1. Cek apakah ada return URL tersimpan di sessionStorage
 *   2. Jika ada → redirect ke sana (jika role cocok)
 *   3. Jika tidak → redirect ke dashboard default role
 *
 * Depends on: supabaseClient.js, auth.js, session.js
 * Expose: window.SELARAS_REDIRECT
 * ─────────────────────────────────────────────
 */

const SELARAS_REDIRECT = (() => {

  const ROLE_HOME = {
    admin    : '/dashboard/admin/',
    provider : '/dashboard/provider/',
    pengolah : '/dashboard/pengolah/',
    buyer    : '/dashboard/buyer/',
  };

  const ROLE_ALLOWED_PREFIX = {
    admin    : ['/dashboard/admin/'],
    provider : ['/dashboard/provider/'],
    pengolah : ['/dashboard/pengolah/'],
    buyer    : ['/dashboard/buyer/'],
  };

  /**
   * Redirect setelah login berhasil.
   * Prioritas: returnUrl (jika valid untuk role) → dashboard role.
   * @param {string} role
   */
  function afterLogin(role) {
    const returnUrl = _consumeReturnUrl();
    if (returnUrl && _isUrlAllowedForRole(returnUrl, role)) {
      window.location.href = returnUrl;
      return;
    }
    toRoleDashboard(role);
  }

  /**
   * Redirect langsung ke dashboard sesuai role.
   * @param {string} role
   */
  function toRoleDashboard(role) {
    const target = ROLE_HOME[role];
    if (!target) {
      console.warn(`SELARAS redirect: role "${role}" tidak dikenali → ke login`);
      window.location.href = '/login.html';
      return;
    }
    window.location.href = target;
  }

  /**
   * Simpan URL saat ini ke sessionStorage.
   * Dipanggil oleh roleGuard saat menolak akses.
   */
  function saveReturnUrl() {
    const current = window.location.href;
    const blocked = ['/login.html', '/unauthorized.html', '/register.html'];
    const isBlocked = blocked.some(p => current.includes(p));
    if (!isBlocked) {
      sessionStorage.setItem('resik_return_url', current);
    }
  }

  function _consumeReturnUrl() {
    const url = sessionStorage.getItem('resik_return_url');
    sessionStorage.removeItem('resik_return_url');
    return url || null;
  }

  function _isUrlAllowedForRole(url, role) {
    const allowed = ROLE_ALLOWED_PREFIX[role] ?? [];
    try {
      const pathname = new URL(url).pathname;
      return allowed.some(prefix => pathname.startsWith(prefix));
    } catch {
      return false;
    }
  }

  return { afterLogin, toRoleDashboard, saveReturnUrl, ROLE_HOME };
})();

window.SELARAS_REDIRECT = SELARAS_REDIRECT;
