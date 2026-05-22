/**
 * Property-Based Tests for normalizeGuestSource
 *
 * Feature: analytics-dashboard
 * Property 9: Normalisasi sumber tamu NULL/kosong
 *
 * Validates: Requirements 7.3
 *
 * Helper ini mencerminkan logika SQL pada migrasi
 * `get_guest_source_summary`:
 *   COALESCE(NULLIF(TRIM(marketing_name), ''), 'Langsung (Tanpa Marketing)')
 *
 * Properti yang diuji:
 *   For any marketing_name (NULL, '', whitespace, atau nilai valid),
 *   normalizeGuestSource SHALL mengelompokkan semua entri NULL/kosong/whitespace
 *   menjadi 'Langsung (Tanpa Marketing)', dan untuk nilai non-kosong setelah trim
 *   SHALL mengembalikan nilai trimmed yang BUKAN 'Langsung (Tanpa Marketing)'.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { normalizeGuestSource, DEFAULT_GUEST_SOURCE } from './normalizeGuestSource';

describe('normalizeGuestSource — Property 9: Normalisasi sumber tamu NULL/kosong', () => {
  /**
   * Property 9: Normalisasi sumber tamu NULL/kosong
   *
   * For any marketing_name yang dihasilkan oleh fc.option(fc.string()),
   * normalizeGuestSource SHALL:
   *   - Mengembalikan 'Langsung (Tanpa Marketing)' jika input null
   *   - Mengembalikan 'Langsung (Tanpa Marketing)' jika input setelah trim adalah ''
   *   - Selain itu mengembalikan nilai trimmed yang bukan 'Langsung (Tanpa Marketing)'
   *
   * Validates: Requirements 7.3
   */
  it(
    'Property 9: semua marketing_name NULL/kosong/whitespace dikelompokkan sebagai "Langsung (Tanpa Marketing)"',
    () => {
      fc.assert(
        fc.property(fc.option(fc.string(), { nil: null }), (marketingName) => {
          const result = normalizeGuestSource(marketingName);

          // Tentukan ekspektasi berdasarkan logika SQL/helper:
          // null/undefined → default
          // whitespace-only / '' → default
          // selainnya → trimmed value
          const isNullish = marketingName === null || marketingName === undefined;
          const trimmed = isNullish ? '' : String(marketingName).trim();
          const shouldBeDefault = isNullish || trimmed === '';

          if (shouldBeDefault) {
            // semua entri NULL/kosong/whitespace → DEFAULT_GUEST_SOURCE
            expect(result).toBe(DEFAULT_GUEST_SOURCE);
          } else {
            // entri non-kosong → nilai trimmed dan BUKAN default
            expect(result).toBe(trimmed);
            expect(result).not.toBe(DEFAULT_GUEST_SOURCE);
          }
        }),
        { numRuns: 100 }
      );
    }
  );

  /**
   * Sub-property: input undefined harus diperlakukan sama seperti null
   * (NULL di SQL).
   */
  it('Property 9 (undefined): input undefined dinormalisasi ke "Langsung (Tanpa Marketing)"', () => {
    expect(normalizeGuestSource(undefined)).toBe(DEFAULT_GUEST_SOURCE);
  });

  /**
   * Sub-property: input null harus dinormalisasi ke default.
   */
  it('Property 9 (null): input null dinormalisasi ke "Langsung (Tanpa Marketing)"', () => {
    expect(normalizeGuestSource(null)).toBe(DEFAULT_GUEST_SOURCE);
  });

  /**
   * Sub-property: string kosong literal '' harus dinormalisasi ke default.
   */
  it('Property 9 (empty string): input "" dinormalisasi ke "Langsung (Tanpa Marketing)"', () => {
    expect(normalizeGuestSource('')).toBe(DEFAULT_GUEST_SOURCE);
  });

  /**
   * Sub-property: explicit whitespace strings harus dinormalisasi ke default.
   * Mencakup space, tab, mixed whitespace dengan newline.
   */
  it('Property 9 (whitespace): "   ", "\\t", "  \\n  " dinormalisasi ke "Langsung (Tanpa Marketing)"', () => {
    expect(normalizeGuestSource('   ')).toBe(DEFAULT_GUEST_SOURCE);
    expect(normalizeGuestSource('\t')).toBe(DEFAULT_GUEST_SOURCE);
    expect(normalizeGuestSource('  \n  ')).toBe(DEFAULT_GUEST_SOURCE);
    expect(normalizeGuestSource('\r\n')).toBe(DEFAULT_GUEST_SOURCE);
    expect(normalizeGuestSource(' \t\n\r ')).toBe(DEFAULT_GUEST_SOURCE);
  });

  /**
   * Sub-property: nilai valid dengan padding whitespace harus dikembalikan
   * dalam bentuk trimmed dan tidak diubah menjadi default.
   */
  it('Property 9 (valid padded): nilai valid dengan padding dikembalikan trimmed dan bukan default', () => {
    expect(normalizeGuestSource('  Traveloka  ')).toBe('Traveloka');
    expect(normalizeGuestSource('\tBooking.com\n')).toBe('Booking.com');
    expect(normalizeGuestSource('Marketing A')).toBe('Marketing A');
  });
});
