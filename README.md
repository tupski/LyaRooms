# Aplikasi Manajemen Apartemen

Aplikasi web untuk mengelola transaksi penyewaan apartemen, tagihan, dan request karyawan.

## 🚀 Deployment ke Vercel

### 1. Persiapan Supabase

1. Buat akun di [Supabase](https://supabase.com)
2. Buat project baru
3. Jalankan script SQL di `supabase-schema.sql` di SQL Editor Supabase
4. Pergi ke Settings > API untuk mendapatkan:
   - Project URL
   - Anon Key

### 2. Setup Vercel

1. Fork/clone repository ini
2. Buat akun di [Vercel](https://vercel.com)
3. Connect repository ke Vercel
4. Set environment variables di Vercel:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### 3. Deploy

Vercel akan otomatis mendeteksi konfigurasi dari `vercel.json` dan melakukan build.

## 📁 Struktur Database

### Tabel Utama:
- `transactions` - Data transaksi penyewaan
- `pengeluaran` - Data pengeluaran
- `tagihan_bulanan` - Tagihan bulanan apartemen
- `tagihan_fee_lunas` - Pembayaran fee marketing
- `lokasi_apartemen` - Daftar lokasi apartemen
- `nomor_kamar` - Daftar nomor kamar
- `karyawan_list` - Daftar karyawan
- `requests` - Request dari karyawan

### Storage:
- `tagihan_proofs` - Bucket untuk menyimpan bukti pembayaran

## 🔧 Development Setup

1. Clone repository
2. Copy `.env.example` ke `.env`
3. Isi environment variables dengan data Supabase
4. Install dependencies: `npm install`
5. Run development server: `npm run dev`

## 📋 Fitur

- ✅ Manajemen transaksi penyewaan
- ✅ Tracking pengeluaran
- ✅ Sistem tagihan bulanan
- ✅ Manajemen fee marketing
- ✅ Sistem request karyawan
- ✅ Upload bukti pembayaran
- ✅ Dashboard dan laporan
- ✅ Authentication dengan Supabase Auth

## 🛠️ Tech Stack

- **Frontend**: React + Vite
- **UI**: Tailwind CSS + Radix UI
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **Deployment**: Vercel