/**
 * pengolah-operasional.js
 * ─────────────────────────────────────────────────────────────────
 * Halaman Operasional — SELARAS Pengolah
 *
 * Tanggung jawab:
 *  1. Ambil roleId (target_role_id) dari getUserContext()
 *  2. Query waste_provider filtered by target_role_id = roleId
 *  3. Join lokasi dari tabel profiles (source_role_id → role_id)
 *  4. Render tabel + filter chips (all / incoming / processing / completed)
 *  5. Aksi: Mulai Proses (incoming→processing), Selesaikan (processing→completed)
 *  6. Realtime subscription → reloadData() on change
 * ─────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────── */
  let _sb           = null;   // Supabase client
  let _roleId       = null;   // target_role_id milik user login
  let _realtimeCh   = null;   // Realtime channel
  let _allRows      = [];     // Semua data (cache)
  let _activeFilter = 'all';  // Filter chip aktif

  /* ── Bootstrap ─────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', async function () {
    try {
      if (typeof getSupabase === 'function') {
        _sb = await getSupabase();
      } else if (window.supabaseClient) {
        _sb = window.supabaseClient;
      }
      if (!_sb) throw new Error('Supabase client tidak ditemukan');

      const ctx = await getUserContext();
      if (!ctx || !ctx.roleId) {
        _showError('Tidak dapat memuat data: role ID tidak ditemukan.');
        return;
      }
      _roleId = ctx.roleId;

      _bindFilterChips();
      await _loadData();
      _subscribeRealtime();
    } catch (err) {
      console.error('[OPS] Init error:', err);
      _showError('Gagal memuat data operasional.');
    }
  });

  /* ── Data loader ────────────────────────────────────────────── */
  async function _loadData() {
    try {
      _setLoadingState(true);

      /* 1. Ambil semua waste_provider milik pengolah ini */
      const { data: wpData, error: wpError } = await _sb
        .from('waste_provider')
        .select('*')
        .eq('target_role_id', _roleId)
        .order('created_at', { ascending: false });

      if (wpError) throw wpError;

      const rows = wpData || [];

      /* 2. Kumpulkan semua source_role_id unik untuk di-join ke profiles */
      const sourceIds = [...new Set(rows.map(function (r) { return r.source_role_id; }).filter(Boolean))];

      let locationMap = {}; // { role_id: location_name }

      if (sourceIds.length > 0) {
        const { data: profData, error: profError } = await _sb
          .from('profiles')
          .select('role_id, location_name')
          .in('role_id', sourceIds);

        if (profError) {
          console.warn('[OPS] Gagal memuat profil lokasi:', profError);
        } else {
          (profData || []).forEach(function (p) {
            locationMap[p.role_id] = p.location_name || '-';
          });
        }
      }

      /* 3. Gabungkan lokasi ke setiap row */
      _allRows = rows.map(function (r) {
        return Object.assign({}, r, {
          _location: locationMap[r.source_role_id] || '-'
        });
      });

      _updateFilterCounts(_allRows);
      _renderTable(_getFilteredRows());
    } catch (err) {
      console.error('[OPS] Load error:', err);
      _showError('Gagal memuat data dari server.');
    } finally {
      _setLoadingState(false);
    }
  }

  /* ── Filter ─────────────────────────────────────────────────── */
  function _getFilteredRows() {
    if (_activeFilter === 'all') return _allRows;
    return _allRows.filter(function (r) {
      return (r.status || '').toLowerCase() === _activeFilter;
    });
  }

  function _bindFilterChips() {
    const chips = document.querySelectorAll('[data-ops-filter]');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        _activeFilter = chip.getAttribute('data-ops-filter');

        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');

        _renderTable(_getFilteredRows());
      });
    });
  }

  function _updateFilterCounts(rows) {
    const counts = { all: rows.length, incoming: 0, processing: 0, completed: 0 };
    rows.forEach(function (r) {
      const s = (r.status || '').toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    });

    _setText('filter-count-all',        counts.all);
    _setText('filter-count-incoming',   counts.incoming);
    _setText('filter-count-processing', counts.processing);
    _setText('filter-count-completed',  counts.completed);
  }

  /* ── Table renderer ─────────────────────────────────────────── */
  function _renderTable(rows) {
    const tbody = document.getElementById('ops-table-body');
    if (!tbody) return;

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:var(--space-8);">Belum ada data pasokan.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (r) {
      const tanggal    = _fmtDate(r.created_at);
      const providerId = _esc(r.source_role_id || '-');
      const binId      = _esc(r.bin_id || '-');
      const lokasi     = _esc(r._location || '-');
      const berat      = _fmtKg(r.weight_kg);
      const statusHtml = _statusBadge(r.status);
      const aksiHtml   = _aksiCell(r);

      return '<tr>'
        + '<td style="color:var(--text-secondary); font-size:var(--font-size-xs);">' + tanggal + '</td>'
        + '<td><span class="ops-provider-tag">' + providerId + '</span></td>'
        + '<td style="font-size:var(--font-size-sm); color:var(--text-secondary);">' + binId + '</td>'
        + '<td style="font-size:var(--font-size-sm); color:var(--text-secondary);">' + lokasi + '</td>'
        + '<td style="font-weight:700;">' + berat + '</td>'
        + '<td>' + statusHtml + '</td>'
        + '<td class="ops-action-cell" style="text-align:center;">' + aksiHtml + '</td>'
        + '</tr>';
    }).join('');
  }

  /* ── Aksi cell ──────────────────────────────────────────────── */
  function _aksiCell(row) {
    const s = (row.status || '').toLowerCase();
    const id = _esc(String(row.id));

    if (s === 'incoming') {
      return '<button'
        + ' class="btn btn-sm btn-outline"'
        + ' style="white-space:nowrap;"'
        + ' onclick="PengolahanOperasional.updateStatus(\'' + id + '\', \'processing\')"'
        + '>Mulai Proses</button>';
    }

    if (s === 'processing') {
      return '<button'
        + ' class="btn btn-sm btn-success"'
        + ' style="white-space:nowrap;"'
        + ' onclick="PengolahanOperasional.updateStatus(\'' + id + '\', \'completed\')"'
        + '>Selesaikan</button>';
    }

    if (s === 'completed') {
      return '<span style="font-size:var(--font-size-xs); color:#388E3C; font-weight:700;">&#10003; Selesai</span>';
    }

    return '<span style="color:var(--text-muted); font-size:var(--font-size-xs);">-</span>';
  }

  /* ── Update status ──────────────────────────────────────────── */
  async function _updateStatus(id, newStatus) {
    if (!id || !newStatus) return;

    /* Nonaktifkan tombol sementara untuk mencegah double-click */
    const btn = document.querySelector('[onclick*="updateStatus(\'' + id + '\'"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '…';
    }

    try {
      const { error } = await _sb
        .from('waste_provider')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('target_role_id', _roleId); // safety: pastikan hanya milik pengolah ini

      if (error) throw error;

      /* Update lokal supaya UI cepat tanpa menunggu realtime */
      _allRows = _allRows.map(function (r) {
        if (String(r.id) === String(id)) {
          return Object.assign({}, r, { status: newStatus });
        }
        return r;
      });

      _updateFilterCounts(_allRows);
      _renderTable(_getFilteredRows());
    } catch (err) {
      console.error('[OPS] Update status error:', err);
      _showError('Gagal memperbarui status. Silakan coba lagi.');
      /* Reload untuk sinkronisasi */
      await _loadData();
    }
  }

  /* ── Realtime ───────────────────────────────────────────────── */
  function _subscribeRealtime() {
    if (!_sb || !_roleId) return;

    if (_realtimeCh) {
      _sb.removeChannel(_realtimeCh);
    }

    const indicator = document.getElementById('realtime-indicator');

    _realtimeCh = _sb
      .channel('ops-waste-provider-' + _roleId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waste_provider',
          filter: 'target_role_id=eq.' + _roleId
        },
        function (payload) {
          console.log('[OPS] Realtime event:', payload.eventType);
          _loadData();
        }
      )
      .subscribe(function (status) {
        console.log('[OPS] Realtime status:', status);
        if (indicator) {
          if (status === 'SUBSCRIBED') {
            indicator.classList.add('connected');
            indicator.title = 'Terhubung realtime';
          } else {
            indicator.classList.remove('connected');
            indicator.title = 'Menghubungkan ke realtime…';
          }
        }
      });
  }

  /* ── UI helpers ─────────────────────────────────────────────── */
  function _setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function _setLoadingState(loading) {
    const overlay = document.getElementById('ops-loading-overlay');
    if (overlay) overlay.style.display = loading ? 'flex' : 'none';
  }

  function _showError(msg) {
    const el = document.getElementById('ops-error-msg');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  }

  /* ── Formatters ─────────────────────────────────────────────── */
  function _fmtKg(kg) {
    const n = parseFloat(kg) || 0;
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + ' ton';
    return n.toLocaleString('id-ID') + ' kg';
  }

  function _fmtDate(iso) {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (_) { return iso.slice(0, 16).replace('T', ' '); }
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  function _statusBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'incoming')   return '<span class="badge badge-gray">Masuk</span>';
    if (s === 'processing') return '<span class="badge badge-warning">Diproses</span>';
    if (s === 'completed')  return '<span class="badge badge-success">Selesai</span>';
    return '<span class="badge badge-gray">' + _esc(status || '-') + '</span>';
  }

  /* ── Public API ─────────────────────────────────────────────── */
  window.PengolahanOperasional = {
    reload:       _loadData,
    updateStatus: _updateStatus
  };

})();
