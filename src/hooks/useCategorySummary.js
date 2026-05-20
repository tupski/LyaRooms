import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook untuk mengambil ringkasan kategori pengeluaran via Supabase RPC.
 * Memanggil RPC `get_category_summary` dengan parameter filter.
 *
 * @param {Object} options
 * @param {string} [options.lokasi] - Filter lokasi apartemen
 * @param {string} [options.kamar] - Filter nomor kamar
 * @param {string} [options.startDate] - Filter tanggal mulai (format: YYYY-MM-DD)
 * @param {string} [options.endDate] - Filter tanggal akhir (format: YYYY-MM-DD)
 * @param {boolean} [options.enabled=true] - Apakah hook aktif melakukan fetch
 * @returns {{ data: Array, isLoading: boolean, error: string|null, refresh: () => void }}
 */
export function useCategorySummary(options = {}) {
  const { lokasi, kamar, startDate, endDate, enabled = true } = options;

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use ref to track if component is still mounted
  const mountedRef = useRef(true);

  const fetchCategorySummary = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    const params = {
      p_lokasi: lokasi || null,
      p_kamar: kamar || null,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    };

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_category_summary',
      params
    );

    if (!mountedRef.current) return;

    if (rpcError) {
      setError('Gagal memuat ringkasan kategori. Silakan coba lagi.');
      // Retain previous data on error (no setData call)
    } else {
      setData(rpcData || []);
    }

    setIsLoading(false);
  }, [lokasi, kamar, startDate, endDate, enabled]);

  // Auto-refresh when filter parameters change
  useEffect(() => {
    fetchCategorySummary();
  }, [fetchCategorySummary]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(() => {
    fetchCategorySummary();
  }, [fetchCategorySummary]);

  return { data, isLoading, error, refresh };
}

export default useCategorySummary;
