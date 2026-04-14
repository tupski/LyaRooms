import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, TrendingUp, Trophy, PieChart, DoorOpen, FileText, Send, MoreHorizontal, Settings, LogOut } from 'lucide-react';
import FormTransaksi from '@/components/FormTransaksiModern';
import KaryawanTransaksi from '@/components/KaryawanTransaksi';
import DashboardPemasukan from '@/components/DashboardPemasukan';
import RankingMarketing from '@/components/RankingMarketing';
import OmsetChart from '@/components/OmsetChart';
import KetersediaanKamar from '@/components/KetersediaanKamar';
import HalamanTagihan from '@/components/HalamanTagihan';
import HalamanRequest from '@/components/HalamanRequest';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Auth from '@/components/Auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import PinInput from '@/components/PinInput';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'form';
    return localStorage.getItem('kr_active_tab') || 'form';
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { session, loading, signOut, userRole, isSuperAdmin } = useAuth();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isTagihanUnlocked, setIsTagihanUnlocked] = useState(false);
  const [showMoreMenus, setShowMoreMenus] = useState(false);
  const correctPin = '232325';

  useEffect(() => {
    document.title = 'Laporan Transaksi KAKARAMA GROUP';
  }, []);

  const handleDataUpdate = () => setRefreshKey((prevKey) => prevKey + 1);

  const handleTabClick = (tabId) => {
    setShowMoreMenus(false);
    if (tabId === 'finance' && userRole === 'admin' && !isTagihanUnlocked) {
      setShowPinModal(true);
      return;
    }
    setActiveTab(tabId);
  };

  const handlePinComplete = (enteredPin) => {
    if (enteredPin === correctPin) {
      toast({ title: 'Akses Diberikan!', description: 'Selamat datang di Menu Keuangan.', className: 'bg-green-500 text-white' });
      setIsTagihanUnlocked(true);
      setActiveTab('finance');
      setShowPinModal(false);
    } else {
      toast({ title: 'PIN Salah!', description: 'Silakan coba lagi.', variant: 'destructive' });
      setShowPinModal(false);
    }
  };

  const allTabs = [
    { id: 'form', label: 'Input', icon: Camera },
    { id: 'dashboard', label: 'Laporan', icon: TrendingUp },
    { id: 'request', label: 'Permintaan', icon: Send },
    { id: 'kamar', label: 'Kamar', icon: DoorOpen },
    { id: 'finance', label: 'Keuangan', icon: FileText },
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'chart', label: 'Grafik', icon: PieChart },
    { id: 'superadmin', label: 'Super Admin', icon: Settings },
  ];

  const allowedTabsByRole = {
    karyawan: ['form', 'kamar', 'request'],
    admin: allTabs.filter((tab) => tab.id !== 'superadmin').map((tab) => tab.id),
    super_admin: allTabs.map((tab) => tab.id),
  };

  const visibleTabIds = allowedTabsByRole[userRole] || allTabs.map((tab) => tab.id);
  const visibleTabs = allTabs.filter((tab) => visibleTabIds.includes(tab.id));

  const primaryTabs = useMemo(() => {
    if (userRole === 'karyawan') {
      return ['kamar', 'request']
        .map((id) => visibleTabs.find((tab) => tab.id === id))
        .filter(Boolean);
    }
    const preferred = ['dashboard', 'kamar', 'finance'];
    return preferred
      .map((id) => visibleTabs.find((tab) => tab.id === id))
      .filter(Boolean);
  }, [userRole, visibleTabs]);

  const secondaryTabs = useMemo(() => {
    if (userRole === 'karyawan') return [];
    const hiddenFromPrimary = new Set([...primaryTabs.map((tab) => tab.id), 'form']);
    return visibleTabs.filter((tab) => !hiddenFromPrimary.has(tab.id));
  }, [userRole, visibleTabs, primaryTabs]);

  useEffect(() => {
    if (!visibleTabIds.includes(activeTab)) {
      setActiveTab('form');
    }
  }, [activeTab, visibleTabIds]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kr_active_tab', activeTab);
    }
  }, [activeTab]);

  const renderContent = () => {
    const key = `${activeTab}-${refreshKey}`;
    switch (activeTab) {
      case 'form':
        return userRole === 'karyawan'
          ? <KaryawanTransaksi key={key} onRequestNavigate={() => setActiveTab('request')} />
          : <FormTransaksi key={key} onDataUpdate={handleDataUpdate} />;
      case 'dashboard':
        return <DashboardPemasukan key={key} />;
      case 'request':
        return <HalamanRequest key={key} />;
      case 'kamar':
        return <KetersediaanKamar key={key} />;
      case 'finance':
        return userRole === 'super_admin' || isTagihanUnlocked ? <HalamanTagihan key={key} /> : null;
      case 'ranking':
        return <RankingMarketing key={key} />;
      case 'chart':
        return <OmsetChart key={key} />;
      case 'superadmin':
        return isSuperAdmin ? <SuperAdminDashboard key={key} /> : <FormTransaksi key={key} onDataUpdate={handleDataUpdate} />;
      default:
        return <FormTransaksi key={key} onDataUpdate={handleDataUpdate} />;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-200 to-blue-300">
        <div className="flex flex-col items-center gap-4 text-blue-900">
          <motion.div
            initial={{ scale: 0.9, opacity: 0.75 }}
            animate={{ scale: [0.9, 1.05, 0.9], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-500 shadow-lg"
          >
            <span className="text-3xl font-extrabold tracking-tight text-white">KR</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            className="text-base font-semibold sm:text-lg"
          >
            Memuat...
          </motion.div>
        </div>
      </div>
    );
  }
  if (!session) return <Auth />;

  const displayRole = userRole === 'super_admin' ? 'Super Admin' : userRole === 'admin' ? 'Admin' : 'Karyawan';

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-blue-300 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 px-4 py-3 text-white shadow-md backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-lg font-bold text-white">🏢 KR</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full ring-offset-2 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={session?.user?.user_metadata?.avatar_url} alt={session?.user?.email} />
                  <AvatarFallback>{session?.user?.email?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="space-y-1">
                <p className="text-xs text-slate-500">Email</p>
                <p className="truncate text-sm font-medium">{session?.user?.email}</p>
                <p className="pt-1 text-xs text-slate-500">Role: {displayRole}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" />
                Pengaturan (segera hadir)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setShowLogoutConfirm(true);
                }}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari akun?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda perlu login lagi untuk mengakses aplikasi. Lanjutkan keluar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={() => signOut()}
            >
              Keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showPinModal} onOpenChange={setShowPinModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">Masukkan PIN</DialogTitle>
            <DialogDescription className="text-center">
              Halaman ini dilindungi. Masukkan PIN 6 digit untuk melanjutkan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <PinInput onComplete={handlePinComplete} />
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen pb-28 sm:pb-32">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
            {renderContent()}
          </motion.div>
        </AnimatePresence>

        <div className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2">
          <div className="mx-auto w-full max-w-md rounded-3xl border-2 border-slate-300 bg-white/95 shadow-xl backdrop-blur">
            <div className="relative flex items-end justify-between gap-1 px-2 py-2">
              {primaryTabs.slice(0, userRole === 'karyawan' ? 1 : 2).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`flex h-12 w-14 flex-col items-center justify-center rounded-xl border ${isActive ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-300 text-slate-700'}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="mt-1 text-[10px]">{tab.label}</span>
                  </button>
                );
              })}

              <button
                onClick={() => handleTabClick('form')}
                className={`-mt-7 flex h-16 w-16 flex-col items-center justify-center rounded-2xl border-4 border-white text-white shadow-lg ${
                  activeTab === 'form' ? 'bg-blue-600' : 'bg-cyan-500'
                }`}
              >
                <Camera className="h-6 w-6" />
                <span className="mt-0.5 text-[9px] font-semibold">Input</span>
              </button>

              {primaryTabs.slice(userRole === 'karyawan' ? 1 : 2, userRole === 'karyawan' ? 2 : 4).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`flex h-12 w-14 flex-col items-center justify-center rounded-xl border ${isActive ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-300 text-slate-700'}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="mt-1 text-[10px]">{tab.label}</span>
                  </button>
                );
              })}

              {secondaryTabs.length > 0 && (
                <button
                  onClick={() => setShowMoreMenus((prev) => !prev)}
                  className="flex h-12 w-10 items-center justify-center rounded-xl text-slate-700"
                  aria-label="Menu lainnya"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              )}
            </div>
            {showMoreMenus && secondaryTabs.length > 0 && (
              <div className="border-t border-slate-200 p-2">
                <div className="grid grid-cols-3 gap-1">
                  {secondaryTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`flex h-12 flex-col items-center justify-center rounded-lg text-[10px] font-semibold ${
                          isActive ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Icon className="mb-1 h-3.5 w-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
