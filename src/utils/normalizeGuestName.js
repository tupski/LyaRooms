/**
 * Analytics Dashboard — Guest Name Normalization Helper
 *
 * Mirror dari logika SQL `LOWER(TRIM(customer_name))` yang digunakan oleh RPC
 * `get_repeat_guests` untuk pengelompokan tamu (Requirement 8.6).
 *
 * Helper ini memungkinkan validasi properti pengelompokan repeat guest dari
 * sisi JavaScript (mis. property-based test) tanpa perlu menjalankan SQL.
 */

/**
 * Menormalisasi nama tamu untuk keperluan pengelompokan repeat guest.
 * Logika ini setara dengan `LOWER(TRIM(customer_name))` pada SQL.
 *
 * @param {string|null|undefined} name - Nama tamu mentah dari kolom `customer_name`
 * @returns {string|null} Kunci normalisasi (lowercase, tanpa whitespace di tepi),
 *                        atau `null` jika `name` adalah `null`/`undefined`.
 */
export function normalizeGuestName(name) {
  if (name === null || name === undefined) {
    return null;
  }
  return String(name).trim().toLowerCase();
}
