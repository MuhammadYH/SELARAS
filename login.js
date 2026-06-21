/**
 * login.js
 * ─────────────────────────────────────────────
 * SELARAS Login Page Controller
 * Mengelola form login: validasi, submit, error handling,
 * loading state, dan redirect ke dashboard.
 *
 * Depends on: resik-supabase.js → auth.js → session.js
 * ─────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════
// INIT — jalankan saat DOM siap
// ═══════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  // ── Jika sudah login, redirect langsung ──
  const existing = await SELARAS_SESSION.checkSession();
  if (existing?.profile) {
    SELARAS_AUTH_CORE.redirectByRole(existing.profile.role);
    return;
  }

  // ── Setup form ──
  _bindLoginForm();
  _bindGoogleLogin();
  _bindPasswordToggle();
  _bindForgotPassword();

  // ── Pre-fill email jika dari halaman lain ──
  _prefillEmail();
});

// ═══════════════════════════════════════════════════
// FORM BINDING
// ═══════════════════════════════════════════════════

function _bindLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await _handleLogin();
  });

  // Real-time validasi ringan
  document.getElementById('login-email')?.addEventListener('blur', _validateEmailField);
  document.getElementById('login-password')?.addEventListener('input', _clearFieldError.bind(null, 'login-password'));
}

function _bindGoogleLogin() {
  document.getElementById('btn-google-login')?.addEventListener('click', async () => {
    _setLoading(true, 'btn-google-login', 'Menghubungkan...');
    try {
      await SELARAS_AUTH_CORE.loginWithGoogle();
      // Browser akan redirect ke Google, tidak perlu lanjut
    } catch (err) {
      _showError(err.message || 'Login Google gagal.');
      _setLoading(false, 'btn-google-login', 'Masuk dengan Google');
    }
  });
}

function _bindPasswordToggle() {
  document.getElementById('toggle-password')?.addEventListener('click', () => {
    const input = document.getElementById('login-password');
    const icon  = document.getElementById('toggle-password');
    if (!input) return;
    const isHidden = input.type === 'password';
    input.type     = isHidden ? 'text' : 'password';
    icon.textContent = isHidden ? '🙈' : '👁️';
  });
}

function _bindForgotPassword() {
  document.getElementById('link-forgot-password')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value?.trim();

    if (!email) {
      _showError('Masukkan email kamu dulu, lalu klik "Lupa Password".');
      document.getElementById('login-email')?.focus();
      return;
    }

    const btn = e.currentTarget;
    btn.textContent = 'Mengirim...';
    btn.style.pointerEvents = 'none';

    try {
      await SELARAS_AUTH_CORE.resetPassword(email);
      _showSuccess('Link reset password sudah dikirim ke email kamu. Cek inbox (atau folder spam).');
    } catch (err) {
      _showError(err.message || 'Gagal mengirim email reset.');
    } finally {
      btn.textContent = 'Lupa Password?';
      btn.style.pointerEvents = '';
    }
  });
}

// ═══════════════════════════════════════════════════
// HANDLER LOGIN UTAMA
// ═══════════════════════════════════════════════════

async function _handleLogin() {
  _clearAllErrors();

  const email    = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;

  // ── Validasi ──
  let hasError = false;
  if (!email)    { _setFieldError('login-email',    'Email wajib diisi.');    hasError = true; }
  if (!password) { _setFieldError('login-password', 'Password wajib diisi.'); hasError = true; }
  if (hasError) return;

  _setLoading(true, 'btn-login', 'Masuk...');
  _showError('');

  try {
    const { profile } = await SELARAS_AUTH_CORE.loginUser(email, password, false);

    // ── Cek apakah akun aktif ──
    if (profile?.is_active === false) {
      throw new Error('Akun kamu tidak aktif. Hubungi admin SELARAS.');
    }

    // ── Redirect ke return URL atau dashboard sesuai role ──
    const returnUrl = SELARAS_SESSION.getReturnUrl();
    if (returnUrl) {
      window.location.href = returnUrl;
    } else {
      SELARAS_AUTH_CORE.redirectByRole(profile?.role ?? '');
    }

  } catch (err) {
    const msg = _translateAuthError(err.message);
    _showError(msg);
  } finally {
    _setLoading(false, 'btn-login', 'Masuk');
  }
}

// ═══════════════════════════════════════════════════
// VALIDASI FIELD
// ═══════════════════════════════════════════════════

function _validateEmailField() {
  const val = document.getElementById('login-email')?.value?.trim();
  if (!val) {
    _setFieldError('login-email', 'Email wajib diisi.');
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
    _setFieldError('login-email', 'Format email tidak valid.');
    return false;
  }
  _clearFieldError('login-email');
  return true;
}

// ═══════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════

/**
 * Toggle loading state pada tombol submit.
 * @param {boolean} loading
 * @param {string} btnId
 * @param {string} loadingText
 */
function _setLoading(loading, btnId, loadingText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled     = loading;
  btn.textContent  = loading ? loadingText : btn.dataset.defaultText || btn.textContent;
  if (!loading && btn.dataset.defaultText) btn.textContent = btn.dataset.defaultText;
}

/**
 * Tampilkan error utama (banner di atas form).
 * @param {string} msg - kosong untuk menyembunyikan
 */
function _showError(msg) {
  const el = document.getElementById('login-error');
  if (!el) return;
  el.textContent    = msg;
  el.style.display  = msg ? 'block' : 'none';
}

/**
 * Tampilkan pesan sukses.
 * @param {string} msg
 */
function _showSuccess(msg) {
  const el = document.getElementById('login-success');
  if (!el) return;
  el.textContent   = msg;
  el.style.display = msg ? 'block' : 'none';
}

/**
 * Tampilkan error di bawah field spesifik.
 * Tambahkan <span id="{fieldId}-error" class="field-error"></span> di HTML.
 */
function _setFieldError(fieldId, msg) {
  const field = document.getElementById(fieldId);
  const errEl = document.getElementById(`${fieldId}-error`);
  if (field) field.setAttribute('aria-invalid', 'true');
  if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
}

function _clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  const errEl = document.getElementById(`${fieldId}-error`);
  if (field) field.removeAttribute('aria-invalid');
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
}

function _clearAllErrors() {
  _showError('');
  _showSuccess('');
  ['login-email', 'login-password'].forEach(_clearFieldError);
}

/** Pre-fill email dari query param (?email=...) atau sessionStorage */
function _prefillEmail() {
  const params    = new URLSearchParams(window.location.search);
  const emailParam = params.get('email') || sessionStorage.getItem('resik_register_email');
  const emailInput = document.getElementById('login-email');
  if (emailParam && emailInput) {
    emailInput.value = emailParam;
    sessionStorage.removeItem('resik_register_email');
  }
}

/**
 * Terjemahkan pesan error Supabase ke Bahasa Indonesia.
 * @param {string} msg
 * @returns {string}
 */
function _translateAuthError(msg = '') {
  const map = {
    'Invalid login credentials'         : 'Email atau password salah. Coba lagi.',
    'Email not confirmed'               : 'Email belum diverifikasi. Cek inbox-mu.',
    'Too many requests'                 : 'Terlalu banyak percobaan. Coba lagi nanti.',
    'User not found'                    : 'Akun tidak ditemukan.',
    'Password should be at least 6 characters' : 'Password minimal 6 karakter.',
    'Network request failed'            : 'Koneksi gagal. Cek internet-mu.',
  };

  for (const [key, val] of Object.entries(map)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return msg || 'Terjadi kesalahan. Coba lagi.';
}
