/**
 * Analytics Dashboard — Format Helpers
 *
 * Helper functions untuk memformat nilai yang ditampilkan di Analytics Dashboard.
 * Konsisten dengan pola formatting yang digunakan di seluruh proyek.
 */

/**
 * Format nilai numerik ke format mata uang Rupiah (IDR).
 * Menangani null/undefined dengan memformat nilai 0.
 *
 * @param {number|null|undefined} value - Nilai yang akan diformat
 * @returns {string} String dalam format Rupiah, contoh: "Rp 1.500.000"
 */
export const formatRupiah = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value ?? 0);

/**
 * Format nilai numerik ke format persentase.
 * Mengembalikan '-' jika nilai null atau undefined.
 *
 * @param {number|null|undefined} value - Nilai persentase (contoh: 75.5 untuk 75.5%)
 * @param {number} [decimals=2] - Jumlah angka desimal
 * @returns {string} String persentase, contoh: "75.50%" atau "-"
 */
export const formatPersen = (value, decimals = 2) =>
  value != null ? `${Number(value).toFixed(decimals)}%` : '-';

/**
 * Format string tanggal ke format lokal Indonesia.
 * Mengembalikan '-' jika dateStr null, undefined, atau string kosong.
 *
 * @param {string|null|undefined} dateStr - String tanggal (ISO 8601 atau format yang didukung Date)
 * @returns {string} Tanggal dalam format lokal id-ID, contoh: "1/6/2025" atau "-"
 */
export const formatTanggal = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleDateString('id-ID') : '-';
