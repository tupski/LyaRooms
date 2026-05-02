-- Migration: Tambah kolom pengeluaran per unit
-- Jalankan di Supabase SQL Editor

-- 1. Tambah kolom baru ke tabel pengeluaran (sudah ada)
ALTER TABLE public.pengeluaran 
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS apartment_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS room_number VARCHAR(255);

-- 2. Buat tabel kategori pengeluaran
CREATE TABLE IF NOT EXISTS public.pengeluaran_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Insert kategori default
INSERT INTO public.pengeluaran_categories (name, is_default) VALUES
    ('Listrik', true),
    ('Air', true),
    ('IPL', true)
ON CONFLICT (name) DO NOTHING;

-- 4. Enable RLS
ALTER TABLE public.pengeluaran_categories ENABLE ROW LEVEL SECURITY;

-- 5. Policies untuk pengeluaran_categories
DROP POLICY IF EXISTS "pengeluaran_categories_read_authenticated" ON public.pengeluaran_categories;
CREATE POLICY "pengeluaran_categories_read_authenticated" ON public.pengeluaran_categories
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pengeluaran_categories_insert_authenticated" ON public.pengeluaran_categories;
CREATE POLICY "pengeluaran_categories_insert_authenticated" ON public.pengeluaran_categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pengeluaran_categories_update_authenticated" ON public.pengeluaran_categories;
CREATE POLICY "pengeluaran_categories_update_authenticated" ON public.pengeluaran_categories
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pengeluaran_categories_delete_authenticated" ON public.pengeluaran_categories;
CREATE POLICY "pengeluaran_categories_delete_authenticated" ON public.pengeluaran_categories
    FOR DELETE USING (auth.role() = 'authenticated');