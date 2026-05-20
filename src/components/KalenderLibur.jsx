import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// ============================================================
// Data Libur Nasional Indonesia 2025 & 2026
// ============================================================
const LIBUR_NASIONAL = {
  // 2025
  '2025-01-01': 'Tahun Baru Masehi',
  '2025-01-27': 'Isra Miraj Nabi Muhammad SAW',
  '2025-01-28': 'Cuti Bersama Isra Miraj',
  '2025-01-29': 'Tahun Baru Imlek 2576',
  '2025-03-29': 'Hari Suci Nyepi (Tahun Baru Saka 1947)',
  '2025-03-31': 'Cuti Bersama Nyepi',
  '2025-04-18': 'Wafat Yesus Kristus',
  '2025-04-20': 'Kebangkitan Yesus Kristus (Paskah)',
  '2025-03-30': 'Hari Raya Idul Fitri 1446 H',
  '2025-03-31': 'Hari Raya Idul Fitri 1446 H (Hari Kedua)',
  '2025-04-01': 'Cuti Bersama Idul Fitri',
  '2025-04-02': 'Cuti Bersama Idul Fitri',
  '2025-04-03': 'Cuti Bersama Idul Fitri',
  '2025-04-04': 'Cuti Bersama Idul Fitri',
  '2025-05-01': 'Hari Buruh Internasional',
  '2025-05-12': 'Hari Raya Waisak 2569',
  '2025-05-13': 'Cuti Bersama Waisak',
  '2025-05-29': 'Kenaikan Yesus Kristus',
  '2025-06-01': 'Hari Lahir Pancasila',
  '2025-06-06': 'Hari Raya Idul Adha 1446 H',
  '2025-06-27': 'Tahun Baru Islam 1447 H',
  '2025-08-17': 'Hari Kemerdekaan Republik Indonesia',
  '2025-09-05': 'Maulid Nabi Muhammad SAW',
  '2025-12-25': 'Hari Raya Natal',
  '2025-12-26': 'Cuti Bersama Natal',
  // 2026
  '2026-01-01': 'Tahun Baru Masehi',
  '2026-01-16': 'Isra Miraj Nabi Muhammad SAW',
  '2026-01-28': 'Tahun Baru Imlek 2577',
  '2026-02-17': 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
  '2026-03-20': 'Hari Raya Idul Fitri 1447 H',
  '2026-03-21': 'Hari Raya Idul Fitri 1447 H (Hari Kedua)',
  '2026-03-22': 'Cuti Bersama Idul Fitri',
  '2026-03-23': 'Cuti Bersama Idul Fitri',
  '2026-03-24': 'Cuti Bersama Idul Fitri',
  '2026-04-03': 'Wafat Yesus Kristus',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-26': 'Hari Raya Waisak 2570',
  '2026-05-27': 'Hari Raya Idul Adha 1447 H',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-17': 'Tahun Baru Islam 1448 H',
  '2026-08-17': 'Hari Kemerdekaan Republik Indonesia',
  '2026-08-25': 'Maulid Nabi Muhammad SAW',
  '2026-12-25': 'Hari Raya Natal',
};

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const NAMA_HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const KalenderLibur = ({ open, onOpenChange }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  // Build calendar grid
  const { days, liburBulanIni } = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells = [];
    // padding awal
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    // libur di bulan ini
    const liburList = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = toKey(viewYear, viewMonth, d);
      if (LIBUR_NASIONAL[key]) {
        liburList.push({ tanggal: d, nama: LIBUR_NASIONAL[key] });
      }
    }

    return { days: cells, liburBulanIni: liburList };
  }, [viewYear, viewMonth]);

  const getDayColor = (day) => {
    if (!day) return '';
    const key = toKey(viewYear, viewMonth, day);
    if (LIBUR_NASIONAL[key]) return 'text-red-600 font-bold';
    const dow = new Date(viewYear, viewMonth, day).getDay();
    // Jum=5, Sab=6, Min=0
    if (dow === 5 || dow === 6 || dow === 0) return 'text-green-600 font-semibold';
    return 'text-gray-800';
  };

  const isToday = (day) =>
    day &&
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const isLibur = (day) => day && !!LIBUR_NASIONAL[toKey(viewYear, viewMonth, day)];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white w-[calc(100vw-2rem)] max-w-sm p-0 overflow-hidden rounded-2xl">
        {/* Header kalender */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition text-white"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="text-white font-bold text-base hover:underline"
          >
            {NAMA_BULAN[viewMonth]} {viewYear}
          </button>
          <button
            onClick={nextMonth}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition text-white"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 pb-4 pt-2">
          {/* Nama hari */}
          <div className="grid grid-cols-7 mb-1">
            {NAMA_HARI.map((h, i) => (
              <div
                key={h}
                className={`text-center text-xs font-semibold py-1 ${
                  i === 0 ? 'text-red-500' :
                  i === 5 || i === 6 ? 'text-green-600' :
                  'text-gray-500'
                }`}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Grid tanggal */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map((day, idx) => (
              <div
                key={idx}
                className={`
                  relative flex items-center justify-center h-9 w-full rounded-xl text-sm
                  ${!day ? '' : 'hover:bg-gray-100 transition-colors'}
                  ${isToday(day) ? 'bg-blue-500 !text-white font-bold rounded-xl hover:bg-blue-600' : ''}
                  ${isLibur(day) && !isToday(day) ? 'bg-red-50' : ''}
                `}
              >
                {day && (
                  <span className={isToday(day) ? 'text-white font-bold' : getDayColor(day)}>
                    {day}
                  </span>
                )}
                {isLibur(day) && !isToday(day) && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-400" />
                )}
              </div>
            ))}
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-4 mt-3 px-1 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Hari ini</span>
            <span className="flex items-center gap-1"><span className="text-green-600 font-semibold">●</span> Jum–Min</span>
            <span className="flex items-center gap-1"><span className="text-red-500 font-semibold">●</span> Libur</span>
          </div>

          {/* Daftar libur bulan ini */}
          {liburBulanIni.length > 0 && (
            <div className="mt-3 border-t pt-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-600 mb-1">Libur {NAMA_BULAN[viewMonth]} {viewYear}</p>
              {liburBulanIni.map(({ tanggal, nama }) => (
                <div key={tanggal} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-red-100 text-red-600 font-bold">
                    {tanggal}
                  </span>
                  <span className="text-gray-700 leading-tight pt-0.5">{nama}</span>
                </div>
              ))}
            </div>
          )}
          {liburBulanIni.length === 0 && (
            <p className="mt-3 text-xs text-center text-gray-400 border-t pt-3">
              Tidak ada libur nasional bulan ini
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KalenderLibur;
