/* eslint-env node */
/* global process */
import { createClient } from '@supabase/supabase-js';
import { sendPushToAudience } from './send-push';

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function formatWibDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const fmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return `${fmt.format(d).replace(',', '')} WIB`;
}

function calcEndAt({ created_at, rental_duration }) {
  const start = new Date(created_at);
  const hours = Number(rental_duration || 1);
  if (Number.isNaN(start.getTime())) return null;
  if (hours >= 24) {
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    end.setHours(12, 0, 0, 0);
    return end;
  }
  return new Date(start.getTime() + hours * 60 * 60 * 1000);
}

async function upsertNotification(supabase, payload) {
  const { data, error } = await supabase
    .from('notifications')
    .upsert(payload, { onConflict: 'dedupe_key' })
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

// Fetch holiday status for a specific date from API
async function fetchHolidayForDate(year, month, day) {
  try {
    const res = await fetch(`https://libur.deno.dev/api?year=${year}&month=${month}&day=${day}`);
    const data = await res.json();
    if (data?.is_holiday) {
      return (Array.isArray(data.holiday_list) ? data.holiday_list[0] : null) || 'Libur Nasional';
    }
    return null;
  } catch {
    return null;
  }
}

// Fetch all holidays for a year/month from API
async function fetchHolidaysForMonth(year, month) {
  try {
    const res = await fetch(`https://libur.deno.dev/api?year=${year}&month=${month}`);
    const data = await res.json();
    if (!Array.isArray(data)) return {};
    const map = {};
    data.forEach(item => { if (item.date && item.name) map[item.date] = item.name; });
    return map;
  } catch {
    return {};
  }
}

/**
 * Deteksi libur panjang: rangkaian hari libur (tanggal merah + weekend) ≥ 3 hari berturut-turut.
 * Returns: { isLongHoliday, startDate, endDate, totalDays, description } | null
 */
function detectLongHoliday(holidayMap, fromDate) {
  // Cek 14 hari ke depan untuk menemukan rangkaian libur panjang
  const NAMA_BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  function toKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function isOffDay(d) {
    const dow = d.getDay(); // 0=Sun, 6=Sat
    if (dow === 0 || dow === 6) return true; // weekend
    return !!holidayMap[toKey(d)];
  }
  function fmtDate(d) {
    return `${d.getDate()} ${NAMA_BULAN[d.getMonth()]}`;
  }

  // Scan 14 hari ke depan, cari streak ≥ 3 hari libur berturut-turut
  for (let startOffset = 0; startOffset <= 14; startOffset++) {
    const startD = new Date(fromDate);
    startD.setDate(fromDate.getDate() + startOffset);
    startD.setHours(0,0,0,0);

    if (!isOffDay(startD)) continue;

    // Hitung panjang streak dari startD
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

      // Kumpulkan nama-nama libur nasional dalam streak
      const holidayNames = [];
      const scanD = new Date(startD);
      for (let i = 0; i < streakLen; i++) {
        const key = toKey(scanD);
        if (holidayMap[key]) holidayNames.push(holidayMap[key]);
        scanD.setDate(scanD.getDate() + 1);
      }

      const uniqueNames = [...new Set(holidayNames)];
      const desc = uniqueNames.length > 0
        ? uniqueNames.slice(0, 2).join(' & ')
        : 'Weekend panjang';

      return {
        isLongHoliday: true,
        startDate: startD,
        endDate: endD,
        totalDays: streakLen,
        description: desc,
        startOffset,
      };
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  const requiredSecret = process.env.NOTIF_CRON_SECRET;
  const secret = String(req.query?.secret || '');
  const authHeader = String(req.headers.authorization || '');
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const provided = bearer || secret;
  if (!requiredSecret) return res.status(500).json({ error: 'Env NOTIF_CRON_SECRET belum diset.' });
  if (provided !== requiredSecret) return res.status(401).json({ error: 'Unauthorized.' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Env SUPABASE_URL dan/atau SUPABASE_SERVICE_ROLE_KEY belum diset.' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const windowMinutes = parsePositiveInt(req.query?.window_minutes, 5);
  const soonMinutes = 30;
  const cutoffSoonMs = soonMinutes * 60 * 1000;

  const NAMA_HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const NAMA_BULAN_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const fmtTanggal = (d) => `${d.getDate()} ${NAMA_BULAN_FULL[d.getMonth()]} ${d.getFullYear()}`;

  // WIB time helpers
  const nowWib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const todayStr = `${nowWib.getFullYear()}-${String(nowWib.getMonth()+1).padStart(2,'0')}-${String(nowWib.getDate()).padStart(2,'0')}`;
  const tomorrowWib = new Date(nowWib);
  tomorrowWib.setDate(nowWib.getDate() + 1);
  const tomorrowStr = `${tomorrowWib.getFullYear()}-${String(tomorrowWib.getMonth()+1).padStart(2,'0')}-${String(tomorrowWib.getDate()).padStart(2,'0')}`;
  const dowWib = nowWib.getDay();
  const isTodayWeekend = dowWib === 0 || dowWib === 5 || dowWib === 6;
  const isTomorrowWeekend = tomorrowWib.getDay() === 0 || tomorrowWib.getDay() === 5 || tomorrowWib.getDay() === 6;

  const result = {
    ok: true, nowIso: now.toISOString(), windowMinutes,
    created: 0, rooms: { low3: 0, soldOut: 0 }, due: 0, soon30m: 0,
    overdueTagihan: 0, errors: [],
  };

  try {
    const pushEnabled = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

    // ================================================================
    // 1) Checkout due & soon (existing)
    // ================================================================
    const { data: activeTx, error: txErr } = await supabase
      .from('transactions')
      .select('id, created_at, rental_duration, apartment_location, room_number, customer_name, user_id, checkout_at, checkin_at')
      .is('checkout_at', null);
    if (txErr) throw txErr;

    const txList = activeTx || [];
    for (const tx of txList) {
      const endAt = calcEndAt(tx);
      if (!endAt) continue;
      const diffMs = endAt.getTime() - now.getTime();
      const endLabel = formatWibDateTime(endAt.toISOString());

      // Hitung durasi menginap
      const checkinAt = tx.checkin_at ? new Date(tx.checkin_at) : new Date(tx.created_at);
      const durasiJam = Number(tx.rental_duration || 1);
      const durasiLabel = durasiJam >= 24 ? `${Math.floor(durasiJam/24)} malam` : `${durasiJam} jam`;
      const checkinLabel = formatWibDateTime(checkinAt.toISOString());

      const baseData = {
        tx_id: tx.id,
        apartment_location: tx.apartment_location,
        room_number: tx.room_number,
        customer_name: tx.customer_name,
        end_at: endAt.toISOString(),
        checkin_at: checkinAt.toISOString(),
        rental_duration: tx.rental_duration,
      };

      if (diffMs <= 0) {
        const dedupe = `checkout_due:tx:${tx.id}`;
        const title = `⏰ Waktunya Checkout: ${tx.apartment_location} ${tx.room_number}`;
        const body = `${tx.customer_name || 'Customer'} sudah melewati waktu sewa (${endLabel}). Check-in: ${checkinLabel}, durasi: ${durasiLabel}.`;
        await upsertNotification(supabase, { type: 'checkout_due', title, body, data: baseData, dedupe_key: `${dedupe}:admin`, audience_role: 'admin' });
        await upsertNotification(supabase, { type: 'checkout_due', title, body, data: baseData, dedupe_key: `${dedupe}:super_admin`, audience_role: 'super_admin' });
        if (tx.user_id) await upsertNotification(supabase, { type: 'checkout_due', title, body, data: baseData, dedupe_key: `${dedupe}:user:${tx.user_id}`, audience_user_id: tx.user_id });
        if (pushEnabled) {
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'admin' });
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'super_admin' });
          if (tx.user_id) await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_user_id: tx.user_id });
        }
        result.due += 1; result.created += 2 + (tx.user_id ? 1 : 0);
        continue;
      }

      if (diffMs > 0 && diffMs <= cutoffSoonMs) {
        const minutesLeft = Math.max(1, Math.ceil(diffMs / 60000));
        const dedupe = `checkout_30m:tx:${tx.id}`;
        const title = `🔔 Checkout ${minutesLeft} Menit Lagi`;
        const body = `${tx.apartment_location} ${tx.room_number} (${tx.customer_name || 'Customer'}) berakhir ${endLabel}. Check-in: ${checkinLabel}, durasi: ${durasiLabel}.`;
        await upsertNotification(supabase, { type: 'checkout_soon', title, body, data: { ...baseData, minutes_left: minutesLeft }, dedupe_key: `${dedupe}:admin`, audience_role: 'admin' });
        await upsertNotification(supabase, { type: 'checkout_soon', title, body, data: { ...baseData, minutes_left: minutesLeft }, dedupe_key: `${dedupe}:super_admin`, audience_role: 'super_admin' });
        if (tx.user_id) await upsertNotification(supabase, { type: 'checkout_soon', title, body, data: { ...baseData, minutes_left: minutesLeft }, dedupe_key: `${dedupe}:user:${tx.user_id}`, audience_user_id: tx.user_id });
        if (pushEnabled) {
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'admin' });
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'super_admin' });
          if (tx.user_id) await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_user_id: tx.user_id });
        }
        result.soon30m += 1; result.created += 2 + (tx.user_id ? 1 : 0);
      }
    }

    // ================================================================
    // 2) Kamar habis / hampir habis (existing)
    // ================================================================
    const [{ data: lokasiRows, error: locErr }, { data: kamarRows, error: kamarErr }] = await Promise.all([
      supabase.from('lokasi_apartemen').select('name').order('name'),
      supabase.from('nomor_kamar').select('name, lokasi').order('name'),
    ]);
    if (locErr) throw locErr;
    if (kamarErr) throw kamarErr;

    const occupied = new Set();
    for (const tx of txList) {
      const endAt = calcEndAt(tx);
      if (!endAt) continue;
      if (now < endAt) occupied.add(`${tx.apartment_location}__${tx.room_number}`);
    }

    const kamar = kamarRows || [];
    const lokasi = (lokasiRows || []).map((x) => x.name);

    for (const loc of lokasi) {
      const rooms = kamar.filter((r) => r.lokasi === loc);
      if (rooms.length === 0) continue;
      const availableCount = rooms.filter((r) => !occupied.has(`${r.lokasi}__${r.name}`)).length;

      if (availableCount === 0) {
        const dedupe = `rooms_sold_out:${loc}:${todayStr}`;
        const title = `🚫 Kamar Habis: ${loc}`;
        const body = `Semua kamar di ${loc} sedang terisi.`;
        await upsertNotification(supabase, { type: 'rooms_sold_out', title, body, data: { lokasi: loc, available_count: 0 }, dedupe_key: `${dedupe}:admin`, audience_role: 'admin' });
        await upsertNotification(supabase, { type: 'rooms_sold_out', title, body, data: { lokasi: loc, available_count: 0 }, dedupe_key: `${dedupe}:super_admin`, audience_role: 'super_admin' });
        if (pushEnabled) {
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'admin' });
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'super_admin' });
        }
        result.rooms.soldOut += 1; result.created += 2;
      } else if (availableCount < 3) {
        const dedupe = `rooms_low3:${loc}:${todayStr}`;
        const title = `⚠️ Kamar Tinggal ${availableCount}: ${loc}`;
        const body = `Sisa ${availableCount} kamar tersedia di ${loc}.`;
        await upsertNotification(supabase, { type: 'rooms_low', title, body, data: { lokasi: loc, available_count: availableCount }, dedupe_key: `${dedupe}:admin`, audience_role: 'admin' });
        await upsertNotification(supabase, { type: 'rooms_low', title, body, data: { lokasi: loc, available_count: availableCount }, dedupe_key: `${dedupe}:super_admin`, audience_role: 'super_admin' });
        if (pushEnabled) {
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'admin' });
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'super_admin' });
        }
        result.rooms.low3 += 1; result.created += 2;
      }
    }

    // ================================================================
    // 3) Tagihan unit terlambat (NEW)
    // ================================================================
    const { data: overdueTagihan, error: tagihanErr } = await supabase
      .from('tagihan_bulanan')
      .select('id, apartment_location, room_number, amount, due_date')
      .eq('status', 'unpaid')
      .lt('due_date', todayStr);

    if (!tagihanErr && overdueTagihan && overdueTagihan.length > 0) {
      for (const tagihan of overdueTagihan) {
        const dueDate = new Date(tagihan.due_date);
        const diffDays = Math.floor((nowWib - dueDate) / (1000 * 60 * 60 * 24));
        const dedupe = `tagihan_overdue:${tagihan.id}:${todayStr}`;
        const title = `🔴 Tagihan Terlambat: ${tagihan.apartment_location} - ${tagihan.room_number}`;
        const body = `Tagihan unit ${tagihan.apartment_location} - ${tagihan.room_number} sudah terlambat ${diffDays} hari (jatuh tempo: ${new Date(tagihan.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}).`;

        await upsertNotification(supabase, { type: 'tagihan_overdue', title, body, data: { tagihan_id: tagihan.id, apartment_location: tagihan.apartment_location, room_number: tagihan.room_number, due_date: tagihan.due_date, overdue_days: diffDays }, dedupe_key: `${dedupe}:admin`, audience_role: 'admin' });
        await upsertNotification(supabase, { type: 'tagihan_overdue', title, body, data: { tagihan_id: tagihan.id, apartment_location: tagihan.apartment_location, room_number: tagihan.room_number, due_date: tagihan.due_date, overdue_days: diffDays }, dedupe_key: `${dedupe}:super_admin`, audience_role: 'super_admin' });
        if (pushEnabled) {
          await sendPushToAudience({ title, body, url: '/?tab=finance', audience_role: 'admin' });
          await sendPushToAudience({ title, body, url: '/?tab=finance', audience_role: 'super_admin' });
        }
        result.overdueTagihan += 1; result.created += 2;
      }
    }

    // ================================================================
    // 4) Libur nasional & weekend (updated — semua ke 'all')
    // ================================================================
    // Fetch libur hari ini, besok, dan 7 hari ke depan (untuk libur panjang)
    const [todayHoliday, tomorrowHoliday] = await Promise.all([
      fetchHolidayForDate(nowWib.getFullYear(), nowWib.getMonth()+1, nowWib.getDate()),
      fetchHolidayForDate(tomorrowWib.getFullYear(), tomorrowWib.getMonth()+1, tomorrowWib.getDate()),
    ]);

    // a) Hari ini libur nasional
    if (todayHoliday) {
      const title = `🔥 Hari Ini Libur: ${todayHoliday}`;
      const body = `Hari ini ${fmtTanggal(nowWib)} adalah ${todayHoliday}. Tamu makin rame, siap-siap sibuk!`;
      await upsertNotification(supabase, { type: 'holiday_today', title, body, data: { date: todayStr }, dedupe_key: `holiday_today:${todayStr}`, audience_role: 'all' });
      if (pushEnabled) await sendPushToAudience({ title, body, url: '/', audience_role: 'all' });
      result.created += 1;
    }

    // b) Hari ini weekend (Jumat = weekend dimulai)
    if (dowWib === 5) {
      const title = `🚀 Weekend Dimulai!`;
      const body = `Hari ini ${NAMA_HARI[dowWib]}, ${fmtTanggal(nowWib)}. Weekend = tamu rame! Semangat kerjanya guys!`;
      await upsertNotification(supabase, { type: 'weekend', title, body, data: { date: todayStr }, dedupe_key: `weekend_start:${todayStr}`, audience_role: 'all' });
      if (pushEnabled) await sendPushToAudience({ title, body, url: '/', audience_role: 'all' });
      result.created += 1;
    }

    // c) Besok libur nasional
    if (tomorrowHoliday) {
      const title = `⚡ Besok Libur: ${tomorrowHoliday}`;
      const body = `Besok ${fmtTanggal(tomorrowWib)} adalah ${tomorrowHoliday}. Bersiap, tamu bakal rame besok!`;
      await upsertNotification(supabase, { type: 'holiday_tomorrow', title, body, data: { date: tomorrowStr }, dedupe_key: `holiday_tomorrow:${tomorrowStr}`, audience_role: 'all' });
      if (pushEnabled) await sendPushToAudience({ title, body, url: '/', audience_role: 'all' });
      result.created += 1;
    }

    // d) Besok weekend (Kamis = besok Jumat/weekend)
    if (dowWib === 4) { // Kamis
      const title = `🎯 Besok Weekend!`;
      const body = `Besok ${NAMA_HARI[tomorrowWib.getDay()]}, ${fmtTanggal(tomorrowWib)}. Persiapkan diri, tamu weekend mulai berdatangan!`;
      await upsertNotification(supabase, { type: 'weekend_tomorrow', title, body, data: { date: tomorrowStr }, dedupe_key: `weekend_tomorrow:${tomorrowStr}`, audience_role: 'all' });
      if (pushEnabled) await sendPushToAudience({ title, body, url: '/', audience_role: 'all' });
      result.created += 1;
    }

    // ================================================================
    // 5) Libur panjang (NEW) — deteksi & notifikasi H-2 sebelum mulai
    // ================================================================
    // Fetch holidays untuk bulan ini dan bulan depan (untuk deteksi libur panjang)
    const thisMonthHolidays = await fetchHolidaysForMonth(nowWib.getFullYear(), nowWib.getMonth()+1);
    const nextMonthDate = new Date(nowWib);
    nextMonthDate.setMonth(nowWib.getMonth() + 1);
    const nextMonthHolidays = await fetchHolidaysForMonth(nextMonthDate.getFullYear(), nextMonthDate.getMonth()+1);
    const combinedHolidayMap = { ...thisMonthHolidays, ...nextMonthHolidays };

    const longHoliday = detectLongHoliday(combinedHolidayMap, nowWib);

    if (longHoliday) {
      const { startDate, endDate, totalDays, description, startOffset } = longHoliday;

      // Notifikasi H-2 sebelum libur panjang dimulai
      if (startOffset === 2) {
        const title = `🏖️ Libur Panjang ${totalDays} Hari Lusa!`;
        const body = `Libur panjang ${totalDays} hari dimulai ${fmtTanggal(startDate)} s/d ${fmtTanggal(endDate)} (${description}). Tamu diprediksi rame, siapkan semua!`;
        const dedupe = `long_holiday_h2:${startDate.toISOString().slice(0,10)}`;
        await upsertNotification(supabase, { type: 'long_holiday', title, body, data: { start_date: startDate.toISOString().slice(0,10), end_date: endDate.toISOString().slice(0,10), total_days: totalDays, description }, dedupe_key: dedupe, audience_role: 'all' });
        if (pushEnabled) await sendPushToAudience({ title, body, url: '/', audience_role: 'all' });
        result.created += 1;
      }

      // Notifikasi H-1 sebelum libur panjang dimulai
      if (startOffset === 1) {
        const title = `🔥 Besok Libur Panjang ${totalDays} Hari!`;
        const body = `Libur panjang ${totalDays} hari mulai besok ${fmtTanggal(startDate)} s/d ${fmtTanggal(endDate)} (${description}). Pastikan semua siap!`;
        const dedupe = `long_holiday_h1:${startDate.toISOString().slice(0,10)}`;
        await upsertNotification(supabase, { type: 'long_holiday', title, body, data: { start_date: startDate.toISOString().slice(0,10), end_date: endDate.toISOString().slice(0,10), total_days: totalDays, description }, dedupe_key: dedupe, audience_role: 'all' });
        if (pushEnabled) await sendPushToAudience({ title, body, url: '/', audience_role: 'all' });
        result.created += 1;
      }

      // Notifikasi hari pertama libur panjang
      if (startOffset === 0) {
        const title = `🎉 Libur Panjang ${totalDays} Hari Dimulai!`;
        const body = `Libur panjang ${totalDays} hari hari ini s/d ${fmtTanggal(endDate)} (${description}). Tamu rame, semangat!`;
        const dedupe = `long_holiday_start:${startDate.toISOString().slice(0,10)}`;
        await upsertNotification(supabase, { type: 'long_holiday', title, body, data: { start_date: startDate.toISOString().slice(0,10), end_date: endDate.toISOString().slice(0,10), total_days: totalDays, description }, dedupe_key: dedupe, audience_role: 'all' });
        if (pushEnabled) await sendPushToAudience({ title, body, url: '/', audience_role: 'all' });
        result.created += 1;
      }
    }

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'Gagal generate notifikasi', ...result });
  }
}
