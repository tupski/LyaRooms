import React, { useEffect, useMemo, useState } from 'react';
import { Check, CheckCheck, Bell, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatWibDateTime } from '@/lib/formatWib';

const PAGE_SIZE = 20;

function buildAudienceFilter(userId, userRole) {
  if (!userId) return null;
  if (userRole === 'super_admin') return `audience_user_id.eq.${userId},audience_role.eq.super_admin,audience_role.eq.all`;
  if (userRole === 'admin') return `audience_user_id.eq.${userId},audience_role.eq.admin,audience_role.eq.all`;
  return `audience_user_id.eq.${userId},audience_role.eq.all`;
}

export default function NotificationsInbox({ open, onOpenChange }) {
  const { user, userRole } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState([]);
  const [unreadSet, setUnreadSet] = useState(new Set());
  const [page, setPage] = useState(1);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [loading, setLoading] = useState(false);

  const audienceFilter = useMemo(() => buildAudienceFilter(userId, userRole), [userId, userRole]);

  const load = async () => {
    if (!userId || !audienceFilter) return;
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: notif, error: notifErr } = await supabase
        .from('notifications')
        .select('id,type,title,body,data,created_at,audience_role,audience_user_id')
        .or(audienceFilter)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (notifErr) throw notifErr;

      const ids = (notif || []).map((n) => n.id);
      const { data: reads, error: readsErr } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', userId)
        .in('notification_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      if (readsErr) throw readsErr;

      const readIds = new Set((reads || []).map((r) => r.notification_id));
      const unread = new Set(ids.filter((id) => !readIds.has(id)));

      setItems(notif || []);
      setUnreadSet(unread);
    } catch (error) {
      toast({
        title: 'Gagal memuat notifikasi',
        description: error.message || 'Coba buka lagi beberapa saat.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setPage(1);
      setOnlyUnread(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    load();
    // realtime refresh
    const channel = supabase
      .channel(`notif_inbox_${userId || 'anon'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_reads' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page, userId, audienceFilter, onlyUnread]);

  const displayed = useMemo(() => {
    if (!onlyUnread) return items;
    return items.filter((n) => unreadSet.has(n.id));
  }, [items, onlyUnread, unreadSet]);

  const markRead = async (id) => {
    if (!userId || !id) return;
    const { error } = await supabase
      .from('notification_reads')
      .upsert({ notification_id: id, user_id: userId, read_at: new Date().toISOString() }, { onConflict: 'notification_id,user_id' });
    if (!error) {
      setUnreadSet((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }
    toast({
      title: 'Gagal menandai notifikasi',
      description: error.message || 'Silakan coba lagi.',
      variant: 'destructive',
    });
  };

  const markAllRead = async () => {
    if (!userId) return;
    const ids = [...unreadSet];
    if (ids.length === 0) return;
    const payload = ids.map((id) => ({ notification_id: id, user_id: userId, read_at: new Date().toISOString() }));
    const { error } = await supabase.from('notification_reads').upsert(payload, { onConflict: 'notification_id,user_id' });
    if (error) {
      toast({
        title: 'Gagal menandai semua notifikasi',
        description: error.message || 'Silakan coba lagi.',
        variant: 'destructive',
      });
      return;
    }
    setUnreadSet(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Inbox
          </DialogTitle>
          <DialogDescription>Notifikasi terbaru untuk Anda.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => setOnlyUnread((v) => !v)}>
            <Filter className="mr-2 h-4 w-4" />
            {onlyUnread ? 'Belum dibaca' : 'Semua'}
          </Button>
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadSet.size === 0}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Tandai semua dibaca
          </Button>
        </div>

        <ScrollArea className="mt-3 h-[55vh] rounded-lg border">
          <div className="divide-y">
            {loading && <div className="p-4 text-sm text-slate-500">Memuat...</div>}
            {!loading && displayed.length === 0 && <div className="p-4 text-sm text-slate-500">Belum ada notifikasi.</div>}
            {displayed.map((n) => {
              const unread = unreadSet.has(n.id);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id)}
                  className={`w-full p-4 text-left transition ${unread ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${unread ? 'text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{n.body}</p>
                      <p className="mt-2 text-[11px] text-slate-500">{formatWibDateTime(n.created_at)}</p>
                    </div>
                    <div className="shrink-0">
                      {unread ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white">
                          <Check className="h-3 w-3" /> Baca
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">Dibaca</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <div className="mt-3 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            Sebelumnya
          </Button>
          <p className="text-xs text-slate-500">Halaman {page}</p>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={items.length < PAGE_SIZE}>
            Berikutnya
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
