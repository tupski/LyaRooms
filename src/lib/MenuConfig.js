import {
  Home,
  Plus,
  Edit,
  BarChart3,
  TrendingUp,
  Users,
  Settings,
  Shield,
  FileText,
  Calendar,
  DollarSign,
  Building,
  UserCheck,
  Key,
  Bell,
  Database,
  Lock,
  Globe,
  Smartphone,
  Monitor,
  Zap,
  Activity,
  PieChart
} from 'lucide-react';

// Menu Categories
export const MENU_CATEGORIES = {
  OPERATIONS: 'operations',
  ANALYTICS: 'analytics',
  MANAGEMENT: 'management',
  SETTINGS: 'settings'
};

// Menu Items Configuration
export const MENU_ITEMS = [
  // Operations Category
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: Home,
    path: '/dashboard',
    category: MENU_CATEGORIES.OPERATIONS,
    priority: 1,
    roles: ['user', 'admin', 'super_admin'],
    description: 'Main dashboard overview'
  },
  {
    id: 'add-transaction',
    name: 'Add Transaction',
    icon: Plus,
    path: '/add-transaction',
    category: MENU_CATEGORIES.OPERATIONS,
    priority: 2,
    roles: ['user', 'admin', 'super_admin'],
    description: 'Create new rental transaction'
  },
  {
    id: 'edit-transaction',
    name: 'Edit Transaction',
    icon: Edit,
    path: '/edit-transaction',
    category: MENU_CATEGORIES.OPERATIONS,
    priority: 3,
    roles: ['admin', 'super_admin'],
    description: 'Modify existing transactions'
  },
  {
    id: 'room-availability',
    name: 'Room Availability',
    icon: Building,
    path: '/room-availability',
    category: MENU_CATEGORIES.OPERATIONS,
    priority: 4,
    roles: ['user', 'admin', 'super_admin'],
    description: 'Check room availability'
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: Calendar,
    path: '/calendar',
    category: MENU_CATEGORIES.OPERATIONS,
    priority: 5,
    roles: ['user', 'admin', 'super_admin'],
    description: 'Booking calendar view'
  },

  // Analytics Category
  {
    id: 'income-dashboard',
    name: 'Income Dashboard',
    icon: DollarSign,
    path: '/income-dashboard',
    category: MENU_CATEGORIES.ANALYTICS,
    priority: 1,
    roles: ['admin', 'super_admin'],
    description: 'Revenue analytics and reports'
  },
  {
    id: 'revenue-chart',
    name: 'Revenue Chart',
    icon: BarChart3,
    path: '/revenue-chart',
    category: MENU_CATEGORIES.ANALYTICS,
    priority: 2,
    roles: ['admin', 'super_admin'],
    description: 'Detailed revenue charts'
  },
  {
    id: 'marketing-ranking',
    name: 'Marketing Ranking',
    icon: TrendingUp,
    path: '/marketing-ranking',
    category: MENU_CATEGORIES.ANALYTICS,
    priority: 3,
    roles: ['admin', 'super_admin'],
    description: 'Marketing performance ranking'
  },
  {
    id: 'occupancy-report',
    name: 'Occupancy Report',
    icon: PieChart,
    path: '/occupancy-report',
    category: MENU_CATEGORIES.ANALYTICS,
    priority: 4,
    roles: ['admin', 'super_admin'],
    description: 'Room occupancy analytics'
  },

  // Management Category
  {
    id: 'user-management',
    name: 'User Management',
    icon: Users,
    path: '/user-management',
    category: MENU_CATEGORIES.MANAGEMENT,
    priority: 1,
    roles: ['super_admin'],
    description: 'Manage system users'
  },
  {
    id: 'menu-controls',
    name: 'Menu Controls',
    icon: Settings,
    path: '/menu-controls',
    category: MENU_CATEGORIES.MANAGEMENT,
    priority: 2,
    roles: ['super_admin'],
    description: 'Control menu access and permissions'
  },
  {
    id: 'billing-requests',
    name: 'Billing Requests',
    icon: FileText,
    path: '/billing-requests',
    category: MENU_CATEGORIES.MANAGEMENT,
    priority: 3,
    roles: ['admin', 'super_admin'],
    description: 'Handle billing requests'
  },
  {
    id: 'room-management',
    name: 'Room Management',
    icon: Key,
    path: '/room-management',
    category: MENU_CATEGORIES.MANAGEMENT,
    priority: 4,
    roles: ['admin', 'super_admin'],
    description: 'Manage room inventory'
  },
  {
    id: 'activity-logs',
    name: 'Activity Logs',
    icon: Activity,
    path: '/activity-logs',
    category: MENU_CATEGORIES.MANAGEMENT,
    priority: 5,
    roles: ['admin', 'super_admin'],
    description: 'System activity monitoring'
  },

  // Settings Category
  {
    id: 'system-settings',
    name: 'System Settings',
    icon: Settings,
    path: '/system-settings',
    category: MENU_CATEGORIES.SETTINGS,
    priority: 1,
    roles: ['super_admin'],
    description: 'Global system configuration'
  },
  {
    id: 'security-settings',
    name: 'Security Settings',
    icon: Shield,
    path: '/security-settings',
    category: MENU_CATEGORIES.SETTINGS,
    priority: 2,
    roles: ['admin', 'super_admin'],
    description: 'Security and access controls'
  },
  {
    id: 'notification-settings',
    name: 'Notifications',
    icon: Bell,
    path: '/notification-settings',
    category: MENU_CATEGORIES.SETTINGS,
    priority: 3,
    roles: ['user', 'admin', 'super_admin'],
    description: 'Notification preferences'
  },
  {
    id: 'backup-restore',
    name: 'Backup & Restore',
    icon: Database,
    path: '/backup-restore',
    category: MENU_CATEGORIES.SETTINGS,
    priority: 4,
    roles: ['super_admin'],
    description: 'Data backup and restore'
  },
  {
    id: 'pwa-settings',
    name: 'PWA Settings',
    icon: Smartphone,
    path: '/pwa-settings',
    category: MENU_CATEGORIES.SETTINGS,
    priority: 5,
    roles: ['super_admin'],
    description: 'Progressive Web App configuration'
  },
  {
    id: 'api-settings',
    name: 'API Settings',
    icon: Globe,
    path: '/api-settings',
    category: MENU_CATEGORIES.SETTINGS,
    priority: 6,
    roles: ['super_admin'],
    description: 'API configuration and keys'
  },
  {
    id: 'performance-monitor',
    name: 'Performance',
    icon: Zap,
    path: '/performance-monitor',
    category: MENU_CATEGORIES.SETTINGS,
    priority: 7,
    roles: ['admin', 'super_admin'],
    description: 'System performance monitoring'
  },
  {
    id: 'audit-logs',
    name: 'Audit Logs',
    icon: Lock,
    path: '/audit-logs',
    category: MENU_CATEGORIES.SETTINGS,
    priority: 8,
    roles: ['super_admin'],
    description: 'Security audit logs'
  }
];

// Helper Functions
export const getMenuItemsByRole = (role) => {
  return MENU_ITEMS.filter(item => item.roles.includes(role));
};

export const getOrganizedMenuByRole = (role) => {
  const userItems = getMenuItemsByRole(role);
  const organized = {};

  Object.values(MENU_CATEGORIES).forEach(category => {
    organized[category] = userItems
      .filter(item => item.category === category)
      .sort((a, b) => a.priority - b.priority);
  });

  return organized;
};

export const hasAccessToMenuItem = (menuItemId, userRole) => {
  const item = MENU_ITEMS.find(item => item.id === menuItemId);
  return item && item.roles.includes(userRole);
};

export const canAccessCategory = (category, userRole) => {
  return getMenuItemsByRole(userRole).some(item => item.category === category);
};

export const getSpecialMenuItems = (userRole) => {
  return getMenuItemsByRole(userRole).filter(item =>
    item.id.includes('management') || item.id.includes('settings')
  );
};

export const getItemsByCategory = (category) => {
  return MENU_ITEMS.filter(item => item.category === category)
    .sort((a, b) => a.priority - b.priority);
};

export const getMenuItemsSortedByPriority = (userRole) => {
  return getMenuItemsByRole(userRole).sort((a, b) => a.priority - b.priority);
};

export const searchMenuItems = (query, userRole) => {
  const userItems = getMenuItemsByRole(userRole);
  const lowerQuery = query.toLowerCase();
  return userItems.filter(item =>
    item.name.toLowerCase().includes(lowerQuery) ||
    item.description.toLowerCase().includes(lowerQuery)
  );
};

export const getMenuItemById = (id) => {
  return MENU_ITEMS.find(item => item.id === id);
};

export const getMenuItemWithStyles = (id, userRole) => {
  const item = getMenuItemById(id);
  if (!item || !hasAccessToMenuItem(id, userRole)) return null;

  return {
    ...item,
    styles: getCategoryColorScheme(item.category)
  };
};

export const getCategoryColorScheme = (category) => {
  const schemes = {
    [MENU_CATEGORIES.OPERATIONS]: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: 'text-blue-600'
    },
    [MENU_CATEGORIES.ANALYTICS]: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: 'text-green-600'
    },
    [MENU_CATEGORIES.MANAGEMENT]: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: 'text-purple-600'
    },
    [MENU_CATEGORIES.SETTINGS]: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
      icon: 'text-gray-600'
    }
  };

  return schemes[category] || schemes[MENU_CATEGORIES.OPERATIONS];
};

export const countMenuItemsByRole = (userRole) => {
  return getMenuItemsByRole(userRole).length;
};

export const getCategoryStats = (userRole) => {
  const organized = getOrganizedMenuByRole(userRole);
  const stats = {};

  Object.keys(organized).forEach(category => {
    stats[category] = organized[category].length;
  });

  return stats;
};

export const hasPermission = (permission, userRole) => {
  // This could be expanded to check specific permissions
  return getMenuItemsByRole(userRole).some(item => item.id === permission);
};

export const getPermissionsForRole = (userRole) => {
  return getMenuItemsByRole(userRole).map(item => item.id);
};

export const getBreadcrumbPath = (menuItemId) => {
  const item = getMenuItemById(menuItemId);
  if (!item) return [];

  return [
    { name: 'Home', path: '/dashboard' },
    { name: getCategoryDisplayName(item.category), path: null },
    { name: item.name, path: item.path }
  ];
};

export const isCategoryEmpty = (category, userRole) => {
  return getOrganizedMenuByRole(userRole)[category]?.length === 0;
};

export const getAvailableCategoriesForRole = (userRole) => {
  const organized = getOrganizedMenuByRole(userRole);
  return Object.keys(organized).filter(category => organized[category].length > 0);
};

export const getMenuCountByCategory = (category, userRole) => {
  return getOrganizedMenuByRole(userRole)[category]?.length || 0;
};

export const getHighestPriorityInCategory = (category, userRole) => {
  const items = getOrganizedMenuByRole(userRole)[category] || [];
  return items.length > 0 ? items[0] : null;
};

export const getMenuItemsByPermission = (permissions, userRole) => {
  const userItems = getMenuItemsByRole(userRole);
  return userItems.filter(item => permissions.includes(item.id));
};

export const getRoleHierarchyLevel = (role) => {
  const levels = {
    user: 1,
    admin: 2,
    super_admin: 3
  };
  return levels[role] || 0;
};

export const hasMorePrivileges = (userRole, requiredRole) => {
  return getRoleHierarchyLevel(userRole) >= getRoleHierarchyLevel(requiredRole);
};

// Utility function to get category display name
export const getCategoryDisplayName = (category) => {
  const names = {
    [MENU_CATEGORIES.OPERATIONS]: 'Operations',
    [MENU_CATEGORIES.ANALYTICS]: 'Analytics',
    [MENU_CATEGORIES.MANAGEMENT]: 'Management',
    [MENU_CATEGORIES.SETTINGS]: 'Settings'
  };
  return names[category] || 'Unknown';
};

// Export default
export default {
  MENU_CATEGORIES,
  MENU_ITEMS,
  getMenuItemsByRole,
  getOrganizedMenuByRole,
  hasAccessToMenuItem,
  canAccessCategory,
  getSpecialMenuItems,
  getItemsByCategory,
  getMenuItemsSortedByPriority,
  searchMenuItems,
  getMenuItemById,
  getMenuItemWithStyles,
  getCategoryColorScheme,
  countMenuItemsByRole,
  getCategoryStats,
  hasPermission,
  getPermissionsForRole,
  getBreadcrumbPath,
  isCategoryEmpty,
  getAvailableCategoriesForRole,
  getMenuCountByCategory,
  getHighestPriorityInCategory,
  getMenuItemsByPermission,
  getRoleHierarchyLevel,
  hasMorePrivileges,
  getCategoryDisplayName
};