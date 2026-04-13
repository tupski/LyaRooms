import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, TrendingUp, Trophy, PieChart, DoorOpen, FileText, Send, LogOut, Lock } from 'lucide-react';
import FormTransaksi from '@/components/FormTransaksi';
import DashboardPemasukan from '@/components/DashboardPemasukan';
import RankingMarketing from '@/components/RankingMarketing';
import OmsetChart from '@/components/OmsetChart';
import KetersediaanKamar from '@/components/KetersediaanKamar';
import HalamanTagihan from '@/components/HalamanTagihan';
import HalamanRequest from '@/components/HalamanRequest';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Auth from '@/components/Auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from '@/components/ui/use-toast';
import PinInput from '@/components/PinInput';


function App() {
  const [activeTab, setActiveTab] = useState('form');
  const [refreshKey, setRefreshKey] = useState(0);
  const { session, loading, signOut, userRole, isSuperAdmin } = useAuth();
  const [showPinModal, setShowPinModal] = useState(false);
  const [isTagihanUnlocked, setIsTagihanUnlocked] = useState(false);
  const correctPin = "232325";

  useEffect(() => {
    document.title = 'Laporan Transaksi KAKARAMA GROUP';
  }, []);

  const handleDataUpdate = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  const handleTabClick = (tabId) => {
    if (tabId === 'logout') {
      signOut();
      return;
    }
    if (tabId === 'finance' && !isTagihanUnlocked) {
      setShowPinModal(true);
    } else {
      setActiveTab(tabId);
    }
  };

  const handlePinComplete = (enteredPin) => {
    if (enteredPin === correctPin) {
      toast({ title: "Akses Diberikan!", description: "Selamat datang di Menu Keuangan.", className: "bg-green-500 text-white" });
      setIsTagihanUnlocked(true);
      setActiveTab('finance');
      setShowPinModal(false);
    } else {
      toast({ title: "PIN Salah!", description: "Silakan coba lagi.", variant: "destructive" });
      setShowPinModal(false); // Tutup modal dan minta klik ulang
    }
  };

  const allTabs = [
    { id: 'form', label: 'Input', icon: Camera },
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'request', label: 'Permintaan', icon: Send },
    { id: 'kamar', label: 'Kamar', icon: DoorOpen },
    { id: 'finance', label: 'Keuangan', icon: FileText },
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'chart', label: 'Grafik', icon: PieChart },
    { id: 'logout', label: 'Keluar', icon: LogOut },
  ];

  const allowedTabsByRole = {
    karyawan: ['form', 'kamar', 'request'],
    admin: allTabs.map((tab) => tab.id),
    super_admin: allTabs.map((tab) => tab.id),
  };

  const visibleTabIds = allowedTabsByRole[userRole] || allTabs.map((tab) => tab.id);
  const visibleTabs = allTabs.filter((tab) => visibleTabIds.includes(tab.id));

  useEffect(() => {
    // Pastikan tab aktif selalu tersedia untuk peran yang sedang login
    if (!visibleTabIds.includes(activeTab)) {
      setActiveTab(visibleTabs[0]?.id || 'form');
    }
  }, [activeTab, visibleTabIds, visibleTabs]);

  const pageVariants = {
    initial: { opacity: 0, scale: 0.95 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 0.95 },
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.4
  };

  const renderContent = () => {
    const key = `${activeTab}-${refreshKey}`;
    switch (activeTab) {
      case 'form':
        return <FormTransaksi key={key} onDataUpdate={handleDataUpdate} />;
      case 'dashboard':
        return <DashboardPemasukan key={key} />;
      case 'request':
        return <HalamanRequest key={key} />;
      case 'kamar':
        return <KetersediaanKamar key={key} />;
      case 'finance':
        return isTagihanUnlocked ? <HalamanTagihan key={key} /> : null;
      case 'ranking':
        return <RankingMarketing key={key} />;
      case 'chart':
        return <OmsetChart key={key} />;
      default:
        return <FormTransaksi key={key} onDataUpdate={handleDataUpdate} />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-cyan-200 to-blue-300">
        <div className="text-blue-800 text-xl">Memuat...</div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <>
      {/* Header dengan info pengguna */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-white/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800">🏢 KR</h1>
            {isSuperAdmin && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" />
                SUPER ADMIN
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-700 font-medium">{session?.user?.email}</p>
            <p className="text-xs text-gray-600 capitalize">{userRole || 'karyawan'}</p>
          </div>
        </div>
      </div>

      <Dialog open={showPinModal} onOpenChange={setShowPinModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold flex items-center justify-center gap-2">
              <Lock className="w-6 h-6" /> Masukkan PIN
            </DialogTitle>
            <DialogDescription className="text-center">
              Halaman ini dilindungi. Masukkan PIN 6 digit untuk melanjutkan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <PinInput onComplete={handlePinComplete} />
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen pb-24 sm:pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>

        <div className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between gap-1 p-1.5">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className="relative flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-200"
                    whileTap={{ scale: 0.9 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon className={`z-10 h-4 w-4 transition-colors ${isActive ? 'text-white' : 'text-slate-700'}`} />
                    <span className={`z-10 text-[10px] font-semibold leading-none transition-colors ${isActive ? 'text-white' : 'text-slate-700'}`}>
                      {tab.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;