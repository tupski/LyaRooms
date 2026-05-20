import React from 'react';
import { useDayInfo } from '@/hooks/useDayInfo';

/**
 * DayInfoBanner — banner kecil di atas form transaksi yang menampilkan:
 * - Libur nasional hari ini (merah)
 * - Besok libur nasional (kuning/amber)
 * - Weekend (hijau)
 * - Hari kerja biasa: tidak tampil
 */
const DayInfoBanner = () => {
  const { todayInfo, tomorrowInfo, loading } = useDayInfo();

  if (loading || !todayInfo) return null;

  // Prioritas: libur hari ini > besok libur > weekend
  if (todayInfo.isHoliday) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800 shadow-sm">
        <span className="text-base">🔥</span>
        <div className="min-w-0">
          <span className="font-semibold">Hari Ini Libur: {todayInfo.holidayName}</span>
          <span className="text-red-500 text-xs ml-1">— Tamu makin rame, siap-siap sibuk!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tomorrowInfo?.isHoliday && (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 shadow-sm">
          <span className="text-base">⚡</span>
          <div className="min-w-0">
            <span className="font-semibold">Besok Libur: {tomorrowInfo.holidayName}</span>
            <span className="text-amber-600 text-xs ml-1">— Bersiap, tamu bakal rame besok!</span>
          </div>
        </div>
      )}
      {todayInfo.isWeekend && (
        <div className="flex items-center gap-2 rounded-2xl bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-800 shadow-sm">
          <span className="text-base">🚀</span>
          <div className="min-w-0">
            <span className="font-semibold">Weekend!</span>
            <span className="text-green-600 text-xs ml-1">— {todayInfo.dayName}, {todayInfo.dateLabel} · Tamu rame, semangat!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayInfoBanner;
