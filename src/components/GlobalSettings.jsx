import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/customSupabaseClient';
import {
  Settings,
  Save,
  RefreshCw,
  Globe,
  Shield,
  Database,
  Mail,
  Bell,
  Smartphone,
  Zap,
  Key,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

const GlobalSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Default settings structure
  const defaultSettings = {
    // System Settings
    system_name: 'Kost Rental System',
    system_version: '1.0.0',
    maintenance_mode: false,
    debug_mode: false,
    timezone: 'Asia/Jakarta',

    // Security Settings
    session_timeout: 3600, // 1 hour in seconds
    password_min_length: 8,
    password_require_special_chars: true,
    password_require_numbers: true,
    max_login_attempts: 5,
    lockout_duration: 900, // 15 minutes

    // Email Settings
    smtp_enabled: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: '',

    // Notification Settings
    email_notifications: true,
    push_notifications: false,
    sms_notifications: false,
    notification_retention_days: 30,

    // PWA Settings
    pwa_enabled: false,
    pwa_name: 'Kost Rental',
    pwa_short_name: 'KR',
    pwa_description: 'Apartment rental management system',
    pwa_theme_color: '#2563eb',
    pwa_background_color: '#ffffff',

    // API Settings
    api_rate_limit: 1000,
    api_key_expiry_days: 365,
    cors_origins: '',

    // Database Settings
    db_backup_enabled: true,
    db_backup_frequency: 'daily',
    db_backup_retention_days: 30,

    // Performance Settings
    cache_enabled: true,
    cache_ttl: 3600,
    compression_enabled: true,
    cdn_enabled: false
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) throw error;

      // Convert array of settings to object
      const settingsObj = { ...defaultSettings };
      data.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      setSettings(settingsObj);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load system settings');
      // Use defaults if fetch fails
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        [key]: value
      }));

      toast.success(`Setting "${key}" updated successfully`);
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error(`Failed to update setting "${key}"`);
    }
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async (key) => {
    await updateSetting(key, settings[key]);
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);

      const updates = Object.keys(settings).map(key => ({
        key,
        value: settings[key],
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast.success('All settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setSaving(true);
      setSettings(defaultSettings);

      const updates = Object.keys(defaultSettings).map(key => ({
        key,
        value: defaultSettings[key],
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast.success('Settings reset to defaults');
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Global Settings</h1>
          <p className="text-gray-600">Configure system-wide settings and preferences</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={resetToDefaults} disabled={saving}>
            <RefreshCw className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            Reset to Defaults
          </Button>
          <Button onClick={handleSaveAll} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>System</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Advanced</span>
          </TabsTrigger>
        </TabsList>

        {/* System Settings */}
        <TabsContent value="system">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="system_name">System Name</Label>
                    <Input
                      id="system_name"
                      value={settings.system_name}
                      onChange={(e) => handleInputChange('system_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="system_version">System Version</Label>
                    <Input
                      id="system_version"
                      value={settings.system_version}
                      onChange={(e) => handleInputChange('system_version', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={settings.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                        <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                        <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Switch
                      id="maintenance_mode"
                      checked={settings.maintenance_mode}
                      onCheckedChange={(checked) => handleInputChange('maintenance_mode', checked)}
                    />
                    <Label htmlFor="maintenance_mode" className="flex items-center space-x-2">
                      <span>Maintenance Mode</span>
                      {settings.maintenance_mode && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Authentication & Password Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="session_timeout">Session Timeout (seconds)</Label>
                    <Input
                      id="session_timeout"
                      type="number"
                      value={settings.session_timeout}
                      onChange={(e) => handleInputChange('session_timeout', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password_min_length">Minimum Password Length</Label>
                    <Input
                      id="password_min_length"
                      type="number"
                      value={settings.password_min_length}
                      onChange={(e) => handleInputChange('password_min_length', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_login_attempts">Max Login Attempts</Label>
                    <Input
                      id="max_login_attempts"
                      type="number"
                      value={settings.max_login_attempts}
                      onChange={(e) => handleInputChange('max_login_attempts', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lockout_duration">Lockout Duration (seconds)</Label>
                    <Input
                      id="lockout_duration"
                      type="number"
                      value={settings.lockout_duration}
                      onChange={(e) => handleInputChange('lockout_duration', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="password_require_special_chars"
                      checked={settings.password_require_special_chars}
                      onCheckedChange={(checked) => handleInputChange('password_require_special_chars', checked)}
                    />
                    <Label htmlFor="password_require_special_chars">
                      Require special characters
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="password_require_numbers"
                      checked={settings.password_require_numbers}
                      onCheckedChange={(checked) => handleInputChange('password_require_numbers', checked)}
                    />
                    <Label htmlFor="password_require_numbers">
                      Require numbers
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Notification Channels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="email_notifications"
                      checked={settings.email_notifications}
                      onCheckedChange={(checked) => handleInputChange('email_notifications', checked)}
                    />
                    <Label htmlFor="email_notifications" className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>Email Notifications</span>
                      {settings.email_notifications && (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Enabled
                        </Badge>
                      )}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="push_notifications"
                      checked={settings.push_notifications}
                      onCheckedChange={(checked) => handleInputChange('push_notifications', checked)}
                    />
                    <Label htmlFor="push_notifications" className="flex items-center space-x-2">
                      <Smartphone className="h-4 w-4" />
                      <span>Push Notifications</span>
                      {settings.push_notifications && (
                        <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Enabled
                        </Badge>
                      )}
                    </Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification_retention_days">Notification Retention (days)</Label>
                  <Input
                    id="notification_retention_days"
                    type="number"
                    value={settings.notification_retention_days}
                    onChange={(e) => handleInputChange('notification_retention_days', parseInt(e.target.value))}
                    className="w-32"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  SMTP Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="smtp_enabled"
                    checked={settings.smtp_enabled}
                    onCheckedChange={(checked) => handleInputChange('smtp_enabled', checked)}
                  />
                  <Label htmlFor="smtp_enabled">Enable SMTP</Label>
                </div>
                {settings.smtp_enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_host">SMTP Host</Label>
                      <Input
                        id="smtp_host"
                        value={settings.smtp_host}
                        onChange={(e) => handleInputChange('smtp_host', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp_port">SMTP Port</Label>
                      <Input
                        id="smtp_port"
                        type="number"
                        value={settings.smtp_port}
                        onChange={(e) => handleInputChange('smtp_port', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp_username">SMTP Username</Label>
                      <Input
                        id="smtp_username"
                        value={settings.smtp_username}
                        onChange={(e) => handleInputChange('smtp_username', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp_password">SMTP Password</Label>
                      <Input
                        id="smtp_password"
                        type="password"
                        value={settings.smtp_password}
                        onChange={(e) => handleInputChange('smtp_password', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp_from_email">From Email</Label>
                      <Input
                        id="smtp_from_email"
                        type="email"
                        value={settings.smtp_from_email}
                        onChange={(e) => handleInputChange('smtp_from_email', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp_from_name">From Name</Label>
                      <Input
                        id="smtp_from_name"
                        value={settings.smtp_from_name}
                        onChange={(e) => handleInputChange('smtp_from_name', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Database & Backup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="db_backup_enabled"
                    checked={settings.db_backup_enabled}
                    onCheckedChange={(checked) => handleInputChange('db_backup_enabled', checked)}
                  />
                  <Label htmlFor="db_backup_enabled">Enable Automatic Backups</Label>
                </div>
                {settings.db_backup_enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="db_backup_frequency">Backup Frequency</Label>
                      <Select value={settings.db_backup_frequency} onValueChange={(value) => handleInputChange('db_backup_frequency', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="db_backup_retention_days">Retention Period (days)</Label>
                      <Input
                        id="db_backup_retention_days"
                        type="number"
                        value={settings.db_backup_retention_days}
                        onChange={(e) => handleInputChange('db_backup_retention_days', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Performance & Caching
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="cache_enabled"
                    checked={settings.cache_enabled}
                    onCheckedChange={(checked) => handleInputChange('cache_enabled', checked)}
                  />
                  <Label htmlFor="cache_enabled">Enable Caching</Label>
                </div>
                {settings.cache_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="cache_ttl">Cache TTL (seconds)</Label>
                    <Input
                      id="cache_ttl"
                      type="number"
                      value={settings.cache_ttl}
                      onChange={(e) => handleInputChange('cache_ttl', parseInt(e.target.value))}
                      className="w-32"
                    />
                  </div>
                )}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="compression_enabled"
                      checked={settings.compression_enabled}
                      onCheckedChange={(checked) => handleInputChange('compression_enabled', checked)}
                    />
                    <Label htmlFor="compression_enabled">Enable Compression</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="cdn_enabled"
                      checked={settings.cdn_enabled}
                      onCheckedChange={(checked) => handleInputChange('cdn_enabled', checked)}
                    />
                    <Label htmlFor="cdn_enabled">Enable CDN</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  API Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="api_rate_limit">API Rate Limit (requests/hour)</Label>
                    <Input
                      id="api_rate_limit"
                      type="number"
                      value={settings.api_rate_limit}
                      onChange={(e) => handleInputChange('api_rate_limit', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api_key_expiry_days">API Key Expiry (days)</Label>
                    <Input
                      id="api_key_expiry_days"
                      type="number"
                      value={settings.api_key_expiry_days}
                      onChange={(e) => handleInputChange('api_key_expiry_days', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cors_origins">CORS Origins (comma-separated)</Label>
                  <Textarea
                    id="cors_origins"
                    value={settings.cors_origins}
                    onChange={(e) => handleInputChange('cors_origins', e.target.value)}
                    placeholder="https://example.com, https://app.example.com"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GlobalSettings;