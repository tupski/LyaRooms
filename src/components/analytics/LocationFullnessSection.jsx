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
import { formatPersen } from '@/utils/analyticsFormatters';

/**
 * LocationFullnessSection — Laporan Lokasi Apartemen yang Sering Penuh
 *
 * Menampilkan bar chart vertikal avg_occupancy_rate per lokasi dan tabel
 * dengan detail occupancy rate, peak occupancy rate, dan total transaksi.
 * Lokasi dengan total_rooms = 0 atau NULL akan menampilkan "-" pada kolom occupancy rate.
 *
 * @param {{ startDate: string, endDate: string, location: string|null }} filter
 */
function LocationFullnessSection({ filter }) {
  const { startDate, endDate, location } = filter ?? {};

  const { data, isLoading, error } = useRpcQuery({
    rpcName: 'get_location_fullness',
    params: {
      p_start_date: startDate,
      p_end_date: endDate,
      p_location: location ?? null,
    },
    paginated: false,
  });

  if (isLoading) return <SectionSkeleton />;
  if (error) return <SectionError name="Lokasi Sering Penuh" message={error} />;
  if (!data.length) return <SectionEmpty message="Tidak ada data untuk periode ini" />;

  // Data sudah diurutkan dari RPC (avg_occupancy_rate DESC NULLS LAST).
  // Untuk chart, hanya tampilkan baris dengan avg_occupancy_rate non-null.
  const chartData = data.filter((row) => row.avg_occupancy_rate != null);

  return (
    <SectionCard title="Lokasi Sering Penuh">
      {/* Bar chart vertikal — sumbu X nama lokasi, sumbu Y avg_occupancy_rate (%) */}
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 24, left: 8, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="apartment_location"
              tick={{ fontSize: 12 }}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 'auto']}
            />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Rata-rata Occupancy Rate']}
              labelFormatter={(label) => `Lokasi: ${label}`}
            />
            <Bar dataKey="avg_occupancy_rate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
              <th className="py-2 pr-4 font-semibold">Lokasi</th>
              <th className="py-2 pr-4 font-semibold text-right">Total Kamar</th>
              <th className="py-2 pr-4 font-semibold text-right">Rata-rata Occupancy Rate</th>
              <th className="py-2 pr-4 font-semibold text-right">Peak Occupancy Rate</th>
              <th className="py-2 font-semibold text-right">Total Transaksi</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={`${row.apartment_location}-${idx}`}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-2 pr-4 font-medium text-gray-800">
                  {row.apartment_location}
                </td>
                <td className="py-2 pr-4 text-right text-gray-800">
                  {row.total_rooms ?? 0}
                </td>
                <td className="py-2 pr-4 text-right text-gray-800">
                  {formatPersen(row.avg_occupancy_rate)}
                </td>
                <td className="py-2 pr-4 text-right text-gray-800">
                  {formatPersen(row.peak_occupancy_rate)}
                </td>
                <td className="py-2 text-right text-gray-800">
                  {row.total_transactions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export default LocationFullnessSection;
