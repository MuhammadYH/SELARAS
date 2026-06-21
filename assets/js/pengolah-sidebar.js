/**
 * pengolah-sidebar.js
 * Mobile sidebar toggle and active-link detection for role: Pengolah.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const sidebar  = document.getElementById('adminSidebar');
    const overlay  = document.getElementById('sidebarOverlay');
    const menuBtn  = document.getElementById('mobileMenuBtn');

    function openSidebar()  { sidebar && sidebar.classList.add('open');    overlay && overlay.classList.add('active'); }
    function closeSidebar() { sidebar && sidebar.classList.remove('open'); overlay && overlay.classList.remove('active'); }

    if (menuBtn)  menuBtn.addEventListener('click', openSidebar);
    if (overlay)  overlay.addEventListener('click', closeSidebar);

    // Auto-highlight active link
    const currentPage = window.location.pathname.split('/').pop() || 'pengolah-dashboard.html';
    document.querySelectorAll('.sidebar-nav-item[data-page]').forEach(function (link) {
      if (link.getAttribute('data-page') === currentPage) {
        link.classList.add('active');
      }
    });

    // Populate session user info
    if (window.SELARASSession) {
      const nameEl  = document.querySelector('.sidebar-user .user-name');
      const emailEl = document.querySelector('.sidebar-user .user-email');
      if (nameEl)  nameEl.textContent  = SELARASSession.getName();
      if (emailEl) emailEl.textContent = SELARASSession.getEmail();
    }
  });
})();
