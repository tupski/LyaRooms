/**
 * Format a non-negative number as Indonesian Rupiah.
 * Uses dot (.) as thousand separator, no decimal places.
 *
 * Examples:
 *   formatRupiah(0)          → "Rp 0"
 *   formatRupiah(1000)       → "Rp 1.000"
 *   formatRupiah(1500000)    → "Rp 1.500.000"
 *   formatRupiah(10000000000) → "Rp 10.000.000.000"
 *
 * @param {number} value - Non-negative number to format
 * @returns {string} Formatted Rupiah string
 */
export function formatRupiah(value) {
  const num = Math.floor(Number(value) || 0);
  return `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num)}`;
}
