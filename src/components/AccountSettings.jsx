import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, KeyRound, Phone, Save, User2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { uploadToVercelBlob } from '@/lib/vercelBlobUpload';
import { compressImageFile } from '@/lib/compressImage';
import { isPushSupported, registerPushSubscription, saveSubscriptionToSupabase } from '@/lib/pushClient';

const DEFAULT_AVATAR = '/logo-kr-transparent-square.png';

export default function AccountSettings({ open, onOpenChange }) {
  const { user, userRole, isAdmin, refreshSession } = useAuth();
  const userId = user?.id;
  const avatarInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState(''); // tanpa +62
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const displayAvatar = avatarUrl || user?.user_metadata?.avatar_url || DEFAULT_AVATAR;
  const roleLabel = userRole === 'super_admin' ? 'Super Admin' : userRole === 'admin' ? 'Admin' : 'Karyawan';

  const vapidPublicKey = useMemo(() => import.meta.env.VITE_VAPID_PUBLIC_KEY || '', []);

  const loadProfile = async () => {
    if (!userId) return;
    let data;
    let error;
    ({ data, error } = await supabase
      .from('user_profiles')
      .select('id,email,full_name,phone,avatar_url,role')
      .eq('id', userId)
      .maybeSingle());
    if (error && String(error.message || '').includes('avatar_url')) {
      // Backward compatible jika DB belum di-migrate
      ({ data, error } = await supabase
        .from('user_profiles')
        .select('id,email,full_name,phone,role')
        .eq('id', userId)
        .maybeSingle());
    }
    if (error) {
      toast({ title: 'Gagal memuat profil', description: error.message, variant: 'destructive' });
      return;
    }

    const p = data || null;
    setProfile(p);
    setFullName(p?.full_name || user?.user_metadata?.full_name || '');
    setEmail(p?.email || user?.email || '');
    setAvatarUrl(p?.avatar_url || '');

    const rawPhone = String(p?.phone || '').trim();
    const normalized = rawPhone.replace(/\\s+/g, '');
    if (normalized.startsWith('+62')) setPhone(normalized.slice(3));
    else if (normalized.startsWith('62')) setPhone(normalized.slice(2));
    else if (normalized.startsWith('0')) setPhone(normalized.slice(1));
    else setPhone(normalized);
  };

  useEffect(() => {
    if (open) {
      loadProfile();
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  const handlePickAvatar = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const compressed = await compressImageFile(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.85 });
      const url = await uploadToVercelBlob(compressed, 'avatars');
      setAvatarUrl(url);
      // Simpan ke user_profiles
      const { error } = await supabase.from('user_profiles').update({ avatar_url: url, updated_at: new Date().toISOString() }).eq('id', userId);
      if (error && String(error.message || '').includes('avatar_url')) {
        toast({
          title: 'Kolom avatar_url belum ada',
          description: 'Jalankan update schema Supabase (ALTER TABLE user_profiles ADD COLUMN avatar_url). Foto profil tetap disimpan di akun.',
          variant: 'destructive',
        });
      } else if (error) {
        throw error;
      }
      // Update metadata agar header langsung ikut
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      await refreshSession?.();
      toast({ title: 'Foto profil diperbarui' });
    } catch (e) {
      toast({ title: 'Gagal upload foto profil', description: e?.message || 'Coba lagi.', variant: 'destructive' });
    } finally {
      setLoading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const cleanedPhone = String(phone || '').replace(/\\D/g, '');
      const phoneWithPrefix = cleanedPhone ? `+62${cleanedPhone}` : null;
      const payload = {
        full_name: String(fullName || '').trim() || null,
        phone: phoneWithPrefix,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('user_profiles').update(payload).eq('id', userId);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: payload.full_name || '' } });
      await refreshSession?.();
      toast({ title: 'Profil disimpan' });
      await loadProfile();
    } catch (e) {
      toast({ title: 'Gagal menyimpan profil', description: e?.message || 'Coba lagi.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!isAdmin) return;
    const next = String(email || '').trim();
    if (!next) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ email: next });
      if (error) throw error;
      // user_profiles email juga ikut
      await supabase.from('user_profiles').update({ email: next, updated_at: new Date().toISOString() }).eq('id', userId);
      toast({ title: 'Permintaan ganti email dikirim', description: 'Silakan cek email untuk konfirmasi.' });
      setEmail(data?.user?.email || next);
    } catch (e) {
      toast({ title: 'Gagal ganti email', description: e?.message || 'Coba lagi.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const userEmail = user?.email || '';
    if (!userEmail) return;
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Lengkapi semua field password', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Konfirmasi password tidak sama', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: 'Password minimal 8 karakter', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // re-auth
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: userEmail, password: oldPassword });
      if (signErr) throw signErr;
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password berhasil diganti' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      toast({ title: 'Gagal ganti password', description: e?.message || 'Coba lagi.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePush = async () => {
    if (!userId) return;
    if (!isPushSupported()) {
      toast({ title: 'Push tidak didukung', description: 'Gunakan Chrome/Edge terbaru dan pastikan notifikasi diizinkan.', variant: 'destructive' });
      return;
    }
    try {
      const sub = await registerPushSubscription({ vapidPublicKey });
      await saveSubscriptionToSupabase(sub, userId);
      toast({ title: 'Notifikasi diaktifkan', description: 'Anda akan menerima notifikasi penting.' });
    } catch (e) {
      toast({ title: 'Gagal mengaktifkan notifikasi', description: e?.message || 'Coba lagi.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pengaturan Akun</DialogTitle>
          <DialogDescription>Kelola profil, keamanan, dan notifikasi.</DialogDescription>
        </DialogHeader>

        <section className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
              <img src={displayAvatar} alt="Foto profil" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{fullName || user?.email}</p>
              <p className="text-xs text-slate-500">{roleLabel}</p>
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="mr-2 h-4 w-4" />
                Ganti
              </Button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePickAvatar(e.target.files?.[0] || null)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <User2 className="h-4 w-4" /> Profil
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Nama</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                placeholder="Nama"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nomor telepon</label>
              <div className="flex overflow-hidden rounded-lg border border-slate-300">
                <div className="flex items-center gap-2 bg-slate-50 px-3 text-sm text-slate-700">
                  <Phone className="h-4 w-4" /> +62
                </div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 w-full px-3 text-sm outline-none"
                  inputMode="numeric"
                  placeholder="8123456789"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isAdmin}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none disabled:bg-slate-100"
              />
              {isAdmin && (
                <Button type="button" variant="outline" size="sm" className="mt-2 w-full" onClick={handleChangeEmail} disabled={loading}>
                  Simpan Email
                </Button>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" className="bg-slate-900 hover:bg-slate-800" onClick={handleSaveProfile} disabled={loading}>
              <Save className="mr-2 h-4 w-4" /> Simpan Profil
            </Button>
          </DialogFooter>
        </section>

        <section className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <KeyRound className="h-4 w-4" /> Ganti Password
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Password lama</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Password baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Konfirmasi password baru</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
              />
            </div>
            <Button type="button" variant="outline" onClick={handleChangePassword} disabled={loading}>
              Ganti Password
            </Button>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Notifikasi</h3>
          <p className="text-xs text-slate-600">Aktifkan push notification agar Anda menerima pemberitahuan penting.</p>
          <Button type="button" className="mt-3 w-full bg-blue-700 hover:bg-blue-800" onClick={handleEnablePush}>
            Aktifkan Notifikasi
          </Button>
          {!vapidPublicKey && (
            <p className="mt-2 text-[11px] text-slate-500">
              Catatan: `VITE_VAPID_PUBLIC_KEY` belum diset di environment.
            </p>
          )}
        </section>

        <p className="text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} - Kakarama Room. All rights reserved.
        </p>
      </DialogContent>
    </Dialog>
  );
}

