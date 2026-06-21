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
   * Isi elemen sidebar setelah user terverifikasi.
   * @param {object} currentUser  window.currentUser
   */
  function fillSidebar(currentUser) {
    function _fill() {
      const nameById  = document.getElementById('sidebarUserName');
      const emailById = document.getElementById('sidebarUserEmail');
      if (nameById)  nameById.textContent  = currentUser.fullName;
      if (emailById) emailById.textContent = currentUser.email;

      const nameByClass  = document.querySelector('.sidebar-user .user-name');
      const emailByClass = document.querySelector('.sidebar-user .user-email');
      if (nameByClass  && !nameById)  nameByClass.textContent  = currentUser.fullName;
      if (emailByClass && !emailById) emailByClass.textContent = currentUser.email;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _fill);
    } else {
      _fill();
    }
  }

  /**
   * Proses user yang sudah terverifikasi — validasi role lalu set window.currentUser.
   * @param {object} user  Supabase user object
   */
  function handleVerifiedUser(user) {
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

    fillSidebar(window.currentUser);
    console.log('[pengolah-auth] Auth OK. User:', window.currentUser.fullName, '| Role:', window.currentUser.role);
  }

  /**
   * Guard utama — menggunakan onAuthStateChange agar tidak race condition.
   *
   * Masalah dengan getSession():
   *   Supabase restore session dari localStorage secara async. Jika getSession()
   *   dipanggil sebelum restore selesai, hasilnya null → halaman redirect ke login
   *   meski user sebenarnya sudah login.
   *
   * Solusi:
   *   onAuthStateChange menunggu event INITIAL_SESSION yang hanya fired SETELAH
   *   Supabase benar-benar selesai restore session — tidak pernah false-negative.
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

      // ── 2. Guard via onAuthStateChange (INITIAL_SESSION) ─────────────
      //    Tidak pakai getSession() langsung karena race condition.
      //    Pasang timeout 8 detik sebagai safety net.
      let _resolved = false;

      const _timeout = setTimeout(function () {
        if (!_resolved) {
          _resolved = true;
          console.warn('[pengolah-auth] Timeout menunggu session. Redirect ke login.');
          location.replace('/login.html');
        }
      }, 8000);

      client.auth.onAuthStateChange(function (event, session) {
        console.log('[AUTH DEBUG] event:', event, '| session:', session);
        // Hanya proses event pertama (INITIAL_SESSION / SIGNED_IN)
        if (_resolved) return;

        // Abaikan semua event selain initial restore dan sign in
        if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') return;

        _resolved = true;
        clearTimeout(_timeout);

        if (!session || !session.user) {
          console.warn('[pengolah-auth] Tidak ada session. Redirect ke login.');
          location.replace('/login.html');
          return;
        }

        handleVerifiedUser(session.user);
      });

    } catch (err) {
      console.error('[pengolah-auth] Unexpected error:', err);
      location.replace('/login.html');
    }
  }

  // Jalankan segera — tidak tunggu DOM agar guard aktif sebelum script lain
  initPengolahAuth();

})();
