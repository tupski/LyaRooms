/**
 * classifyStayDuration
 *
 * JavaScript helper yang mencerminkan logika SQL `CASE WHEN` di RPC
 * `get_stay_duration_summary` (lihat
 * `supabase/migrations/20260601000000_analytics_dashboard_rpcs.sql`).
 *
 * Mengklasifikasikan nilai `rental_duration` (dalam jam) ke salah satu dari
 * enam kategori durasi menginap. NULL, 0, dan nilai yang tidak termasuk
 * rentang yang ditentukan diklasifikasikan ke kategori "Lainnya".
 *
 * Spesifikasi (lihat Requirements 10.2):
 *   - rental_duration === 3                        → 'Transit - 3 Jam'
 *   - 1 <= rental_duration <= 11 AND !== 3        → 'Transit - Lainnya'
 *   - 12 <= rental_duration <= 23                 → 'Fullday'
 *   - 24 <= rental_duration <= 47                 → 'Per Malam - 1 Malam'
 *   - rental_duration >= 48                       → 'Per Malam - 2+ Malam'
 *   - else (NULL, 0, undefined, negatif, dll.)    → 'Lainnya'
 *
 * @param {number|null|undefined} rental_duration - Durasi sewa dalam jam
 * @returns {string} Salah satu dari enam kategori
 */
export function classifyStayDuration(rental_duration) {
  // NULL / undefined / NaN → 'Lainnya' (mencerminkan ELSE clause SQL untuk NULL)
  if (rental_duration === null || rental_duration === undefined) {
    return 'Lainnya';
  }
  if (typeof rental_duration !== 'number' || Number.isNaN(rental_duration)) {
    return 'Lainnya';
  }

  // Cabang pertama: rental_duration = 3
  if (rental_duration === 3) {
    return 'Transit - 3 Jam';
  }

  // 1..11 (inklusif) selain 3
  if (rental_duration >= 1 && rental_duration <= 11) {
    return 'Transit - Lainnya';
  }

  // 12..23 (inklusif)
  if (rental_duration >= 12 && rental_duration <= 23) {
    return 'Fullday';
  }

  // 24..47 (inklusif)
  if (rental_duration >= 24 && rental_duration <= 47) {
    return 'Per Malam - 1 Malam';
  }

  // >= 48
  if (rental_duration >= 48) {
    return 'Per Malam - 2+ Malam';
  }

  // ELSE: 0, negatif, atau nilai lain yang tidak terklasifikasi
  return 'Lainnya';
}

/**
 * Daftar lengkap kategori valid yang dapat dihasilkan oleh classifyStayDuration.
 * Berguna untuk validasi (memastikan output selalu termasuk salah satu kategori).
 */
export const STAY_DURATION_CATEGORIES = Object.freeze([
  'Transit - 3 Jam',
  'Transit - Lainnya',
  'Fullday',
  'Per Malam - 1 Malam',
  'Per Malam - 2+ Malam',
  'Lainnya',
]);
