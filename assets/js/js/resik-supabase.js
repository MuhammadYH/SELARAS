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
          role: role,
          organization: organization || null,
        }
      }
    });
    if (error) throw error;

    // Simpan profil ke tabel profiles jika sign up berhasil
    if (data.user) {
      const { error: profileError } = await sb.from('profiles').upsert({
        id: data.user.id,
        first_name: firstName,
        last_name: lastName || '',
        email: email,
        role: role,
        organization: organization || null,
        created_at: new Date().toISOString()
      });
      if (profileError) console.warn('Profile insert warning:', profileError.message);
    }

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
// WEEKLY CHART — Data volume mingguan untuk SelarasApp
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
        if (navBtn) {
          navBtn.textContent = `👤 ${name}`;
          navBtn.href = '#';
          navBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Keluar dari akun SELARAS?')) {
              await SELARAS_AUTH.logout();
              location.reload();
            }
          });
        }
        if (drawerCta) {
          drawerCta.textContent = `👤 ${name}`;
          drawerCta.href = '#';
        }
      }
    } catch (e) {
      // tidak login, biarkan UI default
    }
  }
};

// Auto-update nav on every page load
document.addEventListener('DOMContentLoaded', () => {
  SELARAS_UI.updateNavAuth();
});
