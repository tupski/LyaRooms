export const resolveStorageUrl = (value) => {
  if (!value) return value;

  // Sudah berupa URL proxy internal
  if (value.startsWith('/api/blob')) return value;

  try {
    const parsed = new URL(value);
    const isPrivateBlob = parsed.hostname.endsWith('.private.blob.vercel-storage.com');
    if (!isPrivateBlob) return value;

    const pathname = parsed.pathname.replace(/^\/+/, '');
    return `/api/blob?pathname=${encodeURIComponent(pathname)}`;
  } catch (_error) {
    return value;
  }
};
