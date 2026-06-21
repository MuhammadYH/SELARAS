/* =========================================
   SELARAS Buyer — buyer-sidebar.js
   Handles sidebar toggle, active state, overlay.
   ========================================= */
(function () {
  function init() {
    const sidebar  = document.getElementById('buyerSidebar');
    const overlay  = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('topbarHamburger');

    if (!sidebar) return;

    // Active nav item based on current page
    const currentPage = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.sidebar-nav-item[data-page]').forEach(item => {
      if (item.dataset.page === currentPage) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Toggle sidebar (mobile)
    function openSidebar() {
      sidebar.classList.add('open');
      overlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay?.classList.remove('open');
      document.body.style.overflow = '';
    }

    hamburger?.addEventListener('click', openSidebar);
    overlay?.addEventListener('click', closeSidebar);

    // Close on nav item click (mobile)
    sidebar.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) closeSidebar();
      });
    });

    // Keyboard escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSidebar();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
