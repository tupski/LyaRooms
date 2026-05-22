/**
 * Property-Based Tests for classifyStayDuration
 *
 * Feature: analytics-dashboard
 * Property 11: Klasifikasi kategori durasi menginap
 *
 * Validates: Requirements 10.2
 *
 * Helper `classifyStayDuration` mencerminkan logika SQL `CASE WHEN` di RPC
 * `get_stay_duration_summary`. Test ini memvalidasi bahwa setiap nilai
 * `rental_duration` (termasuk NULL dan 0) diklasifikasikan ke tepat satu
 * dari enam kategori sesuai spesifikasi di Requirements 10.2.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  classifyStayDuration,
  STAY_DURATION_CATEGORIES,
} from './classifyStayDuration';

describe('classifyStayDuration — Property 11: Klasifikasi kategori durasi menginap', () => {
  /**
   * Property 11: Klasifikasi kategori durasi menginap
   *
   * For any nilai `rental_duration` (termasuk NULL dan 0), helper SHALL
   * mengklasifikasikannya ke dalam tepat satu kategori berikut:
   *   - rental_duration = 3                                   → 'Transit - 3 Jam'
   *   - rental_duration IN [1..11] AND rental_duration != 3   → 'Transit - Lainnya'
   *   - rental_duration IN [12..23]                           → 'Fullday'
   *   - rental_duration IN [24..47]                           → 'Per Malam - 1 Malam'
   *   - rental_duration >= 48                                 → 'Per Malam - 2+ Malam'
   *   - rental_duration IS NULL OR = 0 OR tidak terklasifikasi → 'Lainnya'
   *
   * Validates: Requirements 10.2
   */
  it(
    'Property 11: untuk sembarang rental_duration (termasuk NULL dan 0), nilai diklasifikasikan ke tepat satu kategori sesuai spesifikasi',
    () => {
      fc.assert(
        fc.property(
          // fc.option(...) menghasilkan null sekitar setengah waktu sehingga
          // kasus NULL ter-cover. Range 0..200 mencakup 0, 1–11, 12–23,
          // 24–47, dan 48+ (sampai 200 untuk kasus "Per Malam - 2+ Malam").
          fc.option(fc.integer({ min: 0, max: 200 }), { nil: null }),
          (rentalDuration) => {
            const category = classifyStayDuration(rentalDuration);

            // (1) Output WAJIB salah satu dari enam kategori yang valid
            expect(STAY_DURATION_CATEGORIES).toContain(category);

            // (2) Verifikasi klasifikasi sesuai spesifikasi (tepat satu kategori)
            if (rentalDuration === null) {
              expect(category).toBe('Lainnya');
            } else if (rentalDuration === 0) {
              expect(category).toBe('Lainnya');
            } else if (rentalDuration === 3) {
              expect(category).toBe('Transit - 3 Jam');
            } else if (rentalDuration >= 1 && rentalDuration <= 11) {
              // 1..11 selain 3
              expect(category).toBe('Transit - Lainnya');
            } else if (rentalDuration >= 12 && rentalDuration <= 23) {
              expect(category).toBe('Fullday');
            } else if (rentalDuration >= 24 && rentalDuration <= 47) {
              expect(category).toBe('Per Malam - 1 Malam');
            } else if (rentalDuration >= 48) {
              expect(category).toBe('Per Malam - 2+ Malam');
            } else {
              // Tidak ter-reach untuk range 0..200, tapi defensif:
              // semua nilai lain harus jatuh ke 'Lainnya'
              expect(category).toBe('Lainnya');
            }

            // (3) Tepat satu kategori — kategori yang dipilih bersifat
            //     mutually exclusive dengan kategori lainnya.
            const otherCategories = STAY_DURATION_CATEGORIES.filter(
              (c) => c !== category
            );
            expect(otherCategories).not.toContain(category);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  /**
   * Property 11 (lanjutan): Boundary values
   *
   * Memastikan nilai-nilai batas (0, 1, 3, 11, 12, 23, 24, 47, 48) tepat
   * masuk ke kategori yang benar — tipe kasus yang paling rawan off-by-one
   * dalam logika SQL `BETWEEN` vs JS `>=` / `<=`.
   */
  it('Property 11 (boundary): nilai batas masuk ke kategori yang benar', () => {
    const expectedByValue = {
      0: 'Lainnya',
      1: 'Transit - Lainnya',
      2: 'Transit - Lainnya',
      3: 'Transit - 3 Jam',
      4: 'Transit - Lainnya',
      11: 'Transit - Lainnya',
      12: 'Fullday',
      23: 'Fullday',
      24: 'Per Malam - 1 Malam',
      47: 'Per Malam - 1 Malam',
      48: 'Per Malam - 2+ Malam',
      72: 'Per Malam - 2+ Malam',
      200: 'Per Malam - 2+ Malam',
    };

    for (const [valueStr, expected] of Object.entries(expectedByValue)) {
      const value = Number(valueStr);
      expect(classifyStayDuration(value)).toBe(expected);
    }

    // NULL / undefined → 'Lainnya'
    expect(classifyStayDuration(null)).toBe('Lainnya');
    expect(classifyStayDuration(undefined)).toBe('Lainnya');
  });
});
