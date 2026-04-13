import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DoorOpen, Building, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const KetersediaanKamar = () => {
  const [groupedRooms, setGroupedRooms] = useState({});

  const fetchRoomStatus = useCallback(async () => {
    const { data: allRooms, error: roomsError } = await supabase.from('nomor_kamar').select('*');
    if (roomsError) {
      console.error("Error fetching rooms:", roomsError);
      return;
    }

    const { data: transactions, error: transError } = await supabase.from('transactions').select('id, created_at, rental_duration, apartment_location, room_number, customer_name, checkout_at');
    if (transError) {
      console.error("Error fetching transactions:", transError);
      return;
    }
    
    const getSewaDurationAndEndTime = (transaction) => {
        const startTime = new Date(transaction.created_at);
        const rentalHours = transaction.rental_duration || 1;
        
        // For 24+ hours or special cases, treat as full day
        if (rentalHours >= 24) {
            const endTime = new Date(startTime);
            endTime.setDate(startTime.getDate() + 1);
            endTime.setHours(12, 0, 0, 0); // Checkout jam 12 siang keesokan harinya
            return { endTime };
        }
        
        // For regular hours, add the rental duration
        const endTime = new Date(startTime.getTime() + rentalHours * 60 * 60 * 1000);
        return { endTime };
    };

    const roomStatus = allRooms.map(room => {
      const latestTransaction = transactions
        .filter(t => t.apartment_location === room.lokasi && t.room_number === room.name && !t.checkout_at)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      if (latestTransaction) {
        const { endTime } = getSewaDurationAndEndTime(latestTransaction);
        if (new Date() < endTime) {
          return { ...room, transactionId: latestTransaction.id, status: 'terisi', readyAt: endTime, customerName: latestTransaction.customer_name, checkInTime: new Date(latestTransaction.created_at) };
        }
      }
      return { ...room, status: 'tersedia', readyAt: null, customerName: null, checkInTime: null };
    });

    const grouped = roomStatus.reduce((acc, room) => {
      const location = room.lokasi || 'Lainnya';
      if (!acc[location]) acc[location] = [];
      acc[location].push(room);
      return acc;
    }, {});

    setGroupedRooms(grouped);
  }, []);

  useEffect(() => {
    fetchRoomStatus();
    
    const channel = supabase.channel('realtime-kamar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchRoomStatus)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nomor_kamar' }, fetchRoomStatus)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRoomStatus]);

  const handleCheckOut = async (transactionId) => {
    const { error } = await supabase.from('transactions').update({ checkout_at: new Date().toISOString() }).eq('id', transactionId);
    if (error) {
      toast({ title: "Gagal Check Out", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Check Out Berhasil" });
    }
  };

  const formatTime = (date) => date ? date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
  const formatDate = (date) => date ? date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '';

  return (
    <div className="min-h-screen p-4 pt-6 pb-28">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-cyan-500 text-white px-6 py-3 rounded-full shadow-lg">
            <DoorOpen className="w-5 h-5" />
            <h1 className="text-xl font-bold">Ketersediaan Kamar</h1>
          </div>
        </div>
        {Object.keys(groupedRooms).length === 0 ? (
          <p className="text-center py-10 text-gray-500">Belum ada kamar terdaftar.</p>
        ) : (
          Object.keys(groupedRooms).sort().map(location => (
            <motion.div key={location} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glassmorphic-card p-5">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Building className="w-5 h-5 text-gray-600" />{location}</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {groupedRooms[location].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(room => (
                  <div key={room.id} className={`rounded-xl p-3 text-center transition-all ${room.status === 'tersedia' ? 'bg-green-100 border-2 border-green-300' : 'bg-red-100 border-2 border-red-300'}`}>
                    <p className="font-bold text-base text-gray-800">{room.name}</p>
                    {room.status === 'tersedia' ? <p className="text-xs font-semibold text-green-700">Tersedia</p> : (
                      <>
                        <p className="text-xs font-semibold text-red-700 flex items-center justify-center gap-1 truncate"><User className="w-3 h-3"/>{room.customerName}</p>
                        <div className="text-[10px] text-gray-600 mt-1">
                            <p>In: {formatTime(room.checkInTime)}</p>
                            <p>Out: {formatTime(room.readyAt)} ({formatDate(room.readyAt)})</p>
                        </div>
                        <Button onClick={() => handleCheckOut(room.transactionId)} size="sm" className="mt-2 w-full text-[10px] h-6 bg-blue-500"><LogOut className="w-3 h-3 mr-1" /> Check Out</Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
};

export default KetersediaanKamar;