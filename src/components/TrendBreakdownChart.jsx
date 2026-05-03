import React, { useMemo } from 'react';
import { BarChart, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

const TrendBreakdownChart = ({ expenses, startDate, endDate }) => {
    const formatRupiah = (value) => new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0 
    }).format(value || 0);

    // Calculate trend data per month
    const trendData = useMemo(() => {
        const monthlyData = {};
        
        expenses.forEach(expense => {
            const monthKey = format(parseISO(expense.tanggal), 'yyyy-MM');
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { total: 0, byCategory: {} };
            }
            monthlyData[monthKey].total += Number(expense.jumlah || 0);
            
            const category = expense.category || 'Lainnya';
            if (!monthlyData[monthKey].byCategory[category]) {
                monthlyData[monthKey].byCategory[category] = 0;
            }
            monthlyData[monthKey].byCategory[category] += Number(expense.jumlah || 0);
        });

        return Object.entries(monthlyData)
            .map(([month, data]) => ({
                month,
                monthLabel: format(parseISO(month + '-01'), 'MMM yyyy', { locale: id }),
                total: data.total,
                byCategory: data.byCategory
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }, [expenses]);

    // Calculate breakdown data per category
    const breakdownData = useMemo(() => {
        const categoryData = {};
        const totalAmount = expenses.reduce((sum, e) => sum + Number(e.jumlah || 0), 0);
        
        expenses.forEach(expense => {
            const category = expense.category || 'Lainnya';
            if (!categoryData[category]) {
                categoryData[category] = { amount: 0, count: 0 };
            }
            categoryData[category].amount += Number(expense.jumlah || 0);
            categoryData[category].count += 1;
        });

        return Object.entries(categoryData)
            .map(([category, data]) => ({
                category,
                amount: data.amount,
                count: data.count,
                percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [expenses]);

    const maxTrendValue = Math.max(...trendData.map(d => d.total), 1);

    return (
        <div className="space-y-5">
            {/* Trend Chart */}
            <div className="glassmorphic-card p-5">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold text-gray-800">Trend Pengeluaran per Bulan</h3>
                </div>
                
                {trendData.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Tidak ada data untuk ditampilkan</p>
                ) : (
                    <div className="space-y-3">
                        {trendData.map((item, index) => {
                            const barWidth = (item.total / maxTrendValue) * 100;
                            return (
                                <div key={index} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-gray-700">{item.monthLabel}</span>
                                        <span className="font-bold text-red-600">{formatRupiah(item.total)}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div 
                                            className="bg-gradient-to-r from-red-400 to-red-600 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                    {/* Top 3 categories for this month */}
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {Object.entries(item.byCategory)
                                            .sort((a, b) => b[1] - a[1])
                                            .slice(0, 3)
                                            .map(([cat, amount]) => (
                                                <span key={cat} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                                    {cat}: {formatRupiah(amount)}
                                                </span>
                                            ))
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Breakdown Chart */}
            <div className="glassmorphic-card p-5">
                <div className="flex items-center gap-2 mb-4">
                    <PieChartIcon className="w-5 h-5 text-green-500" />
                    <h3 className="font-bold text-gray-800">Breakdown per Kategori</h3>
                </div>
                
                {breakdownData.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Tidak ada data untuk ditampilkan</p>
                ) : (
                    <div className="space-y-3">
                        {breakdownData.map((item, index) => {
                            const colors = [
                                'from-blue-400 to-blue-600',
                                'from-green-400 to-green-600',
                                'from-yellow-400 to-yellow-600',
                                'from-purple-400 to-purple-600',
                                'from-pink-400 to-pink-600',
                                'from-indigo-400 to-indigo-600',
                                'from-red-400 to-red-600',
                                'from-orange-400 to-orange-600',
                                'from-teal-400 to-teal-600',
                                'from-cyan-400 to-cyan-600'
                            ];
                            const colorClass = colors[index % colors.length];
                            
                            return (
                                <div key={index} className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-700">{item.category}</span>
                                            <span className="text-xs text-gray-500">({item.count} transaksi)</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-gray-900">{formatRupiah(item.amount)}</span>
                                            <span className="text-xs text-gray-500 ml-2">({item.percentage.toFixed(1)}%)</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                        <div 
                                            className={`bg-gradient-to-r ${colorClass} h-full rounded-full transition-all duration-500`}
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrendBreakdownChart;