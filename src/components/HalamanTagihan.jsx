import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
    import { motion, AnimatePresence } from 'framer-motion';
    import { FileText, PlusCircle, Calendar, CheckCircle, History, ChevronDown, Eye, Share2, Trash2, Coins, Search, ArrowUpAZ } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { toast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';
    import { uploadToVercelBlob } from '@/lib/vercelBlobUpload';
    import { resolveStorageUrl } from '@/lib/storageUrl';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { addDays, addMonths, format, endOfMonth, startOfDay, startOfMonth, subDays } from 'date-fns';
    import {
      Dialog,
      DialogContent,
      DialogDescription,
      DialogHeader,
      DialogTitle,
      DialogTrigger,
      DialogFooter,
    } from "@/components/ui/dialog";
    import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
      AlertDialogTrigger,
    } from "@/components/ui/alert-dialog";

    /** Contoh: "18 Apr 2026, 13:20 WIB" — waktu zona Asia/Jakarta. */
    const formatLunasDateTimeWib = (iso) => {
        if (!iso) return '-';
        const d = new Date(iso);
        const core = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Jakarta',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).format(d);
        return `${core} WIB`;
    };
    
    const HalamanTagihan = () => {
        const [activeMenu, setActiveMenu] = useState('bulanan');
        const [refreshKey, setRefreshKey] = useState(0);
        const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
        const [monthlySummary, setMonthlySummary] = useState({ pemasukan: 0, pengeluaran: 0, laba: 0 });
    
        const formatRupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);
    
        const calculateSummary = useCallback(async () => {
            const startDate = startOfMonth(new Date(selectedMonth));
            const endDateExclusive = addMonths(startDate, 1);
    
            const { data: transactions, error: transError } = await supabase.from('transactions').select('cash_amount, transfer_amount')
                .gte('checkin_at', startDate.toISOString()).lt('checkin_at', endDateExclusive.toISOString());
            if (transError) console.error("Error fetching transactions for summary:", transError);
            
            const pemasukan = (transactions || []).reduce((sum, t) => sum + (t.cash_amount || 0) + (t.transfer_amount || 0), 0);
    
            const { data: expenses, error: expenseError } = await supabase.from('pengeluaran').select('jumlah')
                .gte('tanggal', format(startDate, 'yyyy-MM-dd')).lt('tanggal', format(endDateExclusive, 'yyyy-MM-dd'));
            if (expenseError) console.error("Error fetching expenses for summary:", expenseError);
    
            const pengeluaran = (expenses || []).reduce((sum, e) => sum + (e.jumlah || 0), 0);
    
            setMonthlySummary({ pemasukan, pengeluaran, laba: pemasukan - pengeluaran });
        }, [selectedMonth]);
        
        const handleDataUpdate = () => {
            setRefreshKey(prev => prev + 1);
            calculateSummary();
        }
    
        useEffect(() => {
            calculateSummary();
            const realtimeChannel = supabase.channel('public:finance_updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, calculateSummary)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'pengeluaran' }, calculateSummary)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tagihan_bulanan' }, calculateSummary)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tagihan_fee_lunas' }, calculateSummary)
                .subscribe();
    
            return () => { supabase.removeChannel(realtimeChannel); };
        }, [calculateSummary]);
    
        return (
            <div className="min-h-screen p-4 pt-6 pb-28">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto space-y-5">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-full shadow-lg">
                            <FileText className="w-6 h-6" />
                            <h1 className="text-xl font-bold">Menu Finance</h1>
                        </div>
                    </div>
    
                    <div className="glassmorphic-card p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <h2 className="text-gray-800 font-bold">Ringkasan Bulanan</h2>
                            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-white/50 border-gray-300 border-2 rounded-lg px-2 py-1 text-gray-800 text-sm"/>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-green-100 p-2 rounded-lg">
                                <p className="text-xs text-green-800">Pemasukan</p>
                                <p className="text-green-900 font-bold text-sm">{formatRupiah(monthlySummary.pemasukan)}</p>
                            </div>
                            <div className="bg-red-100 p-2 rounded-lg">
                                <p className="text-xs text-red-800">Pengeluaran</p>
                                <p className="text-red-900 font-bold text-sm">{formatRupiah(monthlySummary.pengeluaran)}</p>
                            </div>
                            <div className="bg-blue-100 p-2 rounded-lg">
                                <p className="text-xs text-blue-800">Laba Bersih</p>
                                <p className="text-blue-900 font-bold text-sm">{formatRupiah(monthlySummary.laba)}</p>
                            </div>
                        </div>
                    </div>
    
                    <div className="grid grid-cols-3 gap-2 p-1 rounded-full bg-black/10">
                        <button onClick={() => setActiveMenu('bulanan')} className={`py-2 px-2 rounded-full text-xs font-semibold transition-all duration-300 ${activeMenu === 'bulanan' ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg' : 'text-gray-700'}`}>
                            Tgh. Unit
                        </button>
                        <button onClick={() => setActiveMenu('fee')} className={`py-2 px-2 rounded-full text-xs font-semibold transition-all duration-300 ${activeMenu === 'fee' ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg' : 'text-gray-700'}`}>
                            Tgh. Fee
                        </button>
                        <button onClick={() => setActiveMenu('pengeluaran')} className={`py-2 px-2 rounded-full text-xs font-semibold transition-all duration-300 ${activeMenu === 'pengeluaran' ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg' : 'text-gray-700'}`}>
                            Pengeluaran
                        </button>
                    </div>
    
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${activeMenu}-${refreshKey}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeMenu === 'bulanan' ? <TagihanBulanan onDataUpdate={handleDataUpdate} /> : activeMenu === 'fee' ? <TagihanFee onDataUpdate={handleDataUpdate} /> : <Pengeluaran onDataUpdate={handleDataUpdate} />}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>
        );
    };
    
    const TagihanBulanan = ({ onDataUpdate }) => {
      const { user } = useAuth();
      const [tagihanList, setTagihanList] = useState([]);
      const [paidList, setPaidList] = useState([]);
      const [isFormOpen, setIsFormOpen] = useState(false);
      const [newTagihan, setNewTagihan] = useState({ apartment_location: '', room_number: '', amount: '', due_date: '' });
      const [tagihanKamarOptions, setTagihanKamarOptions] = useState([]);
      const [lokasiOptions, setLokasiOptions] = useState([]);
      const [buktiBayarFile, setBuktiBayarFile] = useState(null);
      const [selectedTagihan, setSelectedTagihan] = useState(null);
      const [showHistory, setShowHistory] = useState(true);
    
      const fetchOptions = async () => {
        const { data: lokasiData } = await supabase.from('lokasi_apartemen').select('name');
        if (lokasiData) setLokasiOptions(lokasiData.map(l => l.name));
        const { data: kamarData } = await supabase.from('nomor_kamar').select('name, lokasi');
        if (kamarData) setTagihanKamarOptions(kamarData);
      };
      
      const loadData = useCallback(async () => {
        const { data: storedTagihan, error: unpaidError } = await supabase.from('tagihan_bulanan').select('*').eq('status', 'unpaid');
        if (unpaidError) console.error("Error fetching unpaid bills:", unpaidError);
    
        const { data: storedPaid, error: paidError } = await supabase.from('tagihan_bulanan').select('*').eq('status', 'paid');
        if (paidError) console.error("Error fetching paid bills:", paidError);
        
        if (storedPaid) setPaidList(storedPaid.sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at)));
    
        if (storedTagihan) {
          const sortedTagihan = storedTagihan.map(tagihan => {
            const dueDate = new Date(tagihan.due_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { ...tagihan, diffDays };
          }).sort((a, b) => a.diffDays - b.diffDays);
          setTagihanList(sortedTagihan);
        }
      }, []);
    
      useEffect(() => {
        fetchOptions();
        loadData();
        const channel = supabase.channel('public:tagihan_bulanan').on('postgres_changes', { event: '*', schema: 'public', table: 'tagihan_bulanan' }, loadData).subscribe();
        return () => supabase.removeChannel(channel);
      }, [loadData]);
      
      const formatRupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);
      const deformatRupiah = (value) => String(value).replace(/[^0-9]/g, '');
      
      const handleInputChange = (field, value) => {
        if (field === 'amount') {
          const numericValue = deformatRupiah(value);
          setNewTagihan(prev => ({ ...prev, [field]: numericValue ? new Intl.NumberFormat('id-ID').format(numericValue) : '' }));
        } else {
          setNewTagihan(prev => ({ ...prev, [field]: value }));
        }
      };
    
      const handleAddTagihan = async () => {
        if (!newTagihan.apartment_location || !newTagihan.room_number || !newTagihan.amount || !newTagihan.due_date) {
          toast({ title: "Data tidak lengkap!", variant: "destructive" });
          return;
        }
        const { error } = await supabase.from('tagihan_bulanan').insert({
          ...newTagihan,
          amount: deformatRupiah(newTagihan.amount),
          user_id: user.id,
          status: 'unpaid'
        });
        
        if (error) {
          toast({ title: "Gagal menambahkan", description: error.message, variant: "destructive" });
        } else {
          setIsFormOpen(false);
          setNewTagihan({ apartment_location: '', room_number: '', amount: '', due_date: '' });
          toast({ title: "✅ Tagihan berhasil ditambahkan!" });
          onDataUpdate();
        }
      };
    
      const handleMarkAsPaid = async () => {
        if (!selectedTagihan) return;
        
        let proof_url = null;
        if (buktiBayarFile) {
          try {
            proof_url = await uploadToVercelBlob(buktiBayarFile, 'tagihan-proofs');
          } catch (uploadError) {
            toast({ title: "Gagal upload bukti", description: uploadError.message, variant: "destructive" });
            return;
          }
        }
        
        const { error: rpcError } = await supabase.rpc('pay_tagihan_bulanan', {
          p_tagihan_id: selectedTagihan.id,
          p_proof_url: proof_url,
        });

        if (rpcError) {
          toast({ title: "Gagal menandai lunas", description: rpcError.message, variant: "destructive" });
        } else {
          toast({ title: "🎉 Lunas!", description: "Tagihan telah dipindahkan ke riwayat dan dicatat di pengeluaran." });
          setSelectedTagihan(null);
          setBuktiBayarFile(null);
          onDataUpdate();
        }
      };
      
      const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
      
      const handleDelete = async (id) => {
        const { error } = await supabase.from('tagihan_bulanan').delete().eq('id', id);
        if (error) {
          toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
        } else {
          toast({title: "Tagihan dihapus"});
          onDataUpdate();
        }
      }
      
      const filteredKamarOptions = newTagihan.apartment_location ? tagihanKamarOptions.filter(k => k.lokasi === newTagihan.apartment_location) : [];
    
      return (
        <div className="space-y-5">
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
              <Button className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold py-6 text-base rounded-2xl shadow-lg">
              <PlusCircle className="mr-2 h-5 w-5" /> Tambah Tagihan
              </Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
              <DialogHeader><DialogTitle>Form Tagihan Baru</DialogTitle><DialogDescription>Isi data tagihan baru lalu simpan.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi Apartemen</label>
                  <select value={newTagihan.apartment_location} onChange={(e) => handleInputChange('apartment_location', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-2 text-gray-900">
                    <option value="">Pilih Lokasi</option>
                    {lokasiOptions.map((lok, i) => <option key={i} value={lok}>{lok}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nomor Kamar</label>
                  <select value={newTagihan.room_number} onChange={(e) => handleInputChange('room_number', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-2 text-gray-900" disabled={!newTagihan.apartment_location}>
                    <option value="">Pilih Kamar</option>
                    {filteredKamarOptions.map((k, i) => <option key={i} value={k.name}>{k.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah Tagihan</label>
                  <input type="text" placeholder="Rp 0" value={newTagihan.amount} onChange={(e) => handleInputChange('amount', e.target.value)} inputMode="text" className="w-full px-4 py-3 rounded-xl border-2 text-gray-900"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Jatuh Tempo</label>
                  <input type="date" value={newTagihan.due_date} onChange={(e) => handleInputChange('due_date', e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 text-gray-900"/>
                </div>
              </div>
              <DialogFooter><Button onClick={handleAddTagihan} className="w-full bg-cyan-500 hover:bg-cyan-600">Simpan Tagihan</Button></DialogFooter>
          </DialogContent>
          </Dialog>
    
          <div className="glassmorphic-card p-5 space-y-4">
            <h2 className="font-bold text-lg text-gray-800">Daftar Tagihan Aktif</h2>
            {tagihanList.length === 0 ? (<p className="text-center text-gray-500 py-8">Tidak ada tagihan aktif. 🎉</p>) : (
              tagihanList.map(tagihan => {
                const isOverdue = tagihan.diffDays < 0;
                const isDueSoon = tagihan.diffDays >= 0 && tagihan.diffDays <= 7;
                let statusClasses = 'bg-green-100 text-green-800';
                if (isOverdue) statusClasses = 'bg-red-100 text-red-800';
                else if (isDueSoon) statusClasses = 'bg-yellow-100 text-yellow-800';
                return (
                  <motion.div key={tagihan.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/50 p-4 rounded-2xl shadow-sm border relative">
                    <AlertDialog><AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7 text-red-500"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger><AlertDialogContent className="bg-white"><AlertDialogHeader><AlertDialogTitle>Hapus Tagihan?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(tagihan.id)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                    <h3 className="font-bold text-gray-900">{tagihan.apartment_location} - Kamar {tagihan.room_number}</h3>
                    <p className="text-lg font-bold text-blue-600">{formatRupiah(tagihan.amount)}</p>
                    <div className={`text-xs font-bold px-2 py-1 rounded-full ${statusClasses} inline-block mt-2`}>
                        {isOverdue ? `Terlambat ${Math.abs(tagihan.diffDays)} hari` : `${tagihan.diffDays} hari lagi`}
                    </div>
                    <div className="flex justify-between items-end mt-3 border-t pt-3">
                      <p className="text-sm text-gray-600"><Calendar className="w-4 h-4 inline" /> {formatDate(tagihan.due_date)}</p>
                      <AlertDialog><AlertDialogTrigger asChild><Button size="sm" className="bg-green-500" onClick={() => setSelectedTagihan(tagihan)}><CheckCircle className="mr-2 h-4 w-4"/> Lunas</Button></AlertDialogTrigger><AlertDialogContent className="bg-white"><AlertDialogHeader><AlertDialogTitle>Konfirmasi Lunas</AlertDialogTitle><AlertDialogDescription>Upload bukti bayar (opsional).</AlertDialogDescription></AlertDialogHeader><div className="py-2"><input type="file" onChange={(e) => setBuktiBayarFile(e.target.files[0])} className="w-full text-sm text-gray-700 file:text-blue-600"/></div><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleMarkAsPaid} className="bg-green-600">Tandai Lunas</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
    
          <div className="glassmorphic-card p-5 space-y-4">
              <button onClick={() => setShowHistory(!showHistory)} className="w-full flex justify-between items-center p-1">
                  <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><History className="w-5 h-5"/>Riwayat Lunas</h2>
                  <ChevronDown className={`w-5 h-5 transition-transform text-gray-800 ${showHistory ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
              {showHistory && (
                  <motion.div initial={{height: 0, opacity: 0}} animate={{height: 'auto', opacity: 1}} exit={{height: 0, opacity: 0}} className="mt-4 space-y-3 overflow-hidden">
                      {paidList.length > 0 ? paidList.map(item => (
                          <motion.div key={item.id} layout initial={{opacity: 0}} animate={{opacity: 1}} className="bg-white/50 p-4 rounded-2xl relative">
                              <AlertDialog><AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7 text-red-500"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger><AlertDialogContent className="bg-white"><AlertDialogHeader><AlertDialogTitle>Hapus Riwayat?</AlertDialogTitle><AlertDialogDescription>Data riwayat lunas ini akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                              <p className="font-bold text-gray-900">{item.apartment_location} - {item.room_number}</p>
                              <p className="text-blue-700 font-semibold">{formatRupiah(item.amount)}</p>
                              <p className="text-xs text-gray-500">Lunas: {formatLunasDateTimeWib(item.paid_at)}</p>
                              <div className="flex justify-between items-center mt-2">
                                {item.proof_url && (<Dialog><DialogTrigger asChild><Button variant="link" className="text-blue-600 p-0 h-auto"><Eye className="w-4 h-4 mr-1"/> Lihat Bukti</Button></DialogTrigger><DialogContent className="bg-black/80"><DialogHeader><DialogTitle className="text-white">Bukti Pembayaran</DialogTitle><DialogDescription className="text-gray-300">Pratinjau bukti pembayaran tagihan bulanan.</DialogDescription></DialogHeader><img src={resolveStorageUrl(item.proof_url)} alt="Bukti bayar" className="rounded-lg" /></DialogContent></Dialog>)}
                              </div>
                          </motion.div>
                      )) : <p className="text-center text-gray-500 py-4">Belum ada riwayat.</p>}
                  </motion.div>
              )}
              </AnimatePresence>
          </div>
        </div>
      )
    };
    
    const getFeeRangeYesterday = () => {
        const y = subDays(startOfDay(new Date()), 1);
        const d = format(y, 'yyyy-MM-dd');
        return { from: d, to: d };
    };
    const getFeeRangeLast7Days = () => {
        const end = startOfDay(new Date());
        const start = subDays(end, 6);
        return { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') };
    };
    const getFeeRangeThisMonth = () => {
        const now = new Date();
        return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
    };
    const getFeeRangeLastMonth = () => {
        const now = new Date();
        const firstThisMonth = startOfMonth(now);
        const lastDayPrev = subDays(firstThisMonth, 1);
        const startPrev = startOfMonth(lastDayPrev);
        return { from: format(startPrev, 'yyyy-MM-dd'), to: format(endOfMonth(startPrev), 'yyyy-MM-dd') };
    };

    const TagihanFee = ({ onDataUpdate }) => {
        const [unpaidFees, setUnpaidFees] = useState([]);
        const [paidFees, setPaidFees] = useState([]);
        const [showHistory, setShowHistory] = useState(true);
        const [uploadFile, setUploadFile] = useState(null);
        const [feeDateFrom, setFeeDateFrom] = useState(() => getFeeRangeLast7Days().from);
        const [feeDateTo, setFeeDateTo] = useState(() => getFeeRangeLast7Days().to);
        const [feePreset, setFeePreset] = useState('last7');
        const [isPayModalOpen, setIsPayModalOpen] = useState(false);
        const [modalMarketing, setModalMarketing] = useState(null);
        const [pendingPayAction, setPendingPayAction] = useState(null); // { type: 'single'|'all', marketingName, transactions: [], totalFee }
        const [confirmOpen, setConfirmOpen] = useState(false);
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [searchTerm, setSearchTerm] = useState('');
        const [sortOrder, setSortOrder] = useState('highest'); // 'highest' | 'lowest' | 'name'
        const feeHistorySectionRef = useRef(null);
    
        const formatRupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

        const lunasRowTouchesTransactionIds = (row, txIdSet) => {
            const raw = row?.transactions_detail;
            let arr = [];
            if (Array.isArray(raw)) arr = raw;
            else if (typeof raw === 'string') {
                try {
                    const parsed = JSON.parse(raw);
                    arr = Array.isArray(parsed) ? parsed : [];
                } catch {
                    return false;
                }
            }
            return arr.some((elem) => {
                const id = Number(elem?.transaction_id);
                return Number.isFinite(id) && txIdSet.has(id);
            });
        };
        
        const applyFeePreset = useCallback((preset) => {
            let r;
            if (preset === 'yesterday') r = getFeeRangeYesterday();
            else if (preset === 'last7') r = getFeeRangeLast7Days();
            else if (preset === 'thisMonth') r = getFeeRangeThisMonth();
            else if (preset === 'lastMonth') r = getFeeRangeLastMonth();
            else return;
            setFeeDateFrom(r.from);
            setFeeDateTo(r.to);
            setFeePreset(preset);
        }, []);

        const loadData = useCallback(async () => {
            const startTime = startOfDay(new Date(feeDateFrom));
            const endTimeExclusive = addDays(startOfDay(new Date(feeDateTo)), 1);
    
            const { data: transactions, error: transError } = await supabase.from('transactions').select('*')
                .gte('checkin_at', startTime.toISOString()).lt('checkin_at', endTimeExclusive.toISOString());
            if (transError) console.error(transError);

            const txIds = (transactions || []).map((t) => t.id).filter((id) => id != null);
            const txIdSet = new Set(txIds);

            let paidTransactionIds = new Set();
            if (txIds.length > 0) {
              const { data: paidItems, error: paidItemsError } = await supabase
                .from('tagihan_fee_lunas_items')
                .select('transaction_id, marketing_name')
                .in('transaction_id', txIds);
              if (paidItemsError) console.error(paidItemsError);
              paidTransactionIds = new Set((paidItems || []).map((p) => p.transaction_id));
            }

            let paidFeesFiltered = [];
            if (txIds.length > 0) {
              const { data: lunasRows, error: lunasError } = await supabase
                .from('tagihan_fee_lunas')
                .select('*')
                .order('paid_at', { ascending: false })
                .limit(500);
              if (lunasError) console.error(lunasError);
              paidFeesFiltered = (lunasRows || []).filter((row) => lunasRowTouchesTransactionIds(row, txIdSet));
            }
            setPaidFees(paidFeesFiltered);
    
            const marketingSummary = (transactions || []).reduce((acc, curr) => {
                if (!curr.marketing_name || !curr.marketing_fee || curr.marketing_fee <= 0) {
                    return acc;
                }
                
                const feeAmount = Number(curr.marketing_fee);
                if (!acc[curr.marketing_name]) {
                    acc[curr.marketing_name] = { nama: curr.marketing_name, count: 0, totalFee: 0, transactions: [] };
                }
                if (paidTransactionIds.has(curr.id)) {
                  return acc;
                }
                acc[curr.marketing_name].count += 1;
                acc[curr.marketing_name].totalFee += feeAmount;
                acc[curr.marketing_name].transactions.push({
                  transaction_id: curr.id,
                  customer: curr.customer_name,
                  location: curr.apartment_location,
                  fee: feeAmount,
                });
                return acc;
            }, {});
    
            const unpaidFeeArray = Object.values(marketingSummary).filter(fee => fee.count > 0);
            setUnpaidFees(unpaidFeeArray);
        }, [feeDateFrom, feeDateTo]);
    
        useEffect(() => {
            loadData();
            const channel = supabase.channel('public:tagihan_fee')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, loadData)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'tagihan_fee_lunas' }, loadData)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'tagihan_fee_lunas_items' }, loadData)
              .subscribe();
            return () => supabase.removeChannel(channel);
        }, [loadData]);
    
        const openPayModal = (fee) => {
          setModalMarketing(fee);
          setIsPayModalOpen(true);
          setUploadFile(null);
        };

        const requestConfirmPay = ({ type, marketingName, transactions }) => {
          const totalFee = (transactions || []).reduce((sum, t) => sum + Number(t.fee || 0), 0);
          setPendingPayAction({ type, marketingName, transactions, totalFee });
          setConfirmOpen(true);
        };

        const executePay = async () => {
          if (!pendingPayAction || isSubmitting) return;
          const { marketingName, transactions } = pendingPayAction;

          setIsSubmitting(true);
          try {
            let proof_url = null;
            if (uploadFile) {
              try {
                proof_url = await uploadToVercelBlob(uploadFile, 'fee-proofs');
              } catch (uploadError) {
                toast({ title: "Gagal upload bukti", description: uploadError.message, variant: "destructive" });
                return;
              }
            }

            const transactionIds = (transactions || []).map((t) => t.transaction_id);
            const { data: rpcData, error: rpcError } = await supabase.rpc('pay_fee_items', {
              p_marketing_name: marketingName,
              p_transaction_ids: transactionIds,
              p_proof_url: proof_url,
            });

            if (rpcError) {
              toast({ title: "Gagal menyimpan pembayaran", description: rpcError.message, variant: "destructive" });
              return;
            }

            const inserted = rpcData?.items_inserted ?? transactions.length;
            toast({ title: "Pembayaran fee berhasil ✅", description: `${marketingName} • ${inserted} customer` });

            setConfirmOpen(false);
            setPendingPayAction(null);
            setUploadFile(null);
            setIsPayModalOpen(false);
            setModalMarketing(null);
            setShowHistory(true);
            await loadData();
            requestAnimationFrame(() => {
              feeHistorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            onDataUpdate();
          } finally {
            setIsSubmitting(false);
          }
        };
        
        const handleDelete = async (id) => {
          const { error } = await supabase.from('tagihan_fee_lunas').delete().eq('id', id);
          if (error) {
            toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
          } else {
            toast({title: "Riwayat fee dihapus"});
            onDataUpdate();
          }
        }
    
        const handleShare = async (item) => {
            let details = (item.transactions_detail || item.transactions || []).map((t, i) => `${i + 1}. ${t.customer} - ${t.location}`).join('\n');
            const totalFee = item.total_fee ?? item.totalFee ?? 0;
            const customerCount = item.customer_count ?? item.count ?? 0;
            const marketingName = item.marketing_name ?? item.nama ?? 'Unknown';
            const paidAt = item.paid_at ? `\n\nLunas: ${formatLunasDateTimeWib(item.paid_at)}` : '';
    
            const message = `*Rincian Fee*\n-------------------\n*Marketing:* ${marketingName}\n*Total Fee:* ${formatRupiah(totalFee)}\n*Jumlah Customer:* ${customerCount} orang\n\n*Detail Customer:*\n${details}${paidAt}`;
    
            try {
                await navigator.clipboard.writeText(message);
                toast({
                    title: "Pesan disalin!",
                    description: "Buka WhatsApp, tempel pesan, dan lampirkan bukti bayar jika ada.",
                });
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
            } catch (error) {
                toast({ title: "Gagal membagikan", variant: "destructive" });
            }
        };
    
        const feeRangeLabel = useMemo(() => {
          if (feeDateFrom === feeDateTo) return feeDateFrom;
          return `${feeDateFrom} – ${feeDateTo}`;
        }, [feeDateFrom, feeDateTo]);

        const processedFees = useMemo(() => {
          let result = [...unpaidFees];
          
          // Filter search
          if (searchTerm) {
            result = result.filter(f => f.nama.toLowerCase().includes(searchTerm.toLowerCase()));
          }
          
          // Sort
          result.sort((a, b) => {
            if (sortOrder === 'highest') return b.totalFee - a.totalFee;
            if (sortOrder === 'lowest') return a.totalFee - b.totalFee;
            if (sortOrder === 'name') return a.nama.localeCompare(b.nama);
            return 0;
          });
          
          return result;
        }, [unpaidFees, searchTerm, sortOrder]);

        return (
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-xl font-black tracking-tight uppercase">Tagihan Fee Marketing</h1>
                        <p className="text-blue-100 text-xs mt-1">Kelola dan bayar komisi marketing secara kolektif.</p>
                    </div>
                </div>

                <div className="glassmorphic-card p-5 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Coins className="text-blue-500 shrink-0"/> Tagihan Fee</h2>
                      </div>
                      <p className="text-xs text-slate-500">Filter menurut tanggal check-in transaksi.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant={feePreset === 'yesterday' ? 'default' : 'outline'} size="sm" className="h-8 text-xs rounded-lg" onClick={() => applyFeePreset('yesterday')}>Kemarin</Button>
                        <Button type="button" variant={feePreset === 'last7' ? 'default' : 'outline'} size="sm" className="h-8 text-xs rounded-lg" onClick={() => applyFeePreset('last7')}>7 hari terakhir</Button>
                        <Button type="button" variant={feePreset === 'thisMonth' ? 'default' : 'outline'} size="sm" className="h-8 text-xs rounded-lg" onClick={() => applyFeePreset('thisMonth')}>Bulan ini</Button>
                        <Button type="button" variant={feePreset === 'lastMonth' ? 'default' : 'outline'} size="sm" className="h-8 text-xs rounded-lg" onClick={() => applyFeePreset('lastMonth')}>Bulan kemarin</Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                          <span className="text-xs font-medium text-slate-600 shrink-0">Dari</span>
                          <input
                            type="date"
                            value={feeDateFrom}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFeePreset('custom');
                              setFeeDateFrom(v);
                              if (v > feeDateTo) setFeeDateTo(v);
                            }}
                            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-900 outline-none"
                          />
                        </label>
                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                          <span className="text-xs font-medium text-slate-600 shrink-0">Sampai</span>
                          <input
                            type="date"
                            value={feeDateTo}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFeePreset('custom');
                              setFeeDateTo(v);
                              if (v < feeDateFrom) setFeeDateFrom(v);
                            }}
                            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-900 outline-none"
                          />
                        </label>
                      </div>
                    </div>
                    
                    {/* Search & Sort UI */}
                    <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-100">
                      <div className="relative group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                          type="text" 
                          placeholder="Cari marketing..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full text-xs bg-slate-50 border-2 border-slate-200 rounded-xl pl-8 pr-2 py-2.5 outline-none focus:border-blue-400 focus:bg-white transition-all shadow-sm"
                        />
                      </div>
                      <select 
                        value={sortOrder} 
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="text-xs bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-blue-400"
                      >
                        <option value="highest">Fee Tertinggi</option>
                        <option value="lowest">Fee Terendah</option>
                        <option value="name">Nama (A-Z)</option>
                      </select>
                    </div>

                    {processedFees.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        {searchTerm ? 'Marketing tidak ditemukan.' : 'Semua fee pada periode ini sudah lunas! 🎉'}
                      </p>
                    ) : (
                        processedFees.map((fee) => (
                        <motion.div key={fee.nama} layout className="bg-white/50 border p-4 rounded-2xl">
                            <h3 className="font-bold text-gray-900 text-lg">{fee.nama}</h3>
                            <p className="text-gray-700">Jumlah Customer: <span className="font-semibold text-gray-900">{fee.count} orang</span></p>
                            <p className="text-gray-700">Total Fee: <span className="font-bold text-xl text-blue-600">{formatRupiah(fee.totalFee)}</span></p>
                            <div className="mt-4 border-t pt-4">
                              <Button
                                size="sm"
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={() => openPayModal(fee)}
                              >
                                Bayar Fee {fee.nama}
                              </Button>
                            </div>
                        </motion.div>
                        ))
                    )}
                </div>

                {/* Modal pembayaran per customer */}
                <Dialog open={isPayModalOpen} onOpenChange={(open) => { setIsPayModalOpen(open); if (!open) { setModalMarketing(null); setUploadFile(null); } }}>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Bayar Fee Marketing</DialogTitle>
                      <DialogDescription>
                        {modalMarketing?.nama ? `Marketing: ${modalMarketing.nama} • Periode: ${feeRangeLabel}` : 'Pilih marketing untuk membayar fee.'}
                      </DialogDescription>
                    </DialogHeader>

                    {modalMarketing?.transactions?.length ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border bg-slate-50 p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700">Sisa customer</span>
                            <span className="font-bold text-slate-900">{modalMarketing.transactions.length}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-slate-700">Total sisa fee</span>
                            <span className="font-bold text-blue-700">{formatRupiah(modalMarketing.totalFee)}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {modalMarketing.transactions.map((t) => (
                            <div key={t.transaction_id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">{t.customer}</p>
                                <p className="truncate text-xs text-slate-600">{t.location}</p>
                                <p className="text-xs font-semibold text-blue-700">{formatRupiah(t.fee)}</p>
                              </div>
                              <Button
                                size="sm"
                                className="shrink-0 bg-green-600 hover:bg-green-700"
                                onClick={() => requestConfirmPay({ type: 'single', marketingName: modalMarketing.nama, transactions: [t] })}
                              >
                                Bayar
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2 border-t pt-3">
                          <label className="block text-sm font-semibold text-slate-700">Bukti bayar (opsional)</label>
                          <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files[0])} className="w-full text-sm text-gray-700 file:text-blue-600"/>
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={() => requestConfirmPay({ type: 'all', marketingName: modalMarketing.nama, transactions: modalMarketing.transactions })}
                          >
                            Bayar Semua
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="py-6 text-center text-sm text-slate-600">Tidak ada customer yang belum dibayar.</p>
                    )}
                  </DialogContent>
                </Dialog>

                {/* Konfirmasi pembayaran */}
                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Konfirmasi Pembayaran</AlertDialogTitle>
                      <AlertDialogDescription>
                        Apakah Anda sudah bayar fee untuk marketing {pendingPayAction?.marketingName || '-'}?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isSubmitting} onClick={() => { setConfirmOpen(false); setPendingPayAction(null); }}>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={executePay} disabled={isSubmitting} className="bg-green-600">
                        {isSubmitting ? 'Memproses...' : 'Bayar'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <div ref={feeHistorySectionRef} className="glassmorphic-card p-5 space-y-4">
                    <button onClick={() => setShowHistory(!showHistory)} className="w-full flex justify-between items-center p-1">
                        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><History className="w-5 h-5"/>Riwayat Fee Lunas</h2>
                        <ChevronDown className={`w-5 h-5 transition-transform text-gray-800 ${showHistory ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                    {showHistory && (
                        <motion.div initial={{height: 0, opacity: 0}} animate={{height: 'auto', opacity: 1}} exit={{height: 0, opacity: 0}} className="mt-4 space-y-3 overflow-hidden">
                            {paidFees.length > 0 ? paidFees.map(item => (
                                <motion.div key={item.id} layout className="bg-white/50 border p-4 rounded-2xl relative">
                                    <AlertDialog><AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7 text-red-500"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger><AlertDialogContent className="bg-white"><AlertDialogHeader><AlertDialogTitle>Hapus Riwayat?</AlertDialogTitle><AlertDialogDescription>Riwayat fee lunas ini akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                                    <p className="font-bold text-lg text-gray-900">{item.marketing_name}</p>
                                    <p className="text-blue-700 font-semibold">{formatRupiah(item.total_fee)} ({item.customer_count} CS)</p>
                                    <p className="text-xs text-gray-500">Lunas: {formatLunasDateTimeWib(item.paid_at)}</p>
                                    <div className="flex gap-2 items-center mt-2">
                                        {item.proof_url && (<Dialog><DialogTrigger asChild><Button variant="link" className="text-blue-600 p-0 h-auto"><Eye className="w-4 h-4 mr-1"/>Lihat Bukti</Button></DialogTrigger><DialogContent className="bg-black/80"><DialogHeader><DialogTitle className="text-white">Bukti Pembayaran Fee</DialogTitle><DialogDescription className="text-gray-300">Pratinjau bukti pembayaran fee marketing.</DialogDescription></DialogHeader><img src={resolveStorageUrl(item.proof_url)} alt={`Bukti bayar ${item.marketing_name}`} className="rounded-lg w-full" /></DialogContent></Dialog>)}
                                        <Button size="icon" onClick={() => handleShare(item)} className="h-7 w-7 bg-green-500"><Share2 className="w-4 h-4" /></Button>
                                    </div>
                                </motion.div>
                            )) : <p className="text-center text-gray-500 py-4">Belum ada riwayat lunas untuk periode ini.</p>}
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>
            </div>
        );
    };
    
    const Pengeluaran = ({ onDataUpdate }) => {
        const { user } = useAuth();
        const [expenses, setExpenses] = useState([]);
        const [isFormOpen, setIsFormOpen] = useState(false);
        const [newExpense, setNewExpense] = useState({ nama_pengeluaran: '', jumlah: '', tanggal: format(new Date(), 'yyyy-MM-dd'), keterangan: '' });
        const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
        const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    
    
        const formatRupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);
        const deformatRupiah = (value) => String(value).replace(/[^0-9]/g, '');
    
        const loadData = useCallback(async () => {
            let query = supabase.from('pengeluaran').select('*').order('tanggal', { ascending: false });
    
            if (startDate) query = query.gte('tanggal', startDate);
            if (endDate) query = query.lte('tanggal', endDate);
    
            const { data, error } = await query;
            if (error) console.error("Error fetching expenses:", error);
            else setExpenses(data);
        }, [startDate, endDate]);
    
        useEffect(() => {
            loadData();
            const channel = supabase.channel('public:pengeluaran').on('postgres_changes', { event: '*', schema: 'public', table: 'pengeluaran' }, loadData).subscribe();
            return () => supabase.removeChannel(channel);
        }, [loadData]);
    
        const handleInputChange = (field, value) => {
            if (field === 'jumlah') {
                const numericValue = deformatRupiah(value);
                setNewExpense(prev => ({ ...prev, [field]: numericValue ? new Intl.NumberFormat('id-ID').format(numericValue) : '' }));
            } else {
                setNewExpense(prev => ({ ...prev, [field]: value }));
            }
        };
    
        const handleAddExpense = async () => {
            if (!newExpense.nama_pengeluaran || !newExpense.jumlah || !newExpense.tanggal) {
                toast({ title: "Data tidak lengkap!", variant: "destructive" });
                return;
            }
            const { error } = await supabase.from('pengeluaran').insert({
                ...newExpense,
                jumlah: deformatRupiah(newExpense.jumlah),
                user_id: user.id,
            });
            if (error) {
                toast({ title: "Gagal menambah pengeluaran", description: error.message, variant: "destructive" });
            } else {
                setIsFormOpen(false);
                setNewExpense({ nama_pengeluaran: '', jumlah: '', tanggal: format(new Date(), 'yyyy-MM-dd'), keterangan: '' });
                toast({ title: "✅ Pengeluaran berhasil dicatat!" });
                onDataUpdate();
            }
        };
    
        const handleDelete = async (id) => {
            const { error } = await supabase.from('pengeluaran').delete().eq('id', id);
            if (error) {
                toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
            } else {
                toast({ title: "Pengeluaran dihapus" });
                onDataUpdate();
            }
        };
    
        return (
            <div className="space-y-5">
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full bg-gradient-to-r from-orange-400 to-red-500 text-white font-bold py-6 text-base rounded-2xl shadow-lg">
                            <PlusCircle className="mr-2 h-5 w-5" /> Catat Pengeluaran
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                        <DialogHeader><DialogTitle>Form Pengeluaran Baru</DialogTitle><DialogDescription>Masukkan detail pengeluaran untuk dicatat ke sistem.</DialogDescription></DialogHeader>
                        <div className="space-y-4 py-4">
                            <input type="text" placeholder="Nama Pengeluaran" value={newExpense.nama_pengeluaran} onChange={(e) => handleInputChange('nama_pengeluaran', e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 text-gray-900" />
                            <input type="text" placeholder="Jumlah (Rp)" value={newExpense.jumlah} onChange={(e) => handleInputChange('jumlah', e.target.value)} inputMode="numeric" className="w-full px-4 py-3 rounded-xl border-2 text-gray-900" />
                            <input type="date" value={newExpense.tanggal} onChange={(e) => handleInputChange('tanggal', e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 text-gray-900" />
                            <textarea placeholder="Keterangan (opsional)" value={newExpense.keterangan} onChange={(e) => handleInputChange('keterangan', e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 text-gray-900 h-24" />
                        </div>
                        <DialogFooter><Button onClick={handleAddExpense} className="w-full bg-red-500 hover:bg-red-600">Simpan</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
    
                <div className="glassmorphic-card p-5 space-y-4">
                    <h2 className="font-bold text-lg text-gray-800">Riwayat Pengeluaran</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                            <label className="absolute -top-2 left-3 bg-white/10 px-1 text-xs text-gray-600">Dari Tanggal</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-2 text-gray-900"/>
                        </div>
                        <div className="relative">
                             <label className="absolute -top-2 left-3 bg-white/10 px-1 text-xs text-gray-600">Sampai Tanggal</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-2 text-gray-900"/>
                        </div>
                    </div>
                    {expenses.length === 0 ? (<p className="text-center text-gray-500 py-8">Belum ada pengeluaran tercatat pada rentang ini.</p>) : (
                        expenses.map(expense => (
                            <motion.div key={expense.id} layout className="bg-white/50 p-4 rounded-2xl shadow-sm border relative">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7 text-red-500"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger>
                                    <AlertDialogContent className="bg-white"><AlertDialogHeader><AlertDialogTitle>Hapus Pengeluaran?</AlertDialogTitle><AlertDialogDescription>Data pengeluaran ini akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(expense.id)} className="bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                </AlertDialog>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-gray-900 pr-8">{expense.nama_pengeluaran}</h3>
                                    <p className="font-bold text-red-600 whitespace-nowrap">{formatRupiah(expense.jumlah)}</p>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{format(new Date(expense.tanggal), 'dd MMMM yyyy')}</p>
                                {expense.keterangan && <p className="text-sm text-gray-700 mt-2 border-t pt-2">{expense.keterangan}</p>}
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        );
    };
    
    export default HalamanTagihan;