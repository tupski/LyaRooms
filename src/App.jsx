import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet';
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
      toast({ title: "Akses Diberikan!", description: "Selamat datang di Menu Finance.", className: "bg-green-500 text-white" });
      setIsTagihanUnlocked(true);
      setActiveTab('finance');
      setShowPinModal(false);
    } else {
      toast({ title: "PIN Salah!", description: "Silakan coba lagi.", variant: "destructive" });
      setShowPinModal(false); // Close and force re-click
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

  const tabs = [
    { id: 'form', label: 'Input', icon: Camera },
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'request', label: 'Request', icon: Send },
    { id: 'kamar', label: 'Kamar', icon: DoorOpen },
    { id: 'finance', label: 'Finance', icon: FileText },
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'chart', label: 'Chart', icon: PieChart },
    { id: 'logout', label: 'Keluar', icon: LogOut },
  ];

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

  return (
    <>
      <Helmet>
        <title>Laporan Transaksi KAKARAMA GROUP</title>
        <meta name="description" content="Aplikasi mobile untuk input transaksi rental dengan dashboard pemasukan dan ranking marketing" />
        <body className="bg-gradient-to-br from-cyan-200 to-blue-300" />
      </Helmet>

      {/* Header with user info */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800">🏢 Apartemen Management</h1>
            {isSuperAdmin && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" />
                SUPER ADMIN
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-700 font-medium">{session?.user?.email}</p>
            <p className="text-xs text-gray-600 capitalize">{userRole || 'user'}</p>
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

      <div className="min-h-screen pb-24">
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

        <div className="fixed bottom-0 left-0 right-0 p-2 z-50">
          <div className="bg-black/20 backdrop-blur-xl border border-white/20 rounded-full max-w-full sm:max-w-lg mx-auto">
            <div className="flex justify-between items-center px-1 py-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-12 rounded-full transition-colors duration-300 relative`}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full shadow-lg"
                        style={{ borderRadius: 9999 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-4 h-4 z-10 transition-colors ${isActive ? 'text-white' : 'text-gray-300'}`} />
                    <span className={`text-[9px] font-semibold z-10 transition-colors ${isActive ? 'text-white' : 'text-gray-300'}`}>{tab.label}</span>
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