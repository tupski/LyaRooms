import { useState, useEffect } from 'react';

const NAMA_HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const NAMA_BULAN_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function formatTanggalIndo(date) {
  return `${date.getDate()} ${NAMA_BULAN[date.getMonth()]} ${date.getFullYear()}`;
}
function formatTanggalShort(date) {
  return `${date.getDate()} ${NAMA_BULAN_SHORT[date.getMonth()]}`;
}
function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/**
 * Deteksi libur panjang: rangkaian hari libur (tanggal merah + weekend) ≥ 3 hari berturut-turut.
 * holidayMap: { "YYYY-MM-DD": "Nama Libur" }
 * fromDate: Date object (hari ini)
 */
function detectLongHoliday(holidayMap, fromDate) {
  function isOffDay(d) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) return true;
    return !!holidayMap[toKey(d)];
  }

  for (let startOffset = 0; startOffset <= 14; startOffset++) {
    const startD = new Date(fromDate);
    startD.setDate(fromDate.getDate() + startOffset);
    startD.setHours(0,0,0,0);
    if (!isOffDay(startD)) continue;

    let streakLen = 0;
    const streakD = new Date(startD);
    while (streakLen < 14) {
      if (!isOffDay(streakD)) break;
      streakLen++;
      streakD.setDate(streakD.getDate() + 1);
    }

    if (streakLen >= 3) {
      const endD = new Date(startD);
      endD.setDate(startD.getDate() + streakLen - 1);

      const holidayNames = [];
      const scanD = new Date(startD);
      for (let i = 0; i < streakLen; i++) {
        const key = toKey(scanD);
        if (holidayMap[key]) holidayNames.push(holidayMap[key]);
        scanD.setDate(scanD.getDate() + 1);
      }
      const uniqueNames = [...new Set(holidayNames)];
      const desc = uniqueNames.length > 0 ? uniqueNames.slice(0,2).join(' & ') : 'Weekend panjang';

      return {
        isLongHoliday: true,
        startDate: startD,
        endDate: endD,
        totalDays: streakLen,
        description: desc,
        startOffset,
        startLabel: formatTanggalShort(startD),
        endLabel: formatTanggalShort(endD),
      };
    }
  }
  return null;
}

/**
 * useDayInfo — fetch info hari ini, besok, dan deteksi libur panjang.
 *
 * Returns:
 *   todayInfo    : { isHoliday, holidayName, isWeekend, dayName, dateLabel }
 *   tomorrowInfo : { isHoliday, holidayName, isWeekend, dateLabel }
 *   longHoliday  : { isLongHoliday, startDate, endDate, totalDays, description, startOffset, startLabel, endLabel } | null
 *   loading      : boolean
 */
export function useDayInfo() {
  const [todayInfo, setTodayInfo] = useState(null);
  const [tomorrowInfo, setTomorrowInfo] = useState(null);
  const [longHoliday, setLongHoliday] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dow = today.getDay();
    const isWeekend = dow === 0 || dow === 5 || dow === 6;
    const tomDow = tomorrow.getDay();
    const isTomWeekend = tomDow === 0 || tomDow === 5 || tomDow === 6;

    const todayY = today.getFullYear();
    const todayM = today.getMonth() + 1;
    const todayD = today.getDate();
    const tomY = tomorrow.getFullYear();
    const tomM = tomorrow.getMonth() + 1;
    const tomD = tomorrow.getDate();

    // Fetch hari ini, besok, dan bulan ini + bulan depan (untuk libur panjang)
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    Promise.all([
      fetch(`https://libur.deno.dev/api?year=${todayY}&month=${todayM}&day=${todayD}`).then(r => r.json()).catch(() => null),
      fetch(`https://libur.deno.dev/api?year=${tomY}&month=${tomM}&day=${tomD}`).then(r => r.json()).catch(() => null),
      fetch(`https://libur.deno.dev/api?year=${todayY}&month=${todayM}`).then(r => r.json()).catch(() => []),
      fetch(`https://libur.deno.dev/api?year=${nextMonth.getFullYear()}&month=${nextMonth.getMonth()+1}`).then(r => r.json()).catch(() => []),
    ]).then(([todayData, tomorrowData, thisMonthData, nextMonthData]) => {
      // Today
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

      // Tomorrow
      const tomIsHoliday = tomorrowData?.is_holiday === true;
      const tomHolidayName = tomIsHoliday
        ? (Array.isArray(tomorrowData?.holiday_list) ? tomorrowData.holiday_list[0] : null) || 'Libur Nasional'
        : null;

      setTomorrowInfo({
        isHoliday: tomIsHoliday,
        holidayName: tomHolidayName,
        isWeekend: isTomWeekend,
        dateLabel: formatTanggalIndo(tomorrow),
      });

      // Build holiday map for long holiday detection
      const holidayMap = {};
      const allMonthData = [...(Array.isArray(thisMonthData) ? thisMonthData : []), ...(Array.isArray(nextMonthData) ? nextMonthData : [])];
      allMonthData.forEach(item => { if (item.date && item.name) holidayMap[item.date] = item.name; });

      // Detect long holiday
      const lh = detectLongHoliday(holidayMap, today);
      setLongHoliday(lh);
    }).finally(() => setLoading(false));
  }, []);

  return { todayInfo, tomorrowInfo, longHoliday, loading };
}

export default useDayInfo;
