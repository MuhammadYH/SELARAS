/**
 * sidebar.js — Shared Sidebar Component
 * Global: SELARAS_SIDEBAR
 *
 * Usage: mount ke elemen #sidebar-mount
 * Config tiap halaman via <body data-sidebar-role="admin" data-sidebar-page="index.html">
 *
 * Render otomatis saat DOMContentLoaded.
 * Expose: SELARAS_SIDEBAR.render(config) untuk render manual.
 */

const SELARAS_SIDEBAR = (() => {
  'use strict';

  // ── Nav menu per role ────────────────────────────────────────────────────

  const NAV_ITEMS = {
    admin: [
      {
        page: 'index.html',
        href: '/dashboard/admin/index.html',
        label: 'Dashboard',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      },
      {
        page: 'smart-bin.html',
        href: '/dashboard/admin/smart-bin.html',
        label: 'Smart Bin',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
      },
      {
        page: 'riwayat.html',
        href: '/dashboard/admin/riwayat.html',
        label: 'Riwayat',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      },
      {
        page: 'laporan.html',
        href: '/dashboard/admin/laporan.html',
        label: 'Laporan',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      },
      { divider: true },
      {
        page: 'notifikasi.html',
        href: '/dashboard/admin/notifikasi.html',
        label: 'Notifikasi',
        badgeId: 'sidebarNotifBadge',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
      },
      {
        page: 'pengaturan.html',
        href: '/dashboard/admin/pengaturan.html',
        label: 'Pengaturan',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
      },
      {
        page: 'bantuan.html',
        href: '/dashboard/admin/bantuan.html',
        label: 'Bantuan',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      },
    ],

    provider: [
      {
        page: 'index.html',
        href: '/dashboard/provider/index.html',
        label: 'Dashboard',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      },
    ],

    pengolah: [
      {
        page: 'index.html',
        href: '/dashboard/pengolah/index.html',
        label: 'Dashboard',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      },
    ],

    buyer: [
      {
        page: 'index.html',
        href: '/dashboard/buyer/index.html',
        label: 'Dashboard',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      },
    ],
  };

  // ── Promo block (admin only, extensible) ─────────────────────────────────

  const PROMO_BLOCKS = {
    admin: `
      <div class="sidebar-promo">
        <div style="margin-bottom:var(--space-3);display:flex;align-items:center;justify-content:center;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 22c1.25-1.25 2.5-2.5 3.5-4 1.8-2.7 2.5-6 2.5-9 0 0 3 1 5 4 1.5 2.3 1.5 5 1.5 5s1.5-1 2-3c.8-3 0-6 0-6s3 2 4 5c.7 2 .5 4.5-.5 6.5C18.5 23 14 24 10 22"/>
            <path d="M2 22c2-2 4-5 4-9"/>
          </svg>
        </div>
        <h4>Kelola Sampah Organik Lebih Cerdas dan Berdampak</h4>
        <p>Bersama SELARAS, kelola sampah organik secara efisien, transparan, dan memberikan manfaat nyata bagi masyarakat.</p>
      </div>`,
    provider: '',
    pengolah: '',
    buyer: '',
  };

  // ── Build HTML ───────────────────────────────────────────────────────────

  function buildNavItem(item, currentPage) {
    if (item.divider) return `<div class="sidebar-divider"></div>`;
    const isActive = item.page === currentPage;
    const badge    = item.badgeId
      ? `<span class="nav-badge" id="${item.badgeId}" style="display:none;">0</span>`
      : '';
    return `
      <a class="sidebar-nav-item${isActive ? ' active' : ''}"
         data-page="${item.page}"
         href="${item.href}">
        <span class="nav-icon">${item.icon}</span>
        ${item.label}
        ${badge}
      </a>`;
  }

  function buildSidebar(role, currentPage, user) {
    const items   = NAV_ITEMS[role] || [];
    const promo   = PROMO_BLOCKS[role] || '';
    const name    = user?.full_name  || user?.name  || '-';
    const email   = user?.email || '-';
    const navHTML = items.map(item => buildNavItem(item, currentPage)).join('\n');

    return `
<div class="sidebar-overlay" id="sidebarOverlay"></div>
<aside class="admin-sidebar" id="adminSidebar">
  <div class="sidebar-logo">
    <img src="/assets/LOGO_SELARAS.png" alt="SELARAS" class="sidebar-logo-img"/>
  </div>
  <nav class="sidebar-nav">
    ${navHTML}
  </nav>
  ${promo}
  <div class="sidebar-user">
    <div class="user-avatar">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
    <div class="user-info">
      <div class="user-name">${name}</div>
      <div class="user-email">${email}</div>
    </div>
    <svg class="user-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  </div>
</aside>`;
  }

  // ── Mobile toggle ────────────────────────────────────────────────────────

  function initToggle() {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuBtn = document.getElementById('mobileMenuBtn'); // injected by navbar.js

    if (!sidebar) return;

    const open  = () => { sidebar.classList.add('open');    overlay?.classList.add('active'); };
    const close = () => { sidebar.classList.remove('open'); overlay?.classList.remove('active'); };

    // menuBtn is added by navbar.js — wait for navbar:ready event
    document.addEventListener('navbar:ready', () => {
      const btn = document.getElementById('mobileMenuBtn');
      btn?.addEventListener('click', open);
    });

    overlay?.addEventListener('click', close);

    sidebar.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 1024) close();
      });
    });
  }

  // ── Public render ────────────────────────────────────────────────────────

  /**
   * render({ role, currentPage, user })
   * @param {string} role        - 'admin' | 'provider' | 'pengolah' | 'buyer'
   * @param {string} currentPage - filename e.g. 'index.html'
   * @param {object} user        - { full_name, email } from ctx.profile / ctx.user
   */
  function render({ role, currentPage, user = {} }) {
    const mount = document.getElementById('sidebar-mount');
    if (!mount) {
      console.warn('[SELARAS_SIDEBAR] #sidebar-mount tidak ditemukan.');
      return;
    }
    mount.innerHTML = buildSidebar(role, currentPage, user);
    initToggle();
    document.dispatchEvent(new CustomEvent('sidebar:ready'));
  }

  /**
   * updateUser({ full_name, email })
   * Call after profile loaded to update user block without re-rendering.
   */
  function updateUser({ full_name, email } = {}) {
    const nameEl  = document.querySelector('.user-name');
    const emailEl = document.querySelector('.user-email');
    if (nameEl  && full_name) nameEl.textContent  = full_name;
    if (emailEl && email)     emailEl.textContent = email;
  }

  /**
   * setBadge(badgeId, count)
   * Show/hide and set text of a nav badge by its id.
   */
  function setBadge(badgeId, count) {
    const el = document.getElementById(badgeId);
    if (!el) return;
    if (count > 0) {
      el.textContent = count > 99 ? '99+' : count;
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  }

  // ── Auto-render from body data attributes ───────────────────────────────
  // Reads: <body data-sidebar-role="admin" data-sidebar-page="index.html">
  // Only runs if #sidebar-mount exists AND body has data-sidebar-role

  function autoRender() {
    const body = document.body;
    const role = body?.dataset?.sidebarRole;
    const page = body?.dataset?.sidebarPage;
    if (!role || !document.getElementById('sidebar-mount')) return;
    render({ role, currentPage: page || 'index.html' });
  }

  document.addEventListener('DOMContentLoaded', autoRender);

  return { render, updateUser, setBadge };
})();
