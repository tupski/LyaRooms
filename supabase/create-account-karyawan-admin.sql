-- =============================================================
-- Script: Buat akun karyawan/admin dari SQL Editor Supabase
-- Input yang dibutuhkan: full_name, phone, email, password, role
-- Role yang diizinkan: 'karyawan' atau 'admin'
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.create_account_karyawan_admin(
  p_full_name text,
  p_phone text,
  p_email text,
  p_password text,
  p_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_role text := lower(trim(p_role));
  v_now timestamptz := now();
BEGIN
  IF v_role NOT IN ('karyawan', 'admin') THEN
    RAISE EXCEPTION 'Role harus karyawan atau admin.';
  END IF;

  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'Email wajib diisi.';
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password minimal 6 karakter.';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(trim(p_email))) THEN
    RAISE EXCEPTION 'Email sudah terdaftar.';
  END IF;

  -- 1) Buat user di auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    lower(trim(p_email)),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    v_now,
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('full_name', p_full_name, 'phone', p_phone, 'role', v_role),
    v_now,
    v_now
  );

  -- 1b) Buat identity email agar kompatibel dengan GoTrue (wajib di beberapa versi Supabase)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email))),
    'email',
    v_now,
    v_now,
    v_now
  );

  -- 2) Simpan role aplikasi
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, v_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  -- 3) Simpan profile user
  INSERT INTO public.user_profiles (id, email, full_name, phone, role)
  VALUES (v_user_id, lower(trim(p_email)), p_full_name, p_phone, v_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    updated_at = now();

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_account_karyawan_admin(text, text, text, text, text) FROM PUBLIC;

-- Contoh pemakaian (jalankan 1x per akun):
-- SELECT public.create_account_karyawan_admin(
--   'Budi Santoso',
--   '6281234567890',
--   'budi@contoh.com',
--   'Password123',
--   'karyawan'
-- );