import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { AlertTriangle, Image as ImageIcon, Save, Upload, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { uploadToVercelBlob } from '@/lib/vercelBlobUpload';
import { resolveStorageUrl } from '@/lib/storageUrl';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const DURATION_OPTIONS = ['3 JAM', '6 JAM', '9 JAM', '12 JAM', '24 JAM', 'PROMO MALAM', 'Fullday', 'Custom'];
const SHIFT_OPTIONS = ['Pagi', 'Malam', 'Long Shift'];
const TRANSFER_TARGET_OPTIONS = ['Kakarama', 'Marketing'];

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 14,
    borderColor: state.isFocused ? '#0f172a' : '#cbd5e1',
    boxShadow: 'none',
    ':hover': { borderColor: '#334155' },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const formatCurrency = (value) => {
  const numeric = String(value || '').replace(/\D/g, '');
  if (!numeric) return '';
  return new Intl.NumberFormat('id-ID').format(Number(numeric));
};
const parseCurrency = (value) => Number(String(value || '').replace(/\D/g, '')) || 0;

const getRentalHours = (duration, customHours) => {
  if (duration === 'Custom') return Number(customHours) || 1;
  if (duration === 'PROMO MALAM') return 12;
  if (duration === 'Fullday') return 24;
  const matched = duration.match(/\d+/);
  return matched ? Number(matched[0]) : 1;
};

const KaryawanTransaksi = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [refs, setRefs] = useState({ lokasi: [], kamar: [], marketing: [] });
  const [occupiedMap, setOccupiedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewTransaksi, setPreviewTransaksi] = useState(null);
  const [reportTransaksi, setReportTransaksi] = useState(null);
  const [confirmResendTransaksi, setConfirmResendTransaksi] = useState(null);
  const [reportDraft, setReportDraft] = useState(null);
  const [formData, setFormData] = useState({
    namaCustomer: '',
    lokasiApartemen: '',
    nomorKamar: '',
    namaMarketing: '',
    lamaSewa: '',
    customSewaJam: '1',
    shift: '',
    tunai: '',
    transfer: '',
    transferKe: '',
    feeMarketing: '',
    ktpFile: null,
    buktiTransferFile: null,
  });
  const selectPortalTarget = typeof document !== 'undefined' ? document.body : null;
  const ktpInputRef = useRef(null);
  const transferInputRef = useRef(null);

  const getSentMap = () => {
    try {
      return JSON.parse(localStorage.getItem('kr_report_sent_map') || '{}');
    } catch (_e) {
      return {};
    }
  };
  const markSent = (id) => {
    const map = getSentMap();
    map[id] = new Date().toISOString();
    localStorage.setItem('kr_report_sent_map', JSON.stringify(map));
  };

  const lokasiOptions = useMemo(
    () =>
      refs.lokasi.map((item) => {
        const roomsInLocation = refs.kamar.filter((room) => room.lokasi === item.name);
        const availableCount = roomsInLocation.filter((room) => !occupiedMap[`${room.lokasi}__${room.name}`]).length;
        const soldOut = roomsInLocation.length > 0 && availableCount === 0;
        return { value: item.name, label: soldOut ? `${item.name} (Habis)` : item.name, isDisabled: soldOut };
      }),
    [refs.lokasi, refs.kamar, occupiedMap]
  );
  const kamarOptions = useMemo(
    () =>
      refs.kamar
        .filter((item) => item.lokasi === formData.lokasiApartemen)
        .map((item) => {
          const key = `${item.lokasi}__${item.name}`;
          const occupied = Boolean(occupiedMap[key]);
          return { value: item.name, label: occupied ? `${item.name} (Terisi)` : item.name, isDisabled: occupied };
        }),
    [refs.kamar, formData.lokasiApartemen, occupiedMap]
  );
  const marketingOptions = useMemo(() => refs.marketing.map((item) => ({ value: item.name, label: item.name })), [refs.marketing]);

  const handleChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));
  const handleToggleChoice = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: prev[field] === value ? '' : value }));
  };

  const handleCreateMarketing = async (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return;
    const exists = refs.marketing.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      handleChange('namaMarketing', trimmed);
      return;
    }
    const { error } = await supabase.from('marketing_list').insert({ name: trimmed });
    if (error) {
      toast({ title: 'Gagal menambah marketing', description: error.message, variant: 'destructive' });
      return;
    }
    setRefs((prev) => ({ ...prev, marketing: [...prev.marketing, { name: trimmed }] }));
    handleChange('namaMarketing', trimmed);
    toast({ title: 'Marketing baru ditambahkan', description: trimmed });
  };

  const loadTransactions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('id, customer_name, apartment_location, room_number, marketing_name, rental_duration, shift, created_at, input_by, cash_amount, transfer_amount, transfer_to, marketing_fee, ktp_image_url, transfer_proof_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) toast({ title: 'Gagal memuat transaksi', description: error.message, variant: 'destructive' });
    else setTransactions(data || []);
    setLoading(false);
  }, [user]);

  const loadReferences = useCallback(async () => {
    const [{ data: lokasi }, { data: kamar }, { data: marketing }, { data: roomTransactions }] = await Promise.all([
      supabase.from('lokasi_apartemen').select('name').order('name'),
      supabase.from('nomor_kamar').select('name, lokasi').order('name'),
      supabase.from('marketing_list').select('name').order('name'),
      supabase.from('transactions').select('apartment_location, room_number, created_at, rental_duration, checkout_at').order('created_at', { ascending: false }),
    ]);
    setRefs({ lokasi: lokasi || [], kamar: kamar || [], marketing: marketing || [] });
    const activeMap = {};
    (roomTransactions || []).forEach((tx) => {
      if (tx.checkout_at) return;
      const key = `${tx.apartment_location}__${tx.room_number}`;
      if (activeMap[key]) return;
      const endAt = new Date(new Date(tx.created_at).getTime() + (Number(tx.rental_duration) || 1) * 60 * 60 * 1000);
      if (new Date() < endAt) activeMap[key] = true;
    });
    setOccupiedMap(activeMap);
  }, []);

  useEffect(() => {
    loadReferences();
    loadTransactions();
  }, [loadReferences, loadTransactions]);

  const formatDateTime = (iso) => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatRentalDuration = (hours) => {
    if (!hours) return '1 JAM';
    const map = { 3: '3 JAM', 6: '6 JAM', 9: '9 JAM', 12: '12 JAM', 24: '24 JAM' };
    return map[hours] || `${hours} JAM`;
  };

  const buildForwardMessage = (t) =>
    `*LAPORAN TRANSAKSI*\n\nCustomer: ${t.customer_name}\nLokasi: ${t.apartment_location} - ${t.room_number}\nMarketing: ${t.marketing_name || '-'}\nSewa: ${formatRentalDuration(t.rental_duration)} (${t.shift || '-'})\nTunai: Rp ${new Intl.NumberFormat('id-ID').format(t.cash_amount || 0)}\nTransfer: Rp ${new Intl.NumberFormat('id-ID').format(t.transfer_amount || 0)}\nInput oleh: ${t.input_by || '-'}\nWaktu: ${formatDateTime(t.created_at)}`;

  const sendForwardReport = (t, force = false) => {
    const sentAt = getSentMap()[t.id];
    if (sentAt && !force) {
      setConfirmResendTransaksi(t);
      return;
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(buildForwardMessage(t))}`, '_blank');
    markSent(t.id);
  };

  const openReportModal = (t) => {
    setReportDraft({
      customer_name: t.customer_name || '',
      apartment_location: t.apartment_location || '',
      room_number: t.room_number || '',
      marketing_name: t.marketing_name || '',
      rental_duration: formatRentalDuration(t.rental_duration),
      shift: t.shift || '',
      cash_amount: String(t.cash_amount || 0),
      transfer_amount: String(t.transfer_amount || 0),
      transfer_to: t.transfer_to || '',
      marketing_fee: String(t.marketing_fee || 0),
      input_by: t.input_by || user?.email || '',
      alasan: '',
    });
    setReportTransaksi(t);
  };

  const sendIssueReport = () => {
    if (!reportTransaksi || !reportDraft) return;
    const msg = `*LAPOR KESALAHAN TRANSAKSI*\n\nAlasan: ${reportDraft.alasan || '-'}\n\nCustomer: ${reportDraft.customer_name}\nLokasi: ${reportDraft.apartment_location}\nKamar: ${reportDraft.room_number}\nMarketing: ${reportDraft.marketing_name || '-'}\nDurasi Sewa: ${reportDraft.rental_duration}\nShift: ${reportDraft.shift || '-'}\nTunai: Rp ${new Intl.NumberFormat('id-ID').format(Number(reportDraft.cash_amount || 0))}\nTransfer: Rp ${new Intl.NumberFormat('id-ID').format(Number(reportDraft.transfer_amount || 0))}\nTransfer ke: ${reportDraft.transfer_to || '-'}\nFee Marketing: Rp ${new Intl.NumberFormat('id-ID').format(Number(reportDraft.marketing_fee || 0))}\nInput oleh: ${reportDraft.input_by || '-'}\nID Transaksi: ${reportTransaksi.id}`;
    window.open(`https://wa.me/6289613413636?text=${encodeURIComponent(msg)}`, '_blank');
    setReportTransaksi(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user?.id) return;
    const cashAmount = parseCurrency(formData.tunai);
    const transferAmount = parseCurrency(formData.transfer);
    const feeAmount = parseCurrency(formData.feeMarketing);
    if (!formData.namaCustomer || !formData.lokasiApartemen || !formData.nomorKamar || !formData.namaMarketing || !formData.lamaSewa) {
      toast({ title: 'Data wajib belum lengkap', variant: 'destructive' });
      return;
    }
    if (cashAmount <= 0 && transferAmount <= 0) {
      toast({ title: 'Pembayaran kosong', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const [ktpUrl, transferProofUrl] = await Promise.all([
        formData.ktpFile ? uploadToVercelBlob(formData.ktpFile, 'ktp-images') : Promise.resolve(null),
        formData.buktiTransferFile ? uploadToVercelBlob(formData.buktiTransferFile, 'transfer-proofs') : Promise.resolve(null),
      ]);
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        customer_name: formData.namaCustomer.trim(),
        apartment_location: formData.lokasiApartemen,
        room_number: formData.nomorKamar,
        marketing_name: formData.namaMarketing,
        rental_duration: getRentalHours(formData.lamaSewa, formData.customSewaJam),
        shift: formData.shift || null,
        input_by: user?.user_metadata?.full_name || user?.email || 'karyawan',
        cash_amount: cashAmount,
        transfer_amount: transferAmount,
        transfer_to: formData.transferKe || null,
        marketing_fee: feeAmount,
        ktp_image_url: ktpUrl,
        transfer_proof_url: transferProofUrl,
      });
      if (error) throw error;
      toast({ title: 'Transaksi berhasil disimpan' });
      setFormData({
        namaCustomer: '', lokasiApartemen: '', nomorKamar: '', namaMarketing: '', lamaSewa: '', customSewaJam: '1', shift: '',
        tunai: '', transfer: '', transferKe: '', feeMarketing: '', ktpFile: null, buktiTransferFile: null,
      });
      if (ktpInputRef.current) ktpInputRef.current.value = '';
      if (transferInputRef.current) transferInputRef.current.value = '';
      await loadTransactions();
    } catch (error) {
      toast({ title: 'Gagal menyimpan transaksi', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-28 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transaksi Saya</h1>
          <p className="text-sm text-slate-500">Hanya transaksi yang Anda input sendiri.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Input Transaksi Karyawan</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Nama Customer *</label>
              <input value={formData.namaCustomer} onChange={(e) => handleChange('namaCustomer', e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" placeholder="Masukkan nama customer" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Lokasi Apartemen *</label>
              <Select styles={selectStyles} menuPortalTarget={selectPortalTarget} options={lokasiOptions} value={lokasiOptions.find((o) => o.value === formData.lokasiApartemen) || null} onChange={(opt) => { handleChange('lokasiApartemen', opt?.value || ''); handleChange('nomorKamar', ''); }} placeholder="Pilih lokasi apartemen..." isClearable />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Nomor Kamar *</label>
              <Select styles={selectStyles} menuPortalTarget={selectPortalTarget} options={kamarOptions} value={kamarOptions.find((o) => o.value === formData.nomorKamar) || null} onChange={(opt) => handleChange('nomorKamar', opt?.value || '')} placeholder="Pilih nomor kamar..." isDisabled={!formData.lokasiApartemen} isClearable />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Nama Marketing *</label>
              <CreatableSelect
                styles={selectStyles}
                menuPortalTarget={selectPortalTarget}
                options={marketingOptions}
                value={marketingOptions.find((o) => o.value === formData.namaMarketing) || null}
                onChange={(opt) => handleChange('namaMarketing', opt?.value || '')}
                onCreateOption={handleCreateMarketing}
                placeholder="Pilih marketing atau tambah baru..."
                isClearable
                formatCreateLabel={(inputValue) => `Tambah marketing: ${inputValue}`}
              />
            </div>
          </div>

          <label className="block text-sm font-medium text-slate-700">Durasi Sewa</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DURATION_OPTIONS.map((item) => (
              <button key={item} type="button" onClick={() => handleToggleChoice('lamaSewa', item)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${formData.lamaSewa === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>{item}</button>
            ))}
          </div>
          {formData.lamaSewa === 'Custom' && (
            <input
              type="number"
              min={1}
              max={168}
              value={formData.customSewaJam}
              onChange={(e) => handleChange('customSewaJam', e.target.value)}
              className="h-11 rounded-xl border border-slate-300 px-3 text-sm"
              placeholder="Durasi custom (jam)"
            />
          )}
          <label className="block text-sm font-medium text-slate-700">Shift</label>
          <div className="grid grid-cols-3 gap-2">
            {SHIFT_OPTIONS.map((item) => (
              <button key={item} type="button" onClick={() => handleToggleChoice('shift', item)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${formData.shift === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>{item}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Tunai (Rp)</label>
              <input inputMode="numeric" value={formData.tunai} onChange={(e) => handleChange('tunai', formatCurrency(e.target.value))} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" placeholder="0" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Transfer (Rp)</label>
              <input inputMode="numeric" value={formData.transfer} onChange={(e) => handleChange('transfer', formatCurrency(e.target.value))} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" placeholder="0" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Bank Tujuan</label>
              <div className="grid grid-cols-2 gap-2">
                {TRANSFER_TARGET_OPTIONS.map((item) => <button key={item} type="button" onClick={() => handleToggleChoice('transferKe', item)} className={`h-11 rounded-xl border text-sm ${formData.transferKe === item ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}>{item}</button>)}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Fee Marketing (Rp)</label>
              <input inputMode="numeric" value={formData.feeMarketing} onChange={(e) => handleChange('feeMarketing', formatCurrency(e.target.value))} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
              <Upload className="mb-2 h-5 w-5 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Upload KTP</span>
              <span className="text-xs text-slate-500">{formData.ktpFile?.name || 'Pilih file gambar'}</span>
              <input ref={ktpInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleChange('ktpFile', e.target.files?.[0] || null)} />
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
              <Upload className="mb-2 h-5 w-5 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Upload Bukti Transfer</span>
              <span className="text-xs text-slate-500">{formData.buktiTransferFile?.name || 'Pilih file gambar'}</span>
              <input ref={transferInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleChange('buktiTransferFile', e.target.files?.[0] || null)} />
            </label>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700"><Save className="mr-2 h-4 w-4" />{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}</Button>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Riwayat Transaksi</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Memuat transaksi...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada transaksi yang Anda input.</p>
          ) : (
            <div className="space-y-4">
              {transactions.map((t) => {
                const sentAt = getSentMap()[t.id];
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border bg-white/70 p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-800">{t.customer_name}</h3>
                      <p className="text-right text-base font-extrabold text-orange-600">Rp {new Intl.NumberFormat('id-ID').format((t.cash_amount || 0) + (t.transfer_amount || 0))}</p>
                    </div>
                    <div className="mb-3 space-y-1 border-y py-2 text-xs text-gray-700">
                      <p>Lokasi: {t.apartment_location} - Kamar {t.room_number}</p>
                      <p>Sewa: {formatRentalDuration(t.rental_duration)} ({t.shift || '-'})</p>
                      <p>Waktu: {formatDateTime(t.created_at)}</p>
                      <p>Marketing: {t.marketing_name || '-'}</p>
                      <p>Diinput oleh: {t.input_by || '-'}</p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setPreviewTransaksi(t)}><ImageIcon className="h-4 w-4" /></Button>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openReportModal(t)}><AlertTriangle className="h-4 w-4" /></Button>
                      <Button size="icon" className={`h-8 w-8 ${sentAt ? 'bg-slate-500 hover:bg-slate-600' : 'bg-green-600 hover:bg-green-700'}`} onClick={() => sendForwardReport(t)}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={Boolean(previewTransaksi)} onOpenChange={() => setPreviewTransaksi(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-black/90 [&>button]:text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Berkas Transaksi</DialogTitle>
            <DialogDescription className="text-gray-300">Menampilkan KTP dan bukti transfer jika tersedia.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {previewTransaksi?.ktp_image_url && <img src={resolveStorageUrl(previewTransaksi.ktp_image_url)} alt="KTP" className="h-44 w-full rounded-lg object-cover" />}
            {previewTransaksi?.transfer_proof_url && <img src={resolveStorageUrl(previewTransaksi.transfer_proof_url)} alt="Bukti Transfer" className="h-44 w-full rounded-lg object-cover" />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reportTransaksi)} onOpenChange={() => setReportTransaksi(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Laporkan Kesalahan</DialogTitle>
            <DialogDescription>Lengkapi data laporan sebelum kirim ke admin via WhatsApp.</DialogDescription>
          </DialogHeader>
          {reportDraft && (
            <div className="space-y-3">
              <input className="w-full rounded-xl border px-3 py-2 text-sm" value={reportDraft.alasan} onChange={(e) => setReportDraft((p) => ({ ...p, alasan: e.target.value }))} placeholder="Alasan" />
              {['customer_name', 'apartment_location', 'room_number', 'marketing_name', 'rental_duration', 'shift', 'cash_amount', 'transfer_amount', 'transfer_to', 'marketing_fee', 'input_by'].map((field) => (
                <input key={field} className="w-full rounded-xl border px-3 py-2 text-sm" value={reportDraft[field] || ''} onChange={(e) => setReportDraft((p) => ({ ...p, [field]: e.target.value }))} placeholder={field} />
              ))}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setReportTransaksi(null)}>Batal</Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={sendIssueReport}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Kirim
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmResendTransaksi)} onOpenChange={() => setConfirmResendTransaksi(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Konfirmasi Lapor Ulang</DialogTitle>
            <DialogDescription>
              Customer ini sudah dilaporkan pada {confirmResendTransaksi ? new Date(getSentMap()[confirmResendTransaksi.id]).toLocaleString('id-ID') : '-'}.
              Apakah Anda yakin ingin laporkan ulang?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmResendTransaksi(null)}>Gak jadi</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => { if (confirmResendTransaksi) sendForwardReport(confirmResendTransaksi, true); setConfirmResendTransaksi(null); }}>
              Ya, kirim aja
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KaryawanTransaksi;
