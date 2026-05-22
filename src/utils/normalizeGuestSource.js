/**
 * Normalisasi sumber tamu (mirror logic SQL pada migrasi):
 *   COALESCE(NULLIF(TRIM(marketing_name), ''), 'Langsung (Tanpa Marketing)')
 *
 * Aturan:
 * - Jika marketingName null/undefined → 'Langsung (Tanpa Marketing)'
 * - Jika setelah trim string kosong → 'Langsung (Tanpa Marketing)'
 * - Selain itu → kembalikan nilai yang sudah di-trim apa adanya
 *
 * Validates: Requirements 7.3 (analytics-dashboard)
 *
 * @param {string | null | undefined} marketingName
 * @returns {string}
 */
export function normalizeGuestSource(marketingName) {
  if (marketingName === null || marketingName === undefined) {
    return 'Langsung (Tanpa Marketing)';
  }

  // Pastikan kita bekerja pada string (mirror perilaku SQL TEXT)
  const asString = typeof marketingName === 'string' ? marketingName : String(marketingName);
  const trimmed = asString.trim();

  if (trimmed === '') {
    return 'Langsung (Tanpa Marketing)';
  }

  return trimmed;
}

export const DEFAULT_GUEST_SOURCE = 'Langsung (Tanpa Marketing)';
