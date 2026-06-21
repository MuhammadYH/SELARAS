-e /**
 * auth.js
 * ─────────────────────────────────────────────
 * SELARAS Authentication Core Module
 *
 * Depends on: supabaseClient.js (harus dimuat lebih dulu)
 * Expose: window.SELARAS_AUTH_CORE
 * ─────────────────────────────────────────────
 */

/**
 * auth.js
 * ─────────────────────────────────────────────
 * SELARAS Authentication Core Module
 * Mengelola semua operasi auth: login, register,
 * logout, profile, dan redirect berbasis role.
 *
 * Depends on: resik-supabase.js (harus dimuat lebih dulu)
 * ─────────────────────────────────────────────
 */

// ── Role yang valid di sistem SELARAS ──
const SELARAS_ROLES = ['provider', 'pengolah', 'buyer', 'admin'];

// ── Mapping role → halaman tujuan setelah login ──
const ROLE_REDIRECT_MAP = {
  provider : '/dashboard/provider/',
  pengolah : '/dashboard/pengolah/',
  buyer    : '/dashboard/buyer/',
  admin    : '/dashboard/admin/',
};

// ── Halaman fallback jika role tidak dikenali ──
const FALLBACK_DASHBOARD = '/login.html';

// ── Halaman login (digunakan saat redirect balik) ──
const LOGIN_PAGE = '/login.html';

// ═══════════════════════════════════════════════════
// UTILITAS INTERNAL
// ═══════════════════════════════════════════════════

/**
 * Ambil instance Supabase dari resik-supabase.js.
 * Melempar error jika belum diinisialisasi.
 * @returns {Promise<SupabaseClient>}
 */
async function _getClient() {
  if (typeof getSupabase !== 'function') {
    throw new Error('resik-supabase.js belum dimuat sebelum auth.js');
  }
  return await getSupabase();
}

/**
 * Redirect ke halaman tujuan berdasarkan role.
 * @param {string} role
 */
function _redirectByRole(role) {
  const target = ROLE_REDIRECT_MAP[role] ?? FALLBACK_DASHBOARD;
  window.location.href = target;
}

// ═══════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════

/**
 * Daftarkan user baru ke Supabase Auth + tabel profiles.
 *
 * @param {Object} payload
 * @param {string} payload.email
 * @param {string} payload.password
 * @param {string} payload.firstName
 * @param {string} [payload.lastName]
 * @param {'provider'|'pengolah'|'buyer'|'admin'} payload.role
 * @param {string} [payload.organization]
 * @returns {Promise<{ user: Object, profile: Object }>}
 * @throws {Error} jika validasi gagal atau Supabase error
 */
async function registerUser({ email, password, firstName, lastName = '', role, organization = null }) {
  // ── Validasi client-side ──
  if (!email || !password || !firstName || !role) {
    throw new Error('Email, password, nama depan, dan role wajib diisi.');
  }
  if (!SELARAS_ROLES.includes(role)) {
    throw new Error(`Role tidak valid. Pilih: ${SELARAS_ROLES.join(', ')}`);
  }
  if (password.length < 8) {
    throw new Error('Password minimal 8 karakter.');
  }

  const sb = await _getClient();

  // ── Daftar ke Supabase Auth ──
  const { data: authData, error: authError } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name : firstName,
        last_name  : lastName,
        role       : role,
        organization: organization,
      }
    }
  });

  if (authError) throw authError;

  const user = authData.user;
  if (!user) throw new Error('Registrasi gagal: user tidak terbuat.');

  // ── Simpan profil ke tabel profiles ──
  const profilePayload = {
    id           : user.id,
    email        : email,
    first_name   : firstName,
    last_name    : lastName,
    role         : role,
    organization : organization,
    avatar_url   : null,
    is_active    : true,
    created_at   : new Date().toISOString(),
    updated_at   : new Date().toISOString(),
  };

  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .upsert(profilePayload)
    .select()
    .single();

  if (profileError) {
    // Profil gagal disimpan — log peringatan, jangan batalkan flow
    console.warn('SELARAS register: gagal simpan profil →', profileError.message);
  }

  return { user, profile: profile ?? profilePayload };
}

// ═══════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════

/**
 * Login dengan email + password.
 * Setelah berhasil, redirect ke dashboard sesuai role.
 *
 * @param {string} email
 * @param {string} password
 * @param {boolean} [autoRedirect=true] - jika false, tidak redirect otomatis
 * @returns {Promise<{ user: Object, profile: Object }>}
 */
async function loginUser(email, password, autoRedirect = true) {
  if (!email || !password) {
    throw new Error('Email dan password wajib diisi.');
  }

  const sb = await _getClient();

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const user = data.user;

  // ── Ambil profil dari tabel profiles ──
  const profile = await getProfile(user.id);

  if (autoRedirect) {
    _redirectByRole(profile?.role ?? '');
  }

  return { user, profile };
}

/**
 * Login via Google OAuth.
 * Browser akan redirect ke Google, lalu kembali ke redirectTo.
 *
 * @param {string} [redirectTo] - URL setelah OAuth berhasil
 */
async function loginWithGoogle(redirectTo = window.location.origin + '/oauth-callback.html') {
  const sb = await _getClient();
  const { error } = await sb.auth.signInWithOAuth({
    provider : 'google',
    options  : { redirectTo }
  });
  if (error) throw error;
}

// ═══════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════

/**
 * Logout user dari Supabase Auth dan redirect ke halaman login.
 *
 * @param {boolean} [redirect=true]
 */
async function logoutUser(redirect = true) {
  const sb = await _getClient();
  const { error } = await sb.auth.signOut();
  if (error) console.warn('SELARAS logout error:', error.message);
  if (redirect) window.location.href = LOGIN_PAGE;
}

// ═══════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════

/**
 * Cek apakah user sedang login.
 * @returns {Promise<boolean>}
 */
async function isLoggedIn() {
  const sb = await _getClient();
  const { data: { session } } = await sb.auth.getSession();
  return session !== null;
}

/**
 * Ambil sesi aktif lengkap (user + token).
 * @returns {Promise<Session|null>}
 */
async function getSession() {
  const sb = await _getClient();
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

/**
 * Ambil user dari sesi saat ini.
 * @returns {Promise<User|null>}
 */
async function getCurrentUser() {
  const sb = await _getClient();
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

// ═══════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════

/**
 * Ambil profil user dari tabel `profiles`.
 * Retry otomatis jika profile belum ada karena trigger lambat (race condition).
 *
 * @param {string} userId  - UUID dari auth.users
 * @param {number} [retry] - internal counter, jangan diisi manual
 * @returns {Promise<Object|null>}
 */
async function getProfile(userId, retry = 0) {
  if (!userId) return null;
  const sb = await _getClient();

  const { data, error } = await sb
    .from('profiles')
    .select('id, email, first_name, last_name, full_name, role, organization, avatar_url, is_active, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (error) {
    // PGRST116 = row tidak ditemukan — bisa terjadi jika trigger on_auth_user_created
    // belum selesai saat getProfile langsung dipanggil setelah register.
    if (error.code === 'PGRST116' && retry < 3) {
      const delay = (retry + 1) * 600; // 600ms, 1200ms, 1800ms
      console.warn(`SELARAS getProfile: profile belum ada, retry ke-${retry + 1} dalam ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getProfile(userId, retry + 1);
    }
    console.warn('SELARAS getProfile error:', error.message);
    return null;
  }
  return data;
}

/**
 * Update profil user (hanya field yang dikirim).
 * @param {string} userId
 * @param {Partial<Profile>} updates
 * @returns {Promise<Object>}
 */
async function updateProfile(userId, updates) {
  const sb = await _getClient();
  const { data, error } = await sb
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ═══════════════════════════════════════════════════
// RESET PASSWORD
// ═══════════════════════════════════════════════════

/**
 * Kirim email reset password.
 * @param {string} email
 */
async function resetPassword(email) {
  if (!email) throw new Error('Email wajib diisi.');
  const sb = await _getClient();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password.html'
  });
  if (error) throw error;
}

// ═══════════════════════════════════════════════════
// EXPORT — expose ke window agar bisa dipakai semua halaman
// ═══════════════════════════════════════════════════

window.SELARAS_AUTH_CORE = {
  // Auth
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,

  // Session
  isLoggedIn,
  getSession,
  getCurrentUser,

  // Profile
  getProfile,
  updateProfile,

  // Password
  resetPassword,

  // Helpers
  redirectByRole : _redirectByRole,
  ROLES          : SELARAS_ROLES,
  REDIRECT_MAP   : ROLE_REDIRECT_MAP,
};
