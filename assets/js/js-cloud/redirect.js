/**
 * redirect.js
 * Location: /assets/js/redirect.js
 *
 * Transit routing logic. Reads session, determines role,
 * and sends the user to the correct dashboard.
 *
 * Dependencies:
 *   - /assets/js/resik-supabase.js  (exposes `supabase` client)
 *   - /assets/js/session.js         (exposes SelarasSession or similar helper)
 */

(function () {
  'use strict';

  /* ─── Role → default landing page map ──────────────────────────── */
  const ROLE_DEFAULTS = {
    admin:    '/admin/admin-dashboard.html',
    provider: '/provider/provider-dashboard.html',
    pengolah: '/pengolah/pengolah-dashboard.html',
    buyer:    '/buyer/buyer-marketplace.html',
  };

  /* ─── DOM helpers ───────────────────────────────────────────────── */
  const $loading = document.getElementById('loadingState');
  const $error   = document.getElementById('errorState');
  const $status  = document.getElementById('statusMsg');
  const $errTitle = document.getElementById('errorTitle');
  const $errMsg   = document.getElementById('errorMsg');

  function setStatus(msg) {
    if ($status) $status.textContent = msg;
  }

  function showError(title, msg) {
    if ($loading) $loading.classList.add('hidden');
    if ($error)   $error.classList.add('visible');
    if ($errTitle) $errTitle.textContent = title || 'Akses Ditolak';
    if ($errMsg)   $errMsg.textContent   = msg   || 'Terjadi kesalahan.';
  }

  /* ─── Safe redirect (prevents open-redirect abuse) ─────────────── */
  function safeRedirect(url) {
    // Only allow same-origin absolute paths
    if (!url || !url.startsWith('/')) {
      showError('Redirect Tidak Valid', 'URL tujuan tidak dikenali.');
      return;
    }
    window.location.replace(url);
  }

  /* ─── Wait until supabase client is ready ──────────────────────── */
  function waitForSupabase(timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (typeof supabase !== 'undefined') return resolve(supabase);
      const interval = 50;
      let elapsed = 0;
      const timer = setInterval(() => {
        if (typeof supabase !== 'undefined') {
          clearInterval(timer);
          resolve(supabase);
        } else {
          elapsed += interval;
          if (elapsed >= timeout) {
            clearInterval(timer);
            reject(new Error('Supabase client tidak berhasil dimuat.'));
          }
        }
      }, interval);
    });
  }

  /* ─── Main routing entry point ──────────────────────────────────── */
  async function routeByRole() {
    try {
      setStatus('Memeriksa sesi…');

      // ── 1. Tunggu supabase client siap ──────────────────────────
      const client = await waitForSupabase();

      // ── 2. Get session ───────────────────────────────────────────
      const { data: { session } } = await client.auth.getSession();

      if (!session || !session.user) {
        setStatus('Sesi tidak ditemukan, mengalihkan ke login…');
        setTimeout(() => safeRedirect('/login.html'), 800);
        return;
      }

      setStatus('Membaca role pengguna…');

      // ── 2. Read role from session metadata ───────────────────────
      //    Adjust the path to wherever your role is stored.
      const role =
        session.user?.user_metadata?.role ||
        session.user?.app_metadata?.role   ||
        null;

      if (!role) {
        showError('Role Tidak Ditemukan', 'Akun Anda belum memiliki role. Hubungi administrator.');
        return;
      }

      const normalizedRole = role.toLowerCase().trim();

      // ── 3. Look up destination ───────────────────────────────────
      const destination = ROLE_DEFAULTS[normalizedRole];

      if (!destination) {
        showError(
          'Role Tidak Dikenal',
          `Role "${role}" tidak terdaftar dalam sistem. Hubungi administrator.`
        );
        return;
      }

      setStatus(`Mengalihkan sebagai ${normalizedRole}…`);

      // ── 4. Honour ?next= param (for post-login deep links) ───────
      //    Only accept same-origin paths that belong to this role.
      const params  = new URLSearchParams(window.location.search);
      const nextRaw = params.get('next');
      const roleFolder = `/${normalizedRole}/`;

      let target = destination; // default

      if (nextRaw && nextRaw.startsWith(roleFolder)) {
        target = nextRaw; // safe: verified same role folder
      }

      setTimeout(() => safeRedirect(target), 300);

    } catch (err) {
      console.error('[redirect.js]', err);
      showError('Terjadi Kesalahan', err.message || 'Gagal memuat sesi. Coba lagi.');
    }
  }

  /* ─── Boot ──────────────────────────────────────────────────────── */
  // Wait for supabase + session.js to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', routeByRole);
  } else {
    routeByRole();
  }

})();
