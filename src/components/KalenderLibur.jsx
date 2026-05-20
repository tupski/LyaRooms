import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';

// ============================================================
// Data Libur Nasional Indonesia 2025 & 2026
// ============================================================
const LIBUR_NASIONAL = {
  '2025-01-01': 'Tahun Baru Masehi',
  '2025-01-27': 'Isra Miraj Nabi Muhammad SAW',
  '2025-01-28': 'Cuti Bersama Isra Miraj',
  '2025-01-29': 'Tahun Baru Imlek 2576',
  '2025-03-29': 'Hari Suci Nyepi (Tahun Baru Saka 1947)',
  '2025-03-30': 'Hari Raya Idul Fitri 1446 H',
  '2025-03-31': 'Hari Raya Idul Fitri 1446 H (Hari Kedua)',
  '2025-04-01': 'Cuti Bersama Idul Fitri',
  '2025-04-02': 'Cuti Bersama Idul Fitri',
  '2025-04-03': 'Cuti Bersama Idul Fitri',
  '2025-04-04': 'Cuti Bersama Idul Fitri',
  '2025-04-18': 'Wafat Yesus Kristus',
  '2025-04-20': 'Kebangkitan Yesus Kristus (Paskah)',
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
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];
// Mulai dari Senin
const NAMA_HARI = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];

function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

// Hari dalam seminggu mulai Senin (0=Sen … 6=Min)
function getDowMon(year, month, day) {
  const dow = new Date(year, month, day).getDay(); // 0=Sun
  return dow === 0 ? 6 : dow - 1; // Sun→6, Mon→0
}

const TAHUN_OPTIONS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 3 + i);

const KalenderLibur = ({ open, onOpenChange }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  // 'calendar' | 'month' | 'year'
  const [pickerMode, setPickerMode] = useState('calendar');
  // Tagihan unit dari Supabase
  const [tagihanList, setTagihanList] = useState([]);

  // Fetch tagihan unpaid saat dialog dibuka
  useEffect(() => {
    if (!open) return;
    supabase
      .from('tagihan_bulanan')
      .select('apartment_location, room_number, due_date')
      .eq('status', 'unpaid')
      .then(({ data }) => setTagihanList(data || []));
  }, [open]);

  // Reset picker mode saat dialog ditutup
  useEffect(() => {
    if (!open) setPickerMode('calendar');
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Map due_date → label tagihan untuk bulan ini
  const tagihanMap = useMemo(() => {
    const map = {};
    tagihanList.forEach(t => {
      if (!t.due_date) return;
      const [y, m, d] = t.due_date.split('-').map(Number);
      if (y === viewYear && m - 1 === viewMonth) {
        const key = toKey(viewYear, viewMonth, d);
        if (!map[key]) map[key] = [];
        map[key].push(`${t.apartment_location}${t.room_number ? ' - ' + t.room_number : ''}`);
      }
    });
    return map;
  }, [tagihanList, viewYear, viewMonth]);

  const { days, liburBulanIni, tagihanBulanIni } = useMemo(() => {
    const firstDowMon = getDowMon(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDowMon; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const liburList = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = toKey(viewYear, viewMonth, d);
      if (LIBUR_NASIONAL[key]) liburList.push({ tanggal: d, nama: LIBUR_NASIONAL[key] });
    }

    const tagihanList2 = [];
    Object.entries(tagihanMap).forEach(([key, units]) => {
      const d = parseInt(key.split('-')[2]);
      units.forEach(u => tagihanList2.push({ tanggal: d, unit: u }));
    });
    tagihanList2.sort((a, b) => a.tanggal - b.tanggal);

    return { days: cells, liburBulanIni: liburList, tagihanBulanIni: tagihanList2 };
  }, [viewYear, viewMonth, tagihanMap]);

  const getDayColor = (day) => {
    if (!day) return '';
    const key = toKey(viewYear, viewMonth, day);
    if (LIBUR_NASIONAL[key]) return 'text-red-600 font-bold';
    const dow = getDowMon(viewYear, viewMonth, day);
    if (dow >= 5) return 'text-green-600 font-semibold'; // Sab=5, Min=6
    return 'text-gray-800';
  };

  const isToday = (day) =>
    day && today.getDate() === day &&
    today.getMonth() === viewMonth && today.getFullYear() === viewYear;

  const isLibur = (day) => day && !!LIBUR_NASIONAL[toKey(viewYear, viewMonth, day)];
  const hasTagihan = (day) => day && !!tagihanMap[toKey(viewYear, viewMonth, day)];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white w-[calc(100vw-2rem)] max-w-sm p-0 overflow-hidden rounded-2xl">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 flex items-center justify-between gap-2">
          {pickerMode === 'calendar' && (
            <button onClick={prevMonth}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition text-white"
              aria-label="Bulan sebelumnya">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {pickerMode !== 'calendar' && <div className="w-8 shrink-0" />}

          <button
            onClick={() => setPickerMode(m => m === 'calendar' ? 'month' : 'calendar')}
            className="flex-1 text-center text-white font-bold text-base hover:underline"
          >
            {pickerMode === 'year' ? 'Pilih Tahun' : `${NAMA_BULAN[viewMonth]} `}
            <button
              onClick={(e) => { e.stopPropagation(); setPickerMode(m => m === 'year' ? 'calendar' : 'year'); }}
              className="hover:underline"
            >
              {viewYear}
            </button>
          </button>

          {pickerMode === 'calendar' && (
            <button onClick={nextMonth}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition text-white"
              aria-label="Bulan berikutnya">
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {pickerMode !== 'calendar' && (
            <button onClick={() => setPickerMode('calendar')}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition text-white text-xs font-bold">
              ✕
            </button>
          )}
        </div>

        {/* Picker bulan */}
        {pickerMode === 'month' && (
          <div className="grid grid-cols-3 gap-2 p-4">
            {NAMA_BULAN.map((bln, i) => (
              <button key={bln} onClick={() => { setViewMonth(i); setPickerMode('calendar'); }}
                className={`py-2 rounded-xl text-sm font-semibold transition ${
                  i === viewMonth ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {bln}
              </button>
            ))}
          </div>
        )}

        {/* Picker tahun */}
        {pickerMode === 'year' && (
          <div className="grid grid-cols-3 gap-2 p-4 max-h-64 overflow-y-auto">
            {TAHUN_OPTIONS.map(y => (
              <button key={y} onClick={() => { setViewYear(y); setPickerMode('calendar'); }}
                className={`py-2 rounded-xl text-sm font-semibold transition ${
                  y === viewYear ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {y}
              </button>
            ))}
          </div>
        )}

        {/* Kalender */}
        {pickerMode === 'calendar' && (
          <div className="px-3 pb-4 pt-2 max-h-[70vh] overflow-y-auto">
            {/* Nama hari — mulai Senin */}
            <div className="grid grid-cols-7 mb-1">
              {NAMA_HARI.map((h, i) => (
                <div key={h} className={`text-center text-xs font-semibold py-1 ${
                  i >= 5 ? 'text-green-600' : 'text-gray-500'
                }`}>{h}</div>
              ))}
            </div>

            {/* Grid tanggal */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {days.map((day, idx) => (
                <div key={idx} className={`
                  relative flex items-center justify-center h-9 w-full rounded-xl text-sm
                  ${!day ? '' : 'hover:bg-gray-100 transition-colors'}
                  ${isToday(day) ? 'bg-blue-500 hover:bg-blue-600' : ''}
                  ${isLibur(day) && !isToday(day) ? 'bg-red-50' : ''}
                `}>
                  {day && (
                    <span className={isToday(day) ? 'text-white font-bold' : getDayColor(day)}>
                      {day}
                    </span>
                  )}
                  {/* Titik indikator */}
                  {day && !isToday(day) && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {isLibur(day) && <span className="w-1 h-1 rounded-full bg-red-400" />}
                      {hasTagihan(day) && <span className="w-1 h-1 rounded-full bg-orange-400" />}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap items-center gap-3 mt-3 px-1 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Hari ini</span>
              <span className="flex items-center gap-1"><span className="text-green-600 font-semibold">●</span> Weekend</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Libur</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" /> Tagihan</span>
            </div>

            {/* Daftar libur bulan ini */}
            {liburBulanIni.length > 0 && (
              <div className="mt-3 border-t pt-3 space-y-1.5">
                <p className="text-xs font-semibold text-gray-600">Libur {NAMA_BULAN[viewMonth]} {viewYear}</p>
                {liburBulanIni.map(({ tanggal, nama }) => (
                  <div key={`libur-${tanggal}`} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-red-100 text-red-600 font-bold text-[11px]">
                      {tanggal}
                    </span>
                    <span className="text-gray-700 leading-tight pt-0.5">{nama}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Daftar tagihan bulan ini */}
            {tagihanBulanIni.length > 0 && (
              <div className="mt-3 border-t pt-3 space-y-1.5">
                <p className="text-xs font-semibold text-gray-600">Tagihan Jatuh Tempo {NAMA_BULAN[viewMonth]} {viewYear}</p>
                {tagihanBulanIni.map(({ tanggal, unit }, i) => (
                  <div key={`tagihan-${i}`} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-orange-100 text-orange-600 font-bold text-[11px]">
                      {tanggal}
                    </span>
                    <span className="text-gray-700 leading-tight pt-0.5">Tagihan unit {unit}</span>
                  </div>
                ))}
              </div>
            )}

            {liburBulanIni.length === 0 && tagihanBulanIni.length === 0 && (
              <p className="mt-3 text-xs text-center text-gray-400 border-t pt-3">
                Tidak ada libur atau tagihan bulan ini
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default KalenderLibur;
