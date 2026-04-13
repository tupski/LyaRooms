import { put } from '@vercel/blob';

const readRequestBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  try {
    const rawName = req.headers['x-file-name'] || `file-${Date.now()}`;
    const folder = (req.headers['x-folder'] || 'uploads').toString().replace(/[^a-zA-Z0-9/_-]/g, '');
    const contentType = req.headers['content-type'] || 'application/octet-stream';
    const body = await readRequestBody(req);

    if (!body || body.length === 0) {
      return res.status(400).json({ error: 'File kosong.' });
    }

    const pathname = `${folder}/${rawName}`;
    const requestedAccess = (process.env.BLOB_OBJECT_ACCESS || '').toLowerCase();
    const access = requestedAccess === 'public' ? 'public' : 'private';
    const blob = await put(pathname, body, {
      access,
      addRandomSuffix: true,
      contentType,
    });

    const proxyUrl = `/api/blob?pathname=${encodeURIComponent(blob.pathname)}`;
    return res.status(200).json({
      url: access === 'private' ? proxyUrl : blob.url,
      blobUrl: blob.url,
      proxyUrl,
      pathname: blob.pathname,
      access,
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Gagal upload file ke Vercel Blob.',
    });
  }
}
