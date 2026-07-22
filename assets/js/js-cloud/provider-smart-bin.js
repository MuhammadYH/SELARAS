/**
 * provider-smart-bin.js
 * --------------------------------------------------
 * Logika utama halaman Smart Bin untuk role Provider.
 * Mengambil data dari Supabase berdasarkan role_id provider.
 *
 * Dependensi:
 *   - window.supabaseClient  (supabase-client.js)
 *   - window.getUserContext  (role-check.js)
 *
 * Arsitektur:
 *   profiles.role_id = PRV001
 *   → smart_bins.provider_id = PRV001
 *   → bins.bin_id IN [BIN001, BIN002, ...]
 *   → merge & render
 * --------------------------------------------------
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
     Konstanta
  ───────────────────────────────────────── */

  const OFFLINE_THRESHOLD_HOURS = 24;
  const FULL_THRESHOLD = 80;    // fill_percent >= 80 → perlu dikosongkan

  /* ─────────────────────────────────────────
     State
  ───────────────────────────────────────── */

  let _providerId   = null;
  let _mergedBins   = [];
  let _realtimeSubs = [];

  /* ─────────────────────────────────────────
     Helpers
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
   * Format waktu relatif dari timestamp ISO.
   * @param {string|null} updatedAt
   * @returns {string}
   */
  function relativeTime(updatedAt) {
    if (!updatedAt) return '—';
    const diffMs  = Date.now() - new Date(updatedAt).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)   return 'Baru saja';
    if (diffMin < 60)  return `${diffMin} mnt lalu`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24)  return `${diffHrs} jam lalu`;
    const diffDay = Math.floor(diffHrs / 24);
    return `${diffDay} hari lalu`;
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
   */
  function avatarStyle(category) {
    switch (category) {
      case 'penuh':   return 'background:#FFEBEE; color:#C62828;';
      case 'hampir':  return 'background:#FFF3E0; color:#F57C00;';
      case 'offline': return 'background:#F5F5F5; color:#9CA3AF;';
      default:        return 'background:#E8F5E9; color:#2E7D32;';
    }
  }

  /**
   * Badge HTML berdasarkan kategori.
   */
  function badgeHtml(category) {
    switch (category) {
      case 'penuh':   return '<span class="badge badge-danger">Hampir Penuh</span>';
      case 'hampir':  return '<span class="badge badge-warning">Perhatian</span>';
      case 'offline': return '<span class="badge badge-gray">Offline</span>';
      default:        return '<span class="badge badge-success">Aman</span>';
    }
  }

  /**
   * Progress bar HTML.
   */
  function progressHtml(fill, category) {
    if (category === 'offline' || fill === null || fill === undefined) {
      return `
        <div class="capacity-bar-wrap">
          <div class="progress-bar"><div class="progress-bar-fill" style="width:0%; background:#E0E0E0;"></div></div>
          <span class="capacity-pct" style="color:#9CA3AF;">—</span>
        </div>`;
    }
    const colorClass = category === 'penuh' ? 'red' : category === 'hampir' ? 'orange' : 'green';
    const colorText  = category === 'penuh' ? '#C62828' : category === 'hampir' ? '#F57C00' : '#2E7D32';
    return `
      <div class="capacity-bar-wrap">
        <div class="progress-bar"><div class="progress-bar-fill ${colorClass}" style="width:${fill}%;"></div></div>
        <span class="capacity-pct" style="color:${colorText};">${fill}%</span>
      </div>`;
  }

  /**
   * IoT signal HTML.
   */
  function iotSignalHtml(status) {
    const cls = status === 'online' ? 'iot-online' : 'iot-offline';
    return `<div class="iot-signal ${cls}"><span></span><span></span><span></span><span></span></div>`;
  }

  /**
   * Aksi button HTML.
   */
  function aksiHtml(category) {
    if (category === 'offline') {
      return '<button class="btn btn-ghost btn-sm">Troubleshoot</button>';
    }
    if (category === 'penuh' || category === 'hampir') {
      return '<button class="btn btn-outline btn-sm">Jadwalkan</button>';
    }
    return '<button class="btn btn-ghost btn-sm">Detail</button>';
  }

  /* ─────────────────────────────────────────
     Render: Stat Cards
  ───────────────────────────────────────── */

  function renderStatCards(bins) {
    const total   = bins.length;
    const online  = bins.filter(b => iotStatus(b.updated_at) === 'online').length;
    const needsEmpty = bins.filter(b => {
      const s = iotStatus(b.updated_at);
      return s === 'online' && b.fill_percent !== null && b.fill_percent >= FULL_THRESHOLD;
    }).length;
    const avgFill = total > 0
      ? Math.round(bins.reduce((sum, b) => sum + (b.fill_percent || 0), 0) / total)
      : 0;

    const elTotal    = document.getElementById('statTotalBin');
    const elOnline   = document.getElementById('statBinOnline');
    const elOnlineSub= document.getElementById('statBinOnlineSub');
    const elNeed     = document.getElementById('statPerluKosong');
    const elNeedSub  = document.getElementById('statPerluKosongSub');
    const elAvg      = document.getElementById('statRataKapasitas');

    if (elTotal)     elTotal.textContent = total;
    if (elOnline)    elOnline.textContent = online;
    if (elOnlineSub) {
      const pct = total > 0 ? Math.round((online / total) * 100) : 0;
      elOnlineSub.innerHTML = `<span class="badge badge-success">${pct}% aktif</span>`;
    }
    if (elNeed)    elNeed.textContent = needsEmpty;
    if (elNeedSub) {
      elNeedSub.innerHTML = needsEmpty > 0
        ? '<span class="badge badge-danger">Segera</span>'
        : '<span class="badge badge-success">Tidak ada</span>';
    }
    if (elAvg) {
      elAvg.innerHTML = `${avgFill}<span style="font-size:var(--font-size-xl); font-weight:600;">%</span>`;
    }

    // Update badge jumlah bin di header tabel
    const elBinCount = document.getElementById('binCountBadge');
    if (elBinCount) elBinCount.textContent = `${total} bin`;

    // Update badge "Bin Online" di Peta Bin
    const elMapOnlineBadge = document.getElementById('mapOnlineBadge');
    if (elMapOnlineBadge) elMapOnlineBadge.textContent = `${online} Online`;
  }

  /* ─────────────────────────────────────────
     Render: Alert Section
  ───────────────────────────────────────── */

  function renderAlerts(bins) {
    const alertSection = document.getElementById('alertSection');
    if (!alertSection) return;

    const criticalBins = bins.filter(b => {
      const s = iotStatus(b.updated_at);
      return s === 'online' && b.fill_percent !== null && b.fill_percent >= 90;
    });
    const warningBins = bins.filter(b => {
      const s = iotStatus(b.updated_at);
      return s === 'online' && b.fill_percent !== null && b.fill_percent >= FULL_THRESHOLD && b.fill_percent < 90;
    });
    const offlineBins = bins.filter(b => iotStatus(b.updated_at) === 'offline');

    let html = '';

    criticalBins.forEach(b => {
      html += `
        <div class="alert-bar danger">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span class="alert-msg"><strong>${b.location_name || b.bin_id}</strong> telah mencapai ${b.fill_percent}% kapasitas. Segera jadwalkan pengangkutan.</span>
          <span class="alert-time">${relativeTime(b.updated_at)}</span>
        </div>`;
    });

    warningBins.forEach(b => {
      html += `
        <div class="alert-bar warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span class="alert-msg"><strong>${b.location_name || b.bin_id}</strong> mencapai ${b.fill_percent}% kapasitas. Pantau terus.</span>
          <span class="alert-time">${relativeTime(b.updated_at)}</span>
        </div>`;
    });

    offlineBins.forEach(b => {
      html += `
        <div class="alert-bar warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
          <span class="alert-msg"><strong>${b.location_name || b.bin_id}</strong> tidak terdeteksi — offline lebih dari ${OFFLINE_THRESHOLD_HOURS} jam.</span>
          <span class="alert-time">${relativeTime(b.updated_at)}</span>
        </div>`;
    });

    alertSection.innerHTML = html;
    alertSection.style.display = html ? '' : 'none';
  }

  /* ─────────────────────────────────────────
     Render: Tabel Bin
  ───────────────────────────────────────── */

  function renderTable(bins) {
    const tbody = document.querySelector('#binTable tbody');
    if (!tbody) return;

    if (bins.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; color:var(--text-muted); padding:var(--space-8);">
            Tidak ada smart bin yang terdaftar untuk akun ini.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = bins.map(b => {
      const status   = iotStatus(b.updated_at);
      const category = capacityCategory(b.fill_percent, status);
      return `
        <tr data-bin-id="${b.bin_id}" data-category="${category}">
          <td>
            <div class="bin-icon-cell">
              <div class="bin-avatar" style="${avatarStyle(category)}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </div>
              <div>
                <div class="bin-name">${b.location_name || '—'}</div>
                <div class="bin-sub">${b.bin_id}</div>
              </div>
            </div>
          </td>
          <td>${badgeHtml(category)}</td>
          <td class="capacity-cell">${progressHtml(b.fill_percent, category)}</td>
          <td>${b.weight_kg !== null && b.weight_kg !== undefined ? b.weight_kg + ' kg' : '—'}</td>
          <td>${b.address || b.location_name || '—'}</td>
          <td>${iotSignalHtml(status)}</td>
          <td>${relativeTime(b.updated_at)}</td>
          <td>${aksiHtml(category)}</td>
        </tr>`;
    }).join('');
  }

  /* ─────────────────────────────────────────
     Render: Distribusi Donut Chart
  ───────────────────────────────────────── */

  function renderDonut(bins) {
    const total   = bins.length;
    const aman    = bins.filter(b => capacityCategory(b.fill_percent, iotStatus(b.updated_at)) === 'aman').length;
    const hampir  = bins.filter(b => capacityCategory(b.fill_percent, iotStatus(b.updated_at)) === 'hampir').length;
    const penuh   = bins.filter(b => capacityCategory(b.fill_percent, iotStatus(b.updated_at)) === 'penuh').length;
    const offline = bins.filter(b => capacityCategory(b.fill_percent, iotStatus(b.updated_at)) === 'offline').length;

    // Circumference for r=35: 2π*35 ≈ 220
    const C = 220;
    const toArc = count => total > 0 ? Math.round((count / total) * C) : 0;

    const arcAman    = toArc(aman);
    const arcHampir  = toArc(hampir);
    const arcPenuh   = toArc(penuh);
    const arcOffline = toArc(offline);

    let offset = 0;

    function segment(color, arc, off) {
      return `<circle cx="45" cy="45" r="35" fill="none" stroke="${color}" stroke-width="16"
        stroke-dasharray="${arc} ${C - arc}" stroke-dashoffset="${-off}" transform="rotate(-90 45 45)"/>`;
    }

    const svgContent =
      `<circle cx="45" cy="45" r="35" fill="none" stroke="#E8F5E9" stroke-width="16"/>` +
      (aman    > 0 ? segment('#2E7D32', arcAman,    (offset += 0,    0))     : '') +
      (hampir  > 0 ? segment('#F57C00', arcHampir,  (offset += arcAman,  offset - arcAman))  : '') +
      (penuh   > 0 ? segment('#C62828', arcPenuh,   (offset += arcHampir, offset - arcHampir)) : '') +
      (offline > 0 ? segment('#9CA3AF', arcOffline, (offset += arcPenuh,  offset - arcPenuh))  : '') +
      `<text x="45" y="50" text-anchor="middle" font-size="14" font-weight="800" fill="var(--text-primary)">${total}</text>`;

    const svgEl = document.querySelector('.donut-wrap svg');
    if (svgEl) svgEl.innerHTML = svgContent;

    // Update legend counts
    const elAmn = document.getElementById('donutAmn');
    const elHmp = document.getElementById('donutHmp');
    const elPnl = document.getElementById('donutPnl');
    const elOfl = document.getElementById('donutOfl');
    if (elAmn) elAmn.textContent = aman;
    if (elHmp) elHmp.textContent = hampir;
    if (elPnl) elPnl.textContent = penuh;
    if (elOfl) elOfl.textContent = offline;
  }

  /* ─────────────────────────────────────────
     Render: Peta Pins
  ───────────────────────────────────────── */

  function renderMapPins(bins) {
    const mapEl = document.querySelector('.map-placeholder');
    if (!mapEl) return;

    // Hapus semua pin lama
    mapEl.querySelectorAll('.map-pin').forEach(el => el.remove());

    if (bins.length === 0) return;

    // Posisi pin tersebar di area peta (acak proporsional, tidak overlap)
    const positions = [
      { top: '28%', left: '18%' },
      { top: '50%', left: '42%' },
      { top: '22%', left: '65%' },
      { top: '65%', left: '72%' },
      { top: '70%', left: '25%' },
      { top: '40%', left: '80%' },
      { top: '55%', left: '55%' },
      { top: '15%', left: '40%' },
    ];

    bins.forEach((b, i) => {
      const status   = iotStatus(b.updated_at);
      const category = capacityCategory(b.fill_percent, status);
      const pos      = positions[i % positions.length];

      const pin = document.createElement('div');
      pin.className = `map-pin ${category === 'offline' ? 'offline' : category === 'penuh' ? 'penuh' : category === 'hampir' ? 'hampir' : 'aman'}`;
      pin.style.top  = pos.top;
      pin.style.left = pos.left;
      pin.title = `${b.location_name || b.bin_id} — ${category === 'offline' ? 'Offline' : (b.fill_percent ?? '?') + '%'}`;
      pin.textContent = '🗑';
      mapEl.appendChild(pin);
    });
  }

  /* ─────────────────────────────────────────
     Render: Semua
  ───────────────────────────────────────── */

  function renderAll(bins) {
    _mergedBins = bins;
    renderStatCards(bins);
    renderAlerts(bins);
    renderTable(bins);
    renderDonut(bins);
    renderMapPins(bins);
    applyFilters(); // terapkan filter aktif
  }

  /* ─────────────────────────────────────────
     Filter & Search
  ───────────────────────────────────────── */

  function applyFilters() {
    const searchEl  = document.getElementById('binSearchInput');
    const statusEl  = document.getElementById('statusFilter');
    const q         = (searchEl?.value || '').toLowerCase().trim();
    const statusVal = (statusEl?.value || '').toLowerCase();

    document.querySelectorAll('#binTable tbody tr').forEach(row => {
      if (!row.dataset.binId) return; // skip empty-state row

      const name     = (row.querySelector('.bin-name')?.textContent || '').toLowerCase();
      const binId    = (row.dataset.binId || '').toLowerCase();
      const category = (row.dataset.category || '').toLowerCase();

      const matchSearch = !q || name.includes(q) || binId.includes(q);
      const matchStatus = !statusVal || category === statusVal;

      row.style.display = matchSearch && matchStatus ? '' : 'none';
    });
  }

  /* ─────────────────────────────────────────
     Fetch Data dari Supabase
  ───────────────────────────────────────── */

  async function fetchData() {
    const sb = window.supabaseClient;
    if (!sb) {
      console.error('[SMART BIN] supabaseClient tidak ditemukan');
      return;
    }

    if (!_providerId) {
      console.warn('[SMART BIN] providerId belum tersedia');
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

      // 3. Merge
      const binsMap = {};
      (binsData || []).forEach(b => { binsMap[b.bin_id] = b; });

      const merged = smartBins.map(sb => ({
        bin_id:       sb.bin_id,
        location_name: sb.location_name,
        address:      sb.address,
        status:       sb.status,
        weight_kg:    binsMap[sb.bin_id]?.weight_kg    ?? null,
        fill_percent: binsMap[sb.bin_id]?.fill_percent ?? null,
        distance_cm:  binsMap[sb.bin_id]?.distance_cm  ?? null,
        updated_at:   binsMap[sb.bin_id]?.updated_at   ?? null,
      }));

      renderAll(merged);

    } catch (err) {
      console.error('[SMART BIN] fetchData error:', err);
    }
  }

  /* ─────────────────────────────────────────
     Realtime Subscription
  ───────────────────────────────────────── */

  function setupRealtime() {
    const sb = window.supabaseClient;
    if (!sb || !_providerId) return;

    // Unsubscribe dari subscription lama
    _realtimeSubs.forEach(s => { try { s.unsubscribe(); } catch (_) {} });
    _realtimeSubs = [];

    // Monitor tabel bins (IoT data)
    const binsSub = sb
      .channel('realtime:bins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bins' }, () => {
        console.log('[SMART BIN] Realtime: bins updated');
        fetchData();
      })
      .subscribe();

    // Monitor tabel smart_bins (perubahan registrasi bin)
    const smartBinsSub = sb
      .channel('realtime:smart_bins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'smart_bins' }, () => {
        console.log('[SMART BIN] Realtime: smart_bins updated');
        fetchData();
      })
      .subscribe();

    _realtimeSubs.push(binsSub, smartBinsSub);
    console.log('[SMART BIN] Realtime subscription aktif');
  }

  /* ─────────────────────────────────────────
     Loading State
  ───────────────────────────────────────── */

  function showLoading() {
    const tbody = document.querySelector('#binTable tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; color:var(--text-muted); padding:var(--space-8);">
            <span style="display:inline-flex; align-items:center; gap:8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite;">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Memuat data smart bin…
            </span>
          </td>
        </tr>`;
    }

    // Reset stat cards ke loading state
    ['statTotalBin','statBinOnline','statPerluKosong'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
    const avgEl = document.getElementById('statRataKapasitas');
    if (avgEl) avgEl.innerHTML = '—';
  }

  /* ─────────────────────────────────────────
     Init
  ───────────────────────────────────────── */

  async function init() {
    showLoading();

    // Tambahkan CSS spin animation jika belum ada
    if (!document.getElementById('smartbin-spin-style')) {
      const style = document.createElement('style');
      style.id = 'smartbin-spin-style';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }

    try {
      // Ambil context user yang login
      const context = await window.getUserContext();

      if (!context) {
        console.error('[SMART BIN] User context tidak ditemukan. User belum login?');
        const tbody = document.querySelector('#binTable tbody');
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#C62828; padding:var(--space-8);">Sesi tidak ditemukan. Silakan <a href="/login.html">login ulang</a>.</td></tr>`;
        }
        return;
      }

      _providerId = context.roleId;
      console.log('[SMART BIN] Provider ID:', _providerId);

      if (!_providerId) {
        console.error('[SMART BIN] role_id tidak ditemukan di profil');
        return;
      }

      // Ambil data pertama kali
      await fetchData();

      // Setup realtime
      setupRealtime();

    } catch (err) {
      console.error('[SMART BIN] init error:', err);
    }

    // Event listeners: filter & search
    document.getElementById('binSearchInput')?.addEventListener('input', applyFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
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
  window._SmartBin = {
    reload: fetchData,
    getBins: () => _mergedBins,
    getProviderId: () => _providerId,
  };

})();
