import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Generic hook untuk semua pemanggilan Dashboard_RPC dengan dukungan pagination server-side.
 *
 * @param {object} options
 * @param {string} options.rpcName - Nama fungsi RPC Supabase
 * @param {object} options.params - Parameter RPC (p_start_date, p_end_date, p_location, dll.)
 * @param {number} [options.pageSize=10] - Ukuran halaman (maks 100)
 * @param {boolean} [options.paginated=true] - Apakah menggunakan pagination
 * @param {boolean} [options.enabled=true] - Apakah fetch dijalankan
 * @returns {{ data: Array, totalCount: number, totalPages: number, currentPage: number, isLoading: boolean, error: string|null, setPage: (page: number) => void, refresh: () => void }}
 */
export function useRpcQuery({
  rpcName,
  params,
  pageSize = 10,
  paginated = true,
  enabled = true,
}) {
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const isMountedRef = useRef(true);

  // Serialize params to JSON string to use as stable useEffect dependency,
  // avoiding infinite loops caused by object identity changes each render.
  const paramsJson = JSON.stringify(params);

  // Derived values
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Reset currentPage to 1 whenever params content changes
  const prevParamsJsonRef = useRef(paramsJson);
  useEffect(() => {
    if (prevParamsJsonRef.current !== paramsJson) {
      prevParamsJsonRef.current = paramsJson;
      setCurrentPage(1);
    }
  }, [paramsJson]);

  // Main fetch effect — depends on serialized params, currentPage, and refreshTick
  useEffect(() => {
    if (!enabled || !rpcName) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      // Parse params from stable JSON string to avoid stale closure issues
      const paramsSnapshot = JSON.parse(paramsJson);

      const rpcParams = {
        ...paramsSnapshot,
        ...(paginated
          ? {
              p_limit: pageSize,
              p_offset: (currentPage - 1) * pageSize,
            }
          : {}),
      };

      const { data: result, error: rpcError } = await supabase.rpc(rpcName, rpcParams);

      if (!isMountedRef.current) return;

      if (rpcError) {
        setError(`Gagal memuat data. ${rpcError.message}`);
        setData([]);
        setTotalCount(0);
      } else {
        setData(result || []);
        setTotalCount(result?.[0]?.total_count ?? result?.length ?? 0);
      }

      setIsLoading(false);
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpcName, paramsJson, pageSize, paginated, currentPage, enabled, refreshTick]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Public API: change page with clamping
  const setPage = useCallback(
    (page) => {
      const clamped = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(clamped);
    },
    [totalPages]
  );

  // Public API: re-trigger the fetch without changing any other state
  const refresh = useCallback(() => {
    setRefreshTick((tick) => tick + 1);
  }, []);

  return {
    data,
    totalCount,
    totalPages,
    currentPage,
    isLoading,
    error,
    setPage,
    refresh,
  };
}

export default useRpcQuery;
