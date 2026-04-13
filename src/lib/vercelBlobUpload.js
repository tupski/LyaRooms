export const uploadToVercelBlob = async (file, folder = 'uploads') => {
  if (!file) return null;

  const safeName = `${Date.now()}-${String(file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'x-file-name': safeName,
      'x-folder': folder,
    },
    body: file,
  });

  if (!response.ok) {
    let message = 'Gagal upload ke Vercel Blob.';
    try {
      const err = await response.json();
      message = err?.error || err?.message || message;
    } catch (_e) {
      // Kosong: fallback pakai message default
    }
    throw new Error(message);
  }

  const data = await response.json();
  if (!data?.url) {
    throw new Error('URL file dari Vercel Blob tidak ditemukan.');
  }

  return data.url;
};
