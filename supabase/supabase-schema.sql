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
    FOR UPDATE USING (
        auth.role() = 'authenticated'
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = auth.uid()
                AND ur.role IN ('admin', 'super_admin')
            )
        )
    ) WITH CHECK (
        auth.role() = 'authenticated'
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = auth.uid()
                AND ur.role IN ('admin', 'super_admin')
            )
        )
    );

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.requests;
CREATE POLICY "Enable delete for authenticated users" ON public.requests
    FOR DELETE USING (
        auth.role() = 'authenticated'
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = auth.uid()
                AND ur.role IN ('admin', 'super_admin')
            )
        )
    );

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

-- Standarisasi role default agar konsisten dengan aplikasi
ALTER TABLE public.user_roles
    ALTER COLUMN role SET DEFAULT 'karyawan';

UPDATE public.user_roles
SET role = 'karyawan'
WHERE role = 'user';image.png

-- Tabel profil karyawan/pengguna aplikasi
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'karyawan',
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================
-- Notifikasi (in-app inbox + read status + push subscriptions)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    dedupe_key TEXT UNIQUE,
    audience_role TEXT,
    audience_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notification_reads (
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, endpoint)
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
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
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

DROP POLICY IF EXISTS "notifications_select_audience" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_admin_or_superadmin" ON public.notifications;
DROP POLICY IF EXISTS "notification_reads_select_self" ON public.notification_reads;
DROP POLICY IF EXISTS "notification_reads_insert_self" ON public.notification_reads;
DROP POLICY IF EXISTS "notification_reads_update_self" ON public.notification_reads;
DROP POLICY IF EXISTS "push_subscriptions_select_self_or_superadmin" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert_self" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete_self" ON public.push_subscriptions;

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

-- notifications
-- User bisa melihat notifikasi untuk dirinya atau untuk role-nya.
CREATE POLICY "notifications_select_audience" ON public.notifications
    FOR SELECT USING (
        auth.role() = 'authenticated'
        AND (
            audience_user_id = auth.uid()
            OR audience_role = 'all'
            OR (
                audience_role IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = auth.uid()
                      AND ur.role = audience_role
                )
            )
        )
    );

-- Insert notifikasi oleh admin/super_admin (atau via server/service role).
CREATE POLICY "notifications_insert_admin_or_superadmin" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'super_admin')
        )
    );

-- notification_reads
CREATE POLICY "notification_reads_select_self" ON public.notification_reads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notification_reads_insert_self" ON public.notification_reads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_reads_update_self" ON public.notification_reads
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- push_subscriptions
CREATE POLICY "push_subscriptions_select_self_or_superadmin" ON public.push_subscriptions
    FOR SELECT USING (auth.uid() = user_id OR public.is_super_admin());

CREATE POLICY "push_subscriptions_insert_self" ON public.push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_delete_self" ON public.push_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

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

-- ============================================================
-- Cascade delete transaksi + sinkronisasi data turunan
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_transaction_by_privileged_role(
    p_transaction_id BIGINT,
    p_payload JSONB
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
    v_tx public.transactions%ROWTYPE;
BEGIN
    SELECT ur.role
    INTO v_user_role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    LIMIT 1;

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Sesi tidak valid.';
    END IF;

    IF COALESCE(v_user_role, 'karyawan') NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Akses ditolak untuk mengubah transaksi ini.';
    END IF;

    UPDATE public.transactions
    SET
        customer_name = COALESCE(p_payload->>'customer_name', customer_name),
        marketing_name = COALESCE(p_payload->>'marketing_name', marketing_name),
        rental_duration = COALESCE(NULLIF(p_payload->>'rental_duration', '')::INTEGER, rental_duration),
        shift = COALESCE(p_payload->>'shift', shift),
        input_by = COALESCE(p_payload->>'input_by', input_by),
        apartment_location = COALESCE(p_payload->>'apartment_location', apartment_location),
        room_number = COALESCE(p_payload->>'room_number', room_number),
        cash_amount = COALESCE(NULLIF(p_payload->>'cash_amount', '')::NUMERIC, cash_amount),
        transfer_amount = COALESCE(NULLIF(p_payload->>'transfer_amount', '')::NUMERIC, transfer_amount),
        transfer_to = CASE
            WHEN p_payload ? 'transfer_to' THEN NULLIF(p_payload->>'transfer_to', '')
            ELSE transfer_to
        END,
        marketing_fee = COALESCE(NULLIF(p_payload->>'marketing_fee', '')::NUMERIC, marketing_fee)
    WHERE id = p_transaction_id
    RETURNING * INTO v_tx;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaksi tidak ditemukan.';
    END IF;

    RETURN v_tx;
END;
$$;

REVOKE ALL ON FUNCTION public.update_transaction_by_privileged_role(BIGINT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_transaction_by_privileged_role(BIGINT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_transaction_cascade(p_transaction_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tx public.transactions%ROWTYPE;
    v_user_role TEXT;
    v_removed_fee_rows INTEGER := 0;
    v_updated_fee_rows INTEGER := 0;
BEGIN
    SELECT *
    INTO v_tx
    FROM public.transactions
    WHERE id = p_transaction_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaksi tidak ditemukan.';
    END IF;

    SELECT ur.role
    INTO v_user_role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    LIMIT 1;

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Sesi tidak valid.';
    END IF;

    IF auth.uid() <> v_tx.user_id AND COALESCE(v_user_role, 'karyawan') NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Akses ditolak untuk menghapus transaksi ini.';
    END IF;

    -- Sinkronisasi riwayat komisi marketing (tagihan_fee_lunas) berdasarkan ID transaksi (lebih akurat) atau detail customer+lokasi
    UPDATE public.tagihan_fee_lunas tfl
    SET
        transactions_detail = COALESCE(
            (
                SELECT jsonb_agg(elem)
                FROM jsonb_array_elements(COALESCE(tfl.transactions_detail, '[]'::jsonb)) elem
                WHERE NOT (
                    (elem ? 'transaction_id' AND (elem->>'transaction_id')::bigint = p_transaction_id)
                    OR 
                    (
                        NOT (elem ? 'transaction_id') AND
                        COALESCE(elem->>'customer', '') = COALESCE(v_tx.customer_name, '') AND
                        COALESCE(elem->>'location', '') = COALESCE(v_tx.apartment_location, '')
                    )
                )
            ),
            '[]'::jsonb
        ),
        customer_count = GREATEST(COALESCE(tfl.customer_count, 0) - 1, 0),
        total_fee = GREATEST(COALESCE(tfl.total_fee, 0) - COALESCE(v_tx.marketing_fee, 0), 0)
    WHERE tfl.marketing_name = v_tx.marketing_name
      AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(tfl.transactions_detail, '[]'::jsonb)) elem
          WHERE (elem ? 'transaction_id' AND (elem->>'transaction_id')::bigint = p_transaction_id)
             OR (COALESCE(elem->>'customer', '') = COALESCE(v_tx.customer_name, '')
                 AND COALESCE(elem->>'location', '') = COALESCE(v_tx.apartment_location, '')
             )
      );

    GET DIAGNOSTICS v_updated_fee_rows = ROW_COUNT;

    DELETE FROM public.tagihan_fee_lunas
    WHERE customer_count <= 0
       OR COALESCE(transactions_detail, '[]'::jsonb) = '[]'::jsonb;

    GET DIAGNOSTICS v_removed_fee_rows = ROW_COUNT;

    -- Hapus transaksi utama
    DELETE FROM public.transactions
    WHERE id = p_transaction_id;

    RETURN jsonb_build_object(
        'deleted_transaction_id', p_transaction_id,
        'updated_fee_rows', v_updated_fee_rows,
        'removed_fee_rows', v_removed_fee_rows
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_transaction_cascade(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_transaction_cascade(BIGINT) TO authenticated;
