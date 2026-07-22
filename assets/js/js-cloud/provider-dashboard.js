/**
 * provider-dashboard.js
 * --------------------------------------------------
 * Logika utama halaman Dashboard untuk role Provider.
 * Mengambil data dari Supabase berdasarkan role_id provider.
 *
 * Dependensi:
 *   - window.supabaseClient  (supabase-client.js)
 *   - window.getUserContext  (role-check.js)
 *
 * Arsitektur (sama dengan provider-smart-bin.js):
 *   profiles.role_id = PRV001
 *   → smart_bins.provider_id = PRV001
 *   → bins.bin_id IN [BIN001, BIN002, ...]
 *   → merge & render dashboard
 *
 * Yang di-render oleh file ini:
 *   1. Stat Cards (Total Bin, Bin Aktif, Perlu Dikosongkan, Rata-rata Kapasitas)
 *   2. Status Smart Bin Saya (top 5, sorted by fill_percent DESC)
 *   3. CTA Banner (jumlah bin dinamis)
 *
 * Yang TETAP dummy (modul belum selesai):
 *   - Aktivitas Terbaru
 *   - Ringkasan Bulan Ini
 *   - Quick Insight
 * --------------------------------------------------
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
     Konstanta
  ───────────────────────────────────────── */

  const OFFLINE_THRESHOLD_HOURS = 24;
  const FULL_THRESHOLD = 80; // fill_percent >= 80 → perlu dikosongkan

  /* ─────────────────────────────────────────
     State
  ───────────────────────────────────────── */

  let _providerId   = null;
  let _mergedBins   = [];
  let _realtimeSubs = [];

  /* ─────────────────────────────────────────
     Helpers (sama dengan provider-smart-bin.js)
  ───────────────────────────────────────── */

  /**
   * Hitung status IoT berdasarkan updated_at.
   * @param {string|null} updatedAt
   * @returns {'online'|'offline'}
   */
  function iotStatus(updatedAt) {
    if (!updatedAt) return 'offline';
    const diffMs  = Date.now() - new Date(updatedAt).getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    return diffHrs < OFFLINE_THRESHOLD_HOURS ? 'online' : 'offline';
  }

  /**
   * Tentukan kategori kapasitas berdasarkan fill_percent.
   * @param {number|null} fill
   * @param {'online'|'offline'} status
   * @returns {'aman'|'hampir'|'penuh'|'offline'}
   */
  function capacityCategory(fill, status) {
    if (status === 'offline') return 'offline';
    if (fill === null || fill === undefined) return 'offline';
    if (fill >= 90) return 'penuh';
    if (fill >= FULL_THRESHOLD) return 'hampir';
    return 'aman';
  }

  /**
   * Warna avatar berdasarkan kategori.
   * @param {'aman'|'hampir'|'penuh'|'offline'} category
   * @returns {string}
   */
  function avatarStyle(category) {
    switch (category) {
      case 'penuh':   return 'background:#FFEBEE; color:#C62828;';
      case 'hampir':  return 'background:#FFF3E0; color:#F57C00;';
      case 'offline': return 'background:#F5F5F5; color:#9CA3AF;';
      default:        return 'background:var(--primary-green-soft); color:var(--primary-green);';
    }
  }

  /**
   * Warna teks persentase berdasarkan kategori.
   * @param {'aman'|'hampir'|'penuh'|'offline'} category
   * @returns {string}
   */
  function percentColor(category) {
    switch (category) {
      case 'penuh':   return '#C62828';
      case 'hampir':  return '#F57C00';
      case 'offline': return '#9CA3AF';
      default:        return 'var(--primary-green)';
    }
  }

  /**
   * Warna fill progress bar berdasarkan kategori.
   * @param {'aman'|'hampir'|'penuh'|'offline'} category
   * @returns {string}
   */
  function progressFillClass(category) {
    switch (category) {
      case 'penuh':   return 'red';
      case 'hampir':  return 'orange';
      default:        return '';
    }
  }

  /**
   * Label meta bin berdasarkan kategori.
   * @param {object} bin
   * @param {'aman'|'hampir'|'penuh'|'offline'} category
   * @returns {string}
   */
  function binMetaLabel(bin, category) {
    const loc = bin.address || bin.location_name || '—';
    if (category === 'offline') {
      return `${loc} • <span style="color:#C62828;">Offline</span>`;
    }
    if (category === 'penuh' || category === 'hampir') {
      return `${loc} • Segera dikosongkan`;
    }
    return loc;
  }

  /* ─────────────────────────────────────────
     Render: Stat Cards
  ───────────────────────────────────────── */

  function renderStatCards(bins) {
    const total = bins.length;

    const aktif = bins.filter(b => iotStatus(b.updated_at) === 'online').length;

    const perluKosong = bins.filter(b => {
      const s = iotStatus(b.updated_at);
      return s === 'online' && b.fill_percent !== null && b.fill_percent >= FULL_THRESHOLD;
    }).length;

    const avgFill = total > 0
      ? Math.round(bins.reduce((sum, b) => sum + (b.fill_percent || 0), 0) / total)
      : 0;

    // Total Smart Bin
    const elTotal = document.getElementById('dashStatTotalBin');
    if (elTotal) elTotal.textContent = total;

    // Bin Aktif
    const elAktif = document.getElementById('dashStatBinAktif');
    if (elAktif) elAktif.textContent = aktif;

    const elAktifSub = document.getElementById('dashStatBinAktifSub');
    if (elAktifSub) {
      const pct = total > 0 ? Math.round((aktif / total) * 100) : 0;
      elAktifSub.innerHTML = `<span class="badge badge-success">${pct}% aktif</span>`;
    }

    // Perlu Dikosongkan
    const elPerlu = document.getElementById('dashStatPerluKosong');
    if (elPerlu) elPerlu.textContent = perluKosong;

    const elPerluSub = document.getElementById('dashStatPerluKosongSub');
    if (elPerluSub) {
      elPerluSub.innerHTML = perluKosong > 0
        ? '<span class="badge badge-danger">Segera</span>'
        : '<span class="badge badge-success">Tidak ada</span>';
    }

    // Rata-rata Kapasitas
    const elAvg = document.getElementById('dashStatRataKapasitas');
    if (elAvg) {
      elAvg.innerHTML = `${avgFill}<span style="font-size:var(--font-size-xl); font-weight:600;">%</span>`;
    }
  }

  /* ─────────────────────────────────────────
     Render: Status Smart Bin Saya (top 5)
  ───────────────────────────────────────── */

  function renderBinList(bins) {
    const container = document.getElementById('dashBinList');
    if (!container) return;

    if (bins.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; color:var(--text-muted); padding:var(--space-8) 0;">
          Tidak ada smart bin yang terdaftar untuk akun ini.
        </div>`;
      return;
    }

    // Urutkan fill_percent DESC, offline paling bawah
    const sorted = [...bins].sort((a, b) => {
      const sa = iotStatus(a.updated_at);
      const sb = iotStatus(b.updated_at);
      if (sa === 'offline' && sb !== 'offline') return 1;
      if (sa !== 'offline' && sb === 'offline') return -1;
      return (b.fill_percent || 0) - (a.fill_percent || 0);
    });

    // Tampilkan maksimal 5 bin
    const topFive = sorted.slice(0, 5);

    container.innerHTML = topFive.map(bin => {
      const status   = iotStatus(bin.updated_at);
      const category = capacityCategory(bin.fill_percent, status);
      const fillPct  = bin.fill_percent !== null && bin.fill_percent !== undefined
        ? bin.fill_percent
        : null;

      const progressStyle = fillPct !== null && category !== 'offline'
        ? `width:${fillPct}%;`
        : 'width:0%; background:#E0E0E0;';

      const fillClass = progressFillClass(category);
      const pctDisplay = fillPct !== null && category !== 'offline'
        ? `${fillPct}%`
        : '—';

      return `
        <div class="bin-list-item">
          <div class="icon-wrap icon-wrap-md" style="${avatarStyle(category)}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </div>
          <div class="bin-list-info">
            <div class="bin-list-name">${bin.location_name || '—'}</div>
            <div class="bin-list-meta">${bin.bin_id} • ${binMetaLabel(bin, category)}</div>
            <div class="progress-bar" style="width:120px; margin-top:6px;">
              <div class="progress-bar-fill ${fillClass}" style="${progressStyle}"></div>
            </div>
          </div>
          <div class="bin-list-percent" style="color:${percentColor(category)};">${pctDisplay}</div>
        </div>`;
    }).join('');
  }

  /* ─────────────────────────────────────────
     Render: CTA Banner
  ───────────────────────────────────────── */

  function renderCtaBanner(bins) {
    const el = document.getElementById('dashCtaBinCount');
    if (el) {
      el.textContent = `${bins.length} Smart Bin Terdaftar`;
    }
  }

  /* ─────────────────────────────────────────
     Render: Semua komponen dashboard
  ───────────────────────────────────────── */

  function renderAll(bins) {
    _mergedBins = bins;
    renderStatCards(bins);
    renderBinList(bins);
    renderCtaBanner(bins);
  }

  /* ─────────────────────────────────────────
     Fetch Data dari Supabase
     (pola identik dengan provider-smart-bin.js)
  ───────────────────────────────────────── */

  async function fetchData() {
    const sb = window.supabaseClient;
    if (!sb) {
      console.error('[DASHBOARD] supabaseClient tidak ditemukan');
      return;
    }

    if (!_providerId) {
      console.warn('[DASHBOARD] providerId belum tersedia');
      return;
    }

    try {
      // 1. Ambil smart_bins milik provider ini
      const { data: smartBins, error: sbError } = await sb
        .from('smart_bins')
        .select('bin_id, location_name, address, status')
        .eq('provider_id', _providerId);

      if (sbError) throw sbError;

      if (!smartBins || smartBins.length === 0) {
        renderAll([]);
        return;
      }

      const binIds = smartBins.map(b => b.bin_id);

      // 2. Ambil data IoT dari tabel bins
      const { data: binsData, error: binsError } = await sb
        .from('bins')
        .select('bin_id, weight_kg, fill_percent, distance_cm, updated_at')
        .in('bin_id', binIds);

      if (binsError) throw binsError;

      // 3. Merge smart_bins + bins
      const binsMap = {};
      (binsData || []).forEach(b => { binsMap[b.bin_id] = b; });

      const merged = smartBins.map(sb => ({
        bin_id:        sb.bin_id,
        location_name: sb.location_name,
        address:       sb.address,
        status:        sb.status,
        weight_kg:     binsMap[sb.bin_id]?.weight_kg    ?? null,
        fill_percent:  binsMap[sb.bin_id]?.fill_percent ?? null,
        distance_cm:   binsMap[sb.bin_id]?.distance_cm  ?? null,
        updated_at:    binsMap[sb.bin_id]?.updated_at   ?? null,
      }));

      renderAll(merged);

    } catch (err) {
      console.error('[DASHBOARD] fetchData error:', err);
    }
  }

  /* ─────────────────────────────────────────
     Realtime Subscription
     (pola identik dengan provider-smart-bin.js)
  ───────────────────────────────────────── */

  function setupRealtime() {
    const sb = window.supabaseClient;
    if (!sb || !_providerId) return;

    // Unsubscribe dari subscription lama
    _realtimeSubs.forEach(s => { try { s.unsubscribe(); } catch (_) {} });
    _realtimeSubs = [];

    // Monitor tabel bins (IoT data)
    const binsSub = sb
      .channel('realtime:dashboard:bins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bins' }, () => {
        console.log('[DASHBOARD] Realtime: bins updated');
        fetchData();
      })
      .subscribe();

    // Monitor tabel smart_bins (perubahan registrasi bin)
    const smartBinsSub = sb
      .channel('realtime:dashboard:smart_bins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'smart_bins' }, () => {
        console.log('[DASHBOARD] Realtime: smart_bins updated');
        fetchData();
      })
      .subscribe();

    _realtimeSubs.push(binsSub, smartBinsSub);
    console.log('[DASHBOARD] Realtime subscription aktif');
  }

  /* ─────────────────────────────────────────
     Loading State
  ───────────────────────────────────────── */

  function showLoading() {
    // Reset stat cards ke loading state
    ['dashStatTotalBin', 'dashStatBinAktif', 'dashStatPerluKosong'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });

    const avgEl = document.getElementById('dashStatRataKapasitas');
    if (avgEl) avgEl.innerHTML = '—';

    // Loading state pada bin list
    const container = document.getElementById('dashBinList');
    if (container) {
      container.innerHTML = `
        <div style="text-align:center; color:var(--text-muted); padding:var(--space-6) 0;">
          <span style="display:inline-flex; align-items:center; gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite;">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Memuat data smart bin…
          </span>
        </div>`;
    }
  }

  /* ─────────────────────────────────────────
     Init
  ───────────────────────────────────────── */

  async function init() {
    showLoading();

    // Tambahkan CSS spin animation jika belum ada
    if (!document.getElementById('dashboard-spin-style')) {
      const style = document.createElement('style');
      style.id = 'dashboard-spin-style';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }

    try {
      // Ambil context user yang login
      const context = await window.getUserContext();

      if (!context) {
        console.error('[DASHBOARD] User context tidak ditemukan. User belum login?');
        const container = document.getElementById('dashBinList');
        if (container) {
          container.innerHTML = `
            <div style="text-align:center; color:#C62828; padding:var(--space-6) 0;">
              Sesi tidak ditemukan. Silakan <a href="/login.html">login ulang</a>.
            </div>`;
        }
        return;
      }

      _providerId = context.roleId;
      console.log('[DASHBOARD] Provider ID:', _providerId);

      if (!_providerId) {
        console.error('[DASHBOARD] role_id tidak ditemukan di profil');
        return;
      }

      // Ambil data pertama kali
      await fetchData();

      // Setup realtime
      setupRealtime();

    } catch (err) {
      console.error('[DASHBOARD] init error:', err);
    }
  }

  /* ─────────────────────────────────────────
     Bootstrap
  ───────────────────────────────────────── */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose untuk debugging
  window._Dashboard = {
    reload: fetchData,
    getBins: () => _mergedBins,
    getProviderId: () => _providerId,
  };

})();


/* provider-dashboard.js — Provider Dashboard interactions */
(function () {
  // Simple count-up animation for stat values
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (isNaN(target)) return;
    const duration = 1200;
    const start = performance.now();
    const isDecimal = String(target).includes('.');
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      el.textContent = (isDecimal ? current.toFixed(2) : Math.floor(current)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  document.querySelectorAll('[data-count]').forEach(animateCount);
})();
