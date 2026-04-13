import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const ITEMS_PER_PAGE = 10;

const RankingMarketing = () => {
  const [rankings, setRankings] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const loadRankings = async () => {
    const { data, error } = await supabase.from('transactions').select('marketing_name, cash_amount, transfer_amount');
    if (error) {
      console.error("Error fetching rankings:", error);
      return;
    }
    
    const marketingStats = data.reduce((acc, t) => {
      const name = t.marketing_name;
      if (!name) return acc;
      if (!acc[name]) {
        acc[name] = { nama: name, jumlahTransaksi: 0, totalPemasukan: 0 };
      }
      acc[name].jumlahTransaksi++;
      acc[name].totalPemasukan += (t.cash_amount || 0) + (t.transfer_amount || 0);
      return acc;
    }, {});

    const rankingArray = Object.values(marketingStats).sort((a, b) => b.jumlahTransaksi - a.jumlahTransaksi);
    setRankings(rankingArray);
    setCurrentPage(1);
  };
  
  useEffect(() => {
    loadRankings();
    const interval = setInterval(loadRankings, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

  const getMedalIcon = (rank) => {
    if (rank === 0) return <Trophy className="w-8 h-8 text-yellow-400" />;
    if (rank === 1) return <Medal className="w-7 h-7 text-gray-400" />;
    if (rank === 2) return <Award className="w-7 h-7 text-orange-600" />;
    return <span className="text-2xl font-bold text-gray-600">#{rank + 1}</span>;
  };

  const getCardGradient = (rank) => {
    if (rank === 0) return 'from-yellow-400 via-amber-400 to-orange-500';
    if (rank === 1) return 'from-gray-300 via-gray-400 to-gray-500';
    if (rank === 2) return 'from-orange-400 via-amber-600 to-orange-700';
    return 'from-blue-400 via-purple-400 to-pink-400';
  };

  const totalPages = Math.max(1, Math.ceil(rankings.length / ITEMS_PER_PAGE));
  const paginatedRankings = rankings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-pink-100 p-4 pt-6 pb-28">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-red-500 text-white px-6 py-3 rounded-full shadow-2xl mb-2">
            <Trophy className="w-6 h-6 animate-bounce" />
            <h1 className="text-xl font-extrabold">Ranking Marketing</h1>
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 p-3 rounded-2xl"><Users className="w-6 h-6 text-white" /></div>
              <div>
                <p className="text-sm text-gray-600">Total Marketing</p>
                <p className="text-2xl font-extrabold text-gray-800">{rankings.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-500 p-3 rounded-2xl"><TrendingUp className="w-6 h-6 text-white" /></div>
              <div>
                <p className="text-sm text-gray-600">Total Transaksi</p>
                <p className="text-2xl font-extrabold text-gray-800">{rankings.reduce((sum, r) => sum + r.jumlahTransaksi, 0)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {rankings.length > 0 ? (
          <div className="space-y-4">
            {paginatedRankings.map((marketing, index) => {
              const absoluteIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
              return (
              <motion.div
                key={marketing.nama}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.2 + index * 0.1 } }}
                className={`bg-gradient-to-r ${getCardGradient(absoluteIndex)} rounded-3xl shadow-2xl p-5 text-white`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl">{getMedalIcon(absoluteIndex)}</div>
                    <h3 className="font-extrabold text-lg">{marketing.nama}</h3>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Jumlah Transaksi</span>
                    <span className="text-2xl font-extrabold">{marketing.jumlahTransaksi}</span>
                  </div>
                  <div className="h-px bg-white/30"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Total Pemasukan</span>
                    <span className="text-lg font-bold">{formatRupiah(marketing.totalPemasukan)}</span>
                  </div>
                </div>
              </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500 pt-10">Belum ada data transaksi.</p>
        )}
        {rankings.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between rounded-2xl bg-white/80 p-3">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Sebelumnya
            </button>
            <p className="text-xs font-semibold text-gray-700">Halaman {currentPage} / {totalPages}</p>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              Berikutnya <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default RankingMarketing;