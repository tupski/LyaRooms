# Changelog

Semua perubahan penting untuk proyek ini akan dicatat di file ini.

## [2.2.2] - 2026-04-28
### Added
- Total tagihan fee belum dibayar kini tampil langsung di judul section: `Tagihan Fee (Rp...)`, mengikuti filter tanggal aktif.
- Tombol bagikan (ikon share) ditambahkan di pojok kanan atas setiap kartu tagihan fee marketing yang belum lunas.

### Changed
- Alur bagikan untuk tagihan fee belum lunas disamakan dengan pola riwayat lunas: salin pesan ke clipboard lalu buka WhatsApp.

### Fixed
- Penempatan total di dalam area tombol bayar pada kartu tagihan fee dikembalikan ke layout semula agar tidak duplikat.

## [2.2.1] - 2026-04-18
### Added
- Audit Integritas Data Keuangan: Pencegahan double-submit di semua form transaksi dan finance.
- Sinkronisasi Role yang lebih robust untuk mencegah error 403 Forbidden.
- Logging tambahan di `RoleBasedWrapper` untuk mempermudah debugging akses.

### Fixed
- Error `gen_salt` pada pembuatan user baru (aktivasi ekstensi `pgcrypto`).
- Bug `delete_transaction_cascade` yang kurang akurat saat menghapus riwayat fee.
- Pembersihan cache yang lebih selektif saat logout.

## [2.2.0] - 2026-04-18
### Added
- **Sistem Auto-Update Wajib**: Aplikasi sekarang otomatis mengecek versi baru melalui `version.json`.
- **Pembersihan Cache Otomatis**: Memaksa penghapusan PWA cache, storage, dan unregister service worker saat versi baru terdeteksi untuk menghindari masalah cache stuck.
- **Force Reload**: Memaksa refresh halaman setelah pembersihan cache untuk memuat aset terbaru.

## [2.0.0] - 2026-04-14
### Added
- PWA install prompt di layar login (muncul jika belum ter-install).
- Viewer gambar (rotate kiri/kanan, zoom in/out, unduh) untuk pratinjau KTP & bukti transfer.
- Kompresi gambar sebelum upload (KTP/bukti transfer) agar lebih ringan namun tetap jelas.
- Konfirmasi logout (warning sebelum keluar).
- Filter ranking marketing per bulan (hanya bulan yang ada datanya).

### Changed
- UI kartu ranking marketing dibuat lebih simpel dan lebih kecil.
- Statistik ranking memakai label periode (mis. **Bulan ini** atau **April 2026**).
- Pesan share WhatsApp transaksi dirapikan dan konsisten (tunai/transfer/split + tujuan transfer).
- Scroll otomatis ke atas saat ganti halaman pagination.
- Branding: logo header & loading pakai `logo-kr-transparent-square.png` dengan background kontras.
- Ikon PWA dibuat “safe zone” agar tidak kepotong saat di-install.

