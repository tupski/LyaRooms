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

/**
 * Color palette untuk slice pie chart Durasi Menginap.
 * Dipilih agar kontras antar kategori tetap jelas dan dicycle untuk kategori >6.
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
 * StayDurationSection — Laporan Durasi Menginap
 *
 * Menampilkan pie chart distribusi kategori durasi menginap (Transit - 3 Jam,
 * Transit - Lainnya, Fullday, Per Malam - 1 Malam, Per Malam - 2+ Malam, Lainnya)
 * berdasarkan persentase, dan tabel detail dengan jumlah transaksi, persentase,
 * dan total pendapatan per kategori. Tidak menggunakan pagination (RPC
 * mengembalikan seluruh hasil agregat per kategori sekaligus).
 *
 * @param {{ filter: { startDate: string, endDate: string, location: string|null } }} props
 */
function StayDurationSection({ filter }) {
  const { startDate, endDate, location } = filter ?? {};

  const { data, isLoading, error } = useRpcQuery({
    rpcName: 'get_stay_duration_summary',
    params: {
      p_start_date: startDate,
      p_end_date: endDate,
      p_location: location ?? null,
    },
    paginated: false,
  });

  if (isLoading) return <SectionSkeleton />;
  if (error) return <SectionError name="Durasi Menginap" message={error} />;
  if (!data.length) return <SectionEmpty message="Tidak ada data untuk periode ini" />;

  // Sort by transaction_count descending for consistent chart/table ordering.
  // Note: this sorts an already-aggregated result set (one row per kategori,
  // bukan raw transaction rows), yang diizinkan per AGENTS.md.
  const sortedData = [...data].sort(
    (a, b) => Number(b.transaction_count || 0) - Number(a.transaction_count || 0)
  );

  return (
    <SectionCard title="Durasi Menginap">
      {/* Pie chart distribusi kategori berdasarkan persentase */}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={sortedData}
            dataKey="percentage"
            nameKey="duration_category"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ duration_category, percentage }) =>
              `${duration_category}: ${formatPersen(percentage)}`
            }
            labelLine={false}
          >
            {sortedData.map((entry, idx) => (
              <Cell
                key={`slice-${entry.duration_category}-${idx}`}
                fill={SLICE_COLORS[idx % SLICE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [formatPersen(value), 'Persentase']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
              <th className="py-2 pr-4 font-semibold">Kategori</th>
              <th className="py-2 pr-4 font-semibold text-right">Jumlah Transaksi</th>
              <th className="py-2 pr-4 font-semibold text-right">Persentase</th>
              <th className="py-2 font-semibold text-right">Total Pendapatan</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => (
              <tr
                key={`${row.duration_category}-${idx}`}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-2 pr-4 font-medium text-gray-800">
                  {row.duration_category}
                </td>
                <td className="py-2 pr-4 text-right text-gray-800">
                  {row.transaction_count}
                </td>
                <td className="py-2 pr-4 text-right text-gray-800">
                  {formatPersen(row.percentage)}
                </td>
                <td className="py-2 text-right text-gray-800">
                  {formatRupiah(row.total_revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export default StayDurationSection;
