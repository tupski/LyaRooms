import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/customSupabaseClient';
import {
  Settings,
  Users,
  Shield,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { toast } from 'sonner';
import {
  MENU_ITEMS,
  getCategoryDisplayName,
  getCategoryColorScheme
} from '../lib/MenuConfig';

const MenuControls = () => {
  const [menuVisibility, setMenuVisibility] = useState({});
  const [userRoles, setUserRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('karyawan');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fallbackRoles = ['karyawan', 'admin', 'super_admin'];

  useEffect(() => {
    fetchMenuVisibility();
    fetchUserRoles();
  }, []);

  useEffect(() => {
    if (!userRoles.length) return;
    if (!userRoles.includes(selectedRole)) {
      setSelectedRole(userRoles[0]);
    }
  }, [userRoles, selectedRole]);

  const fetchUserRoles = async () => {
    try {
      // Ambil role unik dari user_profiles
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .not('role', 'is', null);

      if (error) throw error;

      const profileRoles = [...new Set((data || []).map(item => item.role).filter(Boolean))];
      const mergedRoles = [...new Set([...fallbackRoles, ...profileRoles])];
      setUserRoles(mergedRoles);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setUserRoles(fallbackRoles);
      toast.error('Gagal memuat daftar peran, menggunakan peran default');
    }
  };

  const fetchMenuVisibility = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('role_menu_visibility')
        .select('*');

      if (error) throw error;

      // Ubah ke format object agar mudah dikelola
      const visibilityMap = {};
      data.forEach(item => {
        if (!visibilityMap[item.role]) {
          visibilityMap[item.role] = {};
        }
        visibilityMap[item.role][item.menu_item_id] = item.is_visible;
      });

      setMenuVisibility(visibilityMap);
    } catch (error) {
      console.error('Error fetching menu visibility:', error);
      toast.error('Gagal memuat pengaturan visibilitas menu');
    } finally {
      setLoading(false);
    }
  };

  const updateMenuVisibility = async (role, menuItemId, isVisible) => {
    try {
      const { error } = await supabase
        .from('role_menu_visibility')
        .upsert({
          role,
          menu_item_id: menuItemId,
          is_visible: isVisible,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'role,menu_item_id'
        });

      if (error) throw error;

      // Perbarui state lokal
      setMenuVisibility(prev => ({
        ...prev,
        [role]: {
          ...prev[role],
          [menuItemId]: isVisible
        }
      }));

      toast.success(`Visibilitas menu diperbarui untuk ${role}`);
    } catch (error) {
      console.error('Error updating menu visibility:', error);
      toast.error('Gagal memperbarui visibilitas menu');
    }
  };

  const handleVisibilityChange = (menuItemId, checked) => {
    updateMenuVisibility(selectedRole, menuItemId, checked);
  };

  const getVisibilityForRole = (role, menuItemId) => {
    return menuVisibility[role]?.[menuItemId] ?? true; // Default: tampil
  };

  const saveAllChanges = async () => {
    try {
      setSaving(true);
      // Semua perubahan tersimpan otomatis, ini untuk umpan balik pengguna
      toast.success('Semua pengaturan visibilitas menu sudah tersimpan');
    } catch (error) {
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setSaving(true);

      // Reset visibilitas menu ke default berdasarkan role di MenuConfig
      const defaultVisibility = {};

      MENU_ITEMS.forEach(item => {
        item.roles.forEach(role => {
          if (!defaultVisibility[role]) {
            defaultVisibility[role] = {};
          }
          defaultVisibility[role][item.id] = true;
        });
      });

      // Perbarui ke database
      const updates = [];
      Object.keys(defaultVisibility).forEach(role => {
        Object.keys(defaultVisibility[role]).forEach(menuItemId => {
          updates.push({
            role,
            menu_item_id: menuItemId,
            is_visible: defaultVisibility[role][menuItemId],
            updated_at: new Date().toISOString()
          });
        });
      });

      const { error } = await supabase
        .from('role_menu_visibility')
        .upsert(updates, {
          onConflict: 'role,menu_item_id'
        });

      if (error) throw error;

      setMenuVisibility(defaultVisibility);
      toast.success('Visibilitas menu direset ke default');
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      toast.error('Gagal reset visibilitas menu');
    } finally {
      setSaving(false);
    }
  };

  const groupedMenuItems = MENU_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const getRoleStats = (role) => {
    const totalItems = MENU_ITEMS.length;
    const visibleItems = MENU_ITEMS.filter(item =>
      getVisibilityForRole(role, item.id)
    ).length;

    return { totalItems, visibleItems };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kontrol Menu</h1>
          <p className="text-gray-600">Kelola visibilitas dan izin akses menu per peran</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={resetToDefaults} disabled={saving}>
            <RefreshCw className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            Reset Default
          </Button>
          <Button onClick={saveAllChanges} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Simpan Perubahan
          </Button>
        </div>
      </div>

      {/* Pemilih peran */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Pilih Peran yang Akan Diatur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Label htmlFor="role-select">Peran:</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {userRoles.map(role => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span className="capitalize">{role}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Eye className="h-4 w-4" />
                <span>Tampil: {getRoleStats(selectedRole).visibleItems}</span>
              </div>
              <div className="flex items-center space-x-1">
                <EyeOff className="h-4 w-4" />
                <span>Disembunyikan: {getRoleStats(selectedRole).totalItems - getRoleStats(selectedRole).visibleItems}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kategori menu */}
      <div className="grid gap-6">
        {Object.entries(groupedMenuItems).map(([category, items]) => {
          const colorScheme = getCategoryColorScheme(category);
          const visibleCount = items.filter(item =>
            getVisibilityForRole(selectedRole, item.id)
          ).length;

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${colorScheme.bg}`}>
                      <Settings className={`h-5 w-5 ${colorScheme.icon}`} />
                    </div>
                    <span>{getCategoryDisplayName(category)}</span>
                    <Badge variant="outline" className={colorScheme.border}>
                      {visibleCount}/{items.length} tampil
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item) => {
                    const isVisible = getVisibilityForRole(selectedRole, item.id);
                    const hasAccessByDefault = item.roles.includes(selectedRole);

                    return (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${colorScheme.bg}`}>
                            <item.icon className={`h-5 w-5 ${colorScheme.icon}`} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {item.description}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {item.path}
                              </Badge>
                              {hasAccessByDefault ? (
                                <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Akses Default
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Tanpa Akses Default
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {hasAccessByDefault ? (
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={isVisible}
                                onCheckedChange={(checked) => handleVisibilityChange(item.id, checked)}
                              />
                              <Label className="text-sm">
                                {isVisible ? (
                                  <span className="text-green-600 flex items-center">
                                    <Eye className="h-4 w-4 mr-1" />
                                    Tampil
                                  </span>
                                ) : (
                                  <span className="text-red-600 flex items-center">
                                    <EyeOff className="h-4 w-4 mr-1" />
                                    Sembunyikan
                                  </span>
                                )}
                              </Label>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-gray-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-sm">Tidak Ada Akses</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabel ringkasan */}
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Izin Peran</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Peran</TableHead>
                <TableHead>Total Item Menu</TableHead>
                <TableHead>Item Tampil</TableHead>
                <TableHead>Item Tersembunyi</TableHead>
                <TableHead>Persentase Tampil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userRoles.map(role => {
                const stats = getRoleStats(role);
                const visibilityPercent = Math.round((stats.visibleItems / stats.totalItems) * 100);

                return (
                  <TableRow key={role}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {role}
                      </Badge>
                    </TableCell>
                    <TableCell>{stats.totalItems}</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {stats.visibleItems}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {stats.totalItems - stats.visibleItems}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-pink-600 h-2 rounded-full"
                            style={{ width: `${visibilityPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{visibilityPercent}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MenuControls;