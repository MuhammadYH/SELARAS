/**
 * profileSync.js
 * ─────────────────────────────────────────────────────────────────────────────
 * SELARAS Profile Sync Module
 *
 * Mengelola sinkronisasi profil user antara Supabase DB dan UI:
 *   - Fallback jika trigger on_auth_user_created lambat / gagal
 *   - Update profil (first_name, last_name, organization — bukan role)
 *   - Upload avatar ke Supabase Storage bucket "avatars"
 *   - Cache profil aktif di window.__SELARAS_PROFILE__
 *   - Refresh sidebar setelah update
 *
 * Depends on  : supabaseClient.js, auth.js, roleGuard.js (harus dimuat lebih dulu)
 * Expose      : window.SELARAS_PROFILE
 *
 * Load order  : setelah roleGuard.js, sebelum sidebar.js
 *
 * Contoh HTML :
 *   <script src="/dashboard/shared/js/profileSync.js"></script>
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SELARAS_PROFILE = (() => {
  'use strict';

  // ── Kolom yang boleh diupdate oleh user biasa ────────────────────────────
  // Role sengaja tidak ada di sini — hanya admin yang boleh ubah role.
  const ALLOWED_UPDATE_FIELDS = [
    'first_name',
    'last_name',
    'organization',
    'avatar_url',
  ];

  // ── Nama bucket Supabase Storage untuk avatar ────────────────────────────
  const AVATAR_BUCKET = 'avatars';

  // ══════════════════════════════════════════════════════════════════════════
  // INTERNAL HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Ambil Supabase client. Melempar error jika supabaseClient.js belum dimuat.
   * @returns {Promise<SupabaseClient>}
   */
  async function _getClient() {
    if (typeof getSupabase !== 'function') {
      throw new Error('[SELARAS_PROFILE] supabaseClient.js belum dimuat.');
    }
    return await getSupabase();
  }

  /**
   * Ambil user aktif dari Supabase Auth.
   * @returns {Promise<Object|null>}
   */
  async function _getCurrentUser() {
    const sb = await _getClient();
    const { data: { user } } = await sb.auth.getUser();
    return user ?? null;
  }

  /**
   * Update cache global dan dorong ke sidebar.
   * @param {Object} profile
   */
  function _syncCache(profile) {
    window.__SELARAS_PROFILE__ = profile;

    // Sinkron ke sidebar jika sudah dirender
    if (typeof SELARAS_SIDEBAR !== 'undefined' && typeof SELARAS_SIDEBAR.updateUser === 'function') {
      const fullName = (profile.full_name && profile.full_name.trim())
        || [profile.first_name, profile.last_name].filter(Boolean).join(' ')
        || 'Pengguna';

      SELARAS_SIDEBAR.updateUser({
        name      : fullName,
        role      : profile.role,
        avatarUrl : profile.avatar_url,
      });
    }

    // Update semua elemen data-resik-* di halaman
    _updateDataAttrs(profile);
  }

  /**
   * Update elemen DOM ber-atribut data-resik-* dengan data profil terbaru.
   * @param {Object} profile
   */
  function _updateDataAttrs(profile) {
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

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * ensureProfile(user)
   * ───────────────────
   * Fallback: buat row profil jika trigger on_auth_user_created gagal / lambat.
   * Aman dipanggil berkali-kali (ON CONFLICT DO NOTHING di DB).
   *
   * Biasanya dipanggil otomatis oleh SELARAS_AUTH_CORE.getProfile() lewat retry,
   * tapi bisa juga dipanggil manual di halaman pertama setelah register.
   *
   * @param {Object} user - Supabase auth user object
   * @returns {Promise<Object|null>} profile row
   */
  async function ensureProfile(user) {
    if (!user?.id) {
      console.warn('[SELARAS_PROFILE] ensureProfile: user tidak valid.');
      return null;
    }

    const sb = await _getClient();

    // Cek apakah profil sudah ada
    const { data: existing } = await sb
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existing) {
      // Sudah ada — ambil lengkap
      return await SELARAS_AUTH_CORE.getProfile(user.id);
    }

    // Belum ada — buat manual (fallback dari trigger)
    const meta = user.user_metadata ?? {};
    const { data, error } = await sb
      .from('profiles')
      .insert({
        id           : user.id,
        email        : user.email,
        first_name   : meta.first_name   ?? '',
        last_name    : meta.last_name    ?? '',
        role         : meta.role         ?? 'buyer',
        organization : meta.organization ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('[SELARAS_PROFILE] ensureProfile gagal:', error.message);
      return null;
    }

    console.info('[SELARAS_PROFILE] Profile dibuat manual (trigger fallback).');
    _syncCache(data);
    return data;
  }

  /**
   * updateProfile(updates)
   * ──────────────────────
   * Update profil user yang sedang login.
   * Kolom `role` tidak bisa diubah lewat fungsi ini.
   *
   * @param {Object} updates - { first_name?, last_name?, organization?, avatar_url? }
   * @returns {Promise<Object>} profil yang sudah diupdate
   *
   * @example
   *   const profile = await SELARAS_PROFILE.updateProfile({
   *     first_name: 'Budi',
   *     last_name : 'Santoso',
   *     organization: 'Pesantren Darul Ulum',
   *   });
   */
  async function updateProfile(updates) {
    const user = await _getCurrentUser();
    if (!user) throw new Error('[SELARAS_PROFILE] Tidak ada sesi aktif.');

    // Filter: hanya kolom yang diizinkan
    const safeUpdates = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (key in updates) safeUpdates[key] = updates[key];
    }

    if (Object.keys(safeUpdates).length === 0) {
      throw new Error('[SELARAS_PROFILE] Tidak ada field valid untuk diupdate.');
    }

    const sb = await _getClient();
    const { data, error } = await sb
      .from('profiles')
      .update(safeUpdates)           // updated_at di-handle trigger DB
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw new Error('[SELARAS_PROFILE] updateProfile gagal: ' + error.message);

    _syncCache(data);
    return data;
  }

  /**
   * uploadAvatar(file)
   * ──────────────────
   * Upload file gambar ke Supabase Storage bucket "avatars",
   * lalu update kolom avatar_url di tabel profiles.
   *
   * Syarat bucket "avatars":
   *   - Sudah dibuat di Supabase Dashboard → Storage
   *   - Public: ✅ (agar URL bisa diakses langsung)
   *
   * @param {File} file - File dari <input type="file">
   * @returns {Promise<string>} URL publik avatar
   *
   * @example
   *   const fileInput = document.querySelector('input[type="file"]');
   *   const url = await SELARAS_PROFILE.uploadAvatar(fileInput.files[0]);
   */
  async function uploadAvatar(file) {
    if (!(file instanceof File)) {
      throw new Error('[SELARAS_PROFILE] uploadAvatar: argumen harus File.');
    }

    // Validasi tipe file
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('[SELARAS_PROFILE] Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.');
    }

    // Validasi ukuran (max 2 MB)
    const MAX_SIZE_BYTES = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error('[SELARAS_PROFILE] Ukuran file melebihi 2 MB.');
    }

    const user = await _getCurrentUser();
    if (!user) throw new Error('[SELARAS_PROFILE] Tidak ada sesi aktif.');

    const sb    = await _getClient();
    const ext   = file.name.split('.').pop();
    const path  = `${user.id}/avatar.${ext}`;   // satu file per user, otomatis overwrite

    // Upload ke Storage
    const { error: uploadError } = await sb
      .storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      throw new Error('[SELARAS_PROFILE] Upload gagal: ' + uploadError.message);
    }

    // Ambil URL publik
    const { data: urlData } = sb
      .storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(path);

    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) throw new Error('[SELARAS_PROFILE] Gagal mendapatkan URL publik avatar.');

    // Simpan URL ke profil
    await updateProfile({ avatar_url: publicUrl });

    return publicUrl;
  }

  /**
   * getCurrent()
   * ────────────
   * Ambil profil dari cache window.__SELARAS_PROFILE__.
   * Tersedia setelah SELARAS_GUARD.protect() selesai dijalankan.
   *
   * @returns {Object|null}
   *
   * @example
   *   const profile = SELARAS_PROFILE.getCurrent();
   *   console.log(profile.full_name, profile.role);
   */
  function getCurrent() {
    return window.__SELARAS_PROFILE__ ?? null;
  }

  /**
   * refresh()
   * ─────────
   * Fetch ulang profil dari DB, update cache dan sidebar.
   * Gunakan setelah operasi yang mungkin mengubah profil dari sisi lain.
   *
   * @returns {Promise<Object|null>}
   *
   * @example
   *   const fresh = await SELARAS_PROFILE.refresh();
   */
  async function refresh() {
    const user = await _getCurrentUser();
    if (!user) return null;

    if (typeof SELARAS_AUTH_CORE === 'undefined') {
      console.warn('[SELARAS_PROFILE] refresh: SELARAS_AUTH_CORE belum dimuat.');
      return null;
    }

    const profile = await SELARAS_AUTH_CORE.getProfile(user.id);
    if (profile) _syncCache(profile);
    return profile;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXPOSE
  // ══════════════════════════════════════════════════════════════════════════

  return {
    ensureProfile,
    updateProfile,
    uploadAvatar,
    getCurrent,
    refresh,
  };

})();

window.SELARAS_PROFILE = SELARAS_PROFILE;
