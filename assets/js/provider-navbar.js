/* provider-navbar.js — Topbar / navbar manager for provider role */
(function () {
  const topbar = document.querySelector('.admin-topbar');
  if (!topbar) return;

  const pageTitle = document.body.dataset.navbarTitle || 'Provider';

  topbar.classList.add('navbar-managed');
  topbar.innerHTML = `
    <!-- Mobile menu button -->
    <button class="mobile-menu-btn btn btn-ghost btn-icon" id="mobileMenuBtn" aria-label="Buka menu">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
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

    <!-- Search wrapper -->
    <div class="navbar-search-wrap">
      <!-- Desktop -->
      <div class="navbar-search-desktop">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--text-muted);">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" placeholder="Cari…" aria-label="Cari"/>
      </div>
      <!-- Mobile icon -->
      <button class="navbar-search-icon-btn" id="searchIconBtn" aria-label="Buka pencarian">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>
    </div>

    <!-- Notif -->
    <div class="topbar-notif" title="Notifikasi">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span class="notif-badge" id="notifBadge">2</span>
    </div>

    <!-- Expanded search (mobile) -->
    <div class="navbar-search-expanded" id="navSearchExpanded">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="text" placeholder="Cari di SELARAS…" id="navSearchInput" aria-label="Cari"/>
      <button class="navbar-search-close" id="searchCloseBtn" aria-label="Tutup pencarian">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;

  // Mobile menu
  document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
    document.getElementById('adminSidebar')?.classList.add('open');
    document.getElementById('sidebarOverlay')?.classList.add('active');
  });

  // Search toggle
  const searchIconBtn   = document.getElementById('searchIconBtn');
  const searchExpanded  = document.getElementById('navSearchExpanded');
  const searchCloseBtn  = document.getElementById('searchCloseBtn');
  const titleWrap       = document.getElementById('navbarTitleWrap');

  searchIconBtn?.addEventListener('click', () => {
    searchExpanded?.classList.add('open');
    titleWrap?.classList.add('hidden');
    document.getElementById('navSearchInput')?.focus();
  });

  searchCloseBtn?.addEventListener('click', () => {
    searchExpanded?.classList.remove('open');
    titleWrap?.classList.remove('hidden');
  });
})();
