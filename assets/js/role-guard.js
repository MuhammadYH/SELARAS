/* =========================================
   SELARAS — role-guard.js
   Enforces role-based access control.
   ========================================= */
(function () {
  const ROLE_ROUTES = {
    buyer: '/buyer/',
    admin: '/admin/',
    kurir: '/kurir/',
  };

  const REQUIRED_ROLE = (function () {
    // Determine required role from <meta name="required-role"> or body attribute
    const meta = document.querySelector('meta[name="required-role"]');
    if (meta) return meta.getAttribute('content');
    return document.body.dataset.requiredRole || null;
  })();

  function guard() {
    if (!REQUIRED_ROLE) return; // No guard on this page

    const user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;

    if (!user) {
      // Not logged in — for demo, create a mock buyer session
      const mockUser = { name: 'Budi Santoso', email: 'budi@email.com', role: 'buyer' };
      sessionStorage.setItem('SELARAS_user', JSON.stringify(mockUser));
      sessionStorage.setItem('SELARAS_token', 'mock-token-buyer');
      return;
    }

    if (user.role !== REQUIRED_ROLE) {
      // Wrong role — redirect
      const path = ROLE_ROUTES[user.role] || '/';
      window.location.href = path;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', guard);
  } else {
    guard();
  }
})();
