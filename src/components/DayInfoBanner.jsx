import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useDayInfo } from '@/hooks/useDayInfo';

/**
 * DayInfoBanner — banner info hari yang bisa di-dismiss.
 *
 * Prioritas tampil (dari atas ke bawah):
 * 1. Libur panjang sedang berlangsung (hari ini = bagian dari libur panjang)
 * 2. Libur panjang besok dimulai (H-1)
 * 3. Libur nasional hari ini
 * 4. Besok libur nasional
 * 5. Hari ini weekend
 * 6. Besok weekend (Kamis → besok Jumat)
 *
 * Hari kerja biasa tanpa kondisi di atas: tidak tampil.
 */
const DayInfoBanner = () => {
  const { todayInfo, tomorrowInfo, longHoliday, loading } = useDayInfo();
  const [dismissed, setDismissed] = useState(false);

  if (loading || !todayInfo || dismissed) return null;

  const banners = [];

  // 1. Libur panjang sedang berlangsung (startOffset === 0)
  if (longHoliday?.isLongHoliday && longHoliday.startOffset === 0) {
    const harpitInfo = longHoliday.hasHarpitnas ? ' (termasuk hari kejepit)' : '';
    banners.push({
      key: 'long-holiday-now',
      emoji: '🎉',
      text: (
        <>
          <span className="font-semibold">Libur Panjang {longHoliday.totalDays} Hari{harpitInfo}!</span>
          {' '}<span className="opacity-80 text-xs">s/d {longHoliday.endLabel}</span>
          {' '}— {longHoliday.description}. Tamu rame, semangat!
        </>
      ),
      className: 'bg-purple-50 border-purple-200 text-purple-900',
    });
  }

  // 2. Libur panjang besok dimulai (H-1)
  if (longHoliday?.isLongHoliday && longHoliday.startOffset === 1) {
    const harpitInfo = longHoliday.hasHarpitnas ? ' (ada hari kejepit)' : '';
    banners.push({
      key: 'long-holiday-tomorrow',
      emoji: '🔥',
      text: (
        <>
          <span className="font-semibold">Besok Libur Panjang {longHoliday.totalDays} Hari{harpitInfo}!</span>
          {' '}<span className="opacity-80 text-xs">{longHoliday.startLabel} – {longHoliday.endLabel}</span>
          {' '}— {longHoliday.description}. Pastikan semua siap!
        </>
      ),
      className: 'bg-orange-50 border-orange-200 text-orange-900',
    });
  }

  // 3. Libur nasional hari ini
  if (todayInfo.isHoliday) {
    banners.push({
      key: 'holiday-today',
      emoji: '🔥',
      text: (
        <>
          <span className="font-semibold">{todayInfo.holidayName}</span>
          {' '}— Tamu makin rame, siap-siap sibuk!
        </>
      ),
      className: 'bg-red-50 border-red-200 text-red-800',
    });
  }

  // 4. Besok libur nasional
  if (!todayInfo.isHoliday && tomorrowInfo?.isHoliday) {
    banners.push({
      key: 'holiday-tomorrow',
      emoji: '⚡',
      text: (
        <>
          <span className="font-semibold">Besok Libur: {tomorrowInfo.holidayName}</span>
          {' '}— Bersiap, tamu bakal rame besok!
        </>
      ),
      className: 'bg-amber-50 border-amber-200 text-amber-800',
    });
  }

  // 5. Hari ini weekend
  if (todayInfo.isWeekend && !todayInfo.isHoliday) {
    banners.push({
      key: 'weekend',
      emoji: '🚀',
      text: (
        <>
          <span className="font-semibold">Weekend!</span>
          {' '}<span className="opacity-75 text-xs">{todayInfo.dayName}, {todayInfo.dateLabel}</span>
          {' '}— Tamu rame, semangat!
        </>
      ),
      className: 'bg-green-50 border-green-200 text-green-800',
    });
  }

  // 6. Besok weekend (hari ini Kamis)
  if (!todayInfo.isWeekend && tomorrowInfo?.isWeekend && !tomorrowInfo?.isHoliday) {
    banners.push({
      key: 'weekend-tomorrow',
      emoji: '🎯',
      text: (
        <>
          <span className="font-semibold">Besok Weekend!</span>
          {' '}<span className="opacity-75 text-xs">{tomorrowInfo.dateLabel}</span>
          {' '}— Persiapkan diri, tamu weekend mulai berdatangan!
        </>
      ),
      className: 'bg-teal-50 border-teal-200 text-teal-800',
    });
  }

  if (banners.length === 0) return null;

  return (
    <div className="space-y-2">
      {banners.map((b, i) => (
        <div
          key={b.key}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm shadow-sm ${b.className}`}
        >
          <span className="text-base shrink-0">{b.emoji}</span>
          <p className="flex-1 min-w-0 leading-snug">{b.text}</p>
          {/* Tombol dismiss hanya di banner pertama */}
          {i === 0 && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default DayInfoBanner;
