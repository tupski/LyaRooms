import { useState, useEffect } from 'react';

/**
 * Hook untuk mendapatkan info hari ini dan besok dari API libur.deno.dev
 * Returns:
 *   todayInfo  : { isHoliday, holidayName, isWeekend, dayName, dateLabel }
 *   tomorrowInfo: { isHoliday, holidayName, dateLabel }
 *   loading    : boolean
 */

const NAMA_HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function formatTanggalIndo(date) {
  return `${date.getDate()} ${NAMA_BULAN[date.getMonth()]} ${date.getFullYear()}`;
}

export function useDayInfo() {
  const [todayInfo, setTodayInfo] = useState(null);
  const [tomorrowInfo, setTomorrowInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dow = today.getDay(); // 0=Sun, 5=Fri, 6=Sat
    const isWeekend = dow === 0 || dow === 5 || dow === 6;

    const todayY = today.getFullYear();
    const todayM = today.getMonth() + 1;
    const todayD = today.getDate();
    const tomY = tomorrow.getFullYear();
    const tomM = tomorrow.getMonth() + 1;
    const tomD = tomorrow.getDate();

    Promise.all([
      fetch(`https://libur.deno.dev/api?year=${todayY}&month=${todayM}&day=${todayD}`).then(r => r.json()).catch(() => null),
      fetch(`https://libur.deno.dev/api?year=${tomY}&month=${tomM}&day=${tomD}`).then(r => r.json()).catch(() => null),
    ]).then(([todayData, tomorrowData]) => {
      // today
      const todayIsHoliday = todayData?.is_holiday === true;
      const todayHolidayName = todayIsHoliday
        ? (Array.isArray(todayData?.holiday_list) ? todayData.holiday_list[0] : null) || 'Libur Nasional'
        : null;

      setTodayInfo({
        isHoliday: todayIsHoliday,
        holidayName: todayHolidayName,
        isWeekend,
        dayName: NAMA_HARI[dow],
        dateLabel: formatTanggalIndo(today),
      });

      // tomorrow
      const tomIsHoliday = tomorrowData?.is_holiday === true;
      const tomHolidayName = tomIsHoliday
        ? (Array.isArray(tomorrowData?.holiday_list) ? tomorrowData.holiday_list[0] : null) || 'Libur Nasional'
        : null;

      setTomorrowInfo({
        isHoliday: tomIsHoliday,
        holidayName: tomHolidayName,
        dateLabel: formatTanggalIndo(tomorrow),
      });
    }).finally(() => setLoading(false));
  }, []);

  return { todayInfo, tomorrowInfo, loading };
}

export default useDayInfo;
