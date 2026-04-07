import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, Save, PlusCircle, CheckCircle, Sparkles, Trash2, Coins as HandCoins, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

const AutocompleteInput = ({ title, table, value, onValueChange, filterBy }) => {
  const [listItems, setListItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isListManagerOpen, setIsListManagerOpen] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [lokasiApartemen, setLokasiApartemen] = useState('');
  const [lokasiOptions, setLokasiOptions] = useState([]);

  const fetchItems = async () => {
    const selectColumns = table === 'nomor_kamar' ? 'id, name, lokasi' : 'id, name';
    const { data, error } = await supabase.from(table).select(selectColumns);
    if (error) {
      console.error(`Error fetching ${table}:`, error);
    } else {
      setListItems(data);
    }

    if (table === 'nomor_kamar') {
      const { data: lokasiData } = await supabase.from('lokasi_apartemen').select('name');
      if (lokasiData) setLokasiOptions(lokasiData.map(l => l.name));
    }
  };

  useEffect(() => {
    fetchItems();
  }, [table, isListManagerOpen]);

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    onValueChange(inputValue);
    if (inputValue.length > 0) {
      let filtered = listItems;
      if (table === 'nomor_kamar' && filterBy) {
        filtered = listItems.filter(item => item.lokasi === filterBy);
      }
      const finalSuggestions = filtered.filter(item =>
        item.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setSuggestions(finalSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onValueChange(suggestion.name);
    setSuggestions([]);
  };

  const handleAddItem = async () => {
    if (newItem.trim() === '') return;
    let itemToAdd = { name: newItem.trim() };
    if (table === 'nomor_kamar') {
      if (!lokasiApartemen) {
        toast({ title: "Lokasi belum dipilih", variant: "destructive" });
        return;
      }
      itemToAdd = { ...itemToAdd, lokasi: lokasiApartemen };
    }
    const { error } = await supabase.from(table).insert(itemToAdd);
    if (error) {
      toast({ title: "Gagal Menambahkan", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Data Berhasil Ditambahkan" });
      setNewItem('');
      fetchItems();
    }
  };

  const handleDeleteItem = async (id) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      toast({ title: "Gagal Menghapus", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil Dihapus" });
      fetchItems();
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onBlur={() => setTimeout(() => setSuggestions([]), 200)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-gray-900"
          placeholder={`Ketik untuk cari ${title}`}
          required={title !== 'Diinput oleh'}
        />
        <Dialog open={isListManagerOpen} onOpenChange={setIsListManagerOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 ml-2 shrink-0">
              <PlusCircle className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kelola {title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {listItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                  <span className="text-gray-900">{table === 'nomor_kamar' ? `${item.name} (${item.lokasi})` : item.name}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-100 h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                        <AlertDialogDescription>Tindakan ini akan menghapus item secara permanen.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteItem(item.id)} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 mt-4">
              {table === 'nomor_kamar' && (
                <select value={lokasiApartemen} onChange={(e) => setLokasiApartemen(e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900">
                  <option value="">Pilih Lokasi Apartemen</option>
                  {lokasiOptions.map(lok => <option key={lok} value={lok}>{lok}</option>)}
                </select>
              )}
              <div className="flex gap-2">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder={`Tambah ${title} baru`}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900"
                />
                <Button onClick={handleAddItem}>Tambah</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-gray-900"
              onMouseDown={() => handleSuggestionClick(suggestion)}
            >
              {suggestion.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SuccessPopup = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
    <motion.div
      initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="bg-gradient-to-br from-green-400 to-blue-500 rounded-3xl shadow-2xl p-8 text-white text-center w-11/12 max-w-sm relative overflow-hidden"
    >
      <Sparkles className="absolute -top-4 -left-4 w-20 h-20 text-yellow-300 opacity-50 animate-pulse" />
      <Sparkles className="absolute -bottom-8 -right-8 w-24 h-24 text-yellow-300 opacity-50 animate-pulse delay-300" />
      <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-white" />
      </motion.div>
      <h2 className="text-2xl font-bold mb-2">Kerja Bagus!</h2>
      <p className="mb-4">Transaksi berhasil disimpan. Terimakasih & tetap semangat!</p>
      <Button onClick={onClose} className="mt-6 bg-white text-blue-500 font-bold w-full hover:bg-blue-50">Tutup</Button>
    </motion.div>
  </div>
);

const FormTransaksi = ({ onDataUpdate }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    namaCustomer: '', namaMarketing: '', lamaSewa: '', shift: '', diinputOleh: '',
    lokasiApartemen: '', nomorKamar: '', tunai: '', transfer: '', transferKe: '', feeMarketing: '',
    ktpFile: null, buktiTransferFile: null, customSewaJam: '1'
  });
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lamaSewaPilihan = ['3 JAM', '6 JAM', '9 JAM', '12 JAM', '24 JAM', 'PROMO MALAM', 'Fullday', 'Custom'];
  const shiftPilihan = ['Pagi', 'Malam', 'Long Shift'];

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleFileChange = (field, file) => setFormData(prev => ({ ...prev, [field]: file }));

  const formatRupiah = (value) => {
    if (!value) return '';
    const number = value.replace(/[^0-9,]/g, '').replace(/,/g, '');
    if (isNaN(number) || number === '') return '';
    return new Intl.NumberFormat('id-ID').format(number);
  };
  
  const deformatRupiah = (value) => value ? String(value).replace(/[^0-9]/g, '') : '0';

  const uploadFile = async (file, bucket) => {
    if (!file) return null;
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) {
      console.error(`Error uploading to ${bucket}:`, error);
      toast({ title: `Gagal Upload ${bucket}`, description: error.message, variant: "destructive" });
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.namaCustomer || !formData.namaMarketing || !formData.lokasiApartemen || !formData.nomorKamar || !formData.lamaSewa) {
      toast({ title: "⚠️ Data Tidak Lengkap", description: "Pastikan semua field wajib diisi!", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    if (formData.lamaSewa === 'Custom' && !formData.customSewaJam) {
        toast({ title: "⚠️ Jam Custom Belum Diisi", description: "Masukkan jumlah jam untuk sewa custom.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const ktpUrl = await uploadFile(formData.ktpFile, 'ktp_images');
    const buktiTransferUrl = await uploadFile(formData.buktiTransferFile, 'transfer_proofs');
    
    const rentalDuration = formData.lamaSewa === 'Custom' ? `${formData.customSewaJam} JAM` : formData.lamaSewa;

    const newTransaksi = {
      user_id: user.id,
      customer_name: formData.namaCustomer,
      marketing_name: formData.namaMarketing,
      rental_duration: rentalDuration,
      shift: formData.shift,
      diinputoleh: formData.diinputOleh,
      apartment_location: formData.lokasiApartemen,
      room_number: formData.nomorKamar,
      cash_amount: Number(deformatRupiah(formData.tunai)) || 0,
      transfer_amount: Number(deformatRupiah(formData.transfer)) || 0,
      transfer_to: formData.transferKe,
      marketing_fee: Number(deformatRupiah(formData.feeMarketing)) || 0,
      ktp_image_url: ktpUrl,
      transfer_proof_url: buktiTransferUrl,
    };
    
    const { error } = await supabase.from('transactions').insert(newTransaksi);

    if (error) {
      toast({ title: "Gagal Menyimpan", description: error.message, variant: "destructive" });
    } else {
      setShowSuccessPopup(true);
      setFormData({
        namaCustomer: '', namaMarketing: '', lamaSewa: '', shift: '', diinputOleh: '',
        lokasiApartemen: '', nomorKamar: '', tunai: '', transfer: '', transferKe: '', feeMarketing: '',
        ktpFile: null, buktiTransferFile: null, customSewaJam: '1'
      });
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach(input => input.value = '');
      onDataUpdate();
    }
    setIsSubmitting(false);
  };
  
  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false);
    onDataUpdate();
  };

  return (
    <>
      {showSuccessPopup && <SuccessPopup onClose={handleCloseSuccessPopup} />}
      <div className="min-h-screen p-4 pt-6 pb-28">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-full shadow-lg mb-3">
              <Camera className="w-5 h-5" />
              <h1 className="text-xl font-bold">Form Input Transaksi</h1>
              <Button variant="ghost" size="icon" onClick={onDataUpdate} className="ml-2 h-8 w-8 text-blue-600 hover:bg-blue-100">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Customer <span className="text-red-500">*</span></label>
              <input type="text" value={formData.namaCustomer} onChange={(e) => handleInputChange('namaCustomer', e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900" placeholder="Masukkan nama customer" required />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Marketing <span className="text-red-500">*</span></label>
              <AutocompleteInput title="Marketing" table="marketing_list" value={formData.namaMarketing} onValueChange={(val) => handleInputChange('namaMarketing', val)} />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Lama Sewa <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-4 gap-2">
                {lamaSewaPilihan.map((pilihan) => (
                  <button key={pilihan} type="button" onClick={() => handleInputChange('lamaSewa', pilihan)} className={`px-2 py-3 rounded-lg text-xs font-semibold ${formData.lamaSewa === pilihan ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {pilihan}
                  </button>
                ))}
              </div>
              {formData.lamaSewa === 'Custom' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
                    <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-xl">
                        <Clock className="w-5 h-5 text-blue-500" />
                        <select 
                            value={formData.customSewaJam} 
                            onChange={(e) => handleInputChange('customSewaJam', e.target.value)} 
                            className="w-full px-3 py-2 rounded-lg border-2 border-blue-200 text-gray-900 bg-white"
                        >
                            {Array.from({ length: 168 }, (_, i) => i + 1).map(hour => (
                                <option key={hour} value={hour}>{hour} Jam</option>
                            ))}
                        </select>
                    </div>
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Shift</label>
                <div className="grid grid-cols-3 gap-2">
                  {shiftPilihan.map((pilihan) => (
                    <button key={pilihan} type="button" onClick={() => handleInputChange('shift', pilihan)} className={`px-2 py-3 rounded-lg text-sm font-semibold ${formData.shift === pilihan ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {pilihan}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Diinput oleh</label>
                <AutocompleteInput title="Karyawan" table="karyawan_list" value={formData.diinputOleh} onValueChange={(val) => handleInputChange('diinputOleh', val)} />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi Apartemen <span className="text-red-500">*</span></label>
              <AutocompleteInput title="Lokasi" table="lokasi_apartemen" value={formData.lokasiApartemen} onValueChange={(val) => handleInputChange('lokasiApartemen', val)} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nomor Kamar <span className="text-red-500">*</span></label>
              <AutocompleteInput title="Nomor Kamar" table="nomor_kamar" value={formData.nomorKamar} onValueChange={(val) => handleInputChange('nomorKamar', val)} filterBy={formData.lokasiApartemen} />
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-2xl space-y-3">
              <h3 className="font-bold text-gray-800 mb-3">💰 Pembayaran</h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tunai (Rp)</label>
                <input type="text" value={formData.tunai} onChange={(e) => handleInputChange('tunai', formatRupiah(e.target.value))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900" placeholder="0" inputMode="numeric" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Transfer (Rp)</label>
                <input type="text" value={formData.transfer} onChange={(e) => handleInputChange('transfer', formatRupiah(e.target.value))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900" placeholder="0" inputMode="numeric" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Transfer Kepada</label>
                <div className="flex gap-2">
                  {['Kakarama', 'Marketing'].map(opt => (
                    <button key={opt} type="button" onClick={() => handleInputChange('transferKe', opt)} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${formData.transferKe === opt ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-2xl space-y-3">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><HandCoins /> Fee Marketing</h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah Fee (Rp)</label>
                <input type="text" value={formData.feeMarketing} onChange={(e) => handleInputChange('feeMarketing', formatRupiah(e.target.value))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900" placeholder="0" inputMode="numeric" />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2"><Upload className="w-4 h-4 inline mr-1" /> Upload KTP</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange('ktpFile', e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2"><Upload className="w-4 h-4 inline mr-1" /> Upload Bukti Transfer</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange('buktiTransferFile', e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : <><Save className="w-5 h-5 mr-2" /> Simpan Transaksi</>}
              </Button>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </>
  );
};

export default FormTransaksi;