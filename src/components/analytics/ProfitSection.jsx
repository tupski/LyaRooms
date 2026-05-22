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
import { formatRupiah } from '@/utils/analyticsFormatters';

/**
 * Color palette untuk slice pie chart Profit per Lokasi.
 * Dipilih agar kontras antar lokasi tetap jelas dan dicycle untuk lokasi >6.
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
 * ProfitSection — Laporan Profit per Lokasi
 *
 * Menampilkan pie chart total pendapatan per lokasi, ringkasan total keseluruhan
 * di atas tabel, dan tabel detail dengan total pendapatan, jumlah transaksi,
 * dan rata-rata per transaksi. Tidak menggunakan pagination (RPC mengembalikan
 * seluruh hasil agregat per lokasi sekaligus).
 *
 * @param {{ filter: { startDate: string, endDate: string, location: string|null } }} props
 */
function ProfitSection({ filter }) {
  const { startDate, endDate, location } = filter ?? {};

  const { data, isLoading, error } = useRpcQuery({
    rpcName: 'get_profit_per_location',
    params: {
      p_start_date: startDate,
      p_end_date: endDate,
      p_location: location ?? null,
    },
    paginated: false,
  });

  if (isLoading) return <SectionSkeleton />;
  if (error) return <SectionError name="Profit per Lokasi" message={error} />;
  if (!data.length) return <SectionEmpty message="Tidak ada data untuk periode ini" />;

  // Sort by total_revenue descending for both chart and table.
  // Note: this is sorting an already-aggregated result set returned by the RPC
  // (one row per lokasi, not raw transaction rows), which is allowed per AGENTS.md.
  const sortedData = [...data].sort(
    (a, b) => Number(b.total_revenue || 0) - Number(a.total_revenue || 0)
  );

  // Grand total revenue across all locations. The RPC returns at most one row
  // per location (capped at the number of distinct lokasi), so summing here is
  // bounded and not equivalent to aggregating raw transaction rows.
  const grandTotalRevenue = sortedData.reduce(
    (sum, d) => sum + Number(d.total_revenue || 0),
    0
  );

  return (
    <SectionCard title="Profit per Lokasi">
      {/* Pie chart total pendapatan per lokasi */}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={sortedData}
            dataKey="total_revenue"
            nameKey="apartment_location"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ apartment_location, total_revenue }) =>
              `${apartment_location}: ${formatRupiah(total_revenue)}`
            }
            labelLine={false}
          >
            {sortedData.map((entry, idx) => (
              <Cell
                key={`slice-${entry.apartment_location}-${idx}`}
                fill={SLICE_COLORS[idx % SLICE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [formatRupiah(value), 'Total Pendapatan']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Ringkasan total keseluruhan pendapatan */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-blue-900">
          Total Pendapatan Keseluruhan
        </span>
        <span className="text-base font-bold text-blue-900">
          {formatRupiah(grandTotalRevenue)}
        </span>
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
              <th className="py-2 pr-4 font-semibold">Lokasi</th>
              <th className="py-2 pr-4 font-semibold text-right">Total Pendapatan</th>
              <th className="py-2 pr-4 font-semibold text-right">Jumlah Transaksi</th>
              <th className="py-2 font-semibold text-right">Rata-rata per Transaksi</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => (
              <tr
                key={`${row.apartment_location}-${idx}`}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-2 pr-4 font-medium text-gray-800">
                  {row.apartment_location}
                </td>
                <td className="py-2 pr-4 text-right text-gray-800">
                  {formatRupiah(row.total_revenue)}
                </td>
                <td className="py-2 pr-4 text-right text-gray-800">
                  {row.total_transactions}
                </td>
                <td className="py-2 text-right text-gray-800">
                  {formatRupiah(row.avg_revenue_per_transaction)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export default ProfitSection;
