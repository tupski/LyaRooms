import React, { useEffect, useMemo, useRef, useState } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { Building2, Clock3, DoorOpen, Eye, Landmark, MapPin, Save, Upload, UserCircle2, UserSquare2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { uploadToVercelBlob } from '@/lib/vercelBlobUpload';
import { compressImageFile } from '@/lib/compressImage';
import ImageViewerModal from '@/components/ImageViewerModal';

const DURATION_OPTIONS = ['3 JAM', '6 JAM', '9 JAM', '12 JAM', '24 JAM', 'PROMO MALAM', 'Fullday', 'Custom'];
const SHIFT_OPTIONS = ['Pagi', 'Malam', 'Long Shift'];
const TRANSFER_TARGET_OPTIONS = ['Kakarama', 'Marketing'];

const SectionCard = ({ icon: Icon, title, subtitle, children, className = '' }) => (
  <section className={`rounded-2xl border border-blue-100 bg-white/90 p-5 shadow-sm backdrop-blur ${className}`}>
    <div className="mb-4 flex items-start gap-3">
    <div className="rounded-xl bg-blue-100 p-2 text-blue-700"><Icon className="h-5 w-5" /></div>
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
    {children}
  </section>
);

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 46,
    borderRadius: 16,
    borderColor: state.isFocused ? '#0f172a' : '#cbd5e1',
    boxShadow: 'none',
    ':hover': { borderColor: '#334155' },
  }),
  valueContainer: (base) => ({ ...base, paddingLeft: 12, paddingRight: 12 }),
  menu: (base) => ({ ...base, borderRadius: 12, overflow: 'hidden' }),
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

const FormTransaksiModern = ({ onDataUpdate }) => {
  const { user, userRole, isAdmin, isSuperAdmin } = useAuth();
  const canManageReferences = isAdmin || isSuperAdmin;
  const SelectComponent = canManageReferences ? CreatableSelect : Select;
  const ktpInputRef = useRef(null);
  const transferInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState([]);
  const [refs, setRefs] = useState({ lokasi: [], kamar: [], marketing: [], karyawan: [] });
  const [occupiedMap, setOccupiedMap] = useState({});
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
    input_by: '',
  });
  const selectPortalTarget = typeof document !== 'undefined' ? document.body : null;

  useEffect(() => {
    const inputBy = user?.user_metadata?.full_name || user?.email || '';
    setFormData((prev) => ({ ...prev, input_by: inputBy }));
  }, [user]);

  useEffect(() => {
    const fetchRefs = async () => {
      const [{ data: lokasi }, { data: kamar }, { data: marketing }, { data: karyawan }, { data: roomTransactions }] = await Promise.all([
        supabase.from('lokasi_apartemen').select('name').order('name'),
        supabase.from('nomor_kamar').select('name, lokasi').order('name'),
        supabase.from('marketing_list').select('name').order('name'),
        supabase.from('karyawan_list').select('name').order('name'),
        supabase.from('transactions').select('apartment_location, room_number, created_at, rental_duration, checkout_at').order('created_at', { ascending: false }),
      ]);
      setRefs({
        lokasi: lokasi || [],
        kamar: kamar || [],
        marketing: marketing || [],
        karyawan: karyawan || [],
      });
      const activeMap = {};
      const txList = roomTransactions || [];
      txList.forEach((tx) => {
        if (tx.checkout_at) return;
        const key = `${tx.apartment_location}__${tx.room_number}`;
        if (activeMap[key]) return;
        const startedAt = new Date(tx.created_at);
        const rentalHours = Number(tx.rental_duration) || 1;
        const endAt = new Date(startedAt.getTime() + rentalHours * 60 * 60 * 1000);
        if (new Date() < endAt) {
          activeMap[key] = true;
        }
      });
      setOccupiedMap(activeMap);
    };
    fetchRefs();
  }, []);

  const lokasiOptions = useMemo(
    () =>
      refs.lokasi.map((x) => {
        const roomsInLocation = refs.kamar.filter((room) => room.lokasi === x.name);
        const availableCount = roomsInLocation.filter((room) => !occupiedMap[`${room.lokasi}__${room.name}`]).length;
        const soldOut = roomsInLocation.length > 0 && availableCount === 0;
        return {
          value: x.name,
          label: soldOut ? `${x.name} (Habis)` : x.name,
          isDisabled: soldOut,
        };
      }),
    [refs.lokasi, refs.kamar, occupiedMap]
  );
  const kamarOptions = useMemo(
    () =>
      refs.kamar
        .filter((x) => x.lokasi === formData.lokasiApartemen)
        .map((x) => {
          const key = `${x.lokasi}__${x.name}`;
          const occupied = Boolean(occupiedMap[key]);
          return { value: x.name, label: occupied ? `${x.name} (Terisi)` : x.name, isDisabled: occupied };
        }),
    [refs.kamar, formData.lokasiApartemen, occupiedMap]
  );
  const marketingOptions = useMemo(() => refs.marketing.map((x) => ({ value: x.name, label: x.name })), [refs.marketing]);
  const karyawanOptions = useMemo(() => refs.karyawan.map((x) => ({ value: x.name, label: x.name })), [refs.karyawan]);

  const handleChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleCreateReference = async (field, value) => {
    if (!canManageReferences) {
      toast({ title: 'Akses ditolak', description: 'Hanya admin/superadmin yang dapat menambah data lokasi/kamar.', variant: 'destructive' });
      return;
    }

    const trimmed = String(value || '').trim();
    if (!trimmed) return;

    try {
      if (field === 'lokasiApartemen') {
        const exists = refs.lokasi.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
        if (!exists) {
          const { error } = await supabase.from('lokasi_apartemen').insert({ name: trimmed });
          if (error) throw error;
          setRefs((prev) => ({ ...prev, lokasi: [...prev.lokasi, { name: trimmed }] }));
          toast({ title: 'Lokasi baru ditambahkan', description: trimmed });
        }
        setFormData((prev) => ({ ...prev, lokasiApartemen: trimmed, nomorKamar: '' }));
        return;
      }

      if (field === 'namaMarketing') {
        const exists = refs.marketing.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
        if (!exists) {
          const { error } = await supabase.from('marketing_list').insert({ name: trimmed });
          if (error) throw error;
          setRefs((prev) => ({ ...prev, marketing: [...prev.marketing, { name: trimmed }] }));
          toast({ title: 'Marketing baru ditambahkan', description: trimmed });
        }
        setFormData((prev) => ({ ...prev, namaMarketing: trimmed }));
        return;
      }

      if (field === 'nomorKamar') {
        if (!formData.lokasiApartemen) {
          toast({ title: 'Pilih lokasi terlebih dahulu', variant: 'destructive' });
          return;
        }
        const exists = refs.kamar.some((item) => item.name.toLowerCase() === trimmed.toLowerCase() && item.lokasi === formData.lokasiApartemen);
        if (!exists) {
          const { error } = await supabase.from('nomor_kamar').insert({ name: trimmed, lokasi: formData.lokasiApartemen });
          if (error) throw error;
          setRefs((prev) => ({ ...prev, kamar: [...prev.kamar, { name: trimmed, lokasi: formData.lokasiApartemen }] }));
          toast({ title: 'Nomor kamar baru ditambahkan', description: `${trimmed} pada ${formData.lokasiApartemen}` });
        }
        setFormData((prev) => ({ ...prev, nomorKamar: trimmed }));
      }
    } catch (error) {
      toast({ title: 'Gagal menambahkan data', description: error.message, variant: 'destructive' });
    }
  };

  const [ktpPreviewUrl, setKtpPreviewUrl] = useState(null);
  const [buktiPreviewUrl, setBuktiPreviewUrl] = useState(null);

  useEffect(() => {
    if (!formData.ktpFile) {
      setKtpPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(formData.ktpFile);
    setKtpPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [formData.ktpFile]);

  useEffect(() => {
    if (!formData.buktiTransferFile) {
      setBuktiPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(formData.buktiTransferFile);
    setBuktiPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [formData.buktiTransferFile]);

  const handleImagePick = async (field, file) => {
    if (!file) {
      handleChange(field, null);
      return;
    }
    try {
      const compressed = await compressImageFile(file);
      handleChange(field, compressed);
    } catch (err) {
      toast({ title: 'Gagal memproses gambar', description: err?.message || 'Coba gambar lain.', variant: 'destructive' });
      handleChange(field, null);
    }
  };

  const uploadFile = async (file, bucket) => {
    if (!file) return null;
    const folder = bucket === 'ktp_images' ? 'ktp-images' : bucket === 'transfer_proofs' ? 'transfer-proofs' : 'uploads';
    return uploadToVercelBlob(file, folder);
  };

  const validateAndOpenConfirm = () => {
    if (!user?.id) {
      toast({ title: 'Sesi tidak valid', description: 'Silakan login ulang lalu coba lagi.', variant: 'destructive' });
      return;
    }
    const cashAmount = parseCurrency(formData.tunai);
    const transferAmount = parseCurrency(formData.transfer);

    if (!formData.namaCustomer || !formData.lokasiApartemen || !formData.nomorKamar || !formData.lamaSewa) {
      toast({ title: 'Data wajib belum lengkap', description: 'Isi customer, lokasi, kamar, dan durasi sewa.', variant: 'destructive' });
      return;
    }
    if (formData.lamaSewa === 'Custom' && !formData.customSewaJam) {
      toast({ title: 'Jam custom belum diisi', variant: 'destructive' });
      return;
    }
    if (cashAmount <= 0 && transferAmount <= 0) {
      toast({ title: 'Pembayaran kosong', description: 'Isi minimal salah satu nilai tunai atau transfer.', variant: 'destructive' });
      return;
    }
    if (transferAmount > 0 && !formData.transferKe) {
      toast({ title: 'Tujuan transfer belum dipilih', variant: 'destructive' });
      return;
    }
    setShowConfirmModal(true);
  };

  const performSubmit = async () => {
    if (!user?.id) return;
    setIsSubmitting(true);
    const cashAmount = parseCurrency(formData.tunai);
    const transferAmount = parseCurrency(formData.transfer);
    const feeAmount = parseCurrency(formData.feeMarketing);

    try {
      const [ktpUrl, transferProofUrl] = await Promise.all([
        uploadFile(formData.ktpFile, 'ktp_images'),
        uploadFile(formData.buktiTransferFile, 'transfer_proofs'),
      ]);
      const payload = {
        user_id: user.id,
        customer_name: formData.namaCustomer.trim(),
        marketing_name: formData.namaMarketing || formData.input_by || user?.email || 'sistem',
        rental_duration: getRentalHours(formData.lamaSewa, formData.customSewaJam),
        shift: formData.shift || null,
        input_by: formData.input_by || user?.email || 'sistem',
        apartment_location: formData.lokasiApartemen,
        room_number: formData.nomorKamar,
        cash_amount: cashAmount,
        transfer_amount: transferAmount,
        transfer_to: formData.transferKe || null,
        marketing_fee: feeAmount,
        ktp_image_url: ktpUrl,
        transfer_proof_url: transferProofUrl,
      };
      const { error } = await supabase.from('transactions').insert(payload);
      if (error) throw error;

      setShowConfirmModal(false);
      toast({ title: 'Transaksi berhasil disimpan' });
      window.alert('Transaksi berhasil disimpan.');
      setFormData((prev) => ({
        ...prev,
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
      }));
      if (ktpInputRef.current) ktpInputRef.current.value = '';
      if (transferInputRef.current) transferInputRef.current.value = '';
      onDataUpdate?.();
    } catch (error) {
      const rlsError = error?.message?.toLowerCase().includes('row-level security');
      toast({
        title: 'Gagal menyimpan transaksi',
        description: rlsError ? 'Akses ditolak oleh aturan keamanan data. Pastikan akun Anda memiliki role yang benar.' : error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-100 p-4 pb-28 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-600 to-cyan-500 p-5 text-white shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Form Input Transaksi</h1>
              <p className="text-sm text-blue-100">Catat transaksi apartemen dengan alur cepat dan rapi.</p>
            </div>
            <div className="rounded-xl bg-white/20 px-4 py-2 text-sm text-white">
              <div className="font-medium">{user?.user_metadata?.full_name || user?.email}</div>
              <div className="text-xs uppercase tracking-wide text-blue-100">{userRole || 'karyawan'}</div>
            </div>
          </div>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            validateAndOpenConfirm();
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard icon={UserCircle2} title="Data Penyewa" subtitle="Identitas customer dan unit apartemen">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nama Customer *</label>
                  <input value={formData.namaCustomer} onChange={(e) => handleChange('namaCustomer', e.target.value)} className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-700" placeholder="Masukkan nama customer" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Lokasi Apartemen *</label>
                  <SelectComponent
                    styles={selectStyles}
                    menuPortalTarget={selectPortalTarget}
                    options={lokasiOptions}
                    placeholder={canManageReferences ? 'Pilih lokasi atau tambah baru...' : 'Pilih lokasi...'}
                    value={lokasiOptions.find((x) => x.value === formData.lokasiApartemen) || null}
                    onChange={(opt) => {
                      handleChange('lokasiApartemen', opt?.value || '');
                      handleChange('nomorKamar', '');
                    }}
                    {...(canManageReferences ? {
                      onCreateOption: (value) => handleCreateReference('lokasiApartemen', value),
                      formatCreateLabel: (inputValue) => `Tambah lokasi: ${inputValue}`,
                    } : {})}
                    isClearable
                  />
                  {canManageReferences && formData.lokasiApartemen && (
                    <button type="button" className="mt-2 text-sm text-red-600 hover:text-red-800" onClick={async () => {
                      if (!window.confirm(`Hapus lokasi ${formData.lokasiApartemen}?`)) return;
                      const { error } = await supabase.from('lokasi_apartemen').delete().eq('name', formData.lokasiApartemen);
                      if (error) {
                        toast({ title: 'Gagal menghapus lokasi', description: error.message, variant: 'destructive' });
                        return;
                      }
                      setRefs((prev) => ({
                        ...prev,
                        lokasi: prev.lokasi.filter((item) => item.name !== formData.lokasiApartemen),
                        kamar: prev.kamar.filter((item) => item.lokasi !== formData.lokasiApartemen),
                      }));
                      toast({ title: 'Lokasi dihapus', description: formData.lokasiApartemen });
                      setFormData((prev) => ({ ...prev, lokasiApartemen: '', nomorKamar: '' }));
                    }}>
                      Hapus lokasi ini
                    </button>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nomor Kamar *</label>
                  <SelectComponent
                    styles={selectStyles}
                    menuPortalTarget={selectPortalTarget}
                    options={kamarOptions}
                    placeholder={formData.lokasiApartemen ? (canManageReferences ? 'Pilih nomor kamar atau tambah baru...' : 'Pilih nomor kamar...') : 'Pilih lokasi terlebih dahulu'}
                    value={kamarOptions.find((x) => x.value === formData.nomorKamar) || null}
                    onChange={(opt) => handleChange('nomorKamar', opt?.value || '')}
                    isDisabled={!formData.lokasiApartemen}
                    isClearable
                    {...(canManageReferences ? {
                      onCreateOption: (value) => handleCreateReference('nomorKamar', value),
                      formatCreateLabel: (inputValue) => `Tambah kamar: ${inputValue}`,
                    } : {})}
                  />
                  {canManageReferences && formData.nomorKamar && (
                    <button type="button" className="mt-2 text-sm text-red-600 hover:text-red-800" onClick={async () => {
                      if (!window.confirm(`Hapus nomor kamar ${formData.nomorKamar}?`)) return;
                      const { error } = await supabase.from('nomor_kamar').delete().eq('name', formData.nomorKamar).eq('lokasi', formData.lokasiApartemen);
                      if (error) {
                        toast({ title: 'Gagal menghapus kamar', description: error.message, variant: 'destructive' });
                        return;
                      }
                      setRefs((prev) => ({ ...prev, kamar: prev.kamar.filter((item) => !(item.name === formData.nomorKamar && item.lokasi === formData.lokasiApartemen)) }));
                      toast({ title: 'Nomor kamar dihapus', description: formData.nomorKamar });
                      setFormData((prev) => ({ ...prev, nomorKamar: '' }));
                    }}>
                      Hapus kamar ini
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Clock3} title="Sewa & Marketing" subtitle="Durasi sewa, shift, dan marketing">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Durasi Sewa *</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {DURATION_OPTIONS.map((item) => (
                      <button key={item} type="button" onClick={() => handleChange('lamaSewa', item)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${formData.lamaSewa === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{item}</button>
                    ))}
                  </div>
                  {formData.lamaSewa === 'Custom' && <input type="number" min={1} max={168} value={formData.customSewaJam} onChange={(e) => handleChange('customSewaJam', e.target.value)} className="mt-3 h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-700" placeholder="Jumlah jam custom" />}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Shift</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SHIFT_OPTIONS.map((item) => (
                      <button key={item} type="button" onClick={() => handleChange('shift', item)} className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${formData.shift === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{item}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nama Marketing</label>
                  <CreatableSelect
                    styles={selectStyles}
                    menuPortalTarget={selectPortalTarget}
                    options={marketingOptions}
                    placeholder="Pilih marketing atau tambah baru..."
                    value={marketingOptions.find((x) => x.value === formData.namaMarketing) || null}
                    onChange={(opt) => handleChange('namaMarketing', opt?.value || '')}
                    onCreateOption={(value) => handleCreateReference('namaMarketing', value)}
                    isClearable
                    formatCreateLabel={(inputValue) => `Tambah marketing: ${inputValue}`}
                  />
                  {canManageReferences && formData.namaMarketing && (
                    <div className="mt-2 flex gap-3">
                      <button type="button" className="text-sm text-slate-600 hover:text-slate-900" onClick={() => handleChange('namaMarketing', '')}>Kosongkan pilihan</button>
                      <button type="button" className="text-sm text-red-600 hover:text-red-800" onClick={async () => {
                        if (!window.confirm(`Hapus nama marketing ${formData.namaMarketing}?`)) return;
                        const { error } = await supabase.from('marketing_list').delete().eq('name', formData.namaMarketing);
                        if (error) {
                          toast({ title: 'Gagal menghapus marketing', description: error.message, variant: 'destructive' });
                          return;
                        }
                        setRefs((prev) => ({ ...prev, marketing: prev.marketing.filter((item) => item.name !== formData.namaMarketing) }));
                        handleChange('namaMarketing', '');
                        toast({ title: 'Nama marketing dihapus' });
                      }}>Hapus dari daftar</button>
                    </div>
                  )}
                </div>
                {(userRole === 'admin' || userRole === 'super_admin') && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Input Oleh</label>
                    <Select
                      styles={selectStyles}
                      menuPortalTarget={selectPortalTarget}
                      options={karyawanOptions}
                      placeholder="Pilih karyawan atau ketik nama..."
                      value={karyawanOptions.find((x) => x.value === formData.input_by) || null}
                      onChange={(opt) => handleChange('input_by', opt?.value || '')}
                      isClearable
                    />
                    {formData.input_by && (
                      <div className="mt-2 flex gap-3">
                        <button type="button" className="text-sm text-slate-600 hover:text-slate-900" onClick={() => handleChange('input_by', '')}>
                          Kosongkan pilihan input oleh
                        </button>
                        <button type="button" className="text-sm text-red-600 hover:text-red-800" onClick={async () => {
                          if (!window.confirm(`Hapus nama input oleh ${formData.input_by}?`)) return;
                          const { error } = await supabase.from('karyawan_list').delete().eq('name', formData.input_by);
                          if (error) {
                            toast({ title: 'Gagal menghapus input oleh', description: error.message, variant: 'destructive' });
                            return;
                          }
                          setRefs((prev) => ({ ...prev, karyawan: prev.karyawan.filter((item) => item.name !== formData.input_by) }));
                          handleChange('input_by', '');
                          toast({ title: 'Input oleh dihapus dari daftar' });
                        }}>
                          Hapus dari daftar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          <SectionCard icon={Wallet} title="Detail Pembayaran" subtitle="Tunai, transfer, bank tujuan, dan fee marketing">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div><label className="mb-2 block text-sm font-medium text-slate-700">Tunai (Rp)</label><input inputMode="numeric" value={formData.tunai} onChange={(e) => handleChange('tunai', formatCurrency(e.target.value))} className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-700" placeholder="0" /></div>
              <div><label className="mb-2 block text-sm font-medium text-slate-700">Transfer (Rp)</label><input inputMode="numeric" value={formData.transfer} onChange={(e) => handleChange('transfer', formatCurrency(e.target.value))} className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-700" placeholder="0" /></div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Bank Tujuan</label>
                <div className="grid grid-cols-2 gap-2">
                  {TRANSFER_TARGET_OPTIONS.map((item) => (
                    <button key={item} type="button" onClick={() => handleChange('transferKe', item)} className={`h-11 rounded-2xl border text-sm font-medium ${formData.transferKe === item ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{item}</button>
                  ))}
                </div>
              </div>
              <div><label className="mb-2 block text-sm font-medium text-slate-700">Fee Marketing (Rp)</label><input inputMode="numeric" value={formData.feeMarketing} onChange={(e) => handleChange('feeMarketing', formatCurrency(e.target.value))} className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-700" placeholder="0" /></div>
            </div>
          </SectionCard>

          <SectionCard icon={Upload} title="Unggah Berkas" subtitle="KTP dan bukti transfer (gambar dikompres otomatis)">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center">
                  <Upload className="mb-1 h-5 w-5 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Upload KTP</span>
                  <span className="text-xs text-slate-500">{formData.ktpFile?.name || 'Pilih file gambar'}</span>
                  <input
                    ref={ktpInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImagePick('ktpFile', e.target.files?.[0] || null)}
                  />
                </label>
                {ktpPreviewUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setViewerItems([{ src: ktpPreviewUrl, title: 'KTP', downloadName: formData.ktpFile?.name || 'ktp.jpg' }]);
                      setViewerOpen(true);
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Pratinjau KTP
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center">
                  <Landmark className="mb-1 h-5 w-5 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Upload Bukti Transfer</span>
                  <span className="text-xs text-slate-500">{formData.buktiTransferFile?.name || 'Pilih file gambar'}</span>
                  <input
                    ref={transferInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImagePick('buktiTransferFile', e.target.files?.[0] || null)}
                  />
                </label>
                {buktiPreviewUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setViewerItems([
                        { src: buktiPreviewUrl, title: 'Bukti transfer', downloadName: formData.buktiTransferFile?.name || 'bukti.jpg' },
                      ]);
                      setViewerOpen(true);
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Pratinjau bukti
                  </Button>
                )}
              </div>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4" /><span>Lokasi: {formData.lokasiApartemen || '-'}</span></div>
            <div className="flex items-center gap-2 text-sm text-slate-600"><DoorOpen className="h-4 w-4" /><span>Kamar: {formData.nomorKamar || '-'}</span></div>
            <div className="flex items-center gap-2 text-sm text-slate-600"><Building2 className="h-4 w-4" /><span>Marketing: {formData.namaMarketing || '-'}</span></div>
            <div className="flex items-center gap-2 text-sm text-slate-600"><UserSquare2 className="h-4 w-4" /><span>Input oleh: {formData.input_by || user?.email}</span></div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="h-14 w-full rounded-2xl bg-emerald-600 text-base font-semibold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700">
            <Save className="mr-2 h-5 w-5" />
            {isSubmitting ? 'Menyimpan Transaksi...' : 'Simpan Transaksi'}
          </Button>
        </form>

        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Konfirmasi data transaksi</DialogTitle>
              <DialogDescription>Periksa ringkasan berikut sebelum mengirim.</DialogDescription>
            </DialogHeader>
            <ul className="space-y-1.5 text-sm text-slate-700">
              <li>
                <span className="font-medium text-slate-900">Customer:</span> {formData.namaCustomer || '-'}
              </li>
              <li>
                <span className="font-medium text-slate-900">Lokasi / Kamar:</span> {formData.lokasiApartemen || '-'} — {formData.nomorKamar || '-'}
              </li>
              <li>
                <span className="font-medium text-slate-900">Marketing:</span> {formData.namaMarketing || formData.input_by || user?.email || '-'}
              </li>
              <li>
                <span className="font-medium text-slate-900">Durasi / Shift:</span> {formData.lamaSewa || '-'}
                {formData.lamaSewa === 'Custom' && ` (${formData.customSewaJam} jam)`} / {formData.shift || '-'}
              </li>
              <li>
                <span className="font-medium text-slate-900">Tunai:</span>{' '}
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(parseCurrency(formData.tunai))}
              </li>
              <li>
                <span className="font-medium text-slate-900">Transfer:</span>{' '}
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(parseCurrency(formData.transfer))}{' '}
                {formData.transferKe ? `(ke ${formData.transferKe})` : ''}
              </li>
              <li>
                <span className="font-medium text-slate-900">Fee marketing:</span>{' '}
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(parseCurrency(formData.feeMarketing))}
              </li>
              <li>
                <span className="font-medium text-slate-900">Input oleh:</span> {formData.input_by || user?.email || '-'}
              </li>
              <li>
                <span className="font-medium text-slate-900">Berkas:</span> KTP {formData.ktpFile ? `(${formData.ktpFile.name})` : '(tidak ada)'} — Bukti{' '}
                {formData.buktiTransferFile ? `(${formData.buktiTransferFile.name})` : '(tidak ada)'}
              </li>
            </ul>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowConfirmModal(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => performSubmit()} disabled={isSubmitting}>
                {isSubmitting ? 'Mengirim...' : 'Kirim'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ImageViewerModal open={viewerOpen} onOpenChange={setViewerOpen} items={viewerItems} />
      </div>
    </div>
  );
};

export default FormTransaksiModern;
