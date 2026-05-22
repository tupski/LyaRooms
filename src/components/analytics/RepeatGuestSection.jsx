import React from 'react';
import {
  BarChart,
  Bar,
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
 * RepeatGuestSection — Laporan Repeat Guest
 *
 * Menampilkan bar chart horizontal repeat guest (max 20 teratas) dan tabel
 * dengan detail jumlah kunjungan, total pendapatan, kunjungan pertama,
 * dan kunjungan terakhir.
 *
 * Catatan: Data diambil paginated dari RPC dengan pageSize=10 (sudah diurutkan
 * `visit_count` DESC oleh server). Chart merender data halaman aktif dengan
 * batas atas 20 entri (termasuk tie pada posisi ke-20). Karena `pageSize = 10`,
 * batas tersebut tidak akan tercapai dalam praktik, namun logika dipertahankan
 * agar konsisten dengan spesifikasi.
 *
 * @param {{ startDate: string, endDate: string, location: string|null }} filter
 */
function RepeatGuestSection({ filter }) {
  const { startDate, endDate, location } = filter ?? {};

  const { data, totalCount, totalPages, currentPage, isLoading, error, setPage } = useRpcQuery({
    rpcName: 'get_repeat_guests',
    params: {
      p_start_date: startDate,
      p_end_date: endDate,
      p_location: location ?? null,
    },
    pageSize: 10,
    paginated: true,
  });

  if (isLoading) return <SectionSkeleton />;
  if (error) return <SectionError name="Repeat Guest" message={error} />;
  if (!data.length) return <SectionEmpty message="Tidak ada repeat guest untuk periode ini" />;

  // Sort data DESC by visit_count for chart, slice to top 20 (with tie at 20).
  // Server already returns DESC by visit_count, but we re-sort defensively.
  const sortedData = [...data].sort((a, b) => b.visit_count - a.visit_count);

  // Determine threshold visit_count at position 20 to keep ties at the cutoff.
  let chartData;
  if (sortedData.length <= 20) {
    chartData = sortedData;
  } else {
    const thresholdCount = sortedData[19].visit_count;
    chartData = sortedData.filter((row) => row.visit_count >= thresholdCount);
  }

  return (
    <SectionCard title="Repeat Guest">
      {/* Bar chart horizontal — sumbu Y nama tamu, sumbu X jumlah kunjungan */}
      <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 28)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <YAxis
            dataKey="customer_name"
            type="category"
            width={120}
            tick={{ fontSize: 12 }}
          />
          <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            formatter={(value) => [value, 'Jumlah Kunjungan']}
            labelFormatter={(label) => `Tamu: ${label}`}
          />
          <Bar dataKey="visit_count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
              <th className="py-2 pr-4 font-semibold">Nama Tamu</th>
              <th className="py-2 pr-4 font-semibold text-right">Jumlah Kunjungan</th>
              <th className="py-2 pr-4 font-semibold text-right">Total Pendapatan</th>
              <th className="py-2 pr-4 font-semibold">Kunjungan Pertama</th>
              <th className="py-2 font-semibold">Kunjungan Terakhir</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={`${row.customer_name}-${idx}`}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-2 pr-4 font-medium text-gray-800">{row.customer_name}</td>
                <td className="py-2 pr-4 text-right text-gray-800">{row.visit_count}</td>
                <td className="py-2 pr-4 text-right text-gray-800">
                  {formatRupiah(row.total_revenue)}
                </td>
                <td className="py-2 pr-4 text-gray-800">{formatTanggal(row.first_visit)}</td>
                <td className="py-2 text-gray-800">{formatTanggal(row.last_visit)}</td>
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

export default RepeatGuestSection;
