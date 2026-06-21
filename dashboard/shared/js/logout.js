/**
 * logout.js
 * ─────────────────────────────────────────────
 * SELARAS Logout Helper
 *
 * Menangani logout dari semua halaman dashboard.
 * Cukup load file ini dan panggil SELARAS_LOGOUT.init()
 * atau attach ke tombol logout secara manual.
 *
 * Depends on: supabaseClient.js, auth.js
 *
 * Cara pakai:
 *   <!-- Di bagian bawah <body> -->
 *   <script src="../../shared/js/supabaseClient.js"></script>
 *   <script src="../../shared/js/auth.js"></script>
 *   <script src="../../shared/js/logout.js"></script>
 *
 *   <!-- Di HTML -->
 *   <button data-logout>Keluar</button>
 *   <!-- atau dengan konfirmasi -->
 *   <button data-logout data-logout-confirm="Yakin ingin keluar?">Keluar</button>
 * ─────────────────────────────────────────────
 */

const SELARAS_LOGOUT = (() => {

  /**
   * Jalankan proses logout.
   * Memanggil SELARAS_AUTH_CORE.logoutUser() lalu redirect ke login.
   *
   * @param {boolean} [withConfirm=false]
   * @param {string}  [confirmMsg]
   */
  async function run(withConfirm = false, confirmMsg = 'Yakin ingin keluar dari akun?') {
    if (withConfirm && !confirm(confirmMsg)) return;

    try {
      // Tampilkan loading state jika ada tombol yang sedang diklik
      const activeBtn = document.activeElement;
      if (activeBtn && activeBtn.matches('[data-logout]')) {
        activeBtn.disabled    = true;
        activeBtn.textContent = 'Keluar…';
      }

      await SELARAS_AUTH_CORE.logoutUser(true); // true = redirect ke login
    } catch (err) {
      console.error('SELARAS logout error:', err.message);
      // Paksa redirect meskipun logout API error
      window.location.href = '/login.html';
    }
  }

  /**
   * Pasang event listener ke semua elemen [data-logout] di halaman.
   * Otomatis dipanggil saat DOM ready.
   */
  function init() {
    document.querySelectorAll('[data-logout]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const confirmMsg = el.dataset.logoutConfirm || undefined;
        const withConfirm = el.hasAttribute('data-logout-confirm');
        run(withConfirm, confirmMsg);
      });
    });
  }

  // Auto-init saat DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { run, init };
})();

window.SELARAS_LOGOUT = SELARAS_LOGOUT;
