/**
 * roleGuard.js
 * ─────────────────────────────────────────────
 * SELARAS Role Guard
 *
 * Middleware proteksi halaman berbasis role.
 * Jalankan satu baris ini di setiap halaman dashboard:
 *
 *   SELARAS_GUARD.protect(['admin']);
 *
 * Flow:
 *   1. Cek sesi aktif → jika tidak ada → redirect ke login
 *   2. Ambil role dari profil
 *   3. Cocokkan dengan allowedRoles
 *   4. Jika tidak cocok → redirect ke /unauthorized.html
 *   5. Jika cocok → isi UI dengan data user, lanjut render halaman
 *
 * Depends on: supabaseClient.js, auth.js, session.js, redirect.js
 * Expose: window.SELARAS_GUARD
 * ─────────────────────────────────────────────
 */

const SELARAS_GUARD = (() => {

  /**
   * Proteksi halaman berdasarkan role.
   * Blokir render konten sampai auth selesai dicek.
   *
   * @param {string[]} allowedRoles  - role yang boleh akses, contoh: ['admin']
   * @param {Object}   [options]
   * @param {string}   [options.loginPage]       - default '/login.html'
   * @param {string}   [options.unauthorizedPage] - default '/unauthorized.html'
   * @returns {Promise<{ user, profile } | void>}
   */
  async function protect(allowedRoles = [], {
    loginPage       = '/login.html',
    unauthorizedPage = '/unauthorized.html',
  } = {}) {

    _showOverlay(true);

    try {
      // ── 1. Cek sesi ──────────────────────────────────────────────────────
      const session = await SELARAS_AUTH_CORE.getSession();

      if (!session) {
        SELARAS_REDIRECT.saveReturnUrl();
        window.location.href = loginPage;
        return;
      }

      // ── 2. Ambil profil ───────────────────────────────────────────────────
      const profile = await SELARAS_AUTH_CORE.getProfile(session.user.id);

      if (!profile) {
        // Profil tidak ditemukan — paksa logout
        await SELARAS_AUTH_CORE.logoutUser(false);
        window.location.href = loginPage;
        return;
      }

      // ── 3. Cek role ───────────────────────────────────────────────────────
      if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
        window.location.href = unauthorizedPage;
        return;
      }

      // ── 4. Isi UI dengan data user ────────────────────────────────────────
      _populateUI(profile);

      // ── 5. Simpan ke cache global ─────────────────────────────────────────
      window.__SELARAS_USER__    = session.user;
      window.__SELARAS_PROFILE__ = profile;

      // ── 6. Dispatch event — halaman bisa listen ini ───────────────────────
      document.dispatchEvent(new CustomEvent('resik:ready', {
        detail: { user: session.user, profile }
      }));

      return { user: session.user, profile };

    } catch (err) {
      console.error('SELARAS roleGuard error:', err.message);
      window.location.href = loginPage;
    } finally {
      _showOverlay(false);
    }
  }

  /**
   * Ambil user yang sedang login dari cache.
   * Hanya tersedia setelah protect() selesai.
   * @returns {{ user, profile } | null}
   */
  function getCurrentContext() {
    const user    = window.__SELARAS_USER__;
    const profile = window.__SELARAS_PROFILE__;
    if (!user || !profile) return null;
    return { user, profile };
  }

  // ── UI Helpers ────────────────────────────────────────────────────────────

  /**
   * Isi elemen HTML dengan data user.
   * Gunakan atribut data-resik-* di HTML:
   *
   *   <span data-resik-name></span>
   *   <span data-resik-email></span>
   *   <span data-resik-role></span>
   *   <img  data-resik-avatar />
   *   <span data-resik-org></span>
   */
  function _populateUI(profile) {
    // Utamakan full_name (computed column dari DB), fallback ke gabung manual
    const fullName = (profile.full_name && profile.full_name.trim())
      || [profile.first_name, profile.last_name].filter(Boolean).join(' ')
      || 'Pengguna';

    const ROLE_LABELS = {
      admin    : 'Admin',
      provider : 'Provider',
      pengolah : 'Pengolah',
      buyer    : 'Buyer',
    };

    const set = (attr, value) => {
      document.querySelectorAll(`[data-resik-${attr}]`).forEach(el => {
        if (el.tagName === 'IMG') {
          el.src = value || '/assets/images/default-avatar.png';
        } else {
          el.textContent = value || '';
        }
      });
    };

    set('name',   fullName);
    set('email',  profile.email);
    set('role',   ROLE_LABELS[profile.role] ?? profile.role ?? '');
    set('avatar', profile.avatar_url);
    set('org',    profile.organization);
  }

  function _showOverlay(show) {
    const overlay = document.getElementById('resik-loading-overlay');
    if (!overlay) return;
    overlay.style.display = show ? 'flex' : 'none';
  }

  return { protect, getCurrentContext };

})();

window.SELARAS_GUARD = SELARAS_GUARD;
