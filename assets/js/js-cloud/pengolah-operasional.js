/**
 * pengolah-dashboard.js
 * ─────────────────────────────────────────────────────────────────
 * Dashboard Pengolah — SELARAS
 *
 * Tanggung jawab:
 *  1. Ambil roleId (processor_id) dari getUserContext()
 *  2. Query waste_pickups filtered by processor_id = roleId
 *  3. Render 4 stat cards + tabel pasokan terbaru
 *  4. Realtime subscription → reloadData() on change
 * ─────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────── */
  let _sb       = null;   // Supabase client
  let _roleId   = null;   // processor_id milik user login
  let _realtimeCh = null; // Realtime channel

  /* ── Bootstrap ─────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', async function () {
    try {
      if (typeof getSupabase === 'function') {
        _sb = await getSupabase();
      } else if (window.supabaseClient) {
        _sb = window.supabaseClient;
      }
      // JANGAN fallback ke window.supabase — itu library bukan client
      if (!_sb) throw new Error('Supabase client tidak ditemukan');

      // Ambil roleId dari getUserContext (role-check.js)
      const ctx = await getUserContext();
      if (!ctx || !ctx.roleId) {
        _showError('Tidak dapat memuat data: role ID tidak ditemukan.');
        return;
      }
      _roleId = ctx.roleId;

      await _loadData();
      _subscribeRealtime();
    } catch (err) {
      console.error('[DASHBOARD] Init error:', err);
      _showError('Gagal memuat data dashboard.');
    }
  });

  /* ── Data loader ────────────────────────────────────────────── */
  async function _loadData() {
    try {
      _setLoadingState(true);

      const { data, error } = await _sb
        .from('waste_pickups')
        .select('*')
        .eq('processor_id', _roleId)
        .order('pickup_requested_at', { ascending: false });

      if (error) throw error;

      const rows = data || [];

      _renderStats(rows);
      _renderTable(rows.slice(0, 10));
    } catch (err) {
      console.error('[DASHBOARD] Load error:', err);
      _showError('Gagal memuat data dari server.');
    } finally {
      _setLoadingState(false);
    }
  }

  /* ── Stat cards renderer ────────────────────────────────────── */
  function _renderStats(rows) {
    const now   = new Date();
    const today = now.toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);

    const todayRows = rows.filter(function (r) {
      const d = (r.pickup_requested_at || r.created_at || '').slice(0, 10);
      return d === today;
    });
    const todayKg = todayRows.reduce(function (sum, r) {
      return sum + (parseFloat(r.weight_kg) || 0);
    }, 0);
    _setText('stat-today-kg', _fmtKg(todayKg));

    const monthRows = rows.filter(function (r) {
      const d = (r.pickup_requested_at || r.created_at || '').slice(0, 7);
      return d === thisMonth;
    });
    const monthKg = monthRows.reduce(function (sum, r) {
      return sum + (parseFloat(r.weight_kg) || 0);
    }, 0);
    _setText('stat-month-kg', _fmtKg(monthKg));

    const uniqueProviders = new Set(rows.map(function (r) { return r.provider_id; }));
    _setText('stat-providers', uniqueProviders.size);

    const pendingCount = rows.filter(function (r) {
      return (r.status || '').toLowerCase() === 'pending';
    }).length;
    _setText('stat-pending', pendingCount);
    _setText('stat-pending-card', pendingCount);
  }

  /* ── Table renderer ─────────────────────────────────────────── */
  function _renderTable(rows) {
    const tbody = document.getElementById('dashboard-table-body');
    if (!tbody) return;

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:var(--space-8);">Belum ada data pasokan.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (r) {
      const tanggal    = _fmtDate(r.pickup_requested_at || r.created_at);
      const providerId = _esc(r.provider_id || '-');
      const lokasi     = _esc(r.location_name || r.address || '-');
      const berat      = _fmtKg(r.weight_kg);
      const statusHtml = _statusBadge(r.status);

      return '<tr>'
        + '<td style="color:var(--text-secondary); font-size:var(--font-size-xs);">' + tanggal + '</td>'
        + '<td><span style="font-weight:600; font-size:var(--font-size-sm);">' + providerId + '</span></td>'
        + '<td style="font-size:var(--font-size-sm); color:var(--text-secondary);">' + lokasi + '</td>'
        + '<td style="font-weight:700;">' + berat + '</td>'
        + '<td>' + statusHtml + '</td>'
        + '</tr>';
    }).join('');
  }

  /* ── Realtime ───────────────────────────────────────────────── */
  function _subscribeRealtime() {
    if (!_sb || !_roleId) return;

    if (_realtimeCh) {
      _sb.removeChannel(_realtimeCh);
    }

    _realtimeCh = _sb
      .channel('dashboard-waste-pickups-' + _roleId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waste_pickups',
          filter: 'processor_id=eq.' + _roleId
        },
        function (payload) {
          console.log('[DASHBOARD] Realtime event:', payload.eventType);
          _loadData();
        }
      )
      .subscribe(function (status) {
        console.log('[DASHBOARD] Realtime status:', status);
      });
  }

  /* ── UI helpers ─────────────────────────────────────────────── */
  function _setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function _setLoadingState(loading) {
    const overlay = document.getElementById('dashboard-loading-overlay');
    if (overlay) overlay.style.display = loading ? 'flex' : 'none';
  }

  function _showError(msg) {
    const el = document.getElementById('dashboard-error-msg');
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
      .replace(/"/g, '&quot;');
  }

  function _statusBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'pending')    return '<span class="badge badge-gray">Menunggu</span>';
    if (s === 'processing') return '<span class="badge badge-warning">Diproses</span>';
    if (s === 'completed')  return '<span class="badge badge-success">Selesai</span>';
    return '<span class="badge badge-gray">' + _esc(status || '-') + '</span>';
  }

  window.PengolahanDashboard = { reload: _loadData };

})();