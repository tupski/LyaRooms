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
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
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
  // dedupe_key wajib ada agar upsert stabil
  const { data, error } = await supabase
    .from('notifications')
    .upsert(payload, { onConflict: 'dedupe_key' })
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
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

  const result = {
    ok: true,
    nowIso: now.toISOString(),
    windowMinutes,
    created: 0,
    rooms: { low3: 0, soldOut: 0 },
    due: 0,
    soon30m: 0,
    errors: [],
  };

  try {
    const pushEnabled = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
    // 1) Ambil transaksi aktif untuk perhitungan checkout/soon
    const { data: activeTx, error: txErr } = await supabase
      .from('transactions')
      .select('id, created_at, rental_duration, apartment_location, room_number, customer_name, user_id, checkout_at')
      .is('checkout_at', null);
    if (txErr) throw txErr;

    const txList = activeTx || [];
    for (const tx of txList) {
      const endAt = calcEndAt(tx);
      if (!endAt) continue;
      const diffMs = endAt.getTime() - now.getTime();

      const endLabel = formatWibDateTime(endAt.toISOString());
      const baseData = {
        tx_id: tx.id,
        apartment_location: tx.apartment_location,
        room_number: tx.room_number,
        customer_name: tx.customer_name,
        end_at: endAt.toISOString(),
      };

      // checkout due (now >= endAt)
      if (diffMs <= 0) {
        const dedupe = `checkout_due:tx:${tx.id}`;
        const title = `Waktunya checkout: ${tx.apartment_location} ${tx.room_number}`;
        const body = `${tx.customer_name || 'Customer'} sudah melewati waktu sewa (${endLabel}).`;
        // admin + superadmin
        await upsertNotification(supabase, { type: 'checkout_due', title, body, data: baseData, dedupe_key: `${dedupe}:admin`, audience_role: 'admin' });
        await upsertNotification(supabase, { type: 'checkout_due', title, body, data: baseData, dedupe_key: `${dedupe}:super_admin`, audience_role: 'super_admin' });
        // owner
        if (tx.user_id) {
          await upsertNotification(supabase, { type: 'checkout_due', title, body, data: baseData, dedupe_key: `${dedupe}:user:${tx.user_id}`, audience_user_id: tx.user_id });
        }
        if (pushEnabled) {
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'admin' });
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'super_admin' });
          if (tx.user_id) await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_user_id: tx.user_id });
        }
        result.due += 1;
        result.created += 3 + (tx.user_id ? 1 : 0);
        continue;
      }

      // sisa 30 menit
      if (diffMs > 0 && diffMs <= cutoffSoonMs) {
        const minutesLeft = Math.max(1, Math.ceil(diffMs / 60000));
        const dedupe = `checkout_30m:tx:${tx.id}`;
        const title = `Checkout ${minutesLeft} menit lagi`;
        const body = `${tx.apartment_location} ${tx.room_number} (${tx.customer_name || 'Customer'}) berakhir ${endLabel}.`;

        await upsertNotification(supabase, { type: 'checkout_soon', title, body, data: { ...baseData, minutes_left: minutesLeft }, dedupe_key: `${dedupe}:admin`, audience_role: 'admin' });
        await upsertNotification(supabase, { type: 'checkout_soon', title, body, data: { ...baseData, minutes_left: minutesLeft }, dedupe_key: `${dedupe}:super_admin`, audience_role: 'super_admin' });
        if (tx.user_id) {
          await upsertNotification(supabase, { type: 'checkout_soon', title, body, data: { ...baseData, minutes_left: minutesLeft }, dedupe_key: `${dedupe}:user:${tx.user_id}`, audience_user_id: tx.user_id });
        }
        if (pushEnabled) {
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'admin' });
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'super_admin' });
          if (tx.user_id) await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_user_id: tx.user_id });
        }

        result.soon30m += 1;
        result.created += 2 + (tx.user_id ? 1 : 0);
      }
    }

    // 2) Kamar habis / <3 per lokasi
    const [{ data: lokasiRows, error: locErr }, { data: kamarRows, error: kamarErr }] = await Promise.all([
      supabase.from('lokasi_apartemen').select('name').order('name'),
      supabase.from('nomor_kamar').select('name, lokasi').order('name'),
    ]);
    if (locErr) throw locErr;
    if (kamarErr) throw kamarErr;

    // map occupied berdasarkan transaksi aktif endAt
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
        const dedupe = `rooms_sold_out:${loc}:${now.toISOString().slice(0, 10)}`;
        const title = `Kamar habis: ${loc}`;
        const body = `Semua kamar di ${loc} sedang terisi.`;
        await upsertNotification(supabase, { type: 'rooms_sold_out', title, body, data: { lokasi: loc, available_count: availableCount }, dedupe_key: `${dedupe}:admin`, audience_role: 'admin' });
        await upsertNotification(supabase, { type: 'rooms_sold_out', title, body, data: { lokasi: loc, available_count: availableCount }, dedupe_key: `${dedupe}:super_admin`, audience_role: 'super_admin' });
        if (pushEnabled) {
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'admin' });
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'super_admin' });
        }
        result.rooms.soldOut += 1;
        result.created += 2;
      } else if (availableCount > 0 && availableCount < 3) {
        const dedupe = `rooms_low3:${loc}:${now.toISOString().slice(0, 10)}:${windowMinutes}`;
        const title = `Kamar tinggal ${availableCount}: ${loc}`;
        const body = `Sisa ${availableCount} kamar tersedia di ${loc}.`;
        await upsertNotification(supabase, { type: 'rooms_low', title, body, data: { lokasi: loc, available_count: availableCount }, dedupe_key: `${dedupe}:admin`, audience_role: 'admin' });
        await upsertNotification(supabase, { type: 'rooms_low', title, body, data: { lokasi: loc, available_count: availableCount }, dedupe_key: `${dedupe}:super_admin`, audience_role: 'super_admin' });
        if (pushEnabled) {
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'admin' });
          await sendPushToAudience({ title, body, url: '/?tab=kamar', audience_role: 'super_admin' });
        }
        result.rooms.low3 += 1;
        result.created += 2;
      }
    }

    // 3) Notifikasi Weekend & Libur Nasional — audience_role: 'all'
    const nowWib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const todayStr = `${nowWib.getFullYear()}-${String(nowWib.getMonth() + 1).padStart(2,'0')}-${String(nowWib.getDate()).padStart(2,'0')}`;
    const tomorrowWib = new Date(nowWib);
    tomorrowWib.setDate(nowWib.getDate() + 1);
    const tomorrowStr = `${tomorrowWib.getFullYear()}-${String(tomorrowWib.getMonth() + 1).padStart(2,'0')}-${String(tomorrowWib.getDate()).padStart(2,'0')}`;

    const NAMA_HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const fmtTanggal = (d) => `${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;

    // Fetch libur hari ini dan besok dari API
    let todayHoliday = null;
    let tomorrowHoliday = null;
    try {
      const [todayRes, tomorrowRes] = await Promise.all([
        fetch(`https://libur.deno.dev/api?year=${nowWib.getFullYear()}&month=${nowWib.getMonth()+1}&day=${nowWib.getDate()}`).then(r => r.json()),
        fetch(`https://libur.deno.dev/api?year=${tomorrowWib.getFullYear()}&month=${tomorrowWib.getMonth()+1}&day=${tomorrowWib.getDate()}`).then(r => r.json()),
      ]);
      if (todayRes?.is_holiday) todayHoliday = (todayRes.holiday_list || [])[0] || 'Libur Nasional';
      if (tomorrowRes?.is_holiday) tomorrowHoliday = (tomorrowRes.holiday_list || [])[0] || 'Libur Nasional';
    } catch (_e) { /* API gagal, skip */ }

    // a) Hari ini libur nasional
    if (todayHoliday) {
      const title = `🔥 Hari Ini Hari Libur: ${todayHoliday}`;
      const body = `Hari ini ${fmtTanggal(nowWib)} adalah ${todayHoliday}. Tamu makin rame, siap-siap sibuk!`;
      const dedupe = `holiday_today:${todayStr}`;
      await upsertNotification(supabase, { type: 'holiday_today', title, body, data: { date: todayStr }, dedupe_key: dedupe, audience_role: 'all' });
      if (pushEnabled) await sendPushToAudience({ title, body, url: '/', audience_role: 'all' });
      result.created += 1;
    }

    // b) Besok libur nasional
    if (tomorrowHoliday) {
      const title = `⚡ Besok Libur: ${tomorrowHoliday}`;
      const body = `Besok ${fmtTanggal(tomorrowWib)} adalah ${tomorrowHoliday}. Siap-siap, tamu bakal rame besok!`;
      const dedupe = `holiday_tomorrow:${tomorrowStr}`;
      await upsertNotification(supabase, { type: 'holiday_tomorrow', title, body, data: { date: tomorrowStr }, dedupe_key: dedupe, audience_role: 'all' });
      if (pushEnabled) await sendPushToAudience({ title, body, url: '/', audience_role: 'all' });
      result.created += 1;
    }

    // c) Memasuki hari Jumat (weekend dimulai) — hanya trigger di hari Jumat
    const dowWib = nowWib.getDay(); // 5 = Jumat
    if (dowWib === 5) {
      const title = `🚀 Weekend Dimulai!`;
      const body = `Hari ini ${NAMA_HARI[dowWib]}, ${fmtTanggal(nowWib)}. Weekend = tamu rame! Semangat kerjanya guys!`;
      const dedupe = `weekend_start:${todayStr}`;
      await upsertNotification(supabase, { type: 'weekend', title, body, data: { date: todayStr }, dedupe_key: dedupe, audience_role: 'all' });
      if (pushEnabled) await sendPushToAudience({ title, body, url: '/', audience_role: 'all' });
      result.created += 1;
    }

    // Endpoint ini hanya generator; push akan dikirim dari endpoint terpisah.
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'Gagal generate notifikasi', ...result });
  }
}