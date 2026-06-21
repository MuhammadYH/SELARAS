/**
 * admin-navbar.js
 * Shared topbar/navbar component for all admin pages.
 *
 * Usage: <script src="components/admin-navbar.js"></script>
 * The script auto-injects the navbar into the first .admin-topbar it finds.
 * Page title is read from data-navbar-title on <body>, or falls back to <title>.
 */

(function () {
  // ── Resolve page title ───────────────────────────────────────────────────
  function getPageTitle() {
    const body = document.body;
    if (body && body.dataset.navbarTitle) return body.dataset.navbarTitle;
    // Strip " — SELARAS Admin" suffix from <title>
    const t = document.title || '';
    return t.replace(/\s*[—–-]\s*SELARAS Admin\s*$/i, '').trim() || 'Admin';
  }

  // ── Build navbar HTML ────────────────────────────────────────────────────
  function buildNavbar(title) {
    return `
      <button class="btn btn-ghost btn-icon mobile-menu-btn" id="mobileMenuBtn" aria-label="Buka menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <div class="navbar-title-wrap" id="navbarTitleWrap">
        <h1 class="navbar-title">${title}</h1>
      </div>

      <div class="navbar-search-wrap" id="navbarSearchWrap">
        <!-- Desktop: always-visible search box -->
        <div class="topbar-search navbar-search-desktop">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Cari…" aria-label="Cari" id="navbarSearchInput">
        </div>

        <!-- Mobile/Tablet: search icon button -->
        <button class="navbar-search-icon-btn" id="navbarSearchIconBtn" aria-label="Buka pencarian">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </div>

      <!-- Mobile: expanded search bar (hidden by default) -->
      <div class="navbar-search-expanded" id="navbarSearchExpanded" inert>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" placeholder="Cari…" aria-label="Cari" id="navbarSearchMobileInput">
        <button class="navbar-search-close" id="navbarSearchClose" aria-label="Tutup pencarian">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  }

  // ── Inject into existing .admin-topbar ───────────────────────────────────
  function inject() {
    const topbar = document.querySelector('.admin-topbar');
    if (!topbar) return;

    const title = getPageTitle();
    topbar.innerHTML = buildNavbar(title);
    topbar.classList.add('navbar-managed');

    initBehaviours(topbar);

    // Notify other scripts that navbar (and hamburger btn) is now in DOM
    document.dispatchEvent(new CustomEvent('navbar:ready'));
  }

  // ── Behaviours ───────────────────────────────────────────────────────────
  function initBehaviours(topbar) {
    const iconBtn      = document.getElementById('navbarSearchIconBtn');
    const expanded     = document.getElementById('navbarSearchExpanded');
    const closeBtn     = document.getElementById('navbarSearchClose');
    const titleWrap    = document.getElementById('navbarTitleWrap');
    const mobileInput  = document.getElementById('navbarSearchMobileInput');

    function openSearch() {
      expanded.classList.add('open');
      expanded.removeAttribute('inert');
      titleWrap.classList.add('hidden');
      mobileInput.focus();
    }

    function closeSearch() {
      expanded.classList.remove('open');
      expanded.setAttribute('inert', '');
      titleWrap.classList.remove('hidden');
      mobileInput.value = '';
    }

    if (iconBtn)  iconBtn.addEventListener('click', openSearch);
    if (closeBtn) closeBtn.addEventListener('click', closeSearch);

    // Close when clicking outside topbar
    document.addEventListener('click', function (e) {
      if (expanded.classList.contains('open') && !topbar.contains(e.target)) {
        closeSearch();
      }
    });

    // Note: sidebar toggle is handled by admin-sidebar.js
  }

  // Run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
