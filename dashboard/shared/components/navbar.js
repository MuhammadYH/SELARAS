/**
 * navbar.js — Shared Navbar Component
 * Global: SELARAS_NAVBAR
 *
 * Drop-in pengganti admin-navbar.js, bekerja untuk semua role.
 * Auto-inject ke .admin-topbar.
 * Dispatch event 'navbar:ready' setelah inject.
 *
 * Baca judul dari: <body data-navbar-title="Dashboard">
 * Fallback: dari <title>, stripping " — SELARAS *" suffix.
 */

const SELARAS_NAVBAR = (() => {
  'use strict';

  // ── Resolve page title ───────────────────────────────────────────────────

  function getPageTitle() {
    const fromBody = document.body?.dataset?.navbarTitle;
    if (fromBody) return fromBody;
    const t = document.title || '';
    return t.replace(/\s*[—–-]\s*SELARAS\s*\w*\s*$/i, '').trim() || 'Dashboard';
  }

  // ── Build HTML ───────────────────────────────────────────────────────────

  function buildHTML(title) {
    return `
      <button class="btn btn-ghost btn-icon mobile-menu-btn" id="mobileMenuBtn" aria-label="Buka menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <div class="navbar-title-wrap" id="navbarTitleWrap">
        <h1 class="navbar-title">${title}</h1>
      </div>

      <a href="/login.html" class="navbar-home-btn" aria-label="Ke Beranda">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
          <polyline points="9 21 9 12 15 12 15 21"/>
        </svg>
      </a>

      <div class="navbar-search-wrap" id="navbarSearchWrap">
        <div class="topbar-search navbar-search-desktop">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Cari…" aria-label="Cari" id="navbarSearchInput">
        </div>

        <button class="navbar-search-icon-btn" id="navbarSearchIconBtn" aria-label="Buka pencarian">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </div>

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
      </div>`;
  }

  // ── Behaviour: mobile search toggle ─────────────────────────────────────

  function initBehaviours(topbar) {
    const iconBtn     = document.getElementById('navbarSearchIconBtn');
    const expanded    = document.getElementById('navbarSearchExpanded');
    const closeBtn    = document.getElementById('navbarSearchClose');
    const titleWrap   = document.getElementById('navbarTitleWrap');
    const mobileInput = document.getElementById('navbarSearchMobileInput');

    function openSearch() {
      expanded.classList.add('open');
      expanded.removeAttribute('inert');
      titleWrap.classList.add('hidden');
      mobileInput?.focus();
    }

    function closeSearch() {
      expanded.classList.remove('open');
      expanded.setAttribute('inert', '');
      titleWrap.classList.remove('hidden');
      if (mobileInput) mobileInput.value = '';
    }

    iconBtn?.addEventListener('click', openSearch);
    closeBtn?.addEventListener('click', closeSearch);

    document.addEventListener('click', (e) => {
      if (expanded.classList.contains('open') && !topbar.contains(e.target)) {
        closeSearch();
      }
    });
  }

  // ── Inject ───────────────────────────────────────────────────────────────

  function inject() {
    const topbar = document.querySelector('.admin-topbar');
    if (!topbar) return;

    const title = getPageTitle();
    topbar.innerHTML = buildHTML(title);
    topbar.classList.add('navbar-managed');

    initBehaviours(topbar);

    document.dispatchEvent(new CustomEvent('navbar:ready'));
  }

  // ── Public: setTitle ─────────────────────────────────────────────────────

  function setTitle(text) {
    const el = document.querySelector('.navbar-title');
    if (el) el.textContent = text;
  }

  // Run after DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

  return { setTitle };
})();
