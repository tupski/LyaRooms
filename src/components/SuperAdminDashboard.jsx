import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/customSupabaseClient';
import {
  Shield,
  Users,
  Settings,
  Activity,
  Database,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Server,
  UserCheck,
  Menu,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import UserManagement from './UserManagement';
import MenuControls from './MenuControls';
import GlobalSettings from './GlobalSettings';
import { toast } from 'sonner';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    systemHealth: 100,
    recentActivity: [],
    menuVisibilityStats: {},
    systemSettings: {}
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Ambil statistik karyawan
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('*');

      if (usersError) throw usersError;

      // Hitung akun aktif dari user_profiles agar tidak perlu endpoint admin
      const activeUsersCount = users.filter((u) => !!u.last_sign_in_at).length;

      // Ambil statistik visibilitas menu
      const { data: menuVisibility, error: menuError } = await supabase
        .from('role_menu_visibility')
        .select('*');

      if (menuError) throw menuError;

      // Ambil pengaturan sistem
      const { data: systemSettings, error: settingsError } = await supabase
        .from('system_settings')
        .select('*');

      if (settingsError) throw settingsError;

      // Aktivitas terbaru (sementara masih data contoh)
      const recentActivity = [
        { id: 1, action: 'Karyawan ditambahkan', user: 'admin', timestamp: new Date().toISOString(), type: 'user' },
        { id: 2, action: 'Visibilitas menu diperbarui', user: 'super_admin', timestamp: new Date().toISOString(), type: 'menu' },
        { id: 3, action: 'Pengaturan sistem diubah', user: 'super_admin', timestamp: new Date().toISOString(), type: 'settings' }
      ];

      // Hitung statistik visibilitas menu per peran
      const menuStats = {};
      menuVisibility.forEach(item => {
        if (!menuStats[item.role]) {
          menuStats[item.role] = { visible: 0, hidden: 0 };
        }
        if (item.is_visible) {
          menuStats[item.role].visible++;
        } else {
          menuStats[item.role].hidden++;
        }
      });

      // Ubah pengaturan sistem ke object
      const settingsObj = {};
      systemSettings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      setStats({
        totalUsers: users.length,
        activeUsers: activeUsersCount,
        systemHealth: 95, // Mock health score
        recentActivity,
        menuVisibilityStats: menuStats,
        systemSettings: settingsObj
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Gagal memuat statistik dasbor');
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = (health) => {
    if (health >= 90) return { status: 'Sangat Baik', color: 'text-green-600', bg: 'bg-green-100' };
    if (health >= 70) return { status: 'Baik', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'Perlu Perhatian', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const healthInfo = getHealthStatus(stats.systemHealth);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dasbor Super Admin</h1>
          <p className="text-gray-600">Pusat kendali sistem, menu, dan akses pengguna</p>
        </div>
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          <Shield className="h-4 w-4 mr-1" />
          Akses Super Admin
        </Badge>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} akun aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kesehatan Sistem</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${healthInfo.color}`}>
              {stats.systemHealth}%
            </div>
            <Badge variant="outline" className={`${healthInfo.bg} ${healthInfo.color} border-current`}>
              {healthInfo.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Konfigurasi Menu</CardTitle>
            <Menu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(stats.menuVisibilityStats).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Konfigurasi peran aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengaturan Sistem</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(stats.systemSettings).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Parameter terkonfigurasi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tab utama super admin */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Ringkasan</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Karyawan</span>
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center space-x-2">
            <Menu className="h-4 w-4" />
            <span>Kontrol Menu</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Pengaturan</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab ringkasan */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6">
            {/* Detail kesehatan sistem */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Ringkasan Kesehatan Sistem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Performa Database</span>
                    <span>98%</span>
                  </div>
                  <Progress value={98} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Respons API</span>
                    <span>95%</span>
                  </div>
                  <Progress value={95} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Autentikasi Pengguna</span>
                    <span>100%</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sistem Menu</span>
                    <span>97%</span>
                  </div>
                  <Progress value={97} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Statistik visibilitas menu */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Menu className="h-5 w-5 mr-2" />
                  Visibilitas Menu per Peran
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.menuVisibilityStats).map(([role, stats]) => (
                    <div key={role} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4" />
                        <span className="capitalize font-medium">{role}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          <span>{stats.visible} tampil</span>
                        </div>
                        <div className="flex items-center space-x-1 text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{stats.hidden} disembunyikan</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Aktivitas terbaru */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Aktivitas Terbaru
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`p-2 rounded-full ${
                          activity.type === 'user' ? 'bg-blue-100' :
                          activity.type === 'menu' ? 'bg-green-100' : 'bg-purple-100'
                        }`}>
                          {activity.type === 'user' && <Users className="h-4 w-4 text-blue-600" />}
                          {activity.type === 'menu' && <Menu className="h-4 w-4 text-green-600" />}
                          {activity.type === 'settings' && <Settings className="h-4 w-4 text-purple-600" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.action}
                        </p>
                        <p className="text-sm text-gray-500">
                          oleh {activity.user} • {new Date(activity.timestamp).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Aksi cepat */}
            <Card>
              <CardHeader>
                <CardTitle>Aksi Cepat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center space-y-2"
                    onClick={() => setActiveTab('users')}
                  >
                    <Users className="h-6 w-6" />
                    <span className="text-sm">Kelola Karyawan</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center space-y-2"
                    onClick={() => setActiveTab('menu')}
                  >
                    <Menu className="h-6 w-6" />
                    <span className="text-sm">Kontrol Menu</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center space-y-2"
                    onClick={() => setActiveTab('settings')}
                  >
                    <Settings className="h-6 w-6" />
                    <span className="text-sm">Pengaturan Sistem</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center space-y-2"
                    onClick={fetchDashboardStats}
                  >
                    <TrendingUp className="h-6 w-6" />
                    <span className="text-sm">Muat Ulang Statistik</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab manajemen karyawan */}
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        {/* Tab kontrol menu */}
        <TabsContent value="menu">
          <MenuControls />
        </TabsContent>

        {/* Tab pengaturan global */}
        <TabsContent value="settings">
          <GlobalSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminDashboard;