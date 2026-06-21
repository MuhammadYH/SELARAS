/**
 * resik-supabase.js
 * Integrasi Supabase untuk seluruh halaman SELARAS
 * Gunakan data dummy hanya jika tidak ada data di database
 */

// ── Konfigurasi Supabase ──
const SUPABASE_URL = 'https://vcxwphzxavolrbsafroa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjeHdwaHp4YXZvbHJic2Fmcm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzM4NjQsImV4cCI6MjA5NDg0OTg2NH0.OOW5l0QgcNRPp5Q4qBIaK6uotvTdo91zt2uV5ON6rx0';

// ── Inisialisasi Supabase client ──
let _supabase = null;

async function getSupabase() {
  if (_supabase) return _supabase;
  // Load Supabase dari CDN jika belum ada
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _supabase;
}

// ═══════════════════════════════════════════════════
// AUTH — Login & Register
// ═══════════════════════════════════════════════════

window.SELARAS_AUTH = {
  async login(email, password) {
    const sb = await getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async register({ email, password, firstName, lastName, role, organization }) {
    const sb = await getSupabase();

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName || '',
          role: role || 'buyer',
          organization: organization || null,
        }
      }
    });

    if (error) throw error;

    // Profile otomatis dibuat oleh trigger Supabase
    // Tidak perlu insert manual ke table profiles

    return data;
  },

  async loginWithGoogle() {
    const sb = await getSupabase();
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/01SELARAS.html' }
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    const sb = await getSupabase();
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  },

  async getUser() {
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    return user;
  },

  async resetPassword(email) {
    const sb = await getSupabase();
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password.html'
    });
    if (error) throw error;
  }
};

// ═══════════════════════════════════════════════════
// CONTACT — Kirim Pesan
// ═══════════════════════════════════════════════════

window.SELARAS_CONTACT = {
  async submit({ nama, email, peran, kategori, pesan }) {
    const sb = await getSupabase();
    const { data, error } = await sb.from('contact_messages').insert([{
      nama,
      email,
      peran: peran || null,
      kategori,
      pesan,
      created_at: new Date().toISOString(),
      status: 'pending'
    }]);
    if (error) throw error;
    return data;
  }
};

// ═══════════════════════════════════════════════════
// SMART BIN — Data untuk Dashboard Homepage
// ═══════════════════════════════════════════════════

// Data dummy untuk Smart Bin (dipakai jika DB kosong)
const DUMMY_BINS = [
  { id: 1, name: 'Restoran Pacet Indah', capacity: 60, unit: 'L', location: 'Outdoor', fill_pct: 87, status: 'warning' },
  { id: 2, name: 'Hotel Villa Pacet',    capacity: 40, unit: 'L', location: 'Indoor',  fill_pct: 42, status: 'ok' },
  { id: 3, name: 'Pujasera Tahura',      capacity: 20, unit: 'L', location: 'Indoor',  fill_pct: 28, status: 'ok' },
];

const DUMMY_STATS = {
  limbah_terolah_ton: 1.24,
  nilai_produk_jt: 8.4,
  efisiensi_pct: 78,
  emisi_turun_pct: 22,
};

window.SELARAS_DATA = {
  async getBins() {
    try {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from('smart_bins')
        .select('*')
        .order('fill_pct', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        console.info('SELARAS: Tidak ada data smart_bins di DB, menggunakan dummy.');
        return DUMMY_BINS;
      }
      return data;
    } catch (e) {
      console.warn('SELARAS getBins error, fallback ke dummy:', e.message);
      return DUMMY_BINS;
    }
  },

  async getStats() {
    try {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from('dashboard_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      if (!data) {
        console.info('SELARAS: Tidak ada data dashboard_stats di DB, menggunakan dummy.');
        return DUMMY_STATS;
      }
      return data;
    } catch (e) {
      console.warn('SELARAS getStats error, fallback ke dummy:', e.message);
      return DUMMY_STATS;
    }
  },

  async getImpactNumbers() {
    try {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from('impact_numbers')
        .select('*')
        .single();

      if (error) throw error;
      return data || null;
    } catch (e) {
      return null; // biarkan halaman gunakan angka statis
    }
  }
};

// ═══════════════════════════════════════════════════
// WEEKLY CHART — Data volume mingguan untuk ResikApp
// ═══════════════════════════════════════════════════

const DUMMY_WEEKLY = [
  { day: 'Sen', kg: 180 },
  { day: 'Sel', kg: 260 },
  { day: 'Rab', kg: 224 },
  { day: 'Kam', kg: 370 },
  { day: 'Jum', kg: 308 },
  { day: 'Sab', kg: 418 },
  { day: 'Min', kg: 285 },
];

window.SELARAS_CHART = {
  async getWeekly() {
    try {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from('weekly_volumes')
        .select('day, kg')
        .order('day_index');

      if (error) throw error;
      if (!data || data.length === 0) return DUMMY_WEEKLY;
      return data;
    } catch (e) {
      return DUMMY_WEEKLY;
    }
  }
};

// ═══════════════════════════════════════════════════
// HELPER — Update Nav berdasarkan status auth
// ═══════════════════════════════════════════════════

window.SELARAS_UI = {
  async updateNavAuth() {
    try {
      const user = await SELARAS_AUTH.getUser();
      const navBtn = document.querySelector('.nav-btn');
      const drawerCta = document.querySelector('.drawer-cta a');

      if (user) {
        const name = user.user_metadata?.first_name || user.email?.split('@')[0] || 'Akun';
        const initials = name.slice(0, 1).toUpperCase();

        // ── Inject CSS profile button (sekali saja) ──
        if (!document.getElementById('resik-profile-style')) {
          const style = document.createElement('style');
          style.id = 'resik-profile-style';
          style.textContent = `
            /* Profile button — menggantikan .nav-btn saat login */
            .nav-profile-btn {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 6px 14px 6px 6px;
              border-radius: 99px;
              border: 1.5px solid #dde8e2;
              background: #ffffff;
              cursor: pointer;
              text-decoration: none;
              color: #0e1b14;
              font-family: 'DM Sans', sans-serif;
              font-size: .88rem;
              font-weight: 600;
              transition: box-shadow .2s, border-color .2s;
              position: relative;
              white-space: nowrap;
            }
            .nav-profile-btn:hover {
              border-color: #3ab86e;
              box-shadow: 0 4px 16px rgba(20,56,42,.10);
            }
            .nav-profile-avatar {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: #e8f5ee;
              border: 2px solid #c8edda;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              overflow: hidden;
            }
            .nav-profile-avatar svg {
              width: 18px;
              height: 18px;
              stroke: #1b4d35;
              fill: none;
              stroke-width: 2;
              stroke-linecap: round;
            }
            .nav-profile-avatar img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              border-radius: 50%;
            }
            .nav-profile-name {
              max-width: 120px;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .nav-profile-chevron {
              width: 14px;
              height: 14px;
              stroke: #5d7268;
              fill: none;
              stroke-width: 2.2;
              stroke-linecap: round;
              transition: transform .2s;
              flex-shrink: 0;
            }
            .nav-profile-btn.open .nav-profile-chevron {
              transform: rotate(180deg);
            }

            /* Dropdown menu */
            .nav-profile-dropdown {
              display: none;
              position: absolute;
              top: calc(100% + 10px);
              right: 0;
              min-width: 200px;
              background: #ffffff;
              border: 1px solid #dde8e2;
              border-radius: 14px;
              box-shadow: 0 16px 48px rgba(20,56,42,.13);
              z-index: 9999;
              padding: 8px;
              animation: profileDropIn .18s ease;
            }
            .nav-profile-dropdown.open { display: block; }
            @keyframes profileDropIn {
              from { opacity: 0; transform: translateY(-6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .nav-profile-dropdown-header {
              padding: 10px 12px 8px;
              border-bottom: 1px solid #edf3ef;
              margin-bottom: 6px;
            }
            .nav-profile-dropdown-header .pd-name {
              font-weight: 700;
              font-size: .88rem;
              color: #0e1b14;
              font-family: 'DM Sans', sans-serif;
            }
            .nav-profile-dropdown-header .pd-email {
              font-size: .75rem;
              color: #5d7268;
              margin-top: 2px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 176px;
            }
            .nav-profile-dropdown a,
            .nav-profile-dropdown button {
              display: flex;
              align-items: center;
              gap: 9px;
              width: 100%;
              padding: 9px 12px;
              border-radius: 9px;
              font-family: 'DM Sans', sans-serif;
              font-size: .86rem;
              font-weight: 500;
              color: #0e1b14;
              text-decoration: none;
              background: none;
              border: none;
              cursor: pointer;
              text-align: left;
              transition: background .15s;
            }
            .nav-profile-dropdown a:hover,
            .nav-profile-dropdown button:hover { background: #f0faf4; }
            .nav-profile-dropdown .pd-menu-item {
              color: #0e1b14;
            }
            .nav-profile-dropdown .pd-logout {
              color: #c0392b;
              margin-top: 4px;
              border-top: 1px solid #edf3ef;
              padding-top: 10px;
            }
            .nav-profile-dropdown .pd-logout:hover { background: #fff5f5; }
            .nav-profile-dropdown svg {
              width: 15px; height: 15px;
              stroke: currentColor;
              fill: none; stroke-width: 2;
              stroke-linecap: round;
              flex-shrink: 0;
            }
          `;
          document.head.appendChild(style);
        }

        // ── Ganti .nav-btn dengan profile button ──
        if (navBtn && !document.querySelector('.nav-profile-btn')) {
          const profileBtn = document.createElement('div');
          profileBtn.className = 'nav-profile-btn';
          profileBtn.setAttribute('role', 'button');
          profileBtn.setAttribute('aria-haspopup', 'true');
          profileBtn.setAttribute('aria-expanded', 'false');
          profileBtn.innerHTML = `
            <div class="nav-profile-avatar">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <span class="nav-profile-name">${name}</span>
            <svg class="nav-profile-chevron" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9"/>
            </svg>

            <div class="nav-profile-dropdown" id="navProfileDropdown">
              <div class="nav-profile-dropdown-header">
                <div class="pd-name">${name}</div>
                <div class="pd-email">${user.email || ''}</div>
              </div>
              <a href="dashboard.html" class="pd-menu-item">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                Dashboard
              </a>
              <button class="pd-logout" id="navLogoutBtn">
                <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Keluar
              </button>
            </div>
          `;

          navBtn.replaceWith(profileBtn);

          // Toggle dropdown
          const dropdown = profileBtn.querySelector('#navProfileDropdown');
          profileBtn.addEventListener('click', (e) => {
            const isOpen = profileBtn.classList.toggle('open');
            dropdown.classList.toggle('open', isOpen);
            profileBtn.setAttribute('aria-expanded', isOpen);
            e.stopPropagation();
          });

          // Tutup dropdown saat klik di luar
          document.addEventListener('click', () => {
            profileBtn.classList.remove('open');
            dropdown.classList.remove('open');
            profileBtn.setAttribute('aria-expanded', 'false');
          });

          // Tombol logout
          profileBtn.querySelector('#navLogoutBtn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Keluar dari akun SELARAS?')) {
              await SELARAS_AUTH.logout();
              location.reload();
            }
          });
        }

        // ── Update drawer CTA (mobile) ──
        // CSS untuk .drawer-profile-pill & .drawer-profile-dropdown
        // sudah di-inject oleh resik-shared.js (injectHamburger) — tidak perlu inject ulang di sini.
        if (drawerCta && !document.querySelector('.drawer-profile-pill')) {
          // Ganti <a> menjadi pill button
          const drawerCtaParent = drawerCta.parentElement;
          const pill = document.createElement('div');
          pill.className = 'drawer-profile-pill';
          Object.assign(pill.style, {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px 6px 6px',
            borderRadius: '99px',
            border: '1.5px solid #dde8e2',
            background: '#ffffff',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '.88rem',
            fontWeight: '600',
            color: '#0e1b14',
            position: 'relative',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
          });
          pill.innerHTML = `
            <div class="dpp-avatar" style="width:32px;height:32px;border-radius:50%;background:#e8f5ee;border:2px solid #c8edda;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
              <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#1b4d35;fill:none;stroke-width:2;stroke-linecap:round;">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <span class="dpp-name" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;">${name}</span>
            <svg class="dpp-chevron" viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#5d7268;fill:none;stroke-width:2.2;stroke-linecap:round;flex-shrink:0;transition:transform .2s;">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          `;

          const dropdown = document.createElement('div');
          dropdown.className = 'drawer-profile-dropdown';
          dropdown.id = 'drawerProfileDropdown';
          // Semua style inline — dijamin apply terlepas dari timing CSS
          Object.assign(dropdown.style, {
            display: 'none',
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '-6px',
            minWidth: '200px',
            background: '#ffffff',
            border: '1px solid #dde8e2',
            borderRadius: '14px',
            boxShadow: '0 -8px 32px rgba(20,56,42,.12)',
            zIndex: '9999',
            padding: '8px',
            boxSizing: 'border-box',
          });
          const SVG_STYLE = 'width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;flex-shrink:0;vertical-align:middle;';
          const ROW_STYLE = 'display:flex;align-items:center;gap:9px;width:100%;padding:9px 12px;border-radius:9px;font-family:\'DM Sans\',sans-serif;font-size:.86rem;font-weight:500;color:#0e1b14;text-decoration:none;background:none;border:none;cursor:pointer;text-align:left;box-sizing:border-box;';
          dropdown.innerHTML = `
            <div style="padding:10px 12px 8px;border-bottom:1px solid #edf3ef;margin-bottom:6px;">
              <div style="font-weight:700;font-size:.88rem;color:#0e1b14;font-family:'DM Sans',sans-serif;">${name}</div>
              <div style="font-size:.75rem;color:#5d7268;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${user.email || ''}</div>
            </div>
            <a href="dashboard.html" style="${ROW_STYLE}">
              <svg viewBox="0 0 24 24" style="${SVG_STYLE}"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              Dashboard
            </a>
            <button id="drawerLogoutBtn" style="${ROW_STYLE}color:#c0392b;margin-top:4px;border-top:1px solid #edf3ef;padding-top:10px;">
              <svg viewBox="0 0 24 24" style="${SVG_STYLE}"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Keluar
            </button>
          `;

          // Append dropdown ke DALAM pill (bukan ke parent),
          // karena pill sudah position:relative via inline style — dropdown pasti ter-anchor dengan benar
          pill.appendChild(dropdown);
          drawerCta.replaceWith(pill);

          // ── Animasi dropdown via Web Animations API ──
          // Inject keyframes sekali ke <head>
          if (!document.getElementById('resik-dropdown-anim')) {
            const ks = document.createElement('style');
            ks.id = 'resik-dropdown-anim';
            ks.textContent = `
              @keyframes _ddSlideIn {
                0%   { opacity:0; transform: translateY(10px) scale(.96); }
                60%  { opacity:1; transform: translateY(-3px) scale(1.01); }
                100% { opacity:1; transform: translateY(0)   scale(1); }
              }
              @keyframes _ddSlideOut {
                0%   { opacity:1; transform: translateY(0)   scale(1); }
                100% { opacity:0; transform: translateY(8px) scale(.95); }
              }
            `;
            document.head.appendChild(ks);
          }

          let _ddClosing = false;

          function openDropdown() {
            _ddClosing = false;
            dropdown.style.display = 'block';
            dropdown.style.animation = '_ddSlideIn .28s cubic-bezier(.34,1.56,.64,1) forwards';
          }

          function closeDropdown() {
            if (_ddClosing) return;
            _ddClosing = true;
            dropdown.style.animation = '_ddSlideOut .18s ease forwards';
            dropdown.addEventListener('animationend', function onEnd() {
              dropdown.removeEventListener('animationend', onEnd);
              if (_ddClosing) dropdown.style.display = 'none';
              _ddClosing = false;
            });
          }

          pill.addEventListener('click', (e) => {
            const isOpen = pill.classList.toggle('open');
            const chevron = pill.querySelector('.dpp-chevron');
            if (isOpen) {
              openDropdown();
              if (chevron) chevron.style.transform = 'rotate(180deg)';
            } else {
              closeDropdown();
              if (chevron) chevron.style.transform = '';
            }
            e.stopPropagation();
          });

          // Tutup saat klik di luar
          document.addEventListener('click', () => {
            if (!pill.classList.contains('open')) return;
            pill.classList.remove('open');
            const chevron = pill.querySelector('.dpp-chevron');
            if (chevron) chevron.style.transform = '';
            closeDropdown();
          });

          // Tombol logout
          dropdown.querySelector('#drawerLogoutBtn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Keluar dari akun SELARAS?')) {
              await SELARAS_AUTH.logout();
              location.reload();
            }
          });
        }
      }
    } catch (e) {
      // tidak login, biarkan UI default
    }
  }
};

// updateNavAuth dipanggil oleh resik-shared.js setelah drawer siap

// Update navbar saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  SELARAS_UI.updateNavAuth();
});

// Update drawer CTA setelah resik-shared.js selesai inject drawer
document.addEventListener('resik:drawerReady', () => {
  SELARAS_UI.updateNavAuth();
});
