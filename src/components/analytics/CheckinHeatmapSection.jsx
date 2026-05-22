import React from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useRpcQuery } from '@/hooks/useRpcQuery';
import { SectionCard, SectionSkeleton, SectionError, SectionEmpty } from './shared';
import { formatPersen } from '@/utils/analyticsFormatters';

const NORMAL_COLOR = '#3b82f6';
const HIGHLIGHT_COLOR = '#f59e0b';

/**
 * Format jam (0–23) menjadi label "HH:00".
 *
 * @param {number} hour
 * @returns {string}
 */
const formatHour = (hour) => `${String(hour).padStart(2, '0')}:00`;

/**
 * CheckinHeatmapSection — Laporan Jam Check-in Paling Ramai
 *
 * Menampilkan bar chart vertikal 24 jam (00:00–23:00) dan tabel jumlah
 * transaksi serta persentase per jam. Bar dengan transaction_count tertinggi
 * (termasuk tie) disorot dengan warna berbeda menggunakan `Cell`.
 *
 * @param {{ filter: { startDate: string, endDate: string, location: string|null } }} props
 */
function CheckinHeatmapSection({ filter }) {
  const { startDate, endDate, location } = filter ?? {};

  const { data, isLoading, error } = useRpcQuery({
    rpcName: 'get_checkin_heatmap',
    params: {
      p_start_date: startDate,
      p_end_date: endDate,
      p_location: location ?? null,
    },
    paginated: false,
  });

  if (isLoading) return <SectionSkeleton />;
  if (error) return <SectionError name="Jam Check-in Ramai" message={error} />;

  // RPC selalu mengembalikan 24 baris (jam 0–23). Section dianggap "kosong"
  // hanya jika tidak ada baris atau semua transaction_count = 0.
  const hasAnyTransaction = data.some((row) => Number(row.transaction_count) > 0);
  if (!data.length || !hasAnyTransaction) {
    return <SectionEmpty message="Tidak ada data check-in untuk periode ini" />;
  }

  // Pastikan urutan jam 0..23 untuk chart dan tabel.
  const sortedData = [...data].sort((a, b) => Number(a.hour) - Number(b.hour));

  // Cari nilai transaction_count maksimum (untuk highlight, termasuk tie).
  const maxCount = sortedData.reduce(
    (max, row) => Math.max(max, Number(row.transaction_count) || 0),
    0
  );

  // Siapkan data chart dengan label jam yang diformat.
  const chartData = sortedData.map((row) => ({
    ...row,
    hourLabel: formatHour(Number(row.hour)),
  }));

  return (
    <SectionCard title="Jam Check-in Ramai">
      {/* Bar chart vertikal — sumbu X jam, sumbu Y jumlah transaksi */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 24, left: 8, bottom: 24 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="hourLabel"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value) => [value, 'Jumlah Transaksi']}
            labelFormatter={(label) => `Jam: ${label}`}
          />
          <Bar dataKey="transaction_count" radius={[4, 4, 0, 0]}>
            {chartData.map((row, idx) => {
              const isHighlight =
                maxCount > 0 && Number(row.transaction_count) === maxCount;
              return (
                <Cell
                  key={`cell-${idx}`}
                  fill={isHighlight ? HIGHLIGHT_COLOR : NORMAL_COLOR}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
              <th className="py-2 pr-4 font-semibold">Jam</th>
              <th className="py-2 pr-4 font-semibold text-right">Jumlah Transaksi</th>
              <th className="py-2 font-semibold text-right">Persentase</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => {
              const hour = Number(row.hour);
              const count = Number(row.transaction_count) || 0;
              const isHighlight = maxCount > 0 && count === maxCount;
              return (
                <tr
                  key={`hour-${hour}`}
                  className={
                    'border-b border-gray-100 transition-colors ' +
                    (isHighlight ? 'bg-amber-50' : 'hover:bg-gray-50')
                  }
                >
                  <td className="py-2 pr-4 font-medium text-gray-800">
                    {formatHour(hour)}
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-800">{count}</td>
                  <td className="py-2 text-right text-gray-800">
                    {formatPersen(row.percentage)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export default CheckinHeatmapSection;
