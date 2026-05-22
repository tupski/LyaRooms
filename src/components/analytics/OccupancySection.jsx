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
import { formatRupiah, formatPersen } from '@/utils/analyticsFormatters';
import PaginationControls from '@/components/PaginationControls';

/**
 * OccupancySection — Laporan Occupancy per Unit
 *
 * Menampilkan bar chart horizontal dan tabel occupancy rate per kamar
 * berdasarkan filter tanggal dan lokasi yang diberikan.
 *
 * @param {{ startDate: string, endDate: string, location: string|null }} filter
 */
function OccupancySection({ filter }) {
  const { startDate, endDate, location } = filter ?? {};

  const { data, totalCount, totalPages, currentPage, isLoading, error, setPage } = useRpcQuery({
    rpcName: 'get_occupancy_per_unit',
    params: {
      p_start_date: startDate,
      p_end_date: endDate,
      p_location: location ?? null,
    },
    pageSize: 10,
    paginated: true,
  });

  if (isLoading) return <SectionSkeleton />;
  if (error) return <SectionError name="Okupansi per Unit" message={error} />;
  if (!data.length) return <SectionEmpty message="Tidak ada data untuk periode ini" />;

  // Data sudah diurutkan DESC dari RPC (server-side), tidak perlu sort di client
  return (
    <SectionCard title="Okupansi per Unit">
      {/* Bar chart horizontal — sumbu Y nama kamar, sumbu X jumlah transaksi */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <YAxis
            dataKey="room_number"
            type="category"
            width={90}
            tick={{ fontSize: 12 }}
          />
          <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            formatter={(value) => [value, 'Jumlah Transaksi']}
            labelFormatter={(label) => `Kamar: ${label}`}
          />
          <Bar dataKey="total_transactions" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
              <th className="py-2 pr-4 font-semibold">Kamar</th>
              <th className="py-2 pr-4 font-semibold">Lokasi</th>
              <th className="py-2 pr-4 font-semibold text-right">Jumlah Transaksi</th>
              <th className="py-2 pr-4 font-semibold text-right">Total Pendapatan</th>
              <th className="py-2 font-semibold text-right">Occupancy Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={`${row.room_number}-${row.apartment_location}-${idx}`}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-2 pr-4 font-medium text-gray-800">{row.room_number}</td>
                <td className="py-2 pr-4 text-gray-600">{row.apartment_location}</td>
                <td className="py-2 pr-4 text-right text-gray-800">{row.total_transactions}</td>
                <td className="py-2 pr-4 text-right text-gray-800">
                  {formatRupiah(row.total_revenue)}
                </td>
                <td className="py-2 text-right text-gray-800">
                  {formatPersen(row.occupancy_rate)}
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

export default OccupancySection;
