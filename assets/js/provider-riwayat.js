/* provider-riwayat.js — Histori Pengangkutan table */
(function () {

  /* ── Count-up ── */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (isNaN(target)) return;
    const duration = 1200;
    const start = performance.now();
    const isDecimal = String(target).includes('.');
    function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = (isDecimal ? (target * e).toFixed(2) : Math.floor(target * e)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  document.querySelectorAll('[data-count]').forEach(animateCount);

  /* ── Mock data ── */
  const JENIS = {
    pengangkutan: { label: 'Pengangkutan',  color: '#E8F5E9', text: '#2E7D32' },
    smartbin:     { label: 'Smart Bin',     color: '#E3F2FD', text: '#1565C0' },
    sensor:       { label: 'Sensor Update', color: '#F3E5F5', text: '#6A1B9A' },
    pengiriman:   { label: 'Pengiriman',    color: '#FFF8E1', text: '#F57F17' },
    maintenance:  { label: 'Maintenance',   color: '#FFF3E0', text: '#E65100' },
    peringatan:   { label: 'Peringatan',    color: '#FFEBEE', text: '#C62828' },
    laporan:      { label: 'Laporan Harian',color: '#F1F8E9', text: '#558B2F' },
  };
  const STATUS = {
    selesai:  { label: 'Selesai',   bg: '#E8F5E9', color: '#2E7D32' },
    proses:   { label: 'Diproses',  bg: '#E3F2FD', color: '#1565C0' },
    gagal:    { label: 'Gagal',     bg: '#FFEBEE', color: '#C62828' },
    pending:  { label: 'Menunggu',  bg: '#FFF8E1', color: '#F57F17' },
  };
  const BIN_NAMES = ['Bin Dapur Utama','Bin Kantin Barat','Bin Asrama Putra','Bin Masjid Utama','Bin Gudang Belakang'];
  const WAKTU = ['Hari ini, 08.12','Hari ini, 09.45','Kemarin, 14.20','Kemarin, 07.30','2 hari lalu, 11.00',
                 '2 hari lalu, 16.30','3 hari lalu, 08.15','3 hari lalu, 13.45','4 hari lalu, 10.20','5 hari lalu, 09.00'];
  const OPR = ['Budi Santoso','Siti Aisyah','Ahmad Fauzi','Tim SELARAS','Sistem Otomatis'];
  const JENIS_KEYS = Object.keys(JENIS);
  const STATUS_KEYS = Object.keys(STATUS);

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randNum(min, max) { return (Math.random() * (max - min) + min).toFixed(1); }

  function makeRows(n) {
    return Array.from({ length: n }, (_, i) => ({
      id: 1248 - i,
      waktu: WAKTU[i % WAKTU.length],
      jenis: JENIS_KEYS[i % JENIS_KEYS.length],
      lokasi: rand(BIN_NAMES),
      detail: ['Bin dikosongkan', 'Sensor terdeteksi', 'Jadwal rutin', 'Laporan otomatis', 'Pengiriman selesai'][i % 5],
      jumlah: randNum(4, 28) + ' kg',
      status: STATUS_KEYS[i % STATUS_KEYS.length],
      oleh: rand(OPR),
    }));
  }

  const ALL_DATA = makeRows(50);
  let currentData = [...ALL_DATA];
  let currentPage = 1;
  const PER_PAGE = 7;

  function renderTable() {
    const tbody = document.getElementById('riwayat-tbody');
    const start = (currentPage - 1) * PER_PAGE;
    const slice = currentData.slice(start, start + PER_PAGE);
    if (!tbody) return;

    if (slice.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:var(--space-8);color:var(--text-muted);">Tidak ada data yang sesuai filter.</td></tr>`;
    } else {
      tbody.innerHTML = slice.map(row => {
        const j = JENIS[row.jenis];
        const s = STATUS[row.status];
        return `
          <tr>
            <td style="color:var(--text-muted)">${row.waktu}</td>
            <td>
              <span style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:${j.color};color:${j.text};">
                ${j.label}
              </span>
            </td>
            <td style="font-weight:500;color:var(--text-primary)">${row.lokasi}</td>
            <td>${row.detail}</td>
            <td style="font-weight:700;color:var(--primary-green)">${row.jumlah}</td>
            <td>
              <span style="display:inline-flex;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:${s.bg};color:${s.color};">
                ${s.label}
              </span>
            </td>
            <td>${row.oleh}</td>
          </tr>`;
      }).join('');
    }

    // Count
    const total = currentData.length;
    const end = Math.min(start + PER_PAGE, total);
    const countEl = document.getElementById('riwayat-count');
    if (countEl) countEl.textContent = total === 0
      ? 'Tidak ada aktivitas'
      : `Menampilkan ${start + 1} - ${end} dari ${total.toLocaleString('id')} aktivitas`;

    renderPagination();
  }

  function renderPagination() {
    const pg = document.getElementById('pagination');
    if (!pg) return;
    const totalPages = Math.ceil(currentData.length / PER_PAGE);
    let html = '';

    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="providerRiwayatGoPage(${currentPage-1})">‹</button>`;
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      html += `<button class="${i === currentPage ? 'active' : ''}" onclick="providerRiwayatGoPage(${i})">${i}</button>`;
    }
    if (totalPages > 5) html += `<button disabled>…</button>`;
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="providerRiwayatGoPage(${currentPage+1})">›</button>`;
    pg.innerHTML = html;
  }

  window.providerRiwayatGoPage = function(p) {
    const totalPages = Math.ceil(currentData.length / PER_PAGE);
    currentPage = Math.max(1, Math.min(p, totalPages));
    renderTable();
  };

  /* ── Filters ── */
  function applyFilters() {
    const date  = document.getElementById('filter-date')?.value  || '';
    const jenis = document.getElementById('filter-jenis')?.value || '';
    const bin   = document.getElementById('filter-bin')?.value   || '';

    currentData = ALL_DATA.filter(row => {
      if (jenis && row.jenis !== jenis) return false;
      if (bin   && row.lokasi !== bin)  return false;
      return true;
    });
    currentPage = 1;
    renderTable();
  }

  document.getElementById('filter-date')?.addEventListener('change', applyFilters);
  document.getElementById('filter-jenis')?.addEventListener('change', applyFilters);
  document.getElementById('filter-bin')?.addEventListener('change', applyFilters);
  document.getElementById('filter-reset')?.addEventListener('click', () => {
    ['filter-date','filter-jenis','filter-bin'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    currentData = [...ALL_DATA];
    currentPage = 1;
    renderTable();
  });

  renderTable();

  /* ── Sparklines ── */
  [
    { id: 'spark-pengangkutan', data: [12,15,11,18,14,20,17,22,19,24] },
    { id: 'spark-berat',        data: [80,95,75,110,88,125,105,130,118,145] },
    { id: 'spark-pengiriman',   data: [4,5,3,6,5,7,6,8,7,9] },
    { id: 'spark-efisiensi',    data: [80,82,79,85,83,88,86,90,87,92] },
  ].forEach(({ id, data }) => {
    const svg = document.getElementById(id);
    if (!svg) return;
    const w = 80, h = 30, n = data.length;
    const max = Math.max(...data), min = Math.min(...data);
    const pts = data.map((v, i) => {
      const x = (i / (n-1)) * w;
      const y = h - ((v - min) / (max - min + 1)) * (h - 4) - 2;
      return `${x},${y}`;
    }).join(' ');
    svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="var(--primary-green)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  });

})();
