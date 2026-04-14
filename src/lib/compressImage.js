/**
 * Mengompres gambar untuk upload: membatasi ukuran piksel dan kualitas JPEG
 * agar file lebih kecil tetapi tetap terbaca.
 */
export async function compressImageFile(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.82,
  } = options;

  if (!file || !file.type?.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    img.onload = () => {
      try {
        let { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        const w = Math.max(1, Math.round(width * ratio));
        const h = Math.max(1, Math.round(height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve(file);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob) {
              resolve(file);
              return;
            }
            const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image';
            const out = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
            resolve(out);
          },
          'image/jpeg',
          quality
        );
      } catch (_e) {
        cleanup();
        resolve(file);
      }
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('Gagal memuat gambar'));
    };

    img.src = objectUrl;
  });
}
