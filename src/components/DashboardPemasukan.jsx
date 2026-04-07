import React, { useState, useEffect, useCallback } from 'react';
    import { motion } from 'framer-motion';
    import { TrendingUp, Calendar, Share2, Edit, Trash2, UserCheck, Image as ImageIcon, Download, Lock } from 'lucide-react';
    import { toast } from '@/components/ui/use-toast';
    import { Button } from '@/components/ui/button';
    import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
    import { supabase } from '@/lib/customSupabaseClient';
    import EditTransaksiModal from '@/components/EditTransaksiModal';
    import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
    import * as XLSX from 'xlsx';
    import PinInput from '@/components/PinInput';
    
    const DashboardPemasukan = () => {
      const [filterType, setFilterType] = useState('harian');
      const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
      const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
      const [startTime, setStartTime] = useState('00:00');
      const [endTime, setEndTime] = useState('23:59');
      const [lokasi, setLokasi] = useState('semua');
      const [shift, setShift] = useState('semua');
      const [transaksiList, setTransaksiList] = useState([]);
      const [stats, setStats] = useState({ tunai: 0, transfer: 0, total: 0, jumlahTransaksi: 0, transaksiHariIni: 0 });
      const [lokasiOptions, setLokasiOptions] = useState(['Semua Lokasi']);
      const [editingTransaksi, setEditingTransaksi] = useState(null);
      const [showPinModal, setShowPinModal] = useState(false);
      const [pendingEdit, setPendingEdit] = useState(null);
    
      const loadTransaksi = useCallback(async () => {
        let fromDate, toDate;
        
        switch (filterType) {
            case 'harian':
                fromDate = startOfDay(new Date(startDate));
                toDate = endOfDay(new Date(startDate));
                break;
            case 'bulanan':
                const monthDate = new Date(startDate);
                fromDate = startOfMonth(monthDate);
                toDate = endOfMonth(monthDate);
                break;
            case 'rentang':
                fromDate = new Date(`${startDate}T${startTime}:00`);
                toDate = new Date(`${endDate}T${endTime}:59`);
                break;
            default:
                fromDate = startOfDay(new Date());
                toDate = endOfDay(new Date());
        }
    
        let query = supabase.from('transactions').select('*')
          .gte('created_at', fromDate.toISOString())
          .lte('created_at', toDate.toISOString());
    
        if (lokasi !== 'semua') query = query.eq('apartment_location', lokasi);
        if (shift !== 'semua') query = query.eq('shift', shift);
    
        const { data: filteredData, error } = await query;
        if (error) {
          console.error("Error fetching transactions:", error);
          return;
        }
    
        const totalTunai = filteredData.reduce((sum, t) => sum + (t.cash_amount || 0), 0);
        const totalTransfer = filteredData.reduce((sum, t) => sum + (t.transfer_amount || 0), 0);
    
        setStats(prev => ({
          ...prev,
          tunai: totalTunai,
          transfer: totalTransfer,
          total: totalTunai + totalTransfer,
          jumlahTransaksi: filteredData.length,
        }));
        
        setTransaksiList(filteredData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }, [filterType, startDate, endDate, startTime, endTime, lokasi, shift]);
    
      const loadInitialData = async () => {
        const { data: lokasiData } = await supabase.from('lokasi_apartemen').select('name');
        if (lokasiData) setLokasiOptions(['Semua Lokasi', ...lokasiData.map(l => l.name)]);
        
        const { count, error } = await supabase.from('transactions').select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay(new Date()).toISOString())
          .lt('created_at', endOfDay(new Date()).toISOString());
        
        if (!error) setStats(prev => ({...prev, transaksiHariIni: count }));
      };
    
      useEffect(() => {
        loadInitialData();
      }, []);
    
      useEffect(() => {
        loadTransaksi();
        const channel = supabase.channel('realtime-dashboard')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, loadTransaksi)
          .subscribe();
        return () => { supabase.removeChannel(channel); };
      }, [loadTransaksi]);
    
      const handleEditClick = (transaksi) => {
        setPendingEdit(transaksi);
        setShowPinModal(true);
      };
    
      const handlePinComplete = (pin) => {
        if (pin === '232325') {
          setShowPinModal(false);
          setEditingTransaksi(pendingEdit);
          setPendingEdit(null);
          toast({ title: "Akses diberikan", className: "bg-green-500 text-white" });
        } else {
          setShowPinModal(false);
          toast({ title: "PIN Salah", variant: "destructive" });
        }
      };
    
      const handleDelete = async (id) => {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) {
          toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "✅ Transaksi dihapus" });
          loadTransaksi();
        }
      };
    
      const handleSaveEdit = async (updatedTransaksi) => {
        const { id, ...updateData } = updatedTransaksi;
        const { error } = await supabase.from('transactions').update(updateData).eq('id', id);
        if (error) {
          toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "✅ Transaksi diperbarui" });
          setEditingTransaksi(null);
          loadTransaksi();
        }
      };
      
      const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
      const formatDateTime = (iso) => new Date(iso).toLocaleString('id-ID');
      const getCurrentDate = () => new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
      const handleShare = async (transaksi) => {
        const total = (transaksi.cash_amount || 0) + (transaksi.transfer_amount || 0);
        const message = `*TRANSAKSI KAKARAMA GROUP*\n-------------------\n*Customer:* ${transaksi.customer_name}\n*Marketing:* ${transaksi.marketing_name}\n*Lokasi:* ${transaksi.apartment_location} - ${transaksi.room_number}\n*Waktu:* ${formatDateTime(transaksi.created_at)}\n*Sewa:* ${transaksi.rental_duration} (${transaksi.shift})\n*Total Bayar:* ${formatRupiah(total)}\n  - Tunai: ${formatRupiah(transaksi.cash_amount || 0)}\n  - Transfer: ${formatRupiah(transaksi.transfer_amount || 0)} ${transaksi.transfer_to ? `(ke ${transaksi.transfer_to})` : ''}\n-------------------\nDiinput oleh: ${transaksi.diinputoleh || '-'}`;
        
        try {
            await navigator.clipboard.writeText(message);
            toast({
              title: "Pesan disalin!",
              description: "Buka WhatsApp dan tempel (paste) pesan. Jangan lupa lampirkan gambarnya!",
            });
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
        } catch (error) {
          toast({ title: "Gagal membagikan", description: "Silakan coba lagi.", variant: "destructive" });
        }
      };
    
      const handleExport = () => {
        const dataToExport = transaksiList.map(t => ({
            'Waktu Transaksi': formatDateTime(t.created_at),
            'Nama Customer': t.customer_name,
            'Nama Marketing': t.marketing_name,
            'Lokasi': t.apartment_location,
            'Kamar': t.room_number,
            'Lama Sewa': t.rental_duration,
            'Shift': t.shift,
            'Tunai': t.cash_amount,
            'Transfer': t.transfer_amount,
            'Total': (t.cash_amount || 0) + (t.transfer_amount || 0),
            'Fee Marketing': t.marketing_fee,
            'Diinput Oleh': t.diinputoleh,
        }));
    
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");
        XLSX.writeFile(workbook, `Laporan_Transaksi_${startDate}_${endDate}.xlsx`);
      };
    
      return (
        <>
          <Dialog open={showPinModal} onOpenChange={setShowPinModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Lock/> Akses Terbatas</DialogTitle>
                <DialogDescription>Masukkan PIN untuk mengubah data transaksi.</DialogDescription>
              </DialogHeader>
              <PinInput onComplete={handlePinComplete} />
            </DialogContent>
          </Dialog>
          {editingTransaksi && <EditTransaksiModal transaksi={editingTransaksi} onClose={() => setEditingTransaksi(null)} onSave={handleSaveEdit} />}
          <div className="min-h-screen p-4 pt-6 pb-28">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto space-y-5">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-full shadow-lg mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <h1 className="text-xl font-bold">Ringkasan Pemasukan</h1>
                </div>
                <p className="text-gray-700 text-sm font-medium">{getCurrentDate()}</p>
              </div>
    
              <div className="glassmorphic-card p-5 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-500" /> Filter Data</h2>
                    <Button onClick={handleExport} size="sm" variant="outline" className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200">
                        <Download className="w-4 h-4 mr-2" /> Ekspor
                    </Button>
                </div>
                <div className="flex gap-2">
                  {['harian', 'bulanan', 'rentang'].map((tab) => <button key={tab} onClick={() => setFilterType(tab)} className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold ${filterType === tab ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-gray-100 text-gray-900'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>)}
                </div>
                
                {filterType === 'harian' && <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border-2 text-gray-900" />}
                {filterType === 'bulanan' && <input type="month" value={format(new Date(startDate), 'yyyy-MM')} onChange={(e) => setStartDate(`${e.target.value}-01`)} className="w-full px-4 py-2.5 rounded-xl border-2 text-gray-900" />}
                {filterType === 'rentang' && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-2 text-gray-900" />
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-2 text-gray-900" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                                <label className="absolute -top-2 left-3 bg-white/10 px-1 text-xs text-gray-600">Jam Mulai</label>
                                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-2 py-2.5 rounded-xl border-2 text-gray-900 text-sm" />
                            </div>
                            <div className="relative">
                                <label className="absolute -top-2 left-3 bg-white/10 px-1 text-xs text-gray-600">Jam Akhir</label>
                                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-2 py-2.5 rounded-xl border-2 text-gray-900 text-sm" />
                            </div>
                        </div>
                    </div>
                )}
    
                <div className="grid grid-cols-2 gap-3">
                  <select value={lokasi} onChange={(e) => setLokasi(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-2 bg-white text-sm text-gray-900">{lokasiOptions.map((lok) => (<option key={lok} value={lok === 'Semua Lokasi' ? 'semua' : lok}>{lok}</option>))}</select>
                  <select value={shift} onChange={(e) => setShift(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-2 bg-white text-sm text-gray-900">{['Semua Shift', 'Pagi', 'Malam', 'Long Shift'].map((s) => (<option key={s} value={s === 'Semua Shift' ? 'semua' : s}>{s}</option>))}</select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 glassmorphic-card p-5">
                    <h3 className="font-bold text-lg text-blue-900">Total Transaksi Hari Ini</h3>
                    <p className="text-3xl font-extrabold text-blue-700">{stats.transaksiHariIni} <span className="text-lg">transaksi</span></p>
                </div>
                <div className="glassmorphic-card p-5">
                    <h3 className="font-bold text-lg text-green-900">Tunai (Filter)</h3>
                    <p className="text-3xl font-extrabold text-green-700">{formatRupiah(stats.tunai)}</p>
                </div>
                <div className="glassmorphic-card p-5">
                    <h3 className="font-bold text-lg text-cyan-900">Transfer (Filter)</h3>
                    <p className="text-3xl font-extrabold text-cyan-700">{formatRupiah(stats.transfer)}</p>
                </div>
              </div>
              <div className="glassmorphic-card p-5">
                <h3 className="font-bold text-lg text-red-900">Total Pemasukan (Filter)</h3>
                <p className="text-3xl font-extrabold text-red-700">{formatRupiah(stats.total)}</p>
                <p className="text-sm mt-1">{stats.jumlahTransaksi} total transaksi</p>
              </div>
              
              <div className="glassmorphic-card p-5">
                <h2 className="font-bold text-gray-800 mb-4">Detail Transaksi</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {transaksiList.map((transaksi) => (
                      <div key={transaksi.id} className="bg-white/70 border rounded-2xl p-4">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-gray-800">{transaksi.customer_name}</h3>
                            <p className="text-lg font-extrabold text-orange-600">{formatRupiah((transaksi.cash_amount || 0) + (transaksi.transfer_amount || 0))}</p>
                        </div>
                        <div className="text-xs text-gray-700 space-y-1 mb-3 border-t border-b py-2">
                          <p>Lokasi: {transaksi.apartment_location} - Kamar {transaksi.room_number}</p>
                          <p>Sewa: {transaksi.rental_duration} ({transaksi.shift})</p>
                          <p>Waktu: {formatDateTime(transaksi.created_at)}</p>
                          {transaksi.marketing_name && <p>Marketing: {transaksi.marketing_name}</p>}
                          {transaksi.marketing_fee > 0 && <p>Fee: {formatRupiah(transaksi.marketing_fee)}</p>}
                          {transaksi.diinputoleh && <p><UserCheck className="w-3 h-3 inline mr-1" /> Diinput oleh: {transaksi.diinputoleh}</p>}
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="text-xs space-y-1">
                              {(transaksi.cash_amount || 0) > 0 && (<p className="text-green-600 font-semibold">💵 Tunai: {formatRupiah(transaksi.cash_amount)}</p>)}
                              {(transaksi.transfer_amount || 0) > 0 && (<p className="text-blue-600 font-semibold">💳 Transfer: {formatRupiah(transaksi.transfer_amount)} {transaksi.transfer_to ? `(ke ${transaksi.transfer_to})` : ''}</p>)}
                            </div>
                            <div className="flex gap-1">
                                {transaksi.transfer_proof_url && (
                                    <Dialog>
                                        <DialogTrigger asChild><Button size="icon" variant="outline" className="h-8 w-8"><ImageIcon className="w-4 h-4"/></Button></DialogTrigger>
                                        <DialogContent className="bg-black/80"><img src={transaksi.transfer_proof_url} alt="Bukti Transfer" className="rounded-lg w-full" /></DialogContent>
                                    </Dialog>
                                )}
                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleEditClick(transaksi)}><Edit className="w-4 h-4" /></Button>
                                <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDelete(transaksi.id)}><Trash2 className="w-4 h-4" /></Button>
                                <Button size="icon" onClick={() => handleShare(transaksi)} className="h-8 w-8 bg-green-500"><Share2 className="w-4 h-4" /></Button>
                            </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      );
    };
    
    export default DashboardPemasukan;