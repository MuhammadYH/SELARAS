-- ============================================================
-- 01_profiles_table.sql
-- SELARAS — Profiles Table
-- Jalankan ini PERTAMA di Supabase SQL Editor.
-- ============================================================

-- Tabel utama profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  first_name   TEXT        NOT NULL DEFAULT '',
  last_name    TEXT        NOT NULL DEFAULT '',
  full_name    TEXT        GENERATED ALWAYS AS (
                             TRIM(first_name || ' ' || last_name)
                           ) STORED,
  role         TEXT        NOT NULL DEFAULT 'buyer'
                           CHECK (role IN ('admin', 'provider', 'pengolah', 'buyer')),
  organization TEXT,
  avatar_url   TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk query umum
CREATE INDEX IF NOT EXISTS profiles_role_idx  ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);

-- ── Trigger: auto-update updated_at setiap kali row di-UPDATE ──────────────

CREATE OR REPLACE FUNCTION public.handle_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profiles_updated_at();

-- ── Trigger: auto-create profile saat user baru register ───────────────────
-- Trigger ini berjalan di schema auth, jadi dibuat di public.
-- Mengambil metadata dari raw_user_meta_data (diisi saat register).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER          -- butuh SECURITY DEFINER agar bisa insert ke public.profiles
SET search_path = public
AS $$
DECLARE
  _role TEXT;
BEGIN
  -- Ambil role dari metadata; fallback ke 'buyer'
  _role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'buyer'
  );

  -- Validasi role — tolak nilai selain yang diizinkan
  IF _role NOT IN ('admin', 'provider', 'pengolah', 'buyer') THEN
    _role := 'buyer';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    organization
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',  ''),
    _role,
    COALESCE(NEW.raw_user_meta_data->>'organization', NULL)
  )
  ON CONFLICT (id) DO NOTHING;  -- aman jika trigger terpanggil dua kali

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Selesai ─────────────────────────────────────────────────────────────────
-- Lanjut ke: 02_profiles_rls.sql
