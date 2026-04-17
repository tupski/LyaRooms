import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/customSupabaseClient';
import {
  Shield, Users, Settings, Activity, Building2, 
  History, BarChart3, DoorOpen, LayoutGrid, Server
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';

// Admin Components
import UserManagementModern from './admin/UserManagementModern';
import LocationRoomManager from './admin/LocationRoomManager';
import ActivityLogViewer from './admin/ActivityLogViewer';
import GlobalSettings from './GlobalSettings';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalLocations: 0,
    totalRooms: 0,
    recentLogs: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data: users } = await supabase.from('user_profiles').select('id');
      const { data: locations } = await supabase.from('lokasi_apartemen').select('id');
      const { data: rooms } = await supabase.from('nomor_kamar').select('id');
      const { data: logs } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(5);

      setStats({
        totalUsers: users?.length || 0,
        totalLocations: locations?.length || 0,
        totalRooms: rooms?.length || 0,
        recentLogs: logs || []
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header Premium */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden mt-4">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Settings className="h-32 w-32" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase">Pengaturan Aplikasi</h1>
            <p className="text-slate-400 text-sm mt-1">Kelola akses, unit apartemen, dan pantau operasional sistem.</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-2 scrollbar-hide">
          <TabsList className="inline-flex w-auto p-1 bg-slate-100 rounded-2xl h-12">
            <TabsTrigger value="overview" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4 mr-2" /> Ringkasan
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Users className="h-4 w-4 mr-2" /> Karyawan
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Building2 className="h-4 w-4 mr-2" /> Apartemen
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <History className="h-4 w-4 mr-2" /> Log Aktivitas
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Settings className="h-4 w-4 mr-2" /> Pengaturan
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- Overview Tab --- */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white group hover:border-blue-200 transition-colors">
              <CardContent className="p-6">
                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Users className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total User</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.totalUsers}</h3>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white group hover:border-blue-200 transition-colors">
              <CardContent className="p-6">
                <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Building2 className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lokasi</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.totalLocations}</h3>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white group hover:border-blue-200 transition-colors col-span-2 md:col-span-1">
              <CardContent className="p-6">
                <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <DoorOpen className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Unit</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.totalRooms}</h3>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 bg-slate-50/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" /> Aktivitas Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stats.recentLogs.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {stats.recentLogs.map((log) => (
                    <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                          {log.user_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{log.action}</p>
                          <p className="text-[10px] text-slate-400">{log.user_name} • {new Date(log.created_at).toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm italic">
                  Belum ada aktivitas tercatat.
                </div>
              )}
              <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                <button onClick={() => setActiveTab('logs')} className="text-xs font-bold text-blue-600 hover:underline">
                  Lihat Semua Log
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- User Management Tab --- */}
        <TabsContent value="users">
          <UserManagementModern />
        </TabsContent>

        {/* --- Inventory Tab --- */}
        <TabsContent value="inventory">
          <LocationRoomManager />
        </TabsContent>

        {/* --- Logs Tab --- */}
        <TabsContent value="logs">
          <ActivityLogViewer />
        </TabsContent>

        {/* --- Settings Tab --- */}
        <TabsContent value="settings">
          <GlobalSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ChevronRight = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" />
  </svg>
);

export default SuperAdminDashboard;