import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DoorOpen, LogOut, User, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const INITIAL_VISIBLE_ROOMS = 6;

const KetersediaanKamar = () => {
  const { user, userRole, isAdmin, isSuperAdmin } = useAuth();
  const [groupedRooms, setGroupedRooms] = useState({});
  const [expandedLocations, setExpandedLocations] = useState({});
  const [loading, setLoading] = useState(true);

  const canCheckoutAll = isAdmin || isSuperAdmin;

  const getSewaDurationAndEndTime = (transaction) => {
    const startTime = new Date(transaction.created_at);
    const rentalHours = transaction.rental_duration || 1;
    if (rentalHours >= 24) {
      const endTime = new Date(startTime);
      endTime.setDate(startTime.getDate() + 1);
      endTime.setHours(12, 0, 0, 0);
      return { endTime };
    }
    const endTime = new Date(startTime.getTime() + rentalHours * 60 * 60 * 1000);
    return { endTime };
  };

  const fetchRoomStatus = useCallback(async () => {
    setLoading(true);
    const { data: allRooms, error: roomsError } = await supabase.from('nomor_kamar').select('*').order('lokasi').order('name');
    if (roomsError) {
      toast({ title: 'Gagal memuat kamar', description: roomsError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('id, created_at, rental_duration, apartment_location, room_number, customer_name, checkout_at, user_id')
      .is('checkout_at', null)
      .order('created_at', { ascending: false });

    if (transError) {
      toast({ title: 'Gagal memuat transaksi kamar', description: transError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const roomStatus = (allRooms || []).map((room) => {
      const latestTransaction = (transactions || []).find(
        (t) => t.apartment_location === room.lokasi && t.room_number === room.name
      );

      if (latestTransaction) {
        const { endTime } = getSewaDurationAndEndTime(latestTransaction);
        if (new Date() < endTime) {
          return {
            ...room,
            transactionId: latestTransaction.id,
            transactionUserId: latestTransaction.user_id,
            status: 'terisi',
            readyAt: endTime,
            customerName: latestTransaction.customer_name,
            checkInTime: new Date(latestTransaction.created_at),
          };
        }
      }

      return {
        ...room,
        transactionId: null,
        transactionUserId: null,
        status: 'tersedia',
        readyAt: null,
        customerName: null,
        checkInTime: null,
      };
    });

    const grouped = roomStatus.reduce((acc, room) => {
      const location = room.lokasi || 'Lainnya';
      if (!acc[location]) acc[location] = [];
      acc[location].push(room);
      return acc;
    }, {});

    Object.keys(grouped).forEach((location) => {
      grouped[location].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    });

    setGroupedRooms(grouped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoomStatus();
    const channel = supabase
      .channel('realtime-kamar-grouped')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchRoomStatus)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nomor_kamar' }, fetchRoomStatus)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRoomStatus]);

  const handleCheckOut = async (room) => {
    if (!room.transactionId) return;
    const isOwner = room.transactionUserId === user?.id;
    if (!canCheckoutAll && !isOwner) {
      toast({
        title: 'Akses ditolak',
        description: 'Karyawan hanya bisa checkout transaksi yang diinput sendiri.',
        variant: 'destructive',
      });
      return;
    }

    if (!window.confirm(`Yakin checkout kamar ${room.name} di ${room.lokasi}?`)) return;

    const { error } = await supabase
      .from('transactions')
      .update({ checkout_at: new Date().toISOString() })
      .eq('id', room.transactionId);

    if (error) {
      toast({ title: 'Gagal Check Out', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Check Out Berhasil' });
    fetchRoomStatus();
  };

  const toggleShowMore = (location) => {
    setExpandedLocations((prev) => ({ ...prev, [location]: !prev[location] }));
  };

  const formatTime = (date) => (date ? date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '');
  const formatDate = (date) => (date ? date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '');

  return (
    <div className="min-h-screen p-4 pb-28 pt-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-cyan-500 px-6 py-3 text-white shadow-lg">
            <DoorOpen className="h-5 w-5" />
            <h1 className="text-xl font-bold">Ketersediaan Kamar</h1>
          </div>
        </div>

        {loading ? (
          <p className="py-10 text-center text-gray-500">Memuat data kamar...</p>
        ) : Object.keys(groupedRooms).length === 0 ? (
          <p className="py-10 text-center text-gray-500">Belum ada kamar terdaftar.</p>
        ) : (
          Object.keys(groupedRooms).sort().map((location) => {
            const allLocationRooms = groupedRooms[location];
            const expanded = !!expandedLocations[location];
            const visibleRooms = expanded ? allLocationRooms : allLocationRooms.slice(0, INITIAL_VISIBLE_ROOMS);
            const hasMore = allLocationRooms.length > INITIAL_VISIBLE_ROOMS;

            return (
              <motion.div key={location} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border bg-white p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800">
                  <MapPin className="h-4 w-4 text-cyan-600" />
                  {location}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {visibleRooms.map((room) => {
                    const isOwner = room.transactionUserId === user?.id;
                    const canCheckout = room.status === 'terisi' && (canCheckoutAll || isOwner);
                    return (
                      <div
                        key={room.id}
                        className={`rounded-xl border-2 p-3 text-center ${
                          room.status === 'tersedia' ? 'border-green-300 bg-green-100' : 'border-red-300 bg-red-100'
                        }`}
                      >
                        <p className="font-bold text-gray-800">{room.name}</p>
                        {room.status === 'tersedia' ? (
                          <p className="mt-1 text-xs font-semibold text-green-700">Tersedia</p>
                        ) : (
                          <>
                            <p className="mt-1 truncate text-xs font-semibold text-red-700">
                              <User className="mr-1 inline h-3 w-3" />
                              {room.customerName}
                            </p>
                            <div className="mt-1 text-[10px] text-gray-600">
                              <p>In: {formatTime(room.checkInTime)}</p>
                              <p>Out: {formatTime(room.readyAt)} ({formatDate(room.readyAt)})</p>
                            </div>
                            <Button
                              onClick={() => handleCheckOut(room)}
                              size="sm"
                              disabled={!canCheckout}
                              className={`mt-2 h-6 w-full text-[10px] ${canCheckout ? 'bg-blue-500' : 'bg-slate-400'}`}
                            >
                              <LogOut className="mr-1 h-3 w-3" /> Check Out
                            </Button>
                            {!canCheckoutAll && userRole === 'karyawan' && !isOwner && (
                              <p className="mt-1 text-[10px] text-slate-600">Hanya transaksi milik Anda</p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => toggleShowMore(location)}
                    className="mt-3 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {expanded ? 'Lebih sedikit' : `Tampilkan lebih banyak (${allLocationRooms.length - INITIAL_VISIBLE_ROOMS})`}
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </motion.div>
    </div>
  );
};

export default KetersediaanKamar;
