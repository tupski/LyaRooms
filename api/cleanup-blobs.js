/* eslint-env node */
/* global process */
import { del, list } from '@vercel/blob';

const DAYS = 30;

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function getBlobDate(blob) {
  const raw = blob?.uploadedAt || blob?.createdAt || blob?.updatedAt || blob?.mtime;
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Env BLOB_READ_WRITE_TOKEN belum diset.' });
  }

  const requiredSecret = process.env.BLOB_CLEANUP_SECRET;
  const authHeader = String(req.headers.authorization || '');
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const secretFromQuery = String(req.query?.secret || '');
  const providedSecret = bearer || secretFromQuery;

  if (!requiredSecret) {
    return res.status(500).json({ error: 'Env BLOB_CLEANUP_SECRET belum diset.' });
  }
  if (providedSecret !== requiredSecret) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const days = parsePositiveInt(req.query?.days, DAYS);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const prefixes = ['ktp-images/', 'transfer-proofs/'];

  const summary = {
    days,
    cutoffIso: new Date(cutoff).toISOString(),
    checked: 0,
    deleted: 0,
    skippedNoDate: 0,
    skippedNewer: 0,
    errors: [],
    byPrefix: {},
  };

  try {
    for (const prefix of prefixes) {
      summary.byPrefix[prefix] = { checked: 0, deleted: 0 };
      let cursor = undefined;

      do {
        // list() mengambil semua blob; gunakan prefix supaya hemat resource.
        const page = await list({ prefix, cursor, limit: 1000 });
        const blobs = page?.blobs || [];
        cursor = page?.cursor;

        for (const blob of blobs) {
          summary.checked += 1;
          summary.byPrefix[prefix].checked += 1;

          const d = getBlobDate(blob);
          if (!d) {
            summary.skippedNoDate += 1;
            continue;
          }

          if (d.getTime() > cutoff) {
            summary.skippedNewer += 1;
            continue;
          }

          try {
            await del(blob.url);
            summary.deleted += 1;
            summary.byPrefix[prefix].deleted += 1;
          } catch (e) {
            summary.errors.push({
              pathname: blob.pathname,
              url: blob.url,
              message: e?.message || 'Gagal delete blob',
            });
          }
        }
      } while (cursor);
    }

    return res.status(200).json({ ok: true, ...summary });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e?.message || 'Gagal menjalankan cleanup.',
      ...summary,
    });
  }
}

