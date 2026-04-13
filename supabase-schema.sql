-- Supabase Schema untuk Aplikasi Manajemen Apartemen
-- Jalankan script ini di Supabase SQL Editor

-- Create tables
CREATE TABLE IF NOT EXISTS public.lokasi_apartemen (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nomor_kamar (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lokasi VARCHAR(255) NOT NULL REFERENCES public.lokasi_apartemen(name) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(name, lokasi)
);

CREATE TABLE IF NOT EXISTS public.karyawan_list (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketing_list (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    marketing_name VARCHAR(255) NOT NULL,
    rental_duration INTEGER NOT NULL,
    shift VARCHAR(50),
    input_by VARCHAR(255) NOT NULL,
    apartment_location VARCHAR(255) NOT NULL REFERENCES public.lokasi_apartemen(name),
    room_number VARCHAR(255) NOT NULL,
    cash_amount DECIMAL(15,2) DEFAULT 0,
    transfer_amount DECIMAL(15,2) DEFAULT 0,
    transfer_to VARCHAR(255),
    marketing_fee DECIMAL(15,2) DEFAULT 0,
    ktp_image_url TEXT,
    transfer_proof_url TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    checkout_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.pengeluaran (
    id SERIAL PRIMARY KEY,
    nama_pengeluaran VARCHAR(255) NOT NULL,
    jumlah DECIMAL(15,2) NOT NULL,
    tanggal DATE NOT NULL,
    keterangan TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tagihan_bulanan (
    id SERIAL PRIMARY KEY,
    apartment_location VARCHAR(255) NOT NULL REFERENCES public.lokasi_apartemen(name),
    room_number VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'unpaid',
    paid_at TIMESTAMP WITH TIME ZONE,
    proof_url TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tagihan_fee_lunas (
    id SERIAL PRIMARY KEY,
    marketing_name VARCHAR(255) NOT NULL,
    customer_count INTEGER NOT NULL,
    total_fee DECIMAL(15,2) NOT NULL,
    transactions_detail JSONB,
    proof_url TEXT,
    paid_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.requests (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(255) NOT NULL,
    apartment_location VARCHAR(255) NOT NULL REFERENCES public.lokasi_apartemen(name),
    request_type VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2),
    desired_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id)
);

-- Create storage bucket for tagihan proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('tagihan_proofs', 'tagihan_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for KTP images
INSERT INTO storage.buckets (id, name, public)
VALUES ('ktp_images', 'ktp_images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for transfer proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('transfer_proofs', 'transfer_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security on all tables
ALTER TABLE public.lokasi_apartemen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomor_kamar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karyawan_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tagihan_bulanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tagihan_fee_lunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.lokasi_apartemen;
CREATE POLICY "Enable read access for authenticated users" ON public.lokasi_apartemen
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.lokasi_apartemen;
CREATE POLICY "Enable insert for authenticated users" ON public.lokasi_apartemen
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.lokasi_apartemen;
CREATE POLICY "Enable update for authenticated users" ON public.lokasi_apartemen
    FOR UPDATE USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
        )
    ) WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.lokasi_apartemen;
CREATE POLICY "Enable delete for authenticated users" ON public.lokasi_apartemen
    FOR DELETE USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
        )
    );

-- Similar policies for other tables
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.nomor_kamar;
CREATE POLICY "Enable read access for authenticated users" ON public.nomor_kamar
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.nomor_kamar;
CREATE POLICY "Enable insert for authenticated users" ON public.nomor_kamar
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.nomor_kamar;
CREATE POLICY "Enable update for authenticated users" ON public.nomor_kamar
    FOR UPDATE USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
        )
    ) WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.nomor_kamar;
CREATE POLICY "Enable delete for authenticated users" ON public.nomor_kamar
    FOR DELETE USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.karyawan_list;
CREATE POLICY "Enable read access for authenticated users" ON public.karyawan_list
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.karyawan_list;
CREATE POLICY "Enable insert for authenticated users" ON public.karyawan_list
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.karyawan_list;
CREATE POLICY "Enable update for authenticated users" ON public.karyawan_list
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.karyawan_list;
CREATE POLICY "Enable delete for authenticated users" ON public.karyawan_list
    FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.marketing_list;
CREATE POLICY "Enable read access for authenticated users" ON public.marketing_list
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.marketing_list;
CREATE POLICY "Enable insert for authenticated users" ON public.marketing_list
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.marketing_list;
CREATE POLICY "Enable update for authenticated users" ON public.marketing_list
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.marketing_list;
CREATE POLICY "Enable delete for authenticated users" ON public.marketing_list
    FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.transactions;
CREATE POLICY "Enable read access for authenticated users" ON public.transactions
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.transactions;
CREATE POLICY "Enable insert for authenticated users" ON public.transactions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.transactions;
CREATE POLICY "Enable update for authenticated users" ON public.transactions
    FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.transactions;
CREATE POLICY "Enable delete for authenticated users" ON public.transactions
    FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.pengeluaran;
CREATE POLICY "Enable read access for authenticated users" ON public.pengeluaran
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.pengeluaran;
CREATE POLICY "Enable insert for authenticated users" ON public.pengeluaran
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.pengeluaran;
CREATE POLICY "Enable update for authenticated users" ON public.pengeluaran
    FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.pengeluaran;
CREATE POLICY "Enable delete for authenticated users" ON public.pengeluaran
    FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.tagihan_bulanan;
CREATE POLICY "Enable read access for authenticated users" ON public.tagihan_bulanan
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tagihan_bulanan;
CREATE POLICY "Enable insert for authenticated users" ON public.tagihan_bulanan
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.tagihan_bulanan;
CREATE POLICY "Enable update for authenticated users" ON public.tagihan_bulanan
    FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.tagihan_bulanan;
CREATE POLICY "Enable delete for authenticated users" ON public.tagihan_bulanan
    FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.tagihan_fee_lunas;
CREATE POLICY "Enable read access for authenticated users" ON public.tagihan_fee_lunas
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tagihan_fee_lunas;
CREATE POLICY "Enable insert for authenticated users" ON public.tagihan_fee_lunas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.tagihan_fee_lunas;
CREATE POLICY "Enable update for authenticated users" ON public.tagihan_fee_lunas
    FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.tagihan_fee_lunas;
CREATE POLICY "Enable delete for authenticated users" ON public.tagihan_fee_lunas
    FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.requests;
CREATE POLICY "Enable read access for authenticated users" ON public.requests
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.requests;
CREATE POLICY "Enable insert for authenticated users" ON public.requests
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.requests;
CREATE POLICY "Enable update for authenticated users" ON public.requests
    FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.requests;
CREATE POLICY "Enable delete for authenticated users" ON public.requests
    FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Policies for user_roles table
DROP POLICY IF EXISTS "Enable read user roles for authenticated users" ON public.user_roles;
CREATE POLICY "Enable read user roles for authenticated users" ON public.user_roles
    FOR SELECT USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable insert user roles for authenticated users" ON public.user_roles;
CREATE POLICY "Enable insert user roles for authenticated users" ON public.user_roles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable update user roles for authenticated users" ON public.user_roles;
CREATE POLICY "Enable update user roles for authenticated users" ON public.user_roles
    FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete user roles for authenticated users" ON public.user_roles;
CREATE POLICY "Enable delete user roles for authenticated users" ON public.user_roles
    FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Storage policies for all buckets
DROP POLICY IF EXISTS "tagihan_proofs_read_authenticated" ON storage.objects;
CREATE POLICY "tagihan_proofs_read_authenticated" ON storage.objects
    FOR SELECT USING (bucket_id = 'tagihan_proofs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "tagihan_proofs_insert_authenticated" ON storage.objects;
CREATE POLICY "tagihan_proofs_insert_authenticated" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'tagihan_proofs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "tagihan_proofs_update_authenticated" ON storage.objects;
CREATE POLICY "tagihan_proofs_update_authenticated" ON storage.objects
    FOR UPDATE USING (bucket_id = 'tagihan_proofs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "tagihan_proofs_delete_authenticated" ON storage.objects;
CREATE POLICY "tagihan_proofs_delete_authenticated" ON storage.objects
    FOR DELETE USING (bucket_id = 'tagihan_proofs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ktp_images_read_authenticated" ON storage.objects;
CREATE POLICY "ktp_images_read_authenticated" ON storage.objects
    FOR SELECT USING (bucket_id = 'ktp_images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ktp_images_insert_authenticated" ON storage.objects;
CREATE POLICY "ktp_images_insert_authenticated" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'ktp_images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ktp_images_update_authenticated" ON storage.objects;
CREATE POLICY "ktp_images_update_authenticated" ON storage.objects
    FOR UPDATE USING (bucket_id = 'ktp_images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ktp_images_delete_authenticated" ON storage.objects;
CREATE POLICY "ktp_images_delete_authenticated" ON storage.objects
    FOR DELETE USING (bucket_id = 'ktp_images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "transfer_proofs_read_authenticated" ON storage.objects;
CREATE POLICY "transfer_proofs_read_authenticated" ON storage.objects
    FOR SELECT USING (bucket_id = 'transfer_proofs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "transfer_proofs_insert_authenticated" ON storage.objects;
CREATE POLICY "transfer_proofs_insert_authenticated" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'transfer_proofs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "transfer_proofs_update_authenticated" ON storage.objects;
CREATE POLICY "transfer_proofs_update_authenticated" ON storage.objects
    FOR UPDATE USING (bucket_id = 'transfer_proofs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "transfer_proofs_delete_authenticated" ON storage.objects;
CREATE POLICY "transfer_proofs_delete_authenticated" ON storage.objects
    FOR DELETE USING (bucket_id = 'transfer_proofs' AND auth.role() = 'authenticated');

-- Insert sample data (optional - remove if not needed)
INSERT INTO public.lokasi_apartemen (name) VALUES
    ('Apartemen A'),
    ('Apartemen B'),
    ('Apartemen C')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.karyawan_list (name) VALUES
    ('John Doe'),
    ('Jane Smith'),
    ('Bob Johnson')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.marketing_list (name) VALUES
    ('Marketing A'),
    ('Marketing B'),
    ('Marketing C')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Tambahan skema untuk modul Super Admin (idempotent)
-- ============================================================

-- Standarisasi role default agar konsisten dengan aplikasi
ALTER TABLE public.user_roles
    ALTER COLUMN role SET DEFAULT 'karyawan';

UPDATE public.user_roles
SET role = 'karyawan'
WHERE role = 'user';

-- Tabel profil karyawan/pengguna aplikasi
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'karyawan',
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Pengaturan sistem global key-value
CREATE TABLE IF NOT EXISTS public.system_settings (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Visibilitas menu per peran
CREATE TABLE IF NOT EXISTS public.role_menu_visibility (
    id BIGSERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    menu_item_id VARCHAR(100) NOT NULL,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(role, menu_item_id)
);

-- Konfigurasi menu tambahan (opsional untuk runtime override)
CREATE TABLE IF NOT EXISTS public.menu_configuration (
    id BIGSERIAL PRIMARY KEY,
    menu_item_id VARCHAR(100) UNIQUE NOT NULL,
    label VARCHAR(255),
    category VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Izin granular per pengguna
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_key VARCHAR(255) NOT NULL,
    is_allowed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, permission_key)
);

-- Audit trail akses menu
CREATE TABLE IF NOT EXISTS public.menu_access_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    role VARCHAR(50),
    menu_item_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL DEFAULT 'visit',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Fungsi helper: cek apakah user login adalah super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
  );
$$;

-- Enable RLS untuk tabel tambahan
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_menu_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_access_logs ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "profiles_select_self_or_superadmin" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_insert_self_or_superadmin" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_update_self_or_superadmin" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_delete_superadmin_only" ON public.user_profiles;

DROP POLICY IF EXISTS "system_settings_read_authenticated" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_write_superadmin" ON public.system_settings;

DROP POLICY IF EXISTS "role_menu_visibility_read_authenticated" ON public.role_menu_visibility;
DROP POLICY IF EXISTS "role_menu_visibility_write_superadmin" ON public.role_menu_visibility;

DROP POLICY IF EXISTS "menu_configuration_read_authenticated" ON public.menu_configuration;
DROP POLICY IF EXISTS "menu_configuration_write_superadmin" ON public.menu_configuration;

DROP POLICY IF EXISTS "user_permissions_read_self_or_superadmin" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_write_superadmin" ON public.user_permissions;

DROP POLICY IF EXISTS "menu_access_logs_read_superadmin" ON public.menu_access_logs;
DROP POLICY IF EXISTS "menu_access_logs_insert_authenticated" ON public.menu_access_logs;

-- user_profiles
CREATE POLICY "profiles_select_self_or_superadmin" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "profiles_insert_self_or_superadmin" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "profiles_update_self_or_superadmin" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "profiles_delete_superadmin_only" ON public.user_profiles
    FOR DELETE USING (public.is_super_admin());

-- system_settings
CREATE POLICY "system_settings_read_authenticated" ON public.system_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "system_settings_write_superadmin" ON public.system_settings
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- role_menu_visibility
CREATE POLICY "role_menu_visibility_read_authenticated" ON public.role_menu_visibility
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "role_menu_visibility_write_superadmin" ON public.role_menu_visibility
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- menu_configuration
CREATE POLICY "menu_configuration_read_authenticated" ON public.menu_configuration
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "menu_configuration_write_superadmin" ON public.menu_configuration
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- user_permissions
CREATE POLICY "user_permissions_read_self_or_superadmin" ON public.user_permissions
    FOR SELECT USING (auth.uid() = user_id OR public.is_super_admin());

CREATE POLICY "user_permissions_write_superadmin" ON public.user_permissions
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- menu_access_logs
CREATE POLICY "menu_access_logs_read_superadmin" ON public.menu_access_logs
    FOR SELECT USING (public.is_super_admin());

CREATE POLICY "menu_access_logs_insert_authenticated" ON public.menu_access_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');