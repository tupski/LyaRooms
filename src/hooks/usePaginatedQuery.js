import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Custom hook for server-side pagination using Supabase .range() queries.
 *
 * @param {object} options
 * @param {string} options.table - Supabase table name
 * @param {string} [options.select='*'] - Select clause
 * @param {number} [options.pageSize=10] - Items per page
 * @param {string} options.orderBy - Column to order by
 * @param {boolean} [options.ascending=false] - Sort direction
 * @param {Record<string, { op: 'eq'|'gte'|'lte'|'is', value: any, column?: string }>} [options.filters] - Filter conditions (key is used as column name unless explicit `column` property is provided)
 * @param {boolean} [options.enabled=true] - Whether to fetch data
 * @returns {object} Paginated query result
 */
export function usePaginatedQuery({
  table,
  select = '*',
  pageSize: initialPageSize = 10,
  orderBy,
  ascending = false,
  filters: externalFilters,
  enabled = true,
}) {
  const [data, setData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [internalFilters, setInternalFilters] = useState(externalFilters || {});

  const isMountedRef = useRef(true);

  // Use external filters when provided, sync to internal state
  const activeFilters = externalFilters !== undefined ? externalFilters : internalFilters;

  // Stable JSON representation of filters — used as fetchPage dependency
  // so that object identity changes (new literal each render) don't cause
  // infinite re-fetch loops.
  const activeFiltersJson = JSON.stringify(activeFilters || {});
  const activeFiltersJsonRef = useRef(activeFiltersJson);

  // Calculate derived values
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 when filter content changes
  useEffect(() => {
    if (activeFiltersJsonRef.current !== activeFiltersJson) {
      activeFiltersJsonRef.current = activeFiltersJson;
      setCurrentPage(1);
    }
  }, [activeFiltersJson]);

  // Fetch data — depends on serialized filters string, not object reference
  const fetchPage = useCallback(async () => {
    if (!enabled || !table || !orderBy) return;

    setIsLoading(true);
    setError(null);

    const offset = (currentPage - 1) * pageSize;
    // Parse filters from stable JSON string to avoid stale closure issues
    const filtersSnapshot = JSON.parse(activeFiltersJsonRef.current || '{}');

    try {
      let query = supabase
        .from(table)
        .select(select, { count: 'exact' })
        .order(orderBy, { ascending });

      // Apply filters
      if (filtersSnapshot && typeof filtersSnapshot === 'object') {
        Object.entries(filtersSnapshot).forEach(([key, condition]) => {
          if (condition && typeof condition === 'object' && 'op' in condition) {
            const { op, value, column: col } = condition;
            const column = col || key;
            if (value === undefined || (value === null && op !== 'is')) return;

            switch (op) {
              case 'eq':
                query = query.eq(column, value);
                break;
              case 'gte':
                query = query.gte(column, value);
                break;
              case 'lte':
                query = query.lte(column, value);
                break;
              case 'is':
                query = query.is(column, value);
                break;
              case 'not_is_null':
                query = query.not(column, 'is', null);
                break;
              default:
                break;
            }
          }
        });
      }

      // Apply range for pagination
      query = query.range(offset, offset + pageSize - 1);

      const { data: fetchedData, count, error: queryError } = await query;

      if (!isMountedRef.current) return;

      if (queryError) {
        setError('Gagal memuat data. Silakan coba lagi.');
      } else {
        setData(fetchedData || []);
        setTotalItems(count || 0);

        // Empty page fallback: if current page is empty and not page 1, go to previous page
        if (fetchedData?.length === 0 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setError('Gagal memuat data. Silakan coba lagi.');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, pageSize, orderBy, ascending, activeFiltersJson, currentPage, enabled]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Public API: change page size and reset to page 1
  const setPageSize = useCallback((size) => {
    setPageSizeState(size);
    setCurrentPage(1);
  }, []);

  // Public API: set page with clamping
  const setPage = useCallback(
    (page) => {
      const clamped = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(clamped);
    },
    [totalPages]
  );

  // Public API: refresh current page (re-fetch)
  const refresh = useCallback(() => {
    fetchPage();
  }, [fetchPage]);

  // Public API: update filters programmatically (triggers page reset via useEffect)
  const setFilters = useCallback((newFilters) => {
    setInternalFilters(newFilters || {});
  }, []);

  return {
    data,
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    isLoading,
    error,
    setPage,
    setPageSize,
    refresh,
    setFilters,
  };
}

export default usePaginatedQuery;
