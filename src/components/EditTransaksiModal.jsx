import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';

const DURATION_LABELS = ['3 JAM', '6 JAM', '9 JAM', '12 JAM', 'PROMO MALAM', 'Fullday', '24 JAM'];
const SHIFT_OPTIONS = ['Pagi', 'Malam', 'Long Shift'];
const TRANSFER_TARGET_OPTIONS = ['Kakarama', 'Marketing'];

const formatRupiah = (value) =>
  value ? new Intl.NumberFormat('id-ID').format(String(value).replace(/[^0-9]/g, '')) : '';
const deformatRupiah = (value) =>
  value ? Number(String(value).replace(/[^0-9]/g, '')) || 0 : 0;

const durationToHours = (dur) => {
  if (!dur) return 1;
  if (dur === 'PROMO MALAM') return 12;
  if (dur === 'Fullday') return 24;
  const match = String(dur).match(/\d+/);
  return match ? Number(match[0]) : 1;
};

const hoursToDurationLabel = (hours) => {
  if (!hours) return '3 JAM';
  const map = { 3: '3 JAM', 6: '6 JAM', 9: '9 JAM', 12: '12 JAM', 24: '24 JAM' };
  return map[hours] || `${hours} JAM (Custom)`;
};

const AutocompleteInput = ({ table, value, onValueChange }) => {
  const [listItems, setListItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    supabase.from(table).select('name').then(({ data }) => {
      if (data) setListItems(data);
    });
  }, [table]);

  const handleChange = (e) => {
    const v = e.target.value;
    onValueChange(v);
    setSuggestions(v ? listItems.filter((item) => item.name.toLowerCase().includes(v.toLowerCase())) : []);
  };

  return (
    <div className="relative w-full">
      <input type="text" value={value} onChange={handleChange} className="w-full rounded-xl border-2 px-4 py-3 text-gray-900" />
      {suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
          {suggestions.map((item, i) => (
            <div
              key={i}
              className="cursor-pointer px-4 py-2 text-gray-900 hover:bg-gray-100"
              onMouseDown={() => { onValueChange(item.name); setSuggestions([]); }}
            >
              {item.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EditTransaksiModal = ({ transaksi, onClose, onSave }) => {
  const [formData, setFormData] = useState({});
  const [isCustom, setIsCustom] = useState(false);
  const [customHours, setCustomHours] = useState('1');

  useEffect(() => {
    const label = hoursToDurationLabel(transaksi.rental_duration);
    const known = DURATION_LABELS.includes(label);
    setIsCustom(!known);
    setCustomHours(transaksi.rental_duration || 1);
    setFormData({
      ...transaksi,
      rental_duration_label: known ? label : label,
      cash_amount: formatRupiah(transaksi.cash_amount),
      transfer_amount: formatRupiah(transaksi.transfer_amount),
      marketing_fee: formatRupiah(transaksi.marketing_fee),
      deposit_cash: formatRupiah(transaksi.deposit_cash),
      deposit_transfer: formatRupiah(transaksi.deposit_transfer),
    });
  }, [transaksi]);

  const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const hours = isCustom ? Number(customHours) || 1 : durationToHours(formData.rental_duration_label);
    onSave({
      ...formData,
      rental_duration: hours,
      cash_amount: deformatRupiah(formData.cash_amount),
      transfer_amount: deformatRupiah(formData.transfer_amount),
      marketing_fee: deformatRupiah(formData.marketing_fee),
      deposit_cash: deformatRupiah(formData.deposit_cash),
      deposit_transfer: deformatRupiah(formData.deposit_transfer),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 pb-24 pt-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-bold text-gray-900">Edit Transaksi</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(90vh-130px)] space-y-4 overflow-y-auto p-5">
          {/* Customer */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Nama Customer</label>
            <input type="text" value={formData.customer_name || ''} onChange={(e) => set('customer_name', e.target.value)} className="w-full rounded-xl border-2 px-4 py-3 text-gray-900" required />
          </div>

          {/* Lokasi & Kamar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Lokasi</label>
              <AutocompleteInput table="lokasi_apartemen" value={formData.apartment_location || ''} onValueChange={(v) => set('apartment_location', v)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Kamar</label>
              <AutocompleteInput table="nomor_kamar" value={formData.room_number || ''} onValueChange={(v) => set('room_number', v)} />
            </div>
          </div>

          {/* Marketing */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Marketing</label>
            <AutocompleteInput table="marketing_list" value={formData.marketing_name || ''} onValueChange={(v) => set('marketing_name', v)} />
          </div>

          {/* Durasi */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Durasi Sewa</label>
            <div className="grid grid-cols-4 gap-1.5">
              {DURATION_LABELS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { set('rental_duration_label', d); setIsCustom(false); }}
                  className={`rounded-xl px-2 py-2.5 text-xs font-semibold ${!isCustom && formData.rental_duration_label === d ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`rounded-xl px-2 py-2.5 text-xs font-semibold ${isCustom ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Custom
              </button>
            </div>
            {isCustom && (
              <input
                type="number"
                min={1}
                max={168}
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
                className="mt-2 w-full rounded-xl border-2 px-4 py-2.5 text-gray-900"
                placeholder="Jumlah jam"
              />
            )}
          </div>

          {/* Shift & Input oleh */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Shift</label>
              <div className="flex flex-col gap-1.5">
                {SHIFT_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('shift', s)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold ${formData.shift === s ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-800'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Diinput oleh</label>
              <AutocompleteInput table="karyawan_list" value={formData.input_by || ''} onValueChange={(v) => set('input_by', v)} />
            </div>
          </div>

          {/* Pembayaran Sewa */}
          <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-800">💳 Pembayaran Sewa</h3>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Tunai (Rp)</label>
              <input type="text" value={formData.cash_amount || ''} onChange={(e) => set('cash_amount', formatRupiah(e.target.value))} className="w-full rounded-xl border-2 px-4 py-2.5 text-gray-900" placeholder="0" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Transfer (Rp)</label>
              <input type="text" value={formData.transfer_amount || ''} onChange={(e) => set('transfer_amount', formatRupiah(e.target.value))} className="w-full rounded-xl border-2 px-4 py-2.5 text-gray-900" placeholder="0" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Transfer Ke</label>
              <div className="grid grid-cols-2 gap-2">
                {TRANSFER_TARGET_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => set('transfer_to', formData.transfer_to === item ? '' : item)}
                    className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${formData.transfer_to === item ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-800'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Fee Marketing (Rp)</label>
              <input type="text" value={formData.marketing_fee || ''} onChange={(e) => set('marketing_fee', formatRupiah(e.target.value))} className="w-full rounded-xl border-2 px-4 py-2.5 text-gray-900" placeholder="0" />
            </div>
          </div>

          {/* Deposit */}
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3">
            <h3 className="text-sm font-bold text-amber-800">💰 Apakah cs Deposit? (opsional)</h3>
            <p className="text-xs text-amber-600">Kosongkan jika cs tidak deposit</p>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-amber-700">Tunai (Rp)</label>
              <input type="text" value={formData.deposit_cash || ''} onChange={(e) => set('deposit_cash', formatRupiah(e.target.value))} className="w-full rounded-xl border-2 border-amber-200 bg-white px-4 py-2.5 text-gray-900" placeholder="0" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-amber-700">Transfer (Rp)</label>
              <input type="text" value={formData.deposit_transfer || ''} onChange={(e) => set('deposit_transfer', formatRupiah(e.target.value))} className="w-full rounded-xl border-2 border-amber-200 bg-white px-4 py-2.5 text-gray-900" placeholder="0" />
            </div>
          </div>

          <Button type="submit" className="w-full rounded-xl bg-green-500 py-3 font-bold text-white hover:bg-green-600">
            <Save className="mr-2 h-5 w-5" /> Simpan Perubahan
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default EditTransaksiModal;
