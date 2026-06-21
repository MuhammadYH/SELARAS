/**
 * pengolah-auth.js
 * Location: /assets/js/pengolah-auth.js
 *
 * Standalone Supabase-only auth guard untuk area Pengolah.
 * Menggantikan: role-guard.js, session.js, SELARASSession, Auth.getUser(), SELARAS_token
 *
 * Alur:
 *   1. Ambil session dari Supabase via getSupabase().
 *   2. Tidak ada sesi → redirect ke /login.html
 *   3. Role bukan "pengolah" → redirect ke /redirect.html
 *   4. Simpan window.currentUser untuk digunakan halaman lain.
 *   5. Isi elemen sidebar user secara otomatis.
 *
 * Dependensi:
 *   - /assets/js/resik-supabase.js  (mengekspos getSupabase())
 *   Harus dimuat SETELAH resik-supabase.js, SEBELUM script halaman lainnya.
 */

(function () {
  'use strict';

  /**
   * Ekstrak role dari metadata user Supabase.
   * @param {object} user  Supabase user object
   * @returns {string|null}
   */
  function extractRole(user) {
    if (!user) return null;
    return (
      user.user_metadata?.role ||
      user.app_metadata?.role  ||
      null
    );
  }

  /**
   * Guard utama — dijalankan segera tanpa menunggu DOMContentLoaded.
   */
  async function initPengolahAuth() {
    try {
      // ── 1. Pastikan getSupabase tersedia ─────────────────────────────
      if (typeof getSupabase !== 'function') {
        console.error('[pengolah-auth] getSupabase tidak ditemukan. Pastikan resik-supabase.js dimuat lebih dulu.');
        location.replace('/login.html');
        return;
      }

      const client = await getSupabase();

      // ── 2. Ambil session aktif ───────────────────────────────────────
      const { data: { session }, error: sessionError } = await client.auth.getSession();

      if (sessionError) {
        console.error('[pengolah-auth] getSession error:', sessionError.message);
        location.replace('/login.html');
        return;
      }

      if (!session || !session.user) {
        // Tidak ada sesi valid → paksa login
        location.replace('/login.html');
        return;
      }

      const user = session.user;

      // ── 3. Validasi role ─────────────────────────────────────────────
      const role = extractRole(user);

      if (!role) {
        console.warn('[pengolah-auth] Role tidak ditemukan di metadata. Redirect ke /redirect.html');
        location.replace('/redirect.html');
        return;
      }

      if (role.toLowerCase().trim() !== 'pengolah') {
        console.warn(`[pengolah-auth] Role "${role}" bukan pengolah. Redirect ke /redirect.html`);
        location.replace('/redirect.html');
        return;
      }

      // ── 4. Simpan currentUser di window ─────────────────────────────
      window.currentUser = {
        id:        user.id,
        email:     user.email,
        role:      role.toLowerCase().trim(),
        firstName: user.user_metadata?.first_name  || '',
        lastName:  user.user_metadata?.last_name   || '',
        fullName: (
          (user.user_metadata?.first_name || '') +
          ' ' +
          (user.user_metadata?.last_name  || '')
        ).trim() || user.email?.split('@')[0] || 'Pengolah',
        metadata:  user.user_metadata || {},
      };

      // ── 5. Isi elemen sidebar user (id atau class) ───────────────────
      document.addEventListener('DOMContentLoaded', function () {
        // Versi dengan id (diset oleh provider-sidebar.js yang dipakai bersama)
        const nameById  = document.getElementById('sidebarUserName');
        const emailById = document.getElementById('sidebarUserEmail');
        if (nameById)  nameById.textContent  = window.currentUser.fullName;
        if (emailById) emailById.textContent = window.currentUser.email;

        // Versi dengan class (dipakai pengolah-sidebar.js lama)
        const nameByClass  = document.querySelector('.sidebar-user .user-name');
        const emailByClass = document.querySelector('.sidebar-user .user-email');
        if (nameByClass  && !nameById)  nameByClass.textContent  = window.currentUser.fullName;
        if (emailByClass && !emailById) emailByClass.textContent = window.currentUser.email;
      });

    } catch (err) {
      console.error('[pengolah-auth] Unexpected error:', err);
      location.replace('/login.html');
    }
  }

  // Jalankan segera — tidak tunggu DOM agar guard aktif sebelum script lain
  initPengolahAuth();

})();
