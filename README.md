# 🏢 Aplikasi Manajemen Apartemen

Aplikasi web modern untuk mengelola transaksi penyewaan apartemen, tagihan bulanan, pengeluaran, dan request karyawan dengan integrasi Supabase dan deployment ke Vercel.

## ✨ Fitur Utama

- ✅ **Manajemen Transaksi** - Input dan tracking transaksi penyewaan apartemen
- ✅ **Sistem Tagihan** - Tagihan bulanan, fee marketing, dan upload bukti pembayaran
- ✅ **Tracking Pengeluaran** - Monitoring pengeluaran dengan kategori dan tanggal
- ✅ **Manajemen Kamar** - Status ketersediaan kamar per apartemen
- ✅ **Request System** - Sistem permintaan karyawan (cuti, kasbon, dll.)
- ✅ **Dashboard Analytics** - Laporan omset, ranking marketing, dan statistik
- ✅ **Authentication** - Sistem login berbasis Supabase Auth
- ✅ **File Upload** - Upload KTP dan bukti pembayaran ke Supabase Storage

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **UI Framework**: Tailwind CSS + Radix UI Components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Charts**: Recharts
- **Deployment**: Vercel
- **State Management**: React Context

## 📋 Prerequisites

Sebelum memulai, pastikan Anda memiliki:

- ✅ Node.js 18+ terinstall
- ✅ Akun [Supabase](https://supabase.com)
- ✅ Akun [Vercel](https://vercel.com) (untuk deployment)
- ✅ Git terinstall

## 🚀 Panduan Deployment Lengkap

### 1. Setup Supabase Database

#### 1.1 Buat Project Supabase
1. Kunjungi [supabase.com](https://supabase.com) dan buat akun
2. Klik **"New Project"**
3. Isi detail project:
   - **Name**: `apartment-management`
   - **Database Password**: Buat password yang kuat
   - **Region**: Pilih region terdekat (Asia Southeast - Singapore)
4. Tunggu project selesai dibuat (2-3 menit)

#### 1.2 Setup Database Schema
1. Buka **SQL Editor** di Supabase Dashboard
2. Copy dan paste seluruh isi file `supabase-schema.sql`
3. Klik **"Run"** untuk menjalankan script
4. Pastikan tidak ada error (semua tabel berhasil dibuat)

#### 1.3 Konfigurasi Authentication (Opsional)
1. Pergi ke **Authentication > Settings**
2. Konfigurasi email templates jika diperlukan
3. Setup email provider untuk production (SMTP)

#### 1.4 Buat Akun Super Admin
1. Jalankan script pembuatan super admin:
   ```bash
   node create-super-admin.js
   ```
2. Masukkan email dan password untuk akun admin
3. Script akan otomatis membuat akun dengan role super_admin

**Akun Super Admin Default:**
- Email: `kakaramaroom@gmail.com`
- Password: `KR@98Apartemen`
- Role: super_admin (akses penuh ke semua fitur)

### 2. Setup Environment Variables

#### 2.1 Untuk Development Local
1. Copy file template environment:
   ```bash
   cp .env.example .env
   ```

2. Edit file `.env` dan isi dengan data Supabase:
   ```env
   VITE_SUPABASE_URL=https://hhyvvdumtmvlnzklsbed.supabase.co
   VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_KSDv-uZ4vGOuLSN_Fmm0Mg_CuL6Goyv
   ```

#### 2.2 Mendapatkan Supabase Keys
1. Buka **Settings > API** di Supabase Dashboard
2. Copy **Project URL** untuk `VITE_SUPABASE_URL`
3. Copy **anon/public key** untuk `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

### 3. Setup Development Environment

#### 3.1 Clone dan Install Dependencies
```bash
# Clone repository
git clone <your-repo-url>
cd apartment-management

# Install dependencies
npm install
```

#### 3.2 Jalankan Development Server
```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:3000`

#### 3.3 Build untuk Production
```bash
npm run build
```

### 4. Deployment ke Vercel

#### 4.1 Persiapan Repository
1. Push kode ke Git repository (GitHub/GitLab)
2. Pastikan file `.env` tidak di-commit (sudah ada di `.gitignore`)

#### 4.2 Deploy via Vercel Dashboard
1. Kunjungi [vercel.com](https://vercel.com) dan login
2. Klik **"New Project"**
3. Import repository dari Git
4. Konfigurasi build settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

#### 4.3 Setup Environment Variables di Vercel
Di **Project Settings > Environment Variables**, tambahkan:

```
VITE_SUPABASE_URL=https://hhyvvdumtmvlnzklsbed.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_KSDv-uZ4vGOuLSN_Fmm0Mg_CuL6Goyv
```

> **⚠️ Catatan**: Jika Vercel menanyakan untuk pull environment variables, pilih **"No"** dan set manual di dashboard.

#### 4.4 Deploy
1. Klik **"Deploy"**
2. Tunggu proses build selesai (2-3 menit)
3. Aplikasi akan live di URL Vercel yang diberikan

### 5. Post-Deployment Checklist

- ✅ **Test Authentication**: Coba login/signup
- ✅ **Test Database**: Tambah data transaksi/tagihan
- ✅ **Test File Upload**: Upload KTP/bukti pembayaran
- ✅ **Test Real-time**: Cek update data secara real-time
- ✅ **Mobile Responsive**: Test di berbagai device

## 📁 Struktur Database

### Tabel Utama

| Tabel | Deskripsi |
|-------|-----------|
| `lokasi_apartemen` | Daftar lokasi apartemen |
| `nomor_kamar` | Daftar kamar dengan status ketersediaan |
| `karyawan_list` | Daftar karyawan |
| `transactions` | Data transaksi penyewaan lengkap |
| `pengeluaran` | Tracking pengeluaran dengan kategori |
| `tagihan_bulanan` | Tagihan bulanan apartemen |
| `tagihan_fee_lunas` | Pembayaran fee marketing |
| `requests` | Sistem request karyawan |

### Storage Buckets
- `tagihan_proofs` - Menyimpan bukti pembayaran tagihan

### Sistem User Roles
- `super_admin` - Akses penuh ke semua fitur dan data
- `admin` - Akses terbatas untuk management
- `user` - Akses basic untuk input data

## 🔧 Troubleshooting

### Error: "Failed to run sql query"
- Pastikan script SQL dijalankan di **SQL Editor** Supabase
- Cek tidak ada syntax error di script
- Pastikan project Supabase aktif

### Error: "Could not find the table 'public.user_roles'"
- Pastikan schema database terbaru sudah dijalankan
- Jalankan ulang script `create-super-admin.js` setelah schema update

### Error: "references Secret 'supabase-url', which does not exist"
- Hapus bagian `"env"` dari `vercel.json` jika ada
- Set environment variables langsung di Vercel dashboard
- Jangan pilih "pull environment variables" saat deploy

### Error: "Environment variable not found"
- Pastikan `.env` file ada di root directory
- Restart development server setelah menambah env variables
- Di Vercel, pastikan env variables sudah di-set di dashboard

### Error: "Build failed"
```bash
# Clear cache dan install ulang
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database Connection Issues
- Cek URL dan key Supabase sudah benar
- Pastikan project Supabase tidak paused
- Verify Row Level Security policies

### File Upload Issues
- Pastikan bucket `tagihan_proofs` sudah dibuat
- Cek storage policies sudah benar
- Verify file size tidak melebihi limit Supabase

## 📊 Scripts Available

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🔒 Security Notes

- ✅ **Environment Variables**: Jangan commit `.env` ke Git
- ✅ **Supabase Keys**: Gunakan anon key, bukan service_role key
- ✅ **Row Level Security**: Semua tabel sudah dilengkapi RLS policies
- ✅ **Authentication**: Semua operasi database memerlukan auth

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

Jika ada pertanyaan atau masalah:
- Buat issue di repository ini
- Cek dokumentasi Supabase untuk database issues
- Review Vercel logs untuk deployment issues

---

**Happy Coding! 🚀**
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