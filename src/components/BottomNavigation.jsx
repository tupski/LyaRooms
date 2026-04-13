import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  BarChart3,
  Users,
  Settings,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  MENU_CATEGORIES,
  getAvailableCategoriesForRole,
  getMenuCountByCategory,
  getCategoryDisplayName,
  getCategoryColorScheme
} from '../lib/MenuConfig';

const BottomNavigation = ({ userRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const availableCategories = getAvailableCategoriesForRole(userRole);

  const categoryIcons = {
    [MENU_CATEGORIES.OPERATIONS]: Home,
    [MENU_CATEGORIES.ANALYTICS]: BarChart3,
    [MENU_CATEGORIES.MANAGEMENT]: Users,
    [MENU_CATEGORIES.SETTINGS]: Settings
  };

  const getCurrentCategory = () => {
    // Determine current category based on current path
    const currentPath = location.pathname;
    for (const category of availableCategories) {
      const categoryItems = getMenuCountByCategory(category, userRole);
      if (categoryItems > 0) {
        // This is a simplified check - in a real app you'd check if the current path matches any item in the category
        return category;
      }
    }
    return availableCategories[0] || MENU_CATEGORIES.OPERATIONS;
  };

  const currentCategory = getCurrentCategory();

  const handleCategoryClick = (category) => {
    // Navigate to the first available item in the category
    const categoryItems = getMenuCountByCategory(category, userRole);
    if (categoryItems > 0) {
      // For now, navigate to dashboard for operations, or a placeholder for others
      const defaultRoutes = {
        [MENU_CATEGORIES.OPERATIONS]: '/dashboard',
        [MENU_CATEGORIES.ANALYTICS]: '/income-dashboard',
        [MENU_CATEGORIES.MANAGEMENT]: '/user-management',
        [MENU_CATEGORIES.SETTINGS]: '/system-settings'
      };
      navigate(defaultRoutes[category] || '/dashboard');
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      {/* Main Navigation Bar */}
      <div className="flex items-center justify-around px-2 py-2">
        {availableCategories.map((category) => {
          const Icon = categoryIcons[category];
          const isActive = currentCategory === category;
          const itemCount = getMenuCountByCategory(category, userRole);
          const colorScheme = getCategoryColorScheme(category);

          return (
            <Button
              key={category}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center space-y-1 h-auto py-2 px-3 relative ${
                isActive
                  ? `${colorScheme.bg} ${colorScheme.text} border ${colorScheme.border}`
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => handleCategoryClick(category)}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? colorScheme.icon : ''}`} />
                {itemCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-xs"
                  >
                    {itemCount}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">
                {getCategoryDisplayName(category)}
              </span>
            </Button>
          );
        })}

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center space-y-1 h-auto py-2 px-3 text-gray-600 hover:text-gray-900"
          onClick={toggleExpanded}
        >
          {isExpanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronUp className="h-5 w-5" />
          )}
          <span className="text-xs font-medium">More</span>
        </Button>
      </div>

      {/* Expanded Menu Items */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            {availableCategories.map((category) => {
              const colorScheme = getCategoryColorScheme(category);
              const itemCount = getMenuCountByCategory(category, userRole);

              return (
                <div key={category} className="space-y-2">
                  <h3 className={`text-sm font-semibold ${colorScheme.text}`}>
                    {getCategoryDisplayName(category)}
                  </h3>
                  <div className="space-y-1">
                    {/* Show first few items or indicate count */}
                    <div className="text-xs text-gray-500">
                      {itemCount} item{itemCount !== 1 ? 's' : ''} available
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BottomNavigation;