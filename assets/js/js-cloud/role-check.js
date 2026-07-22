/**
 * role-check.js
 * --------------------------------------------------
 * Mengambil identitas user yang sedang login:
 * - user_id
 * - role
 * - role_id
 * - profile
 *
 * Compatible dengan:
 * - getSupabase()       ← prioritas utama
 * - window.supabaseClient
 * - window.supabase
 *
 * Fix: gunakan window.currentUser (diset pengolah-auth.js)
 * untuk menghindari race condition getSession().
 * --------------------------------------------------
 */

window.getUserContext = async function () {
  try {
    // ── 1. Resolve Supabase client ───────────────────────────────
    let sb = null;
    if (typeof getSupabase === 'function') {
      sb = await getSupabase();
    } else if (window.supabaseClient) {
      sb = window.supabaseClient;
    } else if (window.supabase) {
      sb = window.supabase;
    }

    if (!sb) {
      throw new Error('Supabase client tidak ditemukan');
    }

    // ── 2. Ambil userId ──────────────────────────────────────────
    // Jika pengolah-auth.js sudah set window.currentUser, pakai langsung
    // untuk menghindari getSession() race condition.
    let userId = null;

    if (window.currentUser && window.currentUser.id) {
      userId = window.currentUser.id;
    } else {
      // Fallback: getSession() — hanya jika currentUser belum ada
      const { data: { session }, error: sessionError } = await sb.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) return null;
      userId = session.user.id;
    }

    // ── 3. Query profil dari database ───────────────────────────
    const { data: profile, error: profileError } = await sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    return {
      userId,
      role:   profile?.role    || window.currentUser?.role || null,
      roleId: profile?.role_id || null,
      profile
    };

  } catch (error) {
    console.error('[ROLE CHECK ERROR]', error);
    return null;
  }
};

/**
 * Helper
 */
window.getCurrentRole = async function () {
  const context = await getUserContext();
  return context?.role || null;
};

window.getCurrentRoleId = async function () {
  const context = await getUserContext();
  return context?.roleId || null;
};

/**
 * Isi profil sidebar otomatis
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const context = await getUserContext();

    if (!context) {
      console.warn('[ROLE CHECK] User context tidak ditemukan');
      return;
    }

    const profile = context.profile || {};

    const displayName =
      `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
      profile.full_name ||
      profile.name ||
      'User';

    const displayEmail =
      profile.email ||
      '';

    const sidebarName  = document.getElementById('sidebarUserName');
    const sidebarEmail = document.getElementById('sidebarUserEmail');

    if (sidebarName)  sidebarName.textContent  = displayName;
    if (sidebarEmail) sidebarEmail.textContent = displayEmail;

    console.log('[ROLE CHECK] Loaded:', {
      userId: context.userId,
      role:   context.role,
      roleId: context.roleId,
      name:   displayName,
      email:  displayEmail
    });

  } catch (err) {
    console.error('[ROLE CHECK UI ERROR]', err);
  }
});
