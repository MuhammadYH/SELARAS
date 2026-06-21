/**
 * supabaseClient.js
 * ─────────────────────────────────────────────
 * SELARAS Supabase Client — Shared Core
 *
 * Hanya berisi inisialisasi Supabase client.
 * Tidak ada auth logic, UI logic, atau data fetching di sini.
 *
 * Urutan load yang benar di setiap halaman:
 *   1. supabaseClient.js  ← file ini
 *   2. auth.js
 *   3. session.js
 *   4. [page-specific].js
 *
 * Expose: getSupabase() → Promise<SupabaseClient>
 * ─────────────────────────────────────────────
 */

const SUPABASE_URL      = 'https://vcxwphzxavolrbsafroa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjeHdwaHp4YXZvbHJic2Fmcm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzM4NjQsImV4cCI6MjA5NDg0OTg2NH0.OOW5l0QgcNRPp5Q4qBIaK6uotvTdo91zt2uV5ON6rx0';

let _supabaseInstance = null;

/**
 * Ambil Supabase client.
 * Otomatis load SDK dari CDN jika belum ada.
 * Singleton — hanya dibuat sekali per sesi.
 *
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
async function getSupabase() {
  if (_supabaseInstance) return _supabaseInstance;

  // Load Supabase SDK dari CDN jika belum ada di window
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const script    = document.createElement('script');
      script.src      = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      script.onload   = resolve;
      script.onerror  = () => reject(new Error('Gagal memuat Supabase SDK dari CDN.'));
      document.head.appendChild(script);
    });
  }

  _supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _supabaseInstance;
}

// Expose ke window agar bisa diakses oleh auth.js, session.js, dll
window.getSupabase = getSupabase;
