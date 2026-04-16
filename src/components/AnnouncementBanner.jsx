import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * AnnouncementBanner
 * Menampilkan pengumuman aktif terbaru di bagian atas layar.
 * - Satu banner per waktu (pengumuman paling baru)
 * - Bisa ditutup; state disimpan di sessionStorage (muncul lagi saat reload)
 */
const AnnouncementBanner = () => {
  const [announcement, setAnnouncement] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchAnnouncement = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, created_at')
      .eq('type', 'announcement')
      .eq('audience_role', 'all')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return;

    // Cek apakah sudah di-dismiss untuk notif ini di session ini
    const dismissedId = sessionStorage.getItem('kr_dismissed_announcement');
    if (dismissedId === String(data.id)) {
      setDismissed(true);
    } else {
      setDismissed(false);
    }
    setAnnouncement(data);
  }, []);

  useEffect(() => {
    fetchAnnouncement();

    const channel = supabase
      .channel('announcement-banner')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.new?.type === 'announcement') {
            setAnnouncement(payload.new);
            setDismissed(false);
            sessionStorage.removeItem('kr_dismissed_announcement');
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchAnnouncement]);

  const handleDismiss = () => {
    if (announcement) {
      sessionStorage.setItem('kr_dismissed_announcement', String(announcement.id));
    }
    setDismissed(true);
  };

  const show = announcement && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={announcement.id}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="flex items-start gap-3 bg-amber-400 px-4 py-3 text-amber-950">
            <Megaphone className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              {announcement.title && (
                <span className="mr-2 font-bold">{announcement.title}:</span>
              )}
              <span className="text-sm leading-snug">{announcement.body}</span>
            </div>
            <button
              onClick={handleDismiss}
              aria-label="Tutup pengumuman"
              className="ml-2 flex-shrink-0 rounded-full p-0.5 hover:bg-amber-300 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementBanner;
