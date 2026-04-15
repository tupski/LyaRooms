# Rencana Perombakan Form Transaksi Karyawan

## Tujuan

Menyamakan pengalaman input transaksi `karyawan` dengan form `admin/super_admin` tanpa mempertahankan dua implementasi form yang berbeda logika, validasi, dan alur submit-nya.

## Masalah Saat Ini

1. `src/components/KaryawanTransaksi.jsx` masih menyimpan form input sendiri, sementara `src/components/FormTransaksiModern.jsx` sudah menjadi sumber utama untuk admin/superadmin.
2. Validasi, state form, upload berkas, ringkasan konfirmasi, dan pemetaan payload transaksi diduplikasi di dua file.
3. Perilaku antar-role tidak konsisten:
   - `karyawan` wajib mengisi marketing, `admin/super_admin` tidak.
   - `karyawan` bisa membuat marketing baru, tetapi tidak punya kontrol referensi lokasi/kamar.
   - tampilan, struktur section, dan feedback submit berbeda.
4. Risiko bug tinggi karena setiap perubahan field harus diedit minimal di dua tempat.

## Arah Perombakan

1. Jadikan `FormTransaksiModern.jsx` sebagai basis tunggal form transaksi.
2. Ubah `KaryawanTransaksi.jsx` menjadi halaman container, bukan pemilik logika form.
3. Ekstrak logika bersama ke hook/utility kecil agar bisa dipakai untuk mode `create`, `edit`, dan role berbeda.

## Tahapan Implementasi

### Tahap 1: Satukan kontrak form

1. Tambahkan prop konfigurasi pada `FormTransaksiModern`, misalnya:
   - `mode: 'create' | 'edit'`
   - `roleMode: 'karyawan' | 'admin' | 'super_admin'`
   - `allowReferenceManagement`
   - `requireMarketing`
   - `defaultInputBy`
   - `onSuccess`
2. Pindahkan aturan role dari dalam komponen ke config berbasis prop agar perilaku tidak hard-coded.

### Tahap 2: Ekstrak logika reusable

1. Buat hook seperti `useTransactionReferences` untuk:
   - fetch lokasi, kamar, marketing, karyawan
   - hitung kamar terisi
   - create/delete referensi bila diizinkan
2. Buat helper seperti `transactionFormModel` untuk:
   - `formatCurrency`
   - `parseCurrency`
   - `getRentalHours`
   - `buildTransactionPayload`
   - `validateTransactionForm`
3. Gunakan helper yang sama di form create dan edit.

### Tahap 3: Ganti form karyawan ke shared form

1. Di `KaryawanTransaksi.jsx`, hapus form inline.
2. Render `FormTransaksiModern` dengan konfigurasi karyawan:
   - `allowReferenceManagement={false}`
   - `requireMarketing={true}`
   - `defaultInputBy={nama user login}`
3. Pertahankan panel riwayat transaksi, laporan WhatsApp, dan preview berkas di `KaryawanTransaksi.jsx`.

### Tahap 4: Samakan alur edit

1. Ubah modal edit agar memakai field schema yang sama dengan form utama.
2. Jika perlu, pecah UI form menjadi komponen presentasional seperti:
   - `TransactionIdentitySection`
   - `TransactionRentalSection`
   - `TransactionPaymentSection`
   - `TransactionUploadSection`
3. Pakai komponen section yang sama pada create dan edit supaya perubahan field cukup sekali.

### Tahap 5: Validasi dan QA

1. Uji matriks role:
   - karyawan create transaksi
   - admin create transaksi
   - super_admin create transaksi
   - admin/super_admin edit transaksi milik user lain
2. Uji kombinasi pembayaran:
   - tunai saja
   - transfer saja
   - tunai + transfer
   - transfer tanpa tujuan
3. Uji upload:
   - tanpa file
   - hanya KTP
   - hanya bukti transfer
   - keduanya
4. Uji kamar penuh dan custom duration.

## Hasil Akhir yang Diinginkan

1. Satu sumber logika form transaksi.
2. Perbedaan antar-role hanya lewat konfigurasi, bukan lewat duplikasi komponen.
3. Perubahan field baru bisa dilakukan sekali dan otomatis berlaku untuk semua role.
