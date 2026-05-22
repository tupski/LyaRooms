/**
 * Property-Based Tests for normalizeGuestName
 *
 * Feature: analytics-dashboard
 * Property 10: Normalisasi nama tamu untuk pengelompokan repeat guest
 *
 * Validates: Requirements 8.6
 *
 * Helper `normalizeGuestName` mencerminkan logika SQL `LOWER(TRIM(customer_name))`
 * yang digunakan oleh RPC `get_repeat_guests`. Property ini memvalidasi bahwa
 * semua variasi kapitalisasi/whitespace dari nama yang sama secara semantik akan
 * dikelompokkan menjadi satu tamu dengan visit_count akumulatif.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { normalizeGuestName } from './normalizeGuestName';

/**
 * Generator nama dasar:
 * - `fc.string({minLength: 1, maxLength: 20})` per spec
 * - Filter agar non-empty setelah trim (memastikan nama valid setelah normalisasi)
 * - Filter case-stability: pastikan `s.toUpperCase().toLowerCase() === s.toLowerCase()`
 *   untuk menghindari karakter Unicode dengan case-folding non-reversible
 *   (contoh: 'ß' → 'SS' → 'ss', Turkish dotless 'i', dsb.). Pada SQL Postgres,
 *   `LOWER()` juga tidak menjamin invers `UPPER()` untuk kasus seperti ini,
 *   sehingga property hanya berlaku untuk nama yang case-stable.
 */
const baseNameArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length > 0)
  .filter((s) => s.toUpperCase().toLowerCase() === s.toLowerCase());

/**
 * Bangun lima variasi dari satu nama dasar:
 * 1. Apa adanya
 * 2. UPPERCASE
 * 3. lowercase
 * 4. Dengan leading/trailing whitespace
 * 5. Mixed case (alternasi karakter)
 */
function buildVariations(name) {
  const mixedCase = name
    .split('')
    .map((ch, i) => (i % 2 === 0 ? ch.toUpperCase() : ch.toLowerCase()))
    .join('');

  return [
    name,
    name.toUpperCase(),
    name.toLowerCase(),
    `   ${name}   `,
    mixedCase,
  ];
}

describe('normalizeGuestName — Property 10: Normalisasi nama tamu untuk pengelompokan repeat guest', () => {
  /**
   * Property 10 (bagian 1): Idempotency / kunci normalisasi
   *
   * For any nama dasar `name`, semua variasi kapitalisasi dan whitespace dari
   * nama tersebut SHALL menghasilkan nilai `normalizeGuestName(...)` yang sama.
   *
   * Validates: Requirements 8.6
   */
  it('Property 10: semua variasi kapitalisasi/whitespace dari nama yang sama menghasilkan kunci normalisasi yang sama', () => {
    fc.assert(
      fc.property(baseNameArb, (name) => {
        const variations = buildVariations(name);
        const expectedKey = name.trim().toLowerCase();

        const normalizedKeys = variations.map((v) => normalizeGuestName(v));

        // Semua variasi harus normalize ke key yang sama
        for (const key of normalizedKeys) {
          expect(key).toBe(expectedKey);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10 (bagian 2): Akumulasi visit_count per kunci normalisasi
   *
   * Untuk simulasi sederhana RPC `get_repeat_guests`: bila kita kelompokkan
   * sekumpulan transaksi (yang mengandung variasi nama yang sama) berdasarkan
   * `normalizeGuestName(customer_name)`, jumlah transaksi per kelompok SHALL
   * sama dengan total kemunculan variasi nama tersebut di input.
   *
   * Validates: Requirements 8.6
   */
  it('Property 10: pengelompokan transaksi berdasarkan normalizeGuestName menghasilkan visit_count akumulatif yang benar', () => {
    fc.assert(
      fc.property(
        // Daftar nama dasar yang berbeda (kunci normalisasi unik)
        fc
          .uniqueArray(baseNameArb, {
            minLength: 1,
            maxLength: 5,
            selector: (s) => s.trim().toLowerCase(),
          }),
        // Untuk setiap nama dasar, berapa banyak transaksi yang akan dibuat (1–10)
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 5 }),
        (baseNames, countsRaw) => {
          // Selaraskan panjang counts dengan baseNames
          const counts = baseNames.map((_, i) => countsRaw[i] ?? 1);

          // Bangun array transaksi: untuk tiap baseName, buat `counts[i]` transaksi
          // dengan variasi yang dipilih secara round-robin dari buildVariations.
          const transactions = [];
          baseNames.forEach((name, i) => {
            const variations = buildVariations(name);
            for (let j = 0; j < counts[i]; j++) {
              transactions.push({
                customer_name: variations[j % variations.length],
              });
            }
          });

          // Kelompokkan berdasarkan kunci normalisasi (mirroring SQL GROUP BY LOWER(TRIM(...)))
          const groups = new Map();
          for (const tx of transactions) {
            const key = normalizeGuestName(tx.customer_name);
            groups.set(key, (groups.get(key) ?? 0) + 1);
          }

          // Verifikasi: untuk tiap baseName, visit_count grup-nya == counts[i]
          baseNames.forEach((name, i) => {
            const expectedKey = name.trim().toLowerCase();
            expect(groups.get(expectedKey)).toBe(counts[i]);
          });

          // Verifikasi: jumlah grup == jumlah baseName unik
          expect(groups.size).toBe(baseNames.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
