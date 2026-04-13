import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Select from 'react-select';
import { AlertTriangle, Share2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const DURATION_OPTIONS = ['3 JAM', '6 JAM', '9 JAM', '12 JAM', '24 JAM', 'PROMO MALAM', 'Fullday', 'Custom'];
const SHIFT_OPTIONS = ['Pagi', 'Malam', 'Long Shift'];

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 14,
    borderColor: state.isFocused ? '#0f172a' : '#cbd5e1',
    boxShadow: 'none',
    ':hover': { borderColor: '#334155' },
  }),
};

const getRentalHours = (duration, customHours) => {
  if (duration === 'Custom') return Number(customHours) || 1;
  if (duration === 'PROMO MALAM') return 12;
  if (duration === 'Fullday') return 24;
  const matched = duration.match(/\d+/);
  return matched ? Number(matched[0]) : 1;
};

const KaryawanTransaksi = ({ onRequestNavigate }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [refs, setRefs] = useState({ lokasi: [], kamar: [], marketing: [] });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    namaCustomer: '',
    lokasiApartemen: '',
    nomorKamar: '',
    namaMarketing: '',
    lamaSewa: '',
    customSewaJam: '1',
    shift: '',
  });

  const lokasiOptions = useMemo(() => refs.lokasi.map((item) => ({ value: item.name, label: item.name })), [refs.lokasi]);
  const kamarOptions = useMemo(
    () =>
      refs.kamar
        .filter((item) => item.lokasi === formData.lokasiApartemen)
        .map((item) => ({ value: item.name, label: item.name })),
    [refs.kamar, formData.lokasiApartemen]
  );
  const marketingOptions = useMemo(() => refs.marketing.map((item) => ({ value: item.name, label: item.name })), [refs.marketing]);

  const handleChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const loadTransactions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('id, customer_name, apartment_location, room_number, marketing_name, rental_duration, shift, created_at, input_by')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading transactions:', error);
      toast({ title: 'Gagal memuat transaksi', description: error.message, variant: 'destructive' });
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  }, [user]);

  const loadReferences = useCallback(async () => {
    const [{ data: lokasi }, { data: kamar }, { data: marketing }] = await Promise.all([
      supabase.from('lokasi_apartemen').select('name').order('name'),
      supabase.from('nomor_kamar').select('name, lokasi').order('name'),
      supabase.from('marketing_list').select('name').order('name'),
    ]);
    setRefs({
      lokasi: lokasi || [],
      kamar: kamar || [],
      marketing: marketing || [],
    });
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

  const handleShareReport = async () => {
    if (transactions.length === 0) {
      toast({ title: 'Tidak ada transaksi', description: 'Belum ada transaksi untuk dilaporkan.', variant: 'destructive' });
      return;
    }

    const rows = transactions.map((t, index) => `*${index + 1}. ${t.customer_name}*\nLokasi: ${t.apartment_location} - ${t.room_number}\nMarketing: ${t.marketing_name || '-'}\nSewa: ${formatRentalDuration(t.rental_duration)} (${t.shift || '-'})\nWaktu: ${formatDateTime(t.created_at)}\n`).join('\n');
    const message = `*LAPORAN TRANSAKSI KARYAWAN*\n-------------------------\n${rows}-------------------------\nDiinput oleh: ${user?.user_metadata?.full_name || user?.email || '-'}\nJumlah transaksi: ${transactions.length}`;

    try {
      await navigator.clipboard.writeText(message);
      toast({ title: 'Laporan disalin', description: 'Buka WhatsApp dan tempel pesan untuk mengirim.' });
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    } catch (error) {
      console.error('Share report error:', error);
      toast({ title: 'Gagal kirim laporan', description: 'Silakan coba lagi.', variant: 'destructive' });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user?.id) {
      toast({ title: 'Sesi tidak valid', description: 'Silakan login ulang lalu coba lagi.', variant: 'destructive' });
      return;
    }

    if (!formData.namaCustomer || !formData.lokasiApartemen || !formData.nomorKamar || !formData.namaMarketing || !formData.lamaSewa) {
      toast({ title: 'Data wajib belum lengkap', description: 'Lengkapi customer, lokasi, kamar, marketing, dan durasi sewa.', variant: 'destructive' });
      return;
    }

    if (formData.lamaSewa === 'Custom' && !formData.customSewaJam) {
      toast({ title: 'Jam custom belum diisi', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        customer_name: formData.namaCustomer.trim(),
        apartment_location: formData.lokasiApartemen,
        room_number: formData.nomorKamar,
        marketing_name: formData.namaMarketing,
        rental_duration: getRentalHours(formData.lamaSewa, formData.customSewaJam),
        shift: formData.shift || null,
        input_by: user?.user_metadata?.full_name || user?.email || 'karyawan',
        cash_amount: 0,
        transfer_amount: 0,
        marketing_fee: 0,
      });
      if (error) throw error;

      toast({ title: 'Transaksi berhasil disimpan' });
      setFormData({
        namaCustomer: '',
        lokasiApartemen: '',
        nomorKamar: '',
        namaMarketing: '',
        lamaSewa: '',
        customSewaJam: '1',
        shift: '',
      });
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transaksi Saya</h1>
              <p className="text-sm text-slate-500">Hanya transaksi yang Anda input sendiri.</p>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span className="text-sm font-semibold text-slate-900">{user?.user_metadata?.full_name || user?.email}</span>
              <span className="text-xs uppercase tracking-wide text-slate-500">karyawan</span>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Input Transaksi Karyawan</h2>
          <p className="text-sm text-slate-500">Form sederhana tanpa nominal. Data transaksi hanya milik akun Anda.</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Nama Customer *</label>
              <input
                value={formData.namaCustomer}
                onChange={(e) => handleChange('namaCustomer', e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-slate-700"
                placeholder="Masukkan nama customer"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Lokasi Apartemen *</label>
              <Select
                styles={selectStyles}
                options={lokasiOptions}
                value={lokasiOptions.find((item) => item.value === formData.lokasiApartemen) || null}
                onChange={(opt) => {
                  handleChange('lokasiApartemen', opt?.value || '');
                  handleChange('nomorKamar', '');
                }}
                placeholder="Pilih lokasi..."
                isClearable
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Nomor Kamar *</label>
              <Select
                styles={selectStyles}
                options={kamarOptions}
                value={kamarOptions.find((item) => item.value === formData.nomorKamar) || null}
                onChange={(opt) => handleChange('nomorKamar', opt?.value || '')}
                placeholder={formData.lokasiApartemen ? 'Pilih kamar...' : 'Pilih lokasi dulu'}
                isDisabled={!formData.lokasiApartemen}
                isClearable
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Nama Marketing *</label>
              <Select
                styles={selectStyles}
                options={marketingOptions}
                value={marketingOptions.find((item) => item.value === formData.namaMarketing) || null}
                onChange={(opt) => handleChange('namaMarketing', opt?.value || '')}
                placeholder="Pilih marketing..."
                isClearable
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Durasi Sewa *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DURATION_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleChange('lamaSewa', item)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    formData.lamaSewa === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            {formData.lamaSewa === 'Custom' && (
              <input
                type="number"
                min={1}
                max={168}
                value={formData.customSewaJam}
                onChange={(e) => handleChange('customSewaJam', e.target.value)}
                className="mt-3 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-slate-700"
                placeholder="Jumlah jam custom"
              />
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Shift</label>
            <div className="grid grid-cols-3 gap-2">
              {SHIFT_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleChange('shift', item)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    formData.shift === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700">
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
          </Button>
        </form>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Button className="bg-amber-500 hover:bg-amber-600" onClick={onRequestNavigate}>
            <AlertTriangle className="mr-2 h-4 w-4" /> Lapor Kesalahan
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={handleShareReport}>
            <Share2 className="mr-2 h-4 w-4" /> Kirim Laporan
          </Button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Riwayat Transaksi</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Memuat transaksi...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada transaksi yang Anda input.</p>
          ) : (
            <div className="space-y-4">
              {transactions.map((t) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{t.customer_name}</h3>
                      <p className="text-sm text-slate-600">{formatDateTime(t.created_at)}</p>
                    </div>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs uppercase text-slate-700">{formatRentalDuration(t.rental_duration)}</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <p className="text-sm text-slate-700"><span className="font-semibold">Lokasi:</span> {t.apartment_location}</p>
                    <p className="text-sm text-slate-700"><span className="font-semibold">Kamar:</span> {t.room_number}</p>
                    <p className="text-sm text-slate-700"><span className="font-semibold">Marketing:</span> {t.marketing_name || '-'}</p>
                    <p className="text-sm text-slate-700"><span className="font-semibold">Shift:</span> {t.shift || '-'}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KaryawanTransaksi;
