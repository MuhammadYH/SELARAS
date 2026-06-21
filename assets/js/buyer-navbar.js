/* buyer-navbar.js — Topbar / navbar manager for buyer role */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const topbar = document.querySelector('.admin-topbar');
    if (!topbar) return;

    const pageTitle = document.body.dataset.navbarTitle || 'SELARAS';

    topbar.classList.add('navbar-managed');
    topbar.innerHTML = `
      <!-- Mobile menu button -->
      <button class="mobile-menu-btn btn btn-ghost btn-icon" id="mobileMenuBtn" aria-label="Buka menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <!-- Title -->
      <div class="navbar-title-wrap" id="navbarTitleWrap">
        <h1 class="navbar-title">${pageTitle}</h1>
      </div>

      <!-- Home button -->
      <a class="navbar-home-btn" href="/index.html" title="Kembali ke Beranda" aria-label="Beranda">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </a>

      <!-- Right controls -->
      <div style="display:flex; align-items:center; gap:var(--space-3); margin-left:auto;">

        <!-- Cart -->
        <button class="topbar-notif" id="cartBtn" title="Keranjang"
                onclick="window.location='/buyer/buyer-keranjang.html'"
                style="position:relative;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span class="notif-badge" id="cartBadge" style="display:none;">0</span>
        </button>

        <!-- Notification -->
        <button class="topbar-notif" id="notifBtn" title="Notifikasi"
                onclick="window.location='/buyer/buyer-notifikasi.html'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span class="notif-badge" id="navNotifBadge">2</span>
        </button>

      </div>
    `;

    // Mobile menu — toggle sidebar
    document.getElementById('mobileMenuBtn')?.addEventListener('click', function () {
      document.getElementById('adminSidebar')?.classList.toggle('open');
      document.getElementById('sidebarOverlay')?.classList.toggle('open');
    });

    // Close sidebar when overlay clicked
    document.getElementById('sidebarOverlay')?.addEventListener('click', function () {
      document.getElementById('adminSidebar')?.classList.remove('open');
      document.getElementById('sidebarOverlay')?.classList.remove('open');
    });
  });
})();
