/**
 * Menghitung waktu checkout maksimal (12:00 WIB) untuk sewa harian.
 * Aturan: 
 * - Jika check-in sebelum jam 12:00, dianggap menginap untuk malam sebelumnya (checkout hari yang sama jam 12:00 untuk 1 malam).
 * - Jika check-in setelah jam 12:00, checkout adalah keesokan harinya jam 12:00 untuk 1 malam.
 */
export const computeNoonCheckout = (checkInDate, nights = 1) => {
  const safeNights = Math.max(Number(nights) || 1, 1);
  const isBeforeNoon = checkInDate.getHours() < 12;
  const addDays = isBeforeNoon ? Math.max(safeNights - 1, 0) : safeNights;
  
  const checkoutDate = new Date(checkInDate);
  checkoutDate.setDate(checkoutDate.getDate() + addDays);
  checkoutDate.setHours(12, 0, 0, 0);
  return checkoutDate;
};

/**
 * Menghitung waktu berakhirnya sewa.
 */
export const calcEndAt = (tx) => {
  if (tx.checkout_at) return new Date(tx.checkout_at);
  const start = new Date(tx.checkin_at || tx.created_at);
  const hours = Number(tx.rental_duration || 1);
  return new Date(start.getTime() + hours * 3600000);
};

/**
 * Menentukan apakah sebuah kamar sedang terisi berdasarkan daftar transaksi.
 * Berbeda dengan logika lama, fungsi ini mengecek seluruh transaksi yang mungkin tumpang tindih.
 */
export const getActiveTransaction = (roomLokasi, roomName, transactions, now = new Date()) => {
  if (!transactions || !Array.isArray(transactions)) return null;
  
  // Cari transaksi yang:
  // 1. Lokasi dan nomor kamar cocok
  // 2. Waktu 'sekarang' berada di antara check-in dan (estimasi) checkout
  return transactions.find(tx => {
    if (tx.apartment_location !== roomLokasi || tx.room_number !== roomName) return false;
    
    const start = new Date(tx.checkin_at || tx.created_at);
    const end = calcEndAt(tx);
    
    return now >= start && now < end;
  });
};

/**
 * Format waktu ke WIB (Indonesian Style)
 */
export const formatTimeWIB = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  const parts = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  
  const getPart = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${getPart('weekday')}, ${getPart('day')} ${getPart('month')} ${getPart('year')}, ${getPart('hour')}:${getPart('minute')} WIB`;
};

export const capitalizeWords = (str) => {
  if (!str) return '-';
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export const getRentalConfig = (rentalType, duration, customHours, checkInDate = new Date()) => {
  if (rentalType === 'PER_MALAM') {
    const nights = duration === 'Custom' ? Math.max(Number(customHours) || 1, 1) : 1;
    const checkoutDate = computeNoonCheckout(checkInDate, nights);
    const durationMs = checkoutDate.getTime() - checkInDate.getTime();
    const rentalHours = Math.max(Math.ceil(durationMs / 3600000), 1);
    return { rentalHours, checkoutDate };
  }
  
  const hours = duration === 'Custom' 
    ? Math.max(Number(customHours) || 1, 1) 
    : Number(String(duration).match(/\d+/)?.[0] || 1);
  const checkoutDate = new Date(checkInDate.getTime() + hours * 3600000);
  return { rentalHours: hours, checkoutDate };
};
