-- Script untuk menambahkan kategori default pengeluaran
-- Jalankan script ini untuk memastikan kategori default tersedia

-- Insert kategori default jika belum ada
INSERT INTO pengeluaran_categories (name)
SELECT * FROM (
    VALUES 
        ('Gaji Karyawan'),
        ('CM Aplikasi'),
        ('Internet'),
        ('Tagihan & Utilitas'),
        ('Gas'),
        ('Belanja'),
        ('Reward Marketing'),
        ('Perbaikan Unit Apart'),
        ('Jajan KR'),
        ('Keluarga')
) AS new_categories(name)
WHERE NOT EXISTS (
    SELECT 1 FROM pengeluaran_categories WHERE pengeluaran_categories.name = new_categories.name
);