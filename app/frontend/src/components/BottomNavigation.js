import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const BottomNavigation = ({ menuItems, filteredMenuItems }) => {
  const location = useLocation();

  // Show ALL menu items from the sidebar (no limit)
  const allMenuItems = filteredMenuItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex overflow-x-auto no-scrollbar md:hidden">
      <div className="flex">
        {allMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
            (item.path === '/settings' && location.pathname.startsWith('/settings')) ||
            (item.path === '/cash' && location.pathname.startsWith('/cash')) ||
            (item.path === '/customers' && location.pathname.startsWith('/customers'));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 py-3 min-w-[75px] w-20 transition-colors ${
                isActive 
                  ? 'text-orange-600' 
                  : 'text-gray-500'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;





