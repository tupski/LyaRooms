import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  Building2, DoorOpen, Plus, Search, Edit2, Trash2, 
  MapPin, Check, X, ChevronRight, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const LocationRoomManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('locations');
  const [locations, setLocations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search
  const [locSearch, setLocSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  
  // Dialogs
  const [isLocDialogOpen, setIsLocDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'location'|'room', id, name }

  const [locForm, setLocForm] = useState({ id: null, name: '' });
  const [roomForm, setRoomForm] = useState({ id: null, name: '', lokasi: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: locData } = await supabase.from('lokasi_apartemen').select('*').order('name');
      const { data: roomData } = await supabase.from('nomor_kamar').select('*').order('name');
      setLocations(locData || []);
      setRooms(roomData || []);
    } catch (error) {
      toast({ title: "Gagal memuat data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Location Handlers ---
  const handleSaveLocation = async () => {
    if (!locForm.name) return;
    try {
      if (locForm.id) {
        const { error } = await supabase.from('lokasi_apartemen').update({ name: locForm.name }).eq('id', locForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('lokasi_apartemen').insert({ name: locForm.name });
        if (error) throw error;
      }
      toast({ title: "Lokasi berhasil disimpan ✅" });
      setIsLocDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: "Gagal menyimpan lokasi", description: error.message, variant: "destructive" });
    }
  };

  // --- Room Handlers ---
  const handleSaveRoom = async () => {
    if (!roomForm.name || !roomForm.lokasi) {
      toast({ title: "Data tidak lengkap", variant: "destructive" });
      return;
    }
    try {
      if (roomForm.id) {
        const { error } = await supabase.from('nomor_kamar').update({ name: roomForm.name, lokasi: roomForm.lokasi }).eq('id', roomForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('nomor_kamar').insert({ name: roomForm.name, lokasi: roomForm.lokasi });
        if (error) throw error;
      }
      toast({ title: "Kamar berhasil disimpan ✅" });
      setIsRoomDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: "Gagal menyimpan kamar", description: error.message, variant: "destructive" });
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      const table = deleteTarget.type === 'location' ? 'lokasi_apartemen' : 'nomor_kamar';
      const { error } = await supabase.from(table).delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: "Berhasil dihapus" });
      setIsDeleting(false);
      fetchData();
    } catch (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    }
  };

  const filteredLocations = locations.filter(l => l.name.toLowerCase().includes(locSearch.toLowerCase()));
  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(roomSearch.toLowerCase()) || 
    r.lokasi.toLowerCase().includes(roomSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 rounded-2xl h-12">
          <TabsTrigger value="locations" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Building2 className="h-4 w-4 mr-2" /> Lokasi Apartemen
          </TabsTrigger>
          <TabsTrigger value="rooms" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <DoorOpen className="h-4 w-4 mr-2" /> Nomor Kamar
          </TabsTrigger>
        </TabsList>

        {/* --- Locations Sub-tab --- */}
        <TabsContent value="locations" className="space-y-4 pt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Cari lokasi..." 
                value={locSearch}
                onChange={(e) => setLocSearch(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <Button onClick={() => { setLocForm({ id: null, name: '' }); setIsLocDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Tambah Lokasi
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLocations.map(loc => (
              <motion.div key={loc.id} layout className="bg-white border p-4 rounded-2xl shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-slate-800">{loc.name}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" onClick={() => { setLocForm(loc); setIsLocDialogOpen(true); }} className="h-8 w-8 text-blue-600">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setDeleteTarget({ type: 'location', id: loc.id, name: loc.name }); setIsDeleting(true); }} className="h-8 w-8 text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* --- Rooms Sub-tab --- */}
        <TabsContent value="rooms" className="space-y-4 pt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Cari kamar atau lokasi..." 
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <Button onClick={() => { setRoomForm({ id: null, name: '', lokasi: locations[0]?.name || '' }); setIsRoomDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Tambah Kamar
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredRooms.map(room => (
              <motion.div key={room.id} layout className="bg-white border p-4 rounded-2xl shadow-sm group relative">
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Button size="icon" variant="ghost" onClick={() => { setRoomForm(room); setIsRoomDialogOpen(true); }} className="h-7 w-7 text-blue-600 bg-white shadow-sm">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setDeleteTarget({ type: 'room', id: room.id, name: room.name }); setIsDeleting(true); }} className="h-7 w-7 text-red-600 bg-white shadow-sm">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="text-center py-2">
                  <h3 className="font-black text-xl text-slate-900">{room.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center justify-center gap-1">
                    <MapPin className="h-2.5 w-2.5" /> {room.lokasi}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* --- Location Dialog --- */}
      <Dialog open={isLocDialogOpen} onOpenChange={setIsLocDialogOpen}>
        <DialogContent className="bg-white rounded-3xl">
          <DialogHeader>
            <DialogTitle>{locForm.id ? 'Edit Lokasi' : 'Tambah Lokasi'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <label className="text-sm font-semibold text-slate-700">Nama Lokasi Apartemen</label>
            <Input 
              placeholder="Misal: Sky House BSD" 
              value={locForm.name} 
              onChange={(e) => setLocForm({...locForm, name: e.target.value})}
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsLocDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSaveLocation} className="bg-blue-600 text-white rounded-xl">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Room Dialog --- */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="bg-white rounded-3xl">
          <DialogHeader>
            <DialogTitle>{roomForm.id ? 'Edit Kamar' : 'Tambah Kamar'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nomor Kamar</label>
              <Input 
                placeholder="Misal: L3 8M" 
                value={roomForm.name} 
                onChange={(e) => setRoomForm({...roomForm, name: e.target.value})}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Lokasi</label>
              <select 
                value={roomForm.lokasi} 
                onChange={(e) => setRoomForm({...roomForm, lokasi: e.target.value})}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pilih Lokasi</option>
                {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRoomDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSaveRoom} className="bg-blue-600 text-white rounded-xl">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Delete Confirmation --- */}
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent className="bg-white rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleteTarget?.type === 'location' ? 'Lokasi' : 'Kamar'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{deleteTarget?.name}</strong>? 
              {deleteTarget?.type === 'location' && " Semua kamar di lokasi ini juga akan terhapus."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 text-white">Ya, Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LocationRoomManager;
