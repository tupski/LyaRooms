import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useRpcQuery } from '@/hooks/useRpcQuery';
import { SectionCard, SectionSkeleton, SectionError, SectionEmpty } from './shared';
import { formatRupiah, formatTanggal } from '@/utils/analyticsFormatters';
import PaginationControls from '@/components/PaginationControls';

/**
 * Tooltip kustom untuk line chart Tren Pendapatan Harian.
 * Menampilkan tanggal (`formatTanggal`), total pendapatan (`formatRupiah`),
 * dan jumlah transaksi.
 */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0]?.payload ?? {};
  return (
    <div className="rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-800">{formatTanggal(label)}</p>
      <p className="mt-1 text-gray-600">
        Pendapatan:{' '}
        <span className="font-semibold text-gray-800">
          {formatRupiah(point.total_revenue)}
        </span>
      </p>
      <p className="text-gray-600">
        Transaksi:{' '}
        <span className="font-semibold text-gray-800">
          {point.transaction_count ?? 0}
        </span>
      </p>
    </div>
  );
}

/**
 * DailyRevenueTrendSection — Laporan Tren Pendapatan Harian
 *
 * Menampilkan line chart tren pendapatan harian dan tabel ringkasan per hari
 * berdasarkan filter tanggal dan lokasi.
 *
 * @param {{ filter: { startDate: string, endDate: string, location: string|null } }} props
 */
function DailyRevenueTrendSection({ filter }) {
  const { startDate, endDate, location } = filter ?? {};

  const { data, totalCount, totalPages, currentPage, isLoading, error, setPage } = useRpcQuery({
    rpcName: 'get_daily_revenue_trend',
    params: {
      p_start_date: startDate,
      p_end_date: endDate,
      p_location: location ?? null,
    },
    pageSize: 10,
    paginated: true,
  });

  if (isLoading) return <SectionSkeleton />;
  if (error) return <SectionError name="Tren Pendapatan Harian" message={error} />;
  if (!data.length) return <SectionEmpty message="Tidak ada data untuk periode ini" />;

  // RPC mengurutkan DESC (terbaru → terlama). Untuk line chart, lebih baik
  // ditampilkan ASC (kiri = lebih lama, kanan = lebih baru).
  const chartData = [...data].reverse();

  return (
    <SectionCard title="Tren Pendapatan Harian">
      {/* Line chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 24, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="transaction_date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatTanggal(value)}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) =>
              new Intl.NumberFormat('id-ID', {
                notation: 'compact',
                compactDisplay: 'short',
              }).format(value ?? 0)
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="total_revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
              <th className="py-2 pr-4 font-semibold">Tanggal</th>
              <th className="py-2 pr-4 font-semibold text-right">Total Pendapatan</th>
              <th className="py-2 pr-4 font-semibold text-right">Jumlah Transaksi</th>
              <th className="py-2 font-semibold text-right">Rata-rata per Transaksi</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={`${row.transaction_date}-${idx}`}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-2 pr-4 font-medium text-gray-800">
                  {formatTanggal(row.transaction_date)}
                </td>
                <td className="py-2 pr-4 text-right text-gray-800">
                  {formatRupiah(row.total_revenue)}
                </td>
                <td className="py-2 pr-4 text-right text-gray-800">
                  {row.transaction_count ?? 0}
                </td>
                <td className="py-2 text-right text-gray-800">
                  {formatRupiah(row.avg_revenue_per_transaction)}
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

export default DailyRevenueTrendSection;
