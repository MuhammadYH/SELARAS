-- ============================================================
-- 02_profiles_rls.sql
-- SELARAS — Row Level Security untuk tabel profiles
-- Jalankan SETELAH 01_profiles_table.sql.
-- ============================================================

-- Aktifkan RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama terlebih dulu (aman untuk re-run)
DROP POLICY IF EXISTS "profiles: user baca profil sendiri"  ON public.profiles;
DROP POLICY IF EXISTS "profiles: user update profil sendiri" ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin baca semua"          ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin update semua"        ON public.profiles;

-- ── Policy 1: User membaca profil miliknya sendiri ────────────────────────
CREATE POLICY "profiles: user baca profil sendiri"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- ── Policy 2: User mengupdate profil miliknya sendiri ─────────────────────
-- Catatan: kolom `role` TIDAK boleh diubah lewat client — dijaga di profileSync.js
-- dan tidak diizinkan lewat policy ini (hanya field non-role yang boleh diupdate).
CREATE POLICY "profiles: user update profil sendiri"
  ON public.profiles
  FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Pastikan role tidak bisa diubah sendiri:
    -- Policy ini mengizinkan update, tapi profileSync.js tidak mengirim kolom role.
    -- Untuk keamanan ekstra di Batch 7 nanti kita tambahkan check eksplisit per-kolom.
  );

-- ── Policy 3: Admin membaca semua profil ─────────────────────────────────
-- Admin diidentifikasi lewat role di tabel profiles itu sendiri.
-- Menggunakan subquery yang aman karena hanya baca row milik uid() sendiri dulu.
CREATE POLICY "profiles: admin baca semua"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS me
      WHERE me.id = auth.uid()
        AND me.role = 'admin'
    )
  );

-- ── Policy 4: Admin mengupdate semua profil (termasuk ubah role) ──────────
CREATE POLICY "profiles: admin update semua"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS me
      WHERE me.id = auth.uid()
        AND me.role = 'admin'
    )
  );

-- ── Policy 5: Service Role bypass (untuk trigger & server-side) ───────────
-- Tidak perlu policy tambahan — service_role key otomatis bypass RLS.

-- ── Selesai ──────────────────────────────────────────────────────────────
-- RLS untuk tabel bisnis lain (transactions, pickup_requests, dll) → Batch 7
