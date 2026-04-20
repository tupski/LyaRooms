## Plan: Audit Codebase untuk Laporan Keuangan, Transaksi, dan Kamar

TL;DR - Lakukan pemeriksaan statis dan logika pada komponen finance, input transaksi, dan ketersediaan kamar. Gunakan build/lint untuk validasi keseluruhan, lalu audit area bisnis yang paling sensitif.

**Steps**
1. Jalankan pemeriksaan build dan lint.
   - `npm run lint`
   - `npm run build`
   - Tujuannya: temukan error syntax, import, dan masalah bundling di seluruh codebase.
2. Audit komponen finance.
   - `src/components/HalamanTagihan.jsx`: periksa kalkulasi ringkasan bulanan (`calculateSummary`) dan filter transaksi/expense.
   - `src/components/DashboardPemasukan.jsx`: periksa `loadTransaksi`, filter waktu, filter lokasi/shift, dan hitungan `stats`.
   - Bandingkan logika penanggalan pada kedua file dengan cara data transaksi disimpan di database.
3. Audit input transaksi.
   - `src/components/FormTransaksiModern.jsx`: verifikasi referensi lokasi/kamar/marketing, validasi form, upload file, dan insert payload.
   - Pastikan `getRentalConfig`, `calcEndAt`, dan `getActiveTransaction` di `src/lib/roomUtils.js` sesuai aturan sewa.
   - Cek potensi masalah pada role `karyawan` dan `assignments` kosong.
4. Audit ketersediaan kamar.
   - `src/components/KetersediaanKamar.jsx`: verifikasi query transaksi dan logic deteksi kamar terisi.
   - Pastikan karyawan hanya melihat kamar yang di-assign, dan checkout hanya bisa oleh pemilik atau admin.
5. Validasi runtime pada kasus bisnis utama.
   - Transaksi normal: pilih lokasi/kamar, simpan, lalu cek laporan dan status kamar.
   - Transaksi `PER_MALAM` dan `Custom`: pastikan checkout tanggal dihitung sesuai.
   - Hapus/checkout transaksi: pastikan data kamar dan laporan terupdate.
6. Catat potensi issue yang ditemukan.
   - Jika `checkin_at` bisa null, hitungan di summary dan dashboard bisa melewatkan transaksi.
   - Perhatikan filter darah/range di `DashboardPemasukan` dan `HalamanTagihan`.

**Relevant files**
- `src/components/HalamanTagihan.jsx`
- `src/components/DashboardPemasukan.jsx`
- `src/components/FormTransaksiModern.jsx`
- `src/components/KetersediaanKamar.jsx`
- `src/lib/roomUtils.js`
- `src/App.jsx` (navigasi finance/form/kamar)

**Verification**
1. Jalankan `npm run lint` dan `npm run build`.
2. Buka halaman input transaksi dan ciptakan transaksi sampel dengan durasi normal dan custom.
3. Buka halaman ketersediaan kamar untuk memastikan kamar berubah ke status terisi dan bisa di-checkout.
4. Buka dashboard laporan dan finance, lalu pastikan jumlah `pemasukan` dan `laba bersih` konsisten.

**Decisions**
- Fokus audit di sekitar area finance, transaksi, dan kamar; bukan seluruh repo secara detail.
- Gunakan `npm run build` sebagai verifikasi keseluruhan karena tidak ada unit test yang spesifik tersedia.

**Further Considerations**
1. Jika ingin, saya dapat langsung perbaiki issue logika yang ditemukan di `HaporanKeuangan` dan `KetersediaanKamar`.
2. Jika database juga perlu diperiksa, konfirmasikan apakah ada sandbox data atau migrasi yang harus dijalankan.
