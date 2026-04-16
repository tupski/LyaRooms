import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle, Clock, Upload, ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';

const ManajemenDeposit = () => {
  const [tabDeposit, setTabDeposit] = useState('belum'); // 'belum', 'sudah'
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [fileBukti, setFileBukti] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadDeposits = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('id, customer_name, room_number, apartment_location, deposit_cash, deposit_transfer, created_at, deposit_returned_at, deposit_refund_proof_url, marketing_name, input_by')
      .or('deposit_cash.gt.0,deposit_transfer.gt.0')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Gagal memuat deposit', description: error.message, variant: 'destructive' });
    } else {
      setDeposits(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDeposits();
  }, [loadDeposits]);

  const filteredDeposits = useMemo(() => {
    return deposits.filter((t) => {
      if (tabDeposit === 'belum') return t.deposit_returned_at === null;
      return t.deposit_returned_at !== null;
    });
  }, [deposits, tabDeposit]);

  const formatRupiah = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

  const formatTime = (iso) => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const handleReturnDeposit = async () => {
    if (!selectedTx) return;
    setUploading(true);
    let proofUrl = null;

    try {
      if (fileBukti) {
        const fileExt = fileBukti.name.split('.').pop();
        const fileName = `refund-${selectedTx.id}-${Date.now()}.${fileExt}`;
        const filePath = `refund_proofs/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('transaction_receipts').upload(filePath, fileBukti);
        if (uploadError) throw uploadError;
        proofUrl = filePath;
      }

      const { error } = await supabase
        .from('transactions')
        .update({
          deposit_returned_at: new Date().toISOString(),
          deposit_refund_proof_url: proofUrl,
        })
        .eq('id', selectedTx.id);

      if (error) throw error;

      toast({ title: 'Deposit berhasil dikembalikan ✅' });
      setSelectedTx(null);
      setFileBukti(null);
      loadDeposits();
    } catch (err) {
      toast({ title: 'Gagal mengembalikan deposit', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTabDeposit('belum')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            tabDeposit === 'belum' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-amber-700 hover:bg-amber-50'
          }`}
        >
          <Clock className="mb-1 inline h-4 w-4" /> Belum Dikembalikan
        </button>
        <button
          onClick={() => setTabDeposit('sudah')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            tabDeposit === 'sudah' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-green-700 hover:bg-green-50'
          }`}
        >
          <CheckCircle className="mb-1 inline h-4 w-4" /> Dikembalikan
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">Memuat data deposit...</p>
        ) : filteredDeposits.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">Tidak ada deposit di kategori ini.</p>
        ) : (
          filteredDeposits.map((tx) => {
            const totalDep = (tx.deposit_cash || 0) + (tx.deposit_transfer || 0);
            return (
              <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{tx.customer_name}</h3>
                    <p className="text-xs text-slate-500">Kamar {tx.room_number} ({tx.apartment_location})</p>
                    <p className="text-xs text-slate-500">Masuk: {formatTime(tx.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-extrabold ${tabDeposit === 'belum' ? 'text-amber-600' : 'text-green-600'}`}>
                      {formatRupiah(totalDep)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      C: {tx.deposit_cash > 0 ? formatRupiah(tx.deposit_cash) : '-'} | T: {tx.deposit_transfer > 0 ? formatRupiah(tx.deposit_transfer) : '-'}
                    </p>
                  </div>
                </div>

                {tabDeposit === 'belum' && (
                  <Button
                    onClick={() => setSelectedTx(tx)}
                    className="mt-4 w-full bg-amber-500 text-white hover:bg-amber-600 font-bold"
                  >
                    Kembalikan Deposit
                  </Button>
                )}
                {tabDeposit === 'sudah' && (
                  <div className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-xs text-green-800 border border-green-100 flex justify-between items-center">
                    <span>Dikembalikan: {formatTime(tx.deposit_returned_at)}</span>
                    {tx.deposit_refund_proof_url && (
                      <span className="font-semibold text-green-700 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Ada Bukti</span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modal Kembalikan Deposit */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="max-w-sm rounded-3xl bg-white">
          <DialogHeader>
            <DialogTitle>Kembalikan Deposit</DialogTitle>
            <DialogDescription>Customer: {selectedTx?.customer_name}</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4 rounded-xl bg-amber-50 p-3 text-center border border-amber-200">
              <p className="text-xs font-semibold text-amber-700">Total Deposit</p>
              <p className="text-2xl font-extrabold text-amber-600">
                {formatRupiah((selectedTx?.deposit_cash || 0) + (selectedTx?.deposit_transfer || 0))}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Bukti Transfer / Pengembalian (Opsional)</label>
              <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFileBukti(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-amber-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-amber-700 hover:file:bg-amber-100"
                />
              </div>
              {fileBukti && <p className="text-xs text-green-600 font-medium">File terpilih: {fileBukti.name}</p>}
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-center flex-col sm:flex-row">
            <Button variant="outline" className="w-full" onClick={() => { setSelectedTx(null); setFileBukti(null); }} disabled={uploading}>
              Batal
            </Button>
            <Button className="w-full bg-amber-500 hover:bg-amber-600 font-bold text-white" onClick={handleReturnDeposit} disabled={uploading}>
              {uploading ? 'Memproses...' : 'Kembalikan Deposit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManajemenDeposit;
