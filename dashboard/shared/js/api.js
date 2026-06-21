/**
 * api.js
 * ─────────────────────────────────────────────
 * SELARAS Generic API Helper
 *
 * Wrapper tipis di atas Supabase client untuk
 * query yang sering dipakai di semua role.
 *
 * Depends on: supabaseClient.js
 * Expose: window.SELARAS_API
 *
 * Prinsip:
 *   - Setiap fungsi return { data, error }
 *   - Error tidak di-throw, cukup di-log + return null data
 *   - Page-specific logic JANGAN ditaruh di sini
 * ─────────────────────────────────────────────
 */

const SELARAS_API = (() => {

  // ─── Internal helper ──────────────────────────────────────────────────────

  async function _sb() {
    return await getSupabase();
  }

  function _handleError(context, error) {
    if (error) console.warn(`SELARAS API [${context}]:`, error.message);
    return error ? null : undefined;
  }

  // ─── PROFILES ─────────────────────────────────────────────────────────────

  /**
   * Ambil profil user berdasarkan ID.
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async function getProfile(userId) {
    if (!userId) return null;
    const sb = await _sb();
    const { data, error } = await sb
      .from('profiles')
      .select('id, email, first_name, last_name, role, organization, avatar_url, is_active, created_at')
      .eq('id', userId)
      .single();
    _handleError('getProfile', error);
    return data ?? null;
  }

  /**
   * Update profil user.
   * @param {string} userId
   * @param {Object} updates
   * @returns {Promise<Object|null>}
   */
  async function updateProfile(userId, updates) {
    const sb = await _sb();
    const { data, error } = await sb
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    _handleError('updateProfile', error);
    return data ?? null;
  }

  // ─── GENERIC CRUD ─────────────────────────────────────────────────────────

  /**
   * Ambil semua baris dari tabel dengan filter opsional.
   *
   * @param {string} table        - nama tabel Supabase
   * @param {Object} [options]
   * @param {string} [options.select]      - kolom yang diambil (default '*')
   * @param {Object} [options.match]       - filter eq: { kolom: nilai }
   * @param {string} [options.orderBy]     - nama kolom untuk urutan
   * @param {boolean}[options.ascending]   - asc/desc (default false)
   * @param {number} [options.limit]       - batas jumlah baris
   * @returns {Promise<Array>}
   */
  async function fetchAll(table, { select = '*', match = {}, orderBy = 'created_at', ascending = false, limit = null } = {}) {
    const sb = await _sb();
    let query = sb.from(table).select(select);

    Object.entries(match).forEach(([col, val]) => {
      query = query.eq(col, val);
    });

    query = query.order(orderBy, { ascending });
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    _handleError(`fetchAll:${table}`, error);
    return data ?? [];
  }

  /**
   * Ambil satu baris berdasarkan kondisi.
   *
   * @param {string} table
   * @param {Object} match  - { kolom: nilai }
   * @param {string} [select]
   * @returns {Promise<Object|null>}
   */
  async function fetchOne(table, match = {}, select = '*') {
    const sb = await _sb();
    let query = sb.from(table).select(select);
    Object.entries(match).forEach(([col, val]) => {
      query = query.eq(col, val);
    });
    const { data, error } = await query.single();
    _handleError(`fetchOne:${table}`, error);
    return data ?? null;
  }

  /**
   * Insert satu baris ke tabel.
   *
   * @param {string} table
   * @param {Object} payload
   * @returns {Promise<Object|null>}
   */
  async function insertOne(table, payload) {
    const sb = await _sb();
    const { data, error } = await sb
      .from(table)
      .insert([{ ...payload, created_at: new Date().toISOString() }])
      .select()
      .single();
    _handleError(`insertOne:${table}`, error);
    return data ?? null;
  }

  /**
   * Update baris berdasarkan kondisi match.
   *
   * @param {string} table
   * @param {Object} match    - { kolom: nilai } sebagai filter
   * @param {Object} updates  - field yang diupdate
   * @returns {Promise<Object|null>}
   */
  async function updateOne(table, match = {}, updates = {}) {
    const sb = await _sb();
    let query = sb
      .from(table)
      .update({ ...updates, updated_at: new Date().toISOString() });
    Object.entries(match).forEach(([col, val]) => {
      query = query.eq(col, val);
    });
    const { data, error } = await query.select().single();
    _handleError(`updateOne:${table}`, error);
    return data ?? null;
  }

  /**
   * Hapus baris berdasarkan kondisi match.
   *
   * @param {string} table
   * @param {Object} match
   * @returns {Promise<boolean>}
   */
  async function deleteOne(table, match = {}) {
    const sb = await _sb();
    let query = sb.from(table).delete();
    Object.entries(match).forEach(([col, val]) => {
      query = query.eq(col, val);
    });
    const { error } = await query;
    _handleError(`deleteOne:${table}`, error);
    return !error;
  }

  // ─── EXPORT ───────────────────────────────────────────────────────────────

  return {
    // Profile
    getProfile,
    updateProfile,

    // Generic CRUD
    fetchAll,
    fetchOne,
    insertOne,
    updateOne,
    deleteOne,
  };

})();

window.SELARAS_API = SELARAS_API;
