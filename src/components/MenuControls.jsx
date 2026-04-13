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
  MENU_CATEGORIES,
  getMenuItemsByRole,
  getCategoryDisplayName,
  getCategoryColorScheme
} from '../lib/MenuConfig';

const MenuControls = () => {
  const [menuVisibility, setMenuVisibility] = useState({});
  const [userRoles, setUserRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMenuVisibility();
    fetchUserRoles();
  }, []);

  const fetchUserRoles = async () => {
    try {
      // Get distinct roles from user_profiles
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .not('role', 'is', null);

      if (error) throw error;

      const uniqueRoles = [...new Set(data.map(item => item.role))];
      setUserRoles(uniqueRoles);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      toast.error('Failed to load user roles');
    }
  };

  const fetchMenuVisibility = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('role_menu_visibility')
        .select('*');

      if (error) throw error;

      // Convert to object format for easier management
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
      toast.error('Failed to load menu visibility settings');
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

      // Update local state
      setMenuVisibility(prev => ({
        ...prev,
        [role]: {
          ...prev[role],
          [menuItemId]: isVisible
        }
      }));

      toast.success(`Menu visibility updated for ${role}`);
    } catch (error) {
      console.error('Error updating menu visibility:', error);
      toast.error('Failed to update menu visibility');
    }
  };

  const handleVisibilityChange = (menuItemId, checked) => {
    updateMenuVisibility(selectedRole, menuItemId, checked);
  };

  const getVisibilityForRole = (role, menuItemId) => {
    return menuVisibility[role]?.[menuItemId] ?? true; // Default to visible
  };

  const saveAllChanges = async () => {
    try {
      setSaving(true);
      // All changes are saved immediately, so this is just for user feedback
      toast.success('All menu visibility settings have been saved');
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setSaving(true);

      // Reset all menu visibility to default (based on MenuConfig roles)
      const defaultVisibility = {};

      MENU_ITEMS.forEach(item => {
        item.roles.forEach(role => {
          if (!defaultVisibility[role]) {
            defaultVisibility[role] = {};
          }
          defaultVisibility[role][item.id] = true;
        });
      });

      // Update database
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
      toast.success('Menu visibility reset to defaults');
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      toast.error('Failed to reset menu visibility');
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Controls</h1>
          <p className="text-gray-600">Manage menu visibility and access permissions by role</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={resetToDefaults} disabled={saving}>
            <RefreshCw className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            Reset to Defaults
          </Button>
          <Button onClick={saveAllChanges} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Role Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Select Role to Configure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Label htmlFor="role-select">Role:</Label>
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
                <span>Visible: {getRoleStats(selectedRole).visibleItems}</span>
              </div>
              <div className="flex items-center space-x-1">
                <EyeOff className="h-4 w-4" />
                <span>Hidden: {getRoleStats(selectedRole).totalItems - getRoleStats(selectedRole).visibleItems}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Categories */}
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
                      {visibleCount}/{items.length} visible
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
                                  Default Access
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  No Default Access
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
                                    Visible
                                  </span>
                                ) : (
                                  <span className="text-red-600 flex items-center">
                                    <EyeOff className="h-4 w-4 mr-1" />
                                    Hidden
                                  </span>
                                )}
                              </Label>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-gray-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-sm">No Access</span>
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

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Total Menu Items</TableHead>
                <TableHead>Visible Items</TableHead>
                <TableHead>Hidden Items</TableHead>
                <TableHead>Visibility %</TableHead>
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
                            className="bg-blue-600 h-2 rounded-full"
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