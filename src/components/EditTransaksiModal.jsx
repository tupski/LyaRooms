import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';

const AutocompleteInput = ({ table, value, onValueChange }) => {
  const [listItems, setListItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase.from(table).select('name');
      if (data) setListItems(data);
    };
    fetchItems();
  }, [table]);

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    onValueChange(inputValue);
    if (inputValue) {
      setSuggestions(listItems.filter(item => item.name.toLowerCase().includes(inputValue.toLowerCase())));
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onValueChange(suggestion.name);
    setSuggestions([]);
  };

  return (
    <div className="relative w-full">
      <input type="text" value={value} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border-2 text-gray-900" />
      {suggestions.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map((item, index) => (
            <div key={index} className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-gray-900" onMouseDown={() => handleSuggestionClick(item)}>
              {item.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const EditTransaksiModal = ({ transaksi, onClose, onSave }) => {
  const [formData, setFormData] = useState(transaksi);
  
  const lamaSewaDurations = [
    '3 JAM', '6 JAM', '9 JAM', '12 JAM', 'PROMO MALAM', 'Fullday', '24 JAM'
  ];
  const customHours = Array.from({ length: 168 }, (_, i) => `${i + 1} Jam Custom`);
  const lamaSewaPilihan = [...lamaSewaDurations, ...customHours];

  const shiftPilihan = ['Pagi', 'Malam', 'Long Shift'];

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const formatRupiah = (value) => value ? new Intl.NumberFormat('id-ID').format(String(value).replace(/[^0-9]/g, '')) : '';
  const deformatRupiah = (value) => value ? String(value).replace(/[^0-9]/g, '') : '0';

  useEffect(() => {
    setFormData({
      ...transaksi,
      cash_amount: formatRupiah(transaksi.cash_amount),
      transfer_amount: formatRupiah(transaksi.transfer_amount),
      marketing_fee: formatRupiah(transaksi.marketing_fee),
    });
  }, [transaksi]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      cash_amount: deformatRupiah(formData.cash_amount),
      transfer_amount: deformatRupiah(formData.transfer_amount),
      marketing_fee: deformatRupiah(formData.marketing_fee),
    });
  };
  
  const isCustomDuration = !lamaSewaDurations.includes(formData.rental_duration);


  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Edit Transaksi</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5 text-gray-900" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-130px)]">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Nama Customer</label>
            <input type="text" value={formData.customer_name} onChange={(e) => handleInputChange('customer_name', e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 text-gray-900" required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Nama Marketing</label>
            <AutocompleteInput table="marketing_list" value={formData.marketing_name} onValueChange={(val) => handleInputChange('marketing_name', val)} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Lama Sewa</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {lamaSewaDurations.map((p) => <button key={p} type="button" onClick={() => handleInputChange('rental_duration', p)} className={`px-2 py-3 rounded-lg text-xs font-semibold ${formData.rental_duration === p ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'}`}>{p}</button>)}
               <button type="button" onClick={() => handleInputChange('rental_duration', '1 Jam Custom')} className={`px-2 py-3 rounded-lg text-xs font-semibold ${isCustomDuration ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'}`}>Custom</button>
            </div>
             {isCustomDuration && (
              <select value={formData.rental_duration} onChange={(e) => handleInputChange('rental_duration', e.target.value)} className="w-full mt-2 px-4 py-3 rounded-xl border-2 text-gray-900">
                {customHours.map(hour => <option key={hour} value={hour}>{hour}</option>)}
              </select>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Shift</label>
              <div className="grid grid-cols-3 gap-2">
                {shiftPilihan.map((p) => <button key={p} type="button" onClick={() => handleInputChange('shift', p)} className={`px-2 py-3 rounded-lg text-sm font-semibold ${formData.shift === p ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-900'}`}>{p}</button>)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Diinput oleh</label>
              <AutocompleteInput table="karyawan_list" value={formData.diinputoleh} onValueChange={(val) => handleInputChange('diinputoleh', val)} />
            </div>
          </div>
          <div className="p-4 rounded-2xl space-y-3 bg-gray-50">
            <h3 className="font-bold text-gray-900">Pembayaran</h3>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Tunai (Rp)</label>
              <input type="text" value={formData.cash_amount} onChange={(e) => handleInputChange('cash_amount', formatRupiah(e.target.value))} className="w-full px-4 py-3 rounded-xl border-2 text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Transfer (Rp)</label>
              <input type="text" value={formData.transfer_amount} onChange={(e) => handleInputChange('transfer_amount', formatRupiah(e.target.value))} className="w-full px-4 py-3 rounded-xl border-2 text-gray-900" />
            </div>
             <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Fee Marketing (Rp)</label>
              <input type="text" value={formData.marketing_fee} onChange={(e) => handleInputChange('marketing_fee', formatRupiah(e.target.value))} className="w-full px-4 py-3 rounded-xl border-2 text-gray-900" />
            </div>
          </div>
          <div className="p-4 border-t">
            <Button type="submit" className="w-full bg-green-500 text-white font-bold py-3 rounded-xl"><Save className="w-5 h-5 mr-2" /> Simpan</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditTransaksiModal;