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

-- Create storage bucket for tagihan proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('tagihan_proofs', 'tagihan_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security on all tables
ALTER TABLE public.lokasi_apartemen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomor_kamar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karyawan_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tagihan_bulanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tagihan_fee_lunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON public.lokasi_apartemen
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.lokasi_apartemen
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.lokasi_apartemen
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.lokasi_apartemen
    FOR DELETE USING (auth.role() = 'authenticated');

-- Similar policies for other tables
CREATE POLICY "Enable read access for authenticated users" ON public.nomor_kamar
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.nomor_kamar
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.nomor_kamar
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.nomor_kamar
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.karyawan_list
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.karyawan_list
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.karyawan_list
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.karyawan_list
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.transactions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.transactions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Enable update for authenticated users" ON public.transactions
    FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Enable delete for authenticated users" ON public.transactions
    FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Enable read access for authenticated users" ON public.pengeluaran
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.pengeluaran
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Enable update for authenticated users" ON public.pengeluaran
    FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Enable delete for authenticated users" ON public.pengeluaran
    FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Enable read access for authenticated users" ON public.tagihan_bulanan
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.tagihan_bulanan
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Enable update for authenticated users" ON public.tagihan_bulanan
    FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Enable delete for authenticated users" ON public.tagihan_bulanan
    FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Enable read access for authenticated users" ON public.tagihan_fee_lunas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.tagihan_fee_lunas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Enable update for authenticated users" ON public.tagihan_fee_lunas
    FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Enable delete for authenticated users" ON public.tagihan_fee_lunas
    FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Enable read access for authenticated users" ON public.requests
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.requests
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Enable update for authenticated users" ON public.requests
    FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Enable delete for authenticated users" ON public.requests
    FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Storage policies for tagihan_proofs bucket
CREATE POLICY "Enable read access for authenticated users" ON storage.objects
    FOR SELECT USING (bucket_id = 'tagihan_proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'tagihan_proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON storage.objects
    FOR UPDATE USING (bucket_id = 'tagihan_proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON storage.objects
    FOR DELETE USING (bucket_id = 'tagihan_proofs' AND auth.role() = 'authenticated');

-- Create admin users table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies for user_roles
CREATE POLICY "Users can view their own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
        )
    );

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
        )
    );

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