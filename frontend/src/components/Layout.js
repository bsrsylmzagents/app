import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Calendar, Briefcase, DollarSign, 
  Users, TrendingUp, Package, Settings, 
  LogOut, Menu, X, ShoppingCart, FileText
} from 'lucide-react';
import CurrencyConverter from './CurrencyConverter';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const company = JSON.parse(localStorage.getItem('company') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    navigate('/login');
  };

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', testId: 'nav-dashboard' },
    { path: '/reservations', icon: Briefcase, label: 'Rezervasyonlar', testId: 'nav-reservations' },
    { path: '/calendar', icon: Calendar, label: 'Takvim', testId: 'nav-calendar' },
    { path: '/extra-sales', icon: ShoppingCart, label: 'Açık Satışlar', testId: 'nav-extra-sales' },
    { path: '/cari-accounts', icon: Users, label: 'Cari Firmalar', testId: 'nav-cari' },
    { path: '/seasonal-prices', icon: DollarSign, label: 'Dönemsel Fiyatlar', testId: 'nav-seasonal-prices' },
    { path: '/service-purchases', icon: Package, label: 'Hizmet Al', testId: 'nav-service-purchases' },
    { path: '/reports', icon: FileText, label: 'Raporlar', testId: 'nav-reports' },
    { path: '/vehicles', icon: TrendingUp, label: 'Envanter', testId: 'nav-vehicles' },
    { path: '/settings', icon: Settings, label: 'Ayarlar', testId: 'nav-settings' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-[#0a0e1a] to-[#0f1419]">
      {/* Sidebar */}
      <aside className={`sidebar fixed lg:relative inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-[#14b8dc]/20">
            <div>
              <h1 className="text-2xl font-bold text-[#14b8dc]" data-testid="app-logo">TravelSystem</h1>
              <p className="text-xs text-gray-400 mt-1">{company.name}</p>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="lg:hidden text-gray-400 hover:text-white"
              data-testid="close-sidebar-btn"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      data-testid={item.testId}
                      className={`nav-item flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
                        isActive ? 'active text-[#14b8dc]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Profile */}
          <div className="px-4 py-4 border-t border-[#14b8dc]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14b8dc] to-[#106ebe] flex items-center justify-center text-white font-semibold">
                  {user.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white" data-testid="user-name">{user.full_name}</p>
                  <p className="text-xs text-gray-400">{user.is_admin ? 'Admin' : 'Kullanıcı'}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                className="text-gray-400 hover:text-red-400 transition-colors"
                data-testid="logout-btn"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="header-gradient px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden text-gray-400 hover:text-white"
              data-testid="open-sidebar-btn"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-white">ATV Tur Yönetim Sistemi</h2>
              <p className="text-sm text-gray-400">Firma Kodu: <span className="text-[#14b8dc]">{company.code}</span></p>
            </div>
          </div>
          
          <CurrencyConverter />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
