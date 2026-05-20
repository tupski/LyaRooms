import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useDayInfo } from '@/hooks/useDayInfo';

/**
 * DayInfoBanner — banner info hari yang bisa di-dismiss.
 * Muncul hanya saat: libur nasional hari ini, besok libur, atau weekend.
 * Hari kerja biasa: tidak tampil.
 */
const DayInfoBanner = () => {
  const { todayInfo, tomorrowInfo, loading } = useDayInfo();
  const [dismissed, setDismissed] = useState(false);

  if (loading || !todayInfo || dismissed) return null;

  // Kumpulkan semua banner yang perlu ditampilkan
  const banners = [];

  if (todayInfo.isHoliday) {
    banners.push({
      key: 'holiday-today',
      emoji: '🔥',
      text: <><span className="font-semibold">{todayInfo.holidayName}</span> — Tamu makin rame, siap-siap sibuk!</>,
      className: 'bg-red-50 border-red-200 text-red-800',
    });
  } else {
    if (tomorrowInfo?.isHoliday) {
      banners.push({
        key: 'holiday-tomorrow',
        emoji: '⚡',
        text: <><span className="font-semibold">Besok Libur: {tomorrowInfo.holidayName}</span> — Bersiap, tamu bakal rame!</>,
        className: 'bg-amber-50 border-amber-200 text-amber-800',
      });
    }
    if (todayInfo.isWeekend) {
      banners.push({
        key: 'weekend',
        emoji: '🚀',
        text: <><span className="font-semibold">Weekend!</span> <span className="opacity-75 text-xs">{todayInfo.dayName}, {todayInfo.dateLabel}</span> — Tamu rame, semangat!</>,
        className: 'bg-green-50 border-green-200 text-green-800',
      });
    }
  }

  if (banners.length === 0) return null;

  return (
    <div className="space-y-2">
      {banners.map((b, i) => (
        <div key={b.key} className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm shadow-sm ${b.className}`}>
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
