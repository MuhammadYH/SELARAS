/**
 * register.js
 * ─────────────────────────────────────────────
 * SELARAS Register Page Controller
 * Mengelola form registrasi: validasi, submit,
 * pemilihan role, loading state, dan redirect.
 *
 * Depends on: resik-supabase.js → auth.js → session.js
 * ─────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  // ── Jika sudah login, redirect ──
  const existing = await SELARAS_SESSION.checkSession();
  if (existing?.profile) {
    SELARAS_AUTH_CORE.redirectByRole(existing.profile.role);
    return;
  }

  _buildRoleOptions();
  _bindRegisterForm();
  _bindPasswordToggle();
  _bindPasswordStrength();
  _bindRoleChange();
  _bindGoogleRegister();
});

// ═══════════════════════════════════════════════════
// ROLE OPTIONS — build dinamis dari SELARAS_AUTH_CORE.ROLES
// ═══════════════════════════════════════════════════

/** Label & deskripsi untuk setiap role */
const ROLE_META = {
  provider : {
    label : 'Provider',
    desc  : 'Produsen / penghasil limbah organik (restoran, hotel, pasar, dll.)',
    icon  : '🏭',
  },
  pengolah : {
    label : 'Pengolah',
    desc  : 'Unit yang mengolah limbah menjadi produk bernilai.',
    icon  : '♻️',
  },
  buyer : {
    label : 'Buyer',
    desc  : 'Pembeli produk hasil olahan (pupuk, biogas, dll.).',
    icon  : '🛒',
  },
  admin : {
    label : 'Admin',
    desc  : 'Pengelola platform SELARAS (akses penuh).',
    icon  : '🔑',
  },
};

function _buildRoleOptions() {
  const container = document.getElementById('role-options');
  if (!container) return;

  SELARAS_AUTH_CORE.ROLES.forEach(role => {
    const meta  = ROLE_META[role] ?? { label: role, desc: '', icon: '👤' };
    const label = document.createElement('label');
    label.className     = 'role-option';
    label.dataset.role  = role;
    label.innerHTML = `
      <input type="radio" name="role" value="${role}" id="role-${role}" required>
      <span class="role-icon">${meta.icon}</span>
      <span class="role-content">
        <strong class="role-label">${meta.label}</strong>
        <small class="role-desc">${meta.desc}</small>
      </span>
    `;
    container.appendChild(label);
  });
}

// ═══════════════════════════════════════════════════
// FORM BINDING
// ═══════════════════════════════════════════════════

function _bindRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await _handleRegister();
  });

  // Validasi real-time
  document.getElementById('reg-email')?.addEventListener('blur',  _validateRegEmail);
  document.getElementById('reg-firstname')?.addEventListener('blur', () => {
    const val = document.getElementById('reg-firstname')?.value?.trim();
    if (!val) _setFieldError('reg-firstname', 'Nama depan wajib diisi.');
    else _clearFieldError('reg-firstname');
  });
}

function _bindPasswordToggle() {
  ['toggle-password', 'toggle-confirm'].forEach(btnId => {
    document.getElementById(btnId)?.addEventListener('click', () => {
      const targetId = btnId === 'toggle-password' ? 'reg-password' : 'reg-confirm-password';
      const input    = document.getElementById(targetId);
      const icon     = document.getElementById(btnId);
      if (!input) return;
      const isHidden = input.type === 'password';
      input.type     = isHidden ? 'text' : 'password';
      if (icon) icon.textContent = isHidden ? '🙈' : '👁️';
    });
  });
}

function _bindPasswordStrength() {
  document.getElementById('reg-password')?.addEventListener('input', (e) => {
    _updatePasswordStrength(e.target.value);
  });
  document.getElementById('reg-confirm-password')?.addEventListener('input', _validatePasswordMatch);
}

function _bindRoleChange() {
  const orgGroup = document.getElementById('org-group');
  document.querySelectorAll('input[name="role"]').forEach(radio => {
    radio.addEventListener('change', () => {
      // Tampilkan field organisasi hanya untuk non-admin
      if (orgGroup) {
        orgGroup.style.display = radio.value !== 'admin' ? 'block' : 'none';
      }
    });
  });
}

function _bindGoogleRegister() {
  document.getElementById('btn-google-register')?.addEventListener('click', async () => {
    _setLoading(true, 'btn-google-register', 'Menghubungkan...');
    try {
      await SELARAS_AUTH_CORE.loginWithGoogle();
    } catch (err) {
      _showError(err.message || 'Login Google gagal.');
      _setLoading(false, 'btn-google-register', 'Daftar dengan Google');
    }
  });
}

// ═══════════════════════════════════════════════════
// HANDLER REGISTER UTAMA
// ═══════════════════════════════════════════════════

async function _handleRegister() {
  _clearAllErrors();

  // ── Ambil nilai form ──
  const firstName = document.getElementById('reg-firstname')?.value?.trim();
  const lastName  = document.getElementById('reg-lastname')?.value?.trim() ?? '';
  const email     = document.getElementById('reg-email')?.value?.trim();
  const password  = document.getElementById('reg-password')?.value;
  const confirm   = document.getElementById('reg-confirm-password')?.value;
  const role      = document.querySelector('input[name="role"]:checked')?.value;
  const org       = document.getElementById('reg-organization')?.value?.trim() ?? null;
  const agreeEl   = document.getElementById('reg-agree-terms');

  // ── Validasi ──
  let hasError = false;

  if (!firstName) { _setFieldError('reg-firstname', 'Nama depan wajib diisi.'); hasError = true; }
  if (!email)      { _setFieldError('reg-email',     'Email wajib diisi.');      hasError = true; }
  else if (!_isValidEmail(email)) { _setFieldError('reg-email', 'Format email tidak valid.'); hasError = true; }

  if (!password)   { _setFieldError('reg-password',  'Password wajib diisi.');   hasError = true; }
  else if (password.length < 8) { _setFieldError('reg-password', 'Password minimal 8 karakter.'); hasError = true; }

  if (password && confirm && password !== confirm) {
    _setFieldError('reg-confirm-password', 'Konfirmasi password tidak cocok.');
    hasError = true;
  }

  if (!role) { _showError('Pilih role kamu terlebih dahulu.'); hasError = true; }
  if (agreeEl && !agreeEl.checked) { _showError('Kamu harus menyetujui syarat & ketentuan.'); hasError = true; }

  if (hasError) return;

  _setLoading(true, 'btn-register', 'Mendaftarkan...');
  _showError('');

  try {
    await SELARAS_AUTH_CORE.registerUser({
      email, password, firstName, lastName, role, organization: org
    });

    // ── Simpan email agar bisa pre-fill di halaman login ──
    sessionStorage.setItem('resik_register_email', email);

    // ── Tampilkan pesan sukses ──
    _showSuccess(
      `✅ Berhasil daftar! Cek email <strong>${email}</strong> untuk verifikasi, ` +
      `lalu <a href="/login.html">masuk di sini</a>.`
    );

    // ── Reset form ──
    document.getElementById('register-form')?.reset();

  } catch (err) {
    const msg = _translateRegError(err.message);
    _showError(msg);
  } finally {
    _setLoading(false, 'btn-register', 'Daftar Sekarang');
  }
}

// ═══════════════════════════════════════════════════
// VALIDASI HELPERS
// ═══════════════════════════════════════════════════

function _validateRegEmail() {
  const val = document.getElementById('reg-email')?.value?.trim();
  if (!val)               { _setFieldError('reg-email', 'Email wajib diisi.'); return false; }
  if (!_isValidEmail(val)){ _setFieldError('reg-email', 'Format email tidak valid.'); return false; }
  _clearFieldError('reg-email');
  return true;
}

function _validatePasswordMatch() {
  const pw  = document.getElementById('reg-password')?.value;
  const cfm = document.getElementById('reg-confirm-password')?.value;
  if (cfm && pw !== cfm) {
    _setFieldError('reg-confirm-password', 'Password tidak cocok.');
    return false;
  }
  _clearFieldError('reg-confirm-password');
  return true;
}

function _isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ═══════════════════════════════════════════════════
// PASSWORD STRENGTH METER
// ═══════════════════════════════════════════════════

function _updatePasswordStrength(pw) {
  const bar   = document.getElementById('strength-bar');
  const label = document.getElementById('strength-label');
  if (!bar && !label) return;

  let score = 0;
  if (pw.length >= 8)                     score++;
  if (pw.length >= 12)                    score++;
  if (/[A-Z]/.test(pw))                  score++;
  if (/[0-9]/.test(pw))                  score++;
  if (/[^A-Za-z0-9]/.test(pw))          score++;

  const levels = [
    { text: '', color: '#e0e0e0', pct: 0 },
    { text: 'Sangat Lemah',  color: '#e53935', pct: 20 },
    { text: 'Lemah',         color: '#fb8c00', pct: 40 },
    { text: 'Cukup',         color: '#fdd835', pct: 60 },
    { text: 'Kuat',          color: '#43a047', pct: 80 },
    { text: 'Sangat Kuat',   color: '#00897b', pct: 100 },
  ];

  const level = levels[Math.min(score, levels.length - 1)];
  if (bar) {
    bar.style.width      = `${level.pct}%`;
    bar.style.background = level.color;
  }
  if (label) {
    label.textContent   = level.text;
    label.style.color   = level.color;
  }
}

// ═══════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════

function _setLoading(loading, btnId, loadingText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled    = loading;
  if (!btn.dataset.defaultText) btn.dataset.defaultText = btn.textContent;
  btn.textContent = loading ? loadingText : btn.dataset.defaultText;
}

function _showError(msg) {
  const el = document.getElementById('register-error');
  if (!el) return;
  el.innerHTML     = msg;
  el.style.display = msg ? 'block' : 'none';
}

function _showSuccess(msg) {
  const el = document.getElementById('register-success');
  if (!el) return;
  el.innerHTML     = msg;
  el.style.display = msg ? 'block' : 'none';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

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
  ['reg-email', 'reg-firstname', 'reg-password', 'reg-confirm-password'].forEach(_clearFieldError);
}

function _translateRegError(msg = '') {
  const map = {
    'User already registered'                  : 'Email ini sudah terdaftar. Coba login.',
    'Password should be at least 6 characters' : 'Password minimal 6 karakter.',
    'Unable to validate email address'         : 'Format email tidak valid.',
    'Network request failed'                   : 'Koneksi gagal. Cek internet-mu.',
    'signup is disabled'                       : 'Pendaftaran sedang dinonaktifkan. Hubungi admin.',
  };
  for (const [key, val] of Object.entries(map)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return msg || 'Terjadi kesalahan. Coba lagi.';
}
