/**
 * session.js
 * ─────────────────────────────────────────────
 * SELARAS Session Guard
 * Gunakan script ini di setiap halaman yang perlu dilindungi.
 *
 * Cara pakai — taruh di <head> sebelum konten lain:
 *   <script src="assets/js/resik-supabase.js"></script>
 *   <script src="assets/js/auth.js"></script>
 *   <script src="assets/js/session.js"></script>
 *
 * Fitur:
 *   • Cek sesi aktif saat halaman dimuat
 *   • Redirect ke login jika belum login
 *   • Isi elemen UI dengan data user (nama, role, avatar)
 *   • Dengarkan perubahan auth state secara real-time
 *   • Expose SELARAS_SESSION untuk dipakai halaman lain
 * ─────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════
// STATE GLOBAL SESSION
// ═══════════════════════════════════════════════════

/** Cache sesi agar tidak hit DB berulang kali */
const _sessionCache = {
  user    : null,
  profile : null,
  loading : false,
};

// ═══════════════════════════════════════════════════
// GUARD — Proteksi halaman
// ═══════════════════════════════════════════════════

/**
 * Proteksi halaman: jika tidak ada sesi aktif, redirect ke login.
 * Opsional: batasi akses berdasarkan role tertentu.
 *
 * @param {Object} [options]
 * @param {string[]} [options.allowedRoles]   - jika diisi, hanya role ini yang boleh akses
 * @param {string}   [options.redirectTo]     - halaman login (default: /login.html)
 * @param {string}   [options.forbiddenPage]  - halaman jika role tidak cocok
 * @returns {Promise<{ user: Object, profile: Object }>}
 */
async function requireAuth({
  allowedRoles  = [],
  redirectTo    = '/login.html',
  forbiddenPage = '/unauthorized.html',
} = {}) {
  _sessionCache.loading = true;
  _showLoadingOverlay(true);

  try {
    const session = await SELARAS_AUTH_CORE.getSession();

    // ── Tidak ada sesi → ke login ──
    if (!session) {
      _saveReturnUrl();
      window.location.href = redirectTo;
      return; // hentikan eksekusi
    }

    const user = session.user;

    // ── Ambil profil ──
    const profile = await SELARAS_AUTH_CORE.getProfile(user.id);

    // ── Cek role jika ada pembatasan ──
    if (allowedRoles.length > 0 && !allowedRoles.includes(profile?.role)) {
      window.location.href = forbiddenPage;
      return;
    }

    // ── Simpan ke cache ──
    _sessionCache.user    = user;
    _sessionCache.profile = profile;

    // ── Isi elemen UI ──
    _populateUserUI(profile ?? {});

    return { user, profile };
  } catch (err) {
    console.error('SELARAS requireAuth error:', err.message);
    window.location.href = redirectTo;
  } finally {
    _sessionCache.loading = false;
    _showLoadingOverlay(false);
  }
}

/**
 * Versi ringan: cek sesi tanpa redirect.
 * Cocok untuk halaman publik yang ingin tahu status login.
 * @returns {Promise<{ user, profile } | null>}
 */
async function checkSession() {
  try {
    const session = await SELARAS_AUTH_CORE.getSession();
    if (!session) return null;

    const profile = await SELARAS_AUTH_CORE.getProfile(session.user.id);
    _sessionCache.user    = session.user;
    _sessionCache.profile = profile;
    _populateUserUI(profile ?? {});
    return { user: session.user, profile };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════
// AUTH STATE LISTENER — reaksi real-time
// ═══════════════════════════════════════════════════

/**
 * Dengarkan perubahan status auth (login / logout / token refresh).
 * Panggil sekali saat halaman pertama kali dimuat.
 */
async function listenAuthChanges(callback = null) {
  const sb = await getSupabase();
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      _sessionCache.user    = null;
      _sessionCache.profile = null;
      if (callback) callback(event, null, null);
      return;
    }

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      const profile = await SELARAS_AUTH_CORE.getProfile(session.user.id);
      _sessionCache.user    = session.user;
      _sessionCache.profile = profile;
      _populateUserUI(profile ?? {});
      if (callback) callback(event, session.user, profile);
    }
  });
}

// ═══════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════

/**
 * Isi elemen HTML dengan data user.
 * Gunakan data-resik-* attribute di HTML kamu:
 *
 *   <span data-resik-name></span>       → nama lengkap
 *   <span data-resik-email></span>      → email
 *   <span data-resik-role></span>       → role
 *   <img  data-resik-avatar />          → foto profil
 *   <span data-resik-org></span>        → organisasi
 */
function _populateUserUI(profile) {
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Pengguna';

  const set = (attr, value) => {
    document.querySelectorAll(`[data-resik-${attr}]`).forEach(el => {
      if (el.tagName === 'IMG') el.src = value || '/assets/images/default-avatar.png';
      else el.textContent = value || '';
    });
  };

  set('name',   fullName);
  set('email',  profile.email);
  set('role',   _formatRole(profile.role));
  set('avatar', profile.avatar_url);
  set('org',    profile.organization);
}

/**
 * Format role untuk tampilan (capitalize).
 * @param {string} role
 * @returns {string}
 */
function _formatRole(role) {
  const labels = {
    provider : 'Provider',
    pengolah : 'Pengolah',
    buyer    : 'Buyer',
    admin    : 'Admin',
  };
  return labels[role] ?? role ?? '';
}

/**
 * Tampilkan/sembunyikan loading overlay global.
 * Buat elemen dengan id="resik-loading-overlay" di HTML-mu.
 * @param {boolean} show
 */
function _showLoadingOverlay(show) {
  const overlay = document.getElementById('resik-loading-overlay');
  if (!overlay) return;
  overlay.style.display = show ? 'flex' : 'none';
}

/**
 * Simpan URL sekarang ke sessionStorage agar bisa kembali setelah login.
 */
function _saveReturnUrl() {
  const current = window.location.href;
  if (!current.includes('login.html') && !current.includes('register.html')) {
    sessionStorage.setItem('resik_return_url', current);
  }
}

/**
 * Ambil return URL lalu hapus dari storage.
 * @returns {string|null}
 */
function getReturnUrl() {
  const url = sessionStorage.getItem('resik_return_url');
  sessionStorage.removeItem('resik_return_url');
  return url;
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

window.SELARAS_SESSION = {
  requireAuth,
  checkSession,
  listenAuthChanges,
  getReturnUrl,

  /** Ambil user dari cache (tanpa async) */
  get user()    { return _sessionCache.user; },
  /** Ambil profil dari cache (tanpa async) */
  get profile() { return _sessionCache.profile; },
  /** Cek apakah sedang loading */
  get loading() { return _sessionCache.loading; },
};
