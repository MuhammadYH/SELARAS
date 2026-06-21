/* ════════════════════════════════════════════════════════
   resik-shared.js — Animasi & Hamburger Menu Global SELARAS
   v2.0 — Cinematic Scroll Animations
   Sisipkan sebelum </body> di semua halaman
   ════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── 1. PAGE LOAD BAR ─────────────────────────────── */
  const bar = document.createElement('div');
  bar.className = 'rsik-page-bar';
  document.body.appendChild(bar);
  bar.style.width = '40%';
  setTimeout(() => { bar.style.width = '75%'; }, 120);
  window.addEventListener('load', () => {
    bar.style.width = '100%';
    bar.classList.add('done');
    setTimeout(() => bar.remove(), 700);
  });

  /* ── 2. SCROLL PROGRESS BAR ──────────────────────── */
  const progressBar = document.createElement('div');
  progressBar.className = 'rsik-scroll-progress';
  document.body.appendChild(progressBar);
  window.addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressBar.style.width = pct + '%';
  }, { passive: true });

  /* ── 3. HAMBURGER MENU ───────────────────────────── */
  function injectHamburger() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    const navWrap = navbar.querySelector('.nav-wrap');
    if (!navWrap) return;
    if (navWrap.querySelector('.nav-hamburger')) return;

    const btn = document.createElement('button');
    btn.className = 'nav-hamburger';
    btn.setAttribute('aria-label', 'Buka menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = `
      <span class="hb-line"></span>
      <span class="hb-line"></span>
      <span class="hb-line"></span>
    `;
    const logoWrap = navWrap.querySelector('.nav-logo-wrap');
    if (logoWrap) {
      // Sisipkan hamburger SETELAH logo, sebelum elemen berikutnya
      logoWrap.insertAdjacentElement('afterend', btn);
    } else {
      navWrap.prepend(btn);
    }

    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    document.body.appendChild(overlay);

    const currentHref = window.location.pathname.split('/').pop() || 'index';
    const navItems = [
      { href: '01SELARAS.html',       label: 'Beranda',      icon: '🏠' },
      { href: '01TENTANGKAMI.html', label: 'Tentang Kami', icon: 'ℹ️' },
      { href: '01SOLUSI.html',      label: 'Solusi',       icon: '💡' },
      { href: '01CONTACT.html',     label: 'Kontak Kami',  icon: '📬' },
    ];

    const linksHTML = navItems.map(item => {
      const active = currentHref === item.href ? 'active' : '';
      return `<a href="${item.href}" class="${active}">
        <span class="drawer-nav-icon">${item.icon}</span>
        ${item.label}
      </a>`;
    }).join('');

    const navLogoImg = navWrap.querySelector('.nav-logo-img');
    const logoSrc = navLogoImg ? navLogoImg.src : '';

    const drawer = document.createElement('div');
    drawer.className = 'mobile-drawer';

    // Profile user diurus sepenuhnya oleh resik-supabase.js via pill button di .drawer-cta

    drawer.innerHTML = `
      <div class="drawer-header">
        <a href="01SELARAS.html" class="drawer-logo">
          <img src="${logoSrc}" alt="SELARAS Logo" style="height:32px;width:auto;object-fit:contain;">
        </a>
        <button class="drawer-close" aria-label="Tutup menu">✕</button>
      </div>
      <nav class="drawer-nav">
        ${linksHTML}
      </nav>
      <div class="drawer-cta">
        <a href="01login_register.html">Masuk ke SELARAS →</a>
      </div>
    `;
    document.body.appendChild(drawer);

    // ── Inject CSS profile pill (drawer) — satu kali ──
    if (!document.getElementById('resik-drawer-profile-style')) {
      const ds = document.createElement('style');
      ds.id = 'resik-drawer-profile-style';
      ds.textContent = `
        /* ── Drawer CTA area ── */
        .drawer-cta { padding: 16px; position: relative; }

        /* ── Profile pill button ── */
        .drawer-profile-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px 6px 6px;
          border-radius: 99px;
          border: 1.5px solid #dde8e2;
          background: #ffffff;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: .88rem;
          font-weight: 600;
          color: #0e1b14;
          transition: box-shadow .2s, border-color .2s;
          position: relative;
          white-space: nowrap;
        }
        .drawer-profile-pill:hover {
          border-color: #3ab86e;
          box-shadow: 0 4px 16px rgba(20,56,42,.10);
        }

        /* Avatar circle */
        .drawer-profile-pill .dpp-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: #e8f5ee;
          border: 2px solid #c8edda;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }
        .drawer-profile-pill .dpp-avatar svg {
          width: 18px; height: 18px;
          stroke: #1b4d35; fill: none;
          stroke-width: 2; stroke-linecap: round;
        }
        .drawer-profile-pill .dpp-avatar img {
          width: 100%; height: 100%;
          object-fit: cover; border-radius: 50%;
        }

        /* Name & chevron */
        .drawer-profile-pill .dpp-name {
          max-width: 120px;
          overflow: hidden; text-overflow: ellipsis;
        }
        .drawer-profile-pill .dpp-chevron {
          width: 14px; height: 14px;
          stroke: #5d7268; fill: none;
          stroke-width: 2.2; stroke-linecap: round;
          transition: transform .2s; flex-shrink: 0;
        }
        .drawer-profile-pill.open .dpp-chevron { transform: rotate(180deg); }

        /* ── Dropdown ── */
        .drawer-profile-dropdown {
          display: none;
          position: absolute;
          bottom: calc(100% + 6px);
          left: 16px; right: 16px;
          background: #ffffff;
          border: 1px solid #dde8e2;
          border-radius: 14px;
          box-shadow: 0 -8px 32px rgba(20,56,42,.12);
          z-index: 9999;
          padding: 8px;
          animation: drawerDropIn .18s ease;
        }
        .drawer-profile-dropdown.open { display: block; }
        @keyframes drawerDropIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .drawer-profile-dropdown .dpd-header {
          padding: 10px 12px 8px;
          border-bottom: 1px solid #edf3ef;
          margin-bottom: 6px;
        }
        .drawer-profile-dropdown .dpd-header .dpd-name {
          font-weight: 700; font-size: .88rem;
          color: #0e1b14; font-family: 'DM Sans', sans-serif;
        }
        .drawer-profile-dropdown .dpd-header .dpd-email {
          font-size: .75rem; color: #5d7268; margin-top: 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .drawer-profile-dropdown a,
        .drawer-profile-dropdown button {
          display: flex; align-items: center; gap: 9px;
          width: 100%; padding: 9px 12px; border-radius: 9px;
          font-family: 'DM Sans', sans-serif; font-size: .86rem;
          font-weight: 500; color: #0e1b14; text-decoration: none;
          background: none; border: none; cursor: pointer;
          text-align: left; transition: background .15s;
          box-sizing: border-box;
        }
        .drawer-profile-dropdown a:hover,
        .drawer-profile-dropdown button:hover { background: #f0faf4; }
        .drawer-profile-dropdown .dpd-logout {
          color: #c0392b; margin-top: 4px;
          border-top: 1px solid #edf3ef; padding-top: 10px;
        }
        .drawer-profile-dropdown .dpd-logout:hover { background: #fff5f5; }
        .drawer-profile-dropdown svg {
          width: 15px; height: 15px;
          stroke: currentColor; fill: none;
          stroke-width: 2; stroke-linecap: round; flex-shrink: 0;
        }
      `;
      document.head.appendChild(ds);
    }

    // Beritahu script lain bahwa drawer sudah siap
    document.dispatchEvent(new CustomEvent('resik:drawerReady'));

    let isOpen = false;
    function openDrawer() {
      isOpen = true;
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      drawer.classList.add('open');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeDrawer() {
      isOpen = false;
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', () => isOpen ? closeDrawer() : openDrawer());
    overlay.addEventListener('click', closeDrawer);
    drawer.querySelector('.drawer-close').addEventListener('click', closeDrawer);
    drawer.querySelectorAll('.drawer-nav a').forEach(a => {
      a.addEventListener('click', closeDrawer);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) closeDrawer();
    });
  }

  /* ── 4. SCROLL TO TOP BUTTON ─────────────────────── */
  function injectScrollTop() {
    if (document.getElementById('scrollTop')) return;
    const btn = document.createElement('button');
    btn.id = 'scrollTop';
    btn.innerHTML = '↑';
    btn.setAttribute('aria-label', 'Kembali ke atas');
    document.body.appendChild(btn);
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ── 5. NAV SCROLL SHADOW ────────────────────────── */
  function initNavScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    function onScroll() {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
      const st = document.getElementById('scrollTop');
      if (st) st.classList.toggle('show', window.scrollY > 400);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ══════════════════════════════════════════════════════
     CINEMATIC SCROLL ANIMATION ENGINE
     ══════════════════════════════════════════════════════ */

  /* ── 6. AUTO-TAG ELEMENTS FOR CINEMATIC ANIMATION ── */
  function autoTagElements() {
    // Section labels → rise
    document.querySelectorAll('.sec-label').forEach(el => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim', 'rsik-rise');
      }
    });

    // Section titles → rise with slight delay
    document.querySelectorAll('.sec-title, h2.sec-title').forEach(el => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim', 'rsik-rise', 'rsik-d1');
      }
    });

    // Section subtitles
    document.querySelectorAll('.sec-sub').forEach(el => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim', 'rsik-d2');
      }
    });

    // Masalah layout: visual from left, text from right
    document.querySelectorAll('.masalah-visual').forEach(el => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim', 'rsik-from-left');
      }
    });
    document.querySelectorAll('.masalah-inner > div:last-child').forEach(el => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim', 'rsik-from-right');
      }
    });

    // App section: alternate sides
    document.querySelectorAll('.app-inner > div:first-child').forEach(el => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim', 'rsik-from-left');
      }
    });
    document.querySelectorAll('.app-mockup-wrap').forEach(el => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim', 'rsik-from-right');
      }
    });

    // Timeline steps → depth
    document.querySelectorAll('.timeline-step').forEach((el, i) => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim', 'rsik-depth');
        el.style.transitionDelay = (0.08 * i) + 's';
      }
    });

    // Cards → pop (dampak, eco, impact, overview, etc.)
    const cardSelectors = [
      '.dampak-card', '.eco-card', '.impact-card', '.overview-card',
      '.product-card', '.feature-card', '.solusi-card', '.nilai-card',
      '.team-card', '.admin-card', '.quick-card'
    ];
    document.querySelectorAll(cardSelectors.join(',')).forEach((el, i) => {
      if (!el.classList.contains('rsik-anim') && !el.classList.contains('rsik-card')) {
        el.classList.add('rsik-card');
      }
    });

    // Strip items → slide from bottom
    document.querySelectorAll('.strip-item').forEach((el, i) => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim');
        el.style.transitionDelay = (0.05 * i) + 's';
      }
    });

    // Hero phone/visual → depth scale
    document.querySelectorAll('.hero-phone-wrap, .hero-visual').forEach(el => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim', 'rsik-depth');
      }
    });

    // Stats section items → scale in
    document.querySelectorAll('.stat-item').forEach((el, i) => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim', 'rsik-scale');
        el.style.transitionDelay = (0.09 * i) + 's';
      }
    });

    // M-stats in masalah → pop
    document.querySelectorAll('.m-stat').forEach((el, i) => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim');
        el.style.transitionDelay = (0.08 * i) + 's';
      }
    });

    // Masalah quote → wipe
    document.querySelectorAll('.masalah-quote').forEach(el => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim', 'rsik-wipe');
      }
    });

    // SDG pills → stagger rise
    document.querySelectorAll('.sdg-pill').forEach((el, i) => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim');
        el.style.transitionDelay = (0.06 * i) + 's';
      }
    });

    // CTA inner → depth
    document.querySelectorAll('.cta-inner').forEach(el => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim', 'rsik-depth');
      }
    });

    // Footer cols → stagger from bottom
    document.querySelectorAll('.footer-col, .footer-brand').forEach((el, i) => {
      if (!el.classList.contains('rsik-anim') && !el.classList.contains('fade-in')) {
        el.classList.add('rsik-anim');
        el.style.transitionDelay = (0.08 * i) + 's';
      }
    });

    // App feature list items
    document.querySelectorAll('.app-features li').forEach((el, i) => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim', 'rsik-from-left');
        el.style.transitionDelay = (0.07 * i) + 's';
      }
    });

    // Hero actions
    document.querySelectorAll('.hero-actions').forEach(el => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim');
      }
    });

    // Hero tag chips
    document.querySelectorAll('.hero-tag-chip').forEach((el, i) => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.add('rsik-anim');
        el.style.transitionDelay = (0.05 * i + 0.2) + 's';
      }
    });

    // Existing fade-in elements — upgrade to cinematic
    document.querySelectorAll('.fade-in:not(.rsik-anim)').forEach(el => {
      el.classList.remove('visible'); // reset jika sudah di-trigger observer lain
      el.classList.add('rsik-anim');
    });
    document.querySelectorAll('.fade-up:not(.rsik-anim)').forEach(el => {
      el.classList.remove('visible');
      el.classList.add('rsik-anim', 'rsik-rise');
    });

    // ── Bridge: class dari 01TENTANGKAMI (.fade-up-1~4, .tl-item, .vm-card, .stat-box, .nilai-card)
    document.querySelectorAll([
      '.fade-up-1', '.fade-up-2', '.fade-up-3', '.fade-up-4'
    ].join(',')).forEach((el, i) => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.remove('visible');
        el.classList.add('rsik-anim', 'rsik-rise');
        if (!el.style.transitionDelay) {
          el.style.transitionDelay = (0.08 * (i % 4)) + 's';
        }
      }
    });
    document.querySelectorAll('.tl-item:not(.rsik-anim)').forEach((el, i) => {
      el.classList.remove('visible');
      el.classList.add('rsik-anim', 'rsik-from-left');
      el.style.transitionDelay = (0.1 * i) + 's';
    });
    document.querySelectorAll('.vm-card:not(.rsik-anim), .vm-full-card:not(.rsik-anim)').forEach((el, i) => {
      el.classList.remove('visible');
      el.classList.add('rsik-anim', 'rsik-depth');
      el.style.transitionDelay = (0.1 * i) + 's';
    });
    document.querySelectorAll('.stat-box:not(.rsik-anim)').forEach((el, i) => {
      el.classList.remove('visible');
      el.classList.add('rsik-anim', 'rsik-scale');
      el.style.transitionDelay = (0.09 * i) + 's';
    });

    // ── Bridge: class dari 01CONTACT (.fu, .fu-1~4, .quick-card, .admin-card)
    document.querySelectorAll([
      '.fu', '.fu-1', '.fu-2', '.fu-3', '.fu-4'
    ].join(',')).forEach((el, i) => {
      if (!el.classList.contains('rsik-anim')) {
        el.classList.remove('visible');
        el.classList.add('rsik-anim', 'rsik-rise');
        if (!el.style.transitionDelay) {
          el.style.transitionDelay = (0.07 * (i % 5)) + 's';
        }
      }
    });
    document.querySelectorAll('.quick-card:not(.rsik-anim):not(.rsik-card)').forEach((el, i) => {
      el.classList.remove('visible');
      el.classList.add('rsik-card');
      el.style.transitionDelay = (0.08 * i) + 's';
    });
    document.querySelectorAll('.admin-card:not(.rsik-anim):not(.rsik-card)').forEach((el, i) => {
      el.classList.remove('visible');
      el.classList.add('rsik-card');
      el.style.transitionDelay = (0.08 * i) + 's';
    });
    document.querySelectorAll('.faq-item:not(.rsik-anim)').forEach((el, i) => {
      el.classList.add('rsik-anim');
      if (!el.style.transitionDelay) el.style.transitionDelay = (0.05 * i) + 's';
    });

    // ── Bridge: class dari 01SELARAS (.anim, .d1~d4 — hero elements, skip hero)
    // Hero anim classes are CSS-driven, but non-hero .anim elements need observer
    document.querySelectorAll('.anim:not(.rsik-anim)').forEach(el => {
      // Skip elements inside .hero section (CSS animasi sendiri)
      if (!el.closest('.hero')) {
        el.classList.remove('visible');
        el.classList.add('rsik-anim', 'rsik-rise');
      }
    });
  }

  /* ── 7. INTERSECTION OBSERVER (Cinematic) ─────────── */
  function initCinematicScrollAnimations() {
    // Collect all animated elements
    const allAnimated = document.querySelectorAll('.rsik-anim, .rsik-card, .rsik-line-reveal');
    if (!allAnimated.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -48px 0px'
    });

    allAnimated.forEach(el => obs.observe(el));
  }

  /* ── 8. COUNTER ANIMATION ────────────────────────── */
  function animateCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
        const duration = 1600;
        const start = performance.now();

        function step(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const val = eased * target;
          el.textContent = (decimals > 0 ? val.toFixed(decimals) : Math.floor(val)) + suffix;
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        obs.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(el => obs.observe(el));
  }

  /* ── 9. HOVER MICRO-INTERACTIONS ────────────────── */
  function initMicroInteractions() {
    // Cards: ripple effect on click
    const cardSelector = '.dampak-card, .eco-card, .impact-card, .overview-card, .product-card, .feature-card, .solusi-card, .nilai-card, .team-card';
    document.querySelectorAll(cardSelector).forEach(card => {
      card.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = card.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.cssText = `
          position:absolute;width:${size}px;height:${size}px;
          left:${e.clientX - rect.left - size/2}px;
          top:${e.clientY - rect.top - size/2}px;
          background:rgba(58,184,110,.15);
          border-radius:50%;transform:scale(0);
          animation:rippleAnim .6s ease-out forwards;
          pointer-events:none;z-index:10;
        `;
        if (!document.getElementById('rippleStyle')) {
          const s = document.createElement('style');
          s.id = 'rippleStyle';
          s.textContent = '@keyframes rippleAnim{to{transform:scale(3);opacity:0}}';
          document.head.appendChild(s);
        }
        if (getComputedStyle(card).position === 'static') {
          card.style.position = 'relative';
        }
        card.style.overflow = 'hidden';
        card.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
      });
    });
  }

  /* ── 10. MAGNETIC CARD HOVER EFFECT ─────────────── */
  function initMagneticCards() {
    const cards = document.querySelectorAll(
      '.dampak-card, .eco-card, .impact-card, .timeline-step, .overview-card'
    );

    cards.forEach(card => {
      card.addEventListener('mousemove', function(e) {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        const tiltX = dy * -5;  // max 5deg tilt
        const tiltY = dx * 5;
        card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
        card.style.transition = 'transform .1s ease, box-shadow .2s ease';
        card.style.boxShadow = `
          ${-dx * 10}px ${-dy * 10}px 30px rgba(20,56,42,.12),
          0 20px 40px rgba(20,56,42,.08)
        `;
      });

      card.addEventListener('mouseleave', function() {
        card.style.transform = '';
        card.style.boxShadow = '';
        card.style.transition = 'transform .4s cubic-bezier(.22,.68,0,1.3), box-shadow .4s ease';
      });
    });
  }

  /* ── 11. PARALLAX SUBTLE EFFECT ─────────────────── */
  function initParallax() {
    // Parallax on hero blobs
    const heroBlobs = document.querySelectorAll(
      '.hero-blob-1, .hero-blob-2, .hero-blob-3'
    );

    // Parallax on hero phone
    const heroPhone = document.querySelector('.hero-phone-wrap');

    if (!heroBlobs.length && !heroPhone) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;

          heroBlobs.forEach((el, i) => {
            const speed = 0.06 + (i * 0.025);
            el.style.transform = `translateY(${y * speed}px)`;
          });

          if (heroPhone) {
            const heroRect = heroPhone.closest('.hero');
            if (heroRect) {
              const heroBottom = heroRect.offsetTop + heroRect.offsetHeight;
              if (y < heroBottom) {
                heroPhone.style.transform = `translateY(${y * 0.07}px)`;
              }
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ── 12. SECTION ENTRANCE LINE REVEAL ───────────── */
  function initSectionLineReveal() {
    // Auto-add line reveal to sec-label elements that have ::before line
    document.querySelectorAll('.sec-head').forEach(head => {
      const label = head.querySelector('.sec-label');
      if (label && !label.classList.contains('rsik-line-reveal')) {
        label.classList.add('rsik-line-reveal');
      }
    });
  }

  /* ── 13. NAV ACTIVE LINK ─────────────────────────── */
  function initActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || '';
    document.querySelectorAll('.nav-links a').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href && href !== '#' && currentPage.includes(href.replace('.html', ''))) {
        link.classList.add('active');
      }
    });
  }

  /* ── 14. HERO REVEAL (CSS-driven) ───────────────── */
  function initHeroReveal() {
    const heroEls = document.querySelectorAll(
      '.anim, .anim.d1, .anim.d2, .anim.d3, .anim.d4, .fu, .fu-1, .fu-2, .fu-3, .fu-4'
    );
    heroEls.forEach(el => {
      el.style.animationPlayState = 'running';
    });
  }

  /* ── 15. STAGGER CHILDREN ────────────────────────── */
  function staggerChildren(selector, parentSelector, baseDelay = 0.08) {
    document.querySelectorAll(parentSelector).forEach(parent => {
      const children = parent.querySelectorAll(selector);
      children.forEach((child, i) => {
        if (!child.style.transitionDelay) {
          child.style.transitionDelay = `${baseDelay * i}s`;
        }
      });
    });
  }

  /* ── 16. SMOOTH SECTION REVEAL ON SCROLL ─────────── */
  function initSectionReveal() {
    // Add a subtle "curtain" effect to section backgrounds
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
      if (section.classList.contains('hero')) return; // skip hero
    });
  }

  /* ── 17. APP BARS ANIMATE ON SCROLL ─────────────── */
  function initAppBarsOnScroll() {
    const appBars = document.querySelector('.app-bars');
    if (!appBars) return;

    const bars = appBars.querySelectorAll('.bar');
    // Reset bar heights and animate them when visible
    const originalHeights = Array.from(bars).map(b => b.style.height);
    bars.forEach(b => { b.style.height = '0'; b.style.transition = 'none'; });

    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        bars.forEach((b, i) => {
          setTimeout(() => {
            b.style.transition = 'height .6s cubic-bezier(.22,.68,0,1.3)';
            b.style.height = originalHeights[i];
          }, i * 60);
        });
        obs.disconnect();
      }
    }, { threshold: 0.3 });

    obs.observe(appBars);
  }

  /* ── INIT ALL ────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    // Tag elements first, then observe
    autoTagElements();

    injectHamburger();
    injectScrollTop();
    initNavScroll();
    initActiveNavLink();
    initHeroReveal();
    initSectionLineReveal();

    // Small delay to allow CSS to apply initial states before observer fires
    requestAnimationFrame(() => {
      setTimeout(() => {
        initCinematicScrollAnimations();
      }, 50);
    });

    animateCounters();
    initMicroInteractions();
    initMagneticCards();
    initParallax();
    initAppBarsOnScroll();
    initSectionReveal();

    // Stagger grid children (for any missed cards)
    staggerChildren('.dampak-card', '.dampak-grid', 0.08);
    staggerChildren('.eco-card', '.ecosystem-grid', 0.08);
    staggerChildren('.impact-card', '.impact-grid', 0.08);
    staggerChildren('.overview-card', '.overview-grid', 0.08);
    staggerChildren('.product-card', '.products-grid', 0.08);
    staggerChildren('.feature-card', '.features-grid', 0.08);
    staggerChildren('.solusi-card', '.solusi-grid', 0.08);
    staggerChildren('.nilai-card', '.nilai-grid', 0.08);
    staggerChildren('.team-card', '.team-grid', 0.08);
    staggerChildren('.strip-item', '.strip-inner', 0.06);
    staggerChildren('.footer-col', '.footer-top', 0.1);
    // Halaman tambahan
    staggerChildren('.quick-card', '.quick-cards', 0.09);
    staggerChildren('.admin-card', '.admin-grid', 0.08);
    staggerChildren('.tl-item', '.timeline', 0.1);
    staggerChildren('.stat-box', '.stats-row', 0.09);
    staggerChildren('.vm-card', '.visimisi-grid', 0.1);
    staggerChildren('.vm-full-card', '.vm-full-grid', 0.1);
  });

})();
