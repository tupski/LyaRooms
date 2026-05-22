import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useRpcQuery } from '@/hooks/useRpcQuery';
import { SectionCard, SectionSkeleton, SectionError, SectionEmpty } from './shared';
import { formatRupiah, formatPersen } from '@/utils/analyticsFormatters';
import PaginationControls from '@/components/PaginationControls';

/**
 * Color palette untuk slice pie chart Sumber Tamu.
 * Dicycle bila jumlah sumber melebihi panjang palette.
 */
const SLICE_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
];

/**
 * GuestSourceSection — Laporan Sumber Tamu
 *
 * Menampilkan pie chart distribusi tamu per sumber (marketing internal vs OTA
 * vs "Langsung (Tanpa Marketing)") dan tabel detail dengan pagination
 * server-side (10 baris/halaman). Semua agregasi dilakukan di RPC
 * `get_guest_source_summary`.
 *
 * @param {{ filter: { startDate: string, endDate: string, location: string|null } }} props
 */
function GuestSourceSection({ filter }) {
  const { startDate, endDate, location } = filter ?? {};

  const { data, totalCount, totalPages, currentPage, isLoading, error, setPage } = useRpcQuery({
    rpcName: 'get_guest_source_summary',
    params: {
      p_start_date: startDate,
      p_end_date: endDate,
      p_location: location ?? null,
    },
    pageSize: 10,
    paginated: true,
  });

  if (isLoading) return <SectionSkeleton />;
  if (error) return <SectionError name="Sumber Tamu" message={error} />;
  if (!data.length) return <SectionEmpty message="Tidak ada data untuk periode ini" />;

  return (
    <SectionCard title="Sumber Tamu">
      {/* Pie chart distribusi sumber tamu (halaman aktif) */}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="transaction_count"
            nameKey="source_name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ source_name, transaction_count }) =>
              `${source_name}: ${transaction_count}`
            }
            labelLine={false}
          >
            {data.map((entry, idx) => (
              <Cell
                key={`slice-${entry.source_name}-${idx}`}
                fill={SLICE_COLORS[idx % SLICE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [value, 'Jumlah Transaksi']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
              <th className="py-2 pr-4 font-semibold">Sumber</th>
              <th className="py-2 pr-4 font-semibold text-right">Jumlah Transaksi</th>
              <th className="py-2 pr-4 font-semibold text-right">Total Pendapatan</th>
              <th className="py-2 font-semibold text-right">Persentase</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={`${row.source_name}-${idx}`}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-2 pr-4 font-medium text-gray-800">
                  {row.source_name}
                </td>
                <td className="py-2 pr-4 text-right text-gray-800">
                  {row.transaction_count}
                </td>
                <td className="py-2 pr-4 text-right text-gray-800">
                  {formatRupiah(row.total_revenue)}
                </td>
                <td className="py-2 text-right text-gray-800">
                  {formatPersen(row.percentage)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
        itemsPerPage={10}
        totalItems={totalCount}
      />
    </SectionCard>
  );
}

export default GuestSourceSection;
