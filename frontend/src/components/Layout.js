import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Calendar, Briefcase, DollarSign, 
  Users, TrendingUp, Package, Settings, 
  LogOut, Menu, X, ShoppingCart, FileText, ArrowLeft, Wallet, ChevronDown, ExternalLink, Calendar as CalendarIcon, Bell, Clock, Sun, Moon, CheckSquare, Square
} from 'lucide-react';
import CurrencyConverter from './CurrencyConverter';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { API } from '../App';
import { format } from 'date-fns';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [companyModules, setCompanyModules] = useState({});
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const company = JSON.parse(localStorage.getItem('company') || '{}');
  const profileDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    navigate('/login');
  };

  const isAdmin = user.role === 'admin' || (user.is_admin && company.code === '1000');
  const isAdminView = localStorage.getItem('is_admin_view') === 'true';
  // Owner kontrolü: Firma sahibi (ilk oluşturulan admin user) tüm yetkilere sahip
  const isOwner = user.is_admin && company.code !== '1000'; // Sistem admini değil, firma sahibi

  // Firma bilgilerini yükle
  useEffect(() => {
    if (profileDropdownOpen) {
      fetchCompanyInfo();
    }
  }, [profileDropdownOpen]);

  // Dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const fetchCompanyInfo = async () => {
    try {
      const response = await axios.get(`${API}/company/profile`);
      setCompanyInfo(response.data);
      // Also fetch modules
      const modulesResponse = await axios.get(`${API}/companies/me`);
      setCompanyModules(modulesResponse.data.company?.modules_enabled || {});
    } catch (error) {
      console.error('Firma bilgileri yüklenemedi:', error);
    }
  };

  // Fetch company modules
  const fetchCompanyModules = async () => {
    try {
      const response = await axios.get(`${API}/companies/me`);
      setCompanyModules(response.data.company?.modules_enabled || {});
    } catch (error) {
      console.error('Company modules fetch error:', error);
    }
  };

  // Fetch company modules on mount
  useEffect(() => {
    fetchCompanyModules();
  }, []);

  // Kalan paket süresini hesapla
  const getRemainingDays = () => {
    if (!companyInfo?.package_end_date) return null;
    const endDate = new Date(companyInfo.package_end_date);
    const now = new Date();
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Bildirimleri yükle (tur başlangıcı için)
  useEffect(() => {
    fetchNotifications();
    // Her dakika kontrol et
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Notification dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setNotificationDropdownOpen(false);
      }
    };

    if (notificationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationDropdownOpen]);

  // localStorage'dan okundu bildirimleri yükle
  const getReadNotifications = () => {
    try {
      const read = localStorage.getItem('read_notifications');
      return read ? JSON.parse(read) : [];
    } catch (error) {
      return [];
    }
  };

  // Bildirimi okundu olarak işaretle
  const markNotificationAsRead = (notificationId) => {
    try {
      const read = getReadNotifications();
      if (!read.includes(notificationId)) {
        read.push(notificationId);
        localStorage.setItem('read_notifications', JSON.stringify(read));
        // Bildirimleri güncelle
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        // Okunmamış sayısını güncelle
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Bildirim okundu olarak işaretlenemedi:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      // Okundu bildirimleri yükle
      const readNotifications = getReadNotifications();
      
      // Pending reservations bildirimlerini getir
      let pendingNotifications = [];
      let pendingCount = 0;
      try {
        const pendingResponse = await axios.get(`${API}/notifications`, {
          params: { unread_only: true }
        });
        pendingNotifications = (pendingResponse.data?.notifications || []).filter(n => 
          n.type === 'pending_reservation' && !readNotifications.includes(n.id)
        );
        pendingCount = pendingResponse.data?.unread_count || 0;
      } catch (error) {
        console.error('Pending notifications yüklenemedi:', error);
      }
      
      // Bugünkü rezervasyonları getir
      const response = await axios.get(`${API}/reservations`, {
        params: { 
          date_from: today,
          date_to: today,
          status: 'confirmed'
        }
      });
      
      const reservations = response.data || [];
      
      // Tur başlangıcı bildirimleri oluştur (tur başlangıcından 30 dakika önce başlayarak, tur başlangıcına kadar)
      const upcomingTours = reservations.filter(reservation => {
        if (!reservation.date || !reservation.time) return false;
        
        const reservationDateTime = new Date(`${reservation.date}T${reservation.time}:00`);
        const now = new Date();
        const diffMinutes = (reservationDateTime - now) / (1000 * 60);
        
        // 30 dakika öncesinden başlayarak, tur başlangıcına kadar bildirim göster
        // Yani: -30 <= diffMinutes <= 0 (tur başlangıcından 30 dk önce ile tur başlangıcı arası)
        return diffMinutes <= 30 && diffMinutes >= -30;
      });
      
      // Bildirimleri formatla
      const formattedNotifications = upcomingTours.map(reservation => {
        const reservationDateTime = new Date(`${reservation.date}T${reservation.time}:00`);
        const now = new Date();
        const diffMinutes = Math.floor((reservationDateTime - now) / (1000 * 60));
        
        let message = '';
        if (diffMinutes < 0) {
          message = `Tur başladı (${Math.abs(diffMinutes)} dakika önce)`;
        } else if (diffMinutes === 0) {
          message = 'Tur şimdi başlıyor';
        } else {
          message = `Tur ${diffMinutes} dakika sonra başlayacak`;
        }
        
        // Okundu durumunu kontrol et
        const isRead = readNotifications.includes(reservation.id);
        
        return {
          id: reservation.id,
          type: 'tour_start',
          title: 'Tur Başlangıcı',
          message: message,
          reservation: reservation,
          time: reservation.time,
          date: reservation.date,
          customer: reservation.customer_name,
          tourType: reservation.tour_type_name,
          atvCount: reservation.atv_count,
          createdAt: new Date().toISOString(),
          read: isRead
        };
      });
      
      // Pending reservations bildirimlerini formatla ve ekle
      const formattedPendingNotifications = pendingNotifications.map(notif => ({
        id: notif.id,
        type: 'pending_reservation',
        title: notif.title || 'Yeni Rezervasyon Talebi',
        message: notif.message,
        entity_id: notif.entity_id,
        createdAt: notif.created_at || new Date().toISOString(),
        read: false
      }));
      
      // Tüm bildirimleri birleştir
      const allNotifications = [...formattedPendingNotifications, ...formattedNotifications];
      
      // En yeni bildirimler üstte
      allNotifications.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date).getTime();
        const timeB = new Date(b.createdAt || b.date).getTime();
        return timeB - timeA;
      });
      
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.read).length + pendingCount);
    } catch (error) {
      console.error('Bildirimler yüklenemedi:', error);
    }
  };

  const handleExitAdminView = () => {
    // Admin bilgilerini geri yükle
    const adminUser = sessionStorage.getItem('admin_user');
    const adminCompany = sessionStorage.getItem('admin_company');
    const adminToken = sessionStorage.getItem('admin_token');
    
    if (adminUser && adminCompany && adminToken) {
      localStorage.setItem('user', adminUser);
      localStorage.setItem('company', adminCompany);
      localStorage.setItem('token', adminToken);
      localStorage.removeItem('is_admin_view');
      sessionStorage.removeItem('admin_user');
      sessionStorage.removeItem('admin_company');
      sessionStorage.removeItem('admin_token');
      
      navigate('/admin/customers');
    } else {
      // Session storage'da bilgi yoksa admin paneline yönlendir
      localStorage.removeItem('is_admin_view');
      navigate('/admin/customers');
    }
  };
  
  // Permission kontrolü için user bilgilerini al
  const userPermissions = user.permissions || {};
  const hasStaffManagement = isAdmin || isOwner || (userPermissions.settings?.staff_management === true);

  // Get active module from localStorage or default to 'tour'
  const activeModule = localStorage.getItem('activeModule') || 'tour';

  // Modül bazlı menü yapısı
  const moduleMenus = {
    tour: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard', testId: 'nav-dashboard', permission: 'dashboard.view' },
      { path: '/reservations', icon: Briefcase, label: 'Rezervasyonlar', testId: 'nav-reservations', permission: 'reservation.create' },
      { path: '/calendar', icon: Calendar, label: 'Takvim', testId: 'nav-calendar', permission: 'reservation.create' },
      { path: '/cari-accounts', icon: Users, label: 'Cari Firmalar', testId: 'nav-cari', permission: 'cari.view' },
      { path: '/seasonal-prices', icon: DollarSign, label: 'Fiyat Yönetimi', testId: 'nav-seasonal-prices', permission: 'reservation.edit_price' },
      { path: '/extra-sales', icon: ShoppingCart, label: 'Açık Satışlar', testId: 'nav-extra-sales', permission: 'finance.view_revenue' },
      { path: '/service-purchases', icon: Package, label: 'Hizmet Al', testId: 'nav-service-purchases', permission: 'finance.kasa_edit' },
      { path: '/cash', icon: Wallet, label: 'Kasa', testId: 'nav-cash', permission: 'finance.kasa_view' },
      { path: '/reports', icon: FileText, label: 'Raporlar', testId: 'nav-reports', permission: 'reports.view_all_reports' },
      { path: '/inventory', icon: TrendingUp, label: 'Envanter', testId: 'nav-inventory', permission: 'atv.view' },
      { path: '/settings', icon: Settings, label: 'Ayarlar', testId: 'nav-settings', permission: 'settings.view' },
    ]
  };

  // Aktif modüle göre menüleri al
  const menuItems = moduleMenus[activeModule] || moduleMenus.tour;

  // Permission kontrolü yapan helper fonksiyon
  const hasPermission = (permission) => {
    // Sistem admini veya firma sahibi (owner) her şeyi yapabilir
    if (isAdmin || isOwner) return true;
    // Web panel aktif değilse hiçbir yetki yok
    if (user.web_panel_active === false) return false;
    // Permission string'i parse et (module.action formatında)
    const [module, action] = permission.split('.');
    if (!module || !action) return false;
    // Permissions objesinden kontrol et
    return userPermissions[module]?.[action] === true;
  };

  // Yetkisi olan menü item'larını filtrele
  const filteredMenuItems = menuItems.filter(item => {
    // Permission check
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  // Admin panel menüsü (sadece admin'e görünür)
  const adminMenuItems = isAdmin ? [
    { path: '/admin/customers', icon: Users, label: 'Müşteriler', testId: 'nav-admin-customers' },
    { path: '/admin/customers/new', icon: Users, label: 'Yeni Müşteri', testId: 'nav-admin-new-customer' },
  ] : [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#1E1E1E]">
      {/* Sidebar */}
      <aside className={`sidebar fixed lg:relative inset-y-0 left-0 z-[9999] w-64 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-[#2D2F33]">
            <div>
              <h1 className="text-2xl font-bold text-[#3EA6FF]" data-testid="app-logo">TravelSystem</h1>
              <p className="text-xs text-[#A5A5A5] mt-1">{company.name}</p>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="lg:hidden text-[#A5A5A5] hover:text-white"
              data-testid="close-sidebar-btn"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <ul className="space-y-2">
              {/* Admin Panel Menüsü */}
              {adminMenuItems.length > 0 && (
                <>
                  <li className="px-4 py-2">
                    <div className="text-xs font-semibold text-[#3EA6FF] uppercase tracking-wider">Panel</div>
                  </li>
                  {adminMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          data-testid={item.testId}
                          className={`nav-item flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
                            isActive ? 'active text-[#3EA6FF]' : 'text-[#A5A5A5] hover:text-white'
                          }`}
                        >
                          <Icon size={20} />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                  <li className="px-4 py-2 mt-4">
                    <div className="border-t border-[#2D2F33]"></div>
                  </li>
                </>
              )}
              {/* Normal Menü */}
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || 
                  (item.path === '/settings' && location.pathname.startsWith('/settings')) ||
                  (item.path === '/cash' && location.pathname.startsWith('/cash'));
                
                // Settings için özel render
                if (item.path === '/settings') {
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        data-testid={item.testId}
                        className={`nav-item flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
                          isActive ? 'active text-[#3EA6FF]' : 'text-[#A5A5A5] hover:text-white'
                        }`}
                      >
                        <Icon size={20} />
                        <span>{item.label}</span>
                      </Link>
                      {/* Settings submenu */}
                      {isActive && (
                        <ul className="ml-4 mt-2 space-y-1">
                          {hasPermission('settings.tur_types') && (
                            <li>
                              <Link
                                to="/settings/tour-types"
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                                  location.pathname === '/settings/tour-types'
                                    ? 'bg-[#3EA6FF]/20 text-[#3EA6FF]'
                                    : 'text-[#A5A5A5] hover:bg-[#2D2F33] hover:text-white'
                                }`}
                              >
                                Tur Tipleri
                              </Link>
                            </li>
                          )}
                          {hasPermission('settings.payment_types') && (
                            <li>
                              <Link
                                to="/settings/payment-types"
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                                  location.pathname === '/settings/payment-types'
                                    ? 'bg-[#3EA6FF]/20 text-[#3EA6FF]'
                                    : 'text-[#A5A5A5] hover:bg-[#2D2F33] hover:text-white'
                                }`}
                              >
                                Ödeme Yöntemleri
                              </Link>
                            </li>
                          )}
                          {hasStaffManagement && (
                            <li>
                              <Link
                                to="/settings/staff"
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                                  location.pathname === '/settings/staff'
                                    ? 'bg-[#3EA6FF]/20 text-[#3EA6FF]'
                                    : 'text-[#A5A5A5] hover:bg-[#2D2F33] hover:text-white'
                                }`}
                              >
                                Personel Yönetimi
                              </Link>
                            </li>
                          )}
                        </ul>
                      )}
                    </li>
                  );
                }
                
                // Normal menü item'ları
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      data-testid={item.testId}
                      className={`nav-item flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
                        isActive ? 'active text-[#3EA6FF]' : 'text-[#A5A5A5] hover:text-white'
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
          <div className="px-4 py-4 border-t border-[#2D2F33] relative z-[10001]" ref={profileDropdownRef}>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-3 hover:bg-[#2D2F33] p-2 rounded-lg transition-colors cursor-pointer flex-1"
              >
                <div className="w-10 h-10 rounded-full bg-[#3EA6FF] flex items-center justify-center text-white font-semibold">
                  {user.full_name?.charAt(0).toUpperCase() || company.name?.charAt(0).toUpperCase() || 'F'}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-white truncate" data-testid="user-name">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-xs text-[#A5A5A5] truncate">
                    {company.name || 'Firma Profili'}
                  </p>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`text-[#A5A5A5] transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <button 
                onClick={handleLogout} 
                className="text-[#A5A5A5] hover:text-red-400 transition-colors ml-2"
                data-testid="logout-btn"
              >
                <LogOut size={20} />
              </button>
            </div>

            {/* Profile Dropdown */}
            {profileDropdownOpen && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#1E1E1E] border border-[#2D2F33] rounded-lg shadow-xl z-[10002] overflow-hidden max-h-[500px] overflow-y-auto">
                <div className="p-4 space-y-4">
                  {/* Paket Kullanım Süresi */}
                  {companyInfo?.package_end_date ? (
                    <div className="pb-3 border-b border-[#2D2F33]">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarIcon size={16} className="text-[#3EA6FF]" />
                        <span className="text-xs text-[#A5A5A5]">Paket Kullanım Süresi</span>
                      </div>
                      {(() => {
                        const remainingDays = getRemainingDays();
                        if (remainingDays === null) return null;
                        const isExpired = remainingDays < 0;
                        const isExpiringSoon = remainingDays <= 7 && remainingDays >= 0;
                        return (
                          <div>
                            <p className={`text-sm font-semibold ${
                              isExpired ? 'text-red-400' : 
                              isExpiringSoon ? 'text-yellow-400' : 
                              'text-[#3EA6FF]'
                            }`}>
                              {isExpired 
                                ? `Süresi Doldu (${Math.abs(remainingDays)} gün önce)`
                                : `Kalan Süre: ${remainingDays} gün`
                              }
                            </p>
                            {companyInfo.package_start_date && (
                              <p className="text-xs text-[#A5A5A5] mt-1">
                                {new Date(companyInfo.package_start_date).toLocaleDateString('tr-TR')} - {new Date(companyInfo.package_end_date).toLocaleDateString('tr-TR')}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="pb-3 border-b border-[#2D2F33]">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarIcon size={16} className="text-red-400" />
                        <span className="text-xs text-[#A5A5A5]">Paket Kullanım Süresi</span>
                      </div>
                      <p className="text-sm font-semibold text-red-400">Paket bulunamadı</p>
                    </div>
                  )}

                  {/* Firma Kodu */}
                  {company.code && (
                    <div className="pb-3 border-b border-[#2D2F33]">
                      <p className="text-xs text-[#A5A5A5] mb-1">Firma Kodu</p>
                      <p className="text-sm font-semibold text-[#3EA6FF]">{company.code}</p>
                    </div>
                  )}

                  {/* Detay Linki */}
                  <Link
                    to="/company-profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center justify-between w-full px-3 py-2 bg-[#2D2F33] hover:bg-[#3EA6FF]/20 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-white">Detay</span>
                    <ExternalLink size={14} className="text-[#A5A5A5] group-hover:text-[#3EA6FF]" />
                  </Link>

                  {/* Paketler */}
                  <div className="pt-2 border-t border-[#2D2F33]">
                    <div className="flex items-center gap-2 mb-3">
                      <Package size={16} className="text-[#3EA6FF]" />
                      <span className="text-sm font-semibold text-white">Paketler</span>
                    </div>
                    <div className="space-y-2">
                      {/* Mevcut Paket */}
                      {companyInfo?.package_end_date ? (
                        <div className="px-3 py-2 bg-[#2D2F33] rounded-lg">
                          <p className="text-xs text-[#A5A5A5] mb-1">Mevcut Paket</p>
                          <p className="text-sm text-white">
                            {companyInfo.package_start_date && companyInfo.package_end_date
                              ? `${new Date(companyInfo.package_start_date).toLocaleDateString('tr-TR')} - ${new Date(companyInfo.package_end_date).toLocaleDateString('tr-TR')}`
                              : 'Aktif Paket'
                            }
                          </p>
                        </div>
                      ) : (
                        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <p className="text-xs text-red-400">Paket bulunamadı</p>
                        </div>
                      )}
                      
                      {/* Paket Yükselt Butonu */}
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          // Paket yükseltme sayfasına yönlendir veya modal aç
                          // Şimdilik company-profile sayfasına yönlendiriyoruz
                          navigate('/company-profile');
                        }}
                        className="w-full px-3 py-2 bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Package size={14} />
                        Paket Yükselt
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="header-gradient px-6 py-4 flex items-center justify-between relative z-[10000]">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden text-[#A5A5A5] hover:text-white"
              data-testid="open-sidebar-btn"
            >
              <Menu size={24} />
            </button>
            <CurrencyConverter />
            {isAdminView && (
              <button
                onClick={handleExitAdminView}
                className="flex items-center gap-2 px-3 py-2 bg-[#3EA6FF]/20 hover:bg-[#3EA6FF]/30 text-[#3EA6FF] rounded-lg transition-colors"
                title="Admin paneline geri dön"
              >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium">Admin Paneline Dön</span>
              </button>
            )}
            {isAdminView && (
              <span className="px-2 py-1 bg-[#3EA6FF]/20 text-[#3EA6FF] text-xs rounded">Admin Görünümü</span>
            )}
          </div>
          
          {/* Tema Toggle ve Bildirim İkonları */}
          <div className="flex items-center gap-2">
            {/* Tema Toggle Butonu */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-[#3EA6FF]/10 border border-[#3EA6FF]/30 hover:bg-[#3EA6FF]/20 transition-colors"
              title={theme === 'dark' ? 'Light Mode\'a Geç' : 'Dark Mode\'a Geç'}
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-[#3EA6FF]" />
              ) : (
                <Moon size={20} className="text-[#00BFFF]" />
              )}
            </button>
            
            {/* Bildirim İkonu */}
            <div className="relative z-[10001]" ref={notificationDropdownRef}>
            <button
              onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
              className="relative p-2 rounded-lg bg-[#3EA6FF]/10 border border-[#3EA6FF]/30 hover:bg-[#3EA6FF]/20 transition-colors"
              title="Bildirimler"
            >
              <Bell size={20} className="text-[#3EA6FF]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Bildirim Dropdown */}
            {notificationDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-[#1E1E1E] border border-[#2D2F33] rounded-lg shadow-2xl z-[10002] max-h-[500px] overflow-y-auto">
                <div className="p-4 border-b border-[#2D2F33]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Bildirimler</h3>
                    {unreadCount > 0 && (
                      <span className="text-xs text-[#3EA6FF] bg-[#3EA6FF]/20 px-2 py-1 rounded">
                        {unreadCount} yeni
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="divide-y divide-[#2D2F33]">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-[#2D2F33] transition-colors ${
                          !notification.read ? 'bg-[#3EA6FF]/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Okundu Checkbox */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationAsRead(notification.id);
                            }}
                            className="mt-1 flex-shrink-0 p-1 hover:bg-[#3EA6FF]/20 rounded transition-colors"
                            title={notification.read ? 'Okundu' : 'Okundu olarak işaretle'}
                          >
                            {notification.read ? (
                              <CheckSquare size={18} className="text-[#3EA6FF]" />
                            ) : (
                              <Square size={18} className="text-[#A5A5A5] hover:text-[#3EA6FF]" />
                            )}
                          </button>
                          
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              // Pending reservation ise Dashboard'a git, değilse rezervasyonlara git
                              if (notification.type === 'pending_reservation') {
                                navigate(`/dashboard`);
                                setNotificationDropdownOpen(false);
                              } else {
                                navigate(`/reservations`);
                                setNotificationDropdownOpen(false);
                              }
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className="mt-1">
                                <Clock size={16} className="text-[#3EA6FF]" />
                              </div>
                              <p className="text-sm font-semibold text-white">{notification.title}</p>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-[#3EA6FF] rounded-full"></span>
                              )}
                            </div>
                            <p className="text-sm text-[#A5A5A5] mb-2 ml-6">{notification.message}</p>
                            <div className="text-xs text-[#A5A5A5] space-y-1 ml-6">
                              <p>Müşteri: {notification.customer}</p>
                              {notification.tourType && <p>Tur: {notification.tourType}</p>}
                              <p>ATV: {notification.atvCount}</p>
                              <p className="text-[#3EA6FF]">
                                {notification.date} {notification.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <Bell size={32} className="text-[#A5A5A5] mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-[#A5A5A5]">Yeni bildirim yok</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
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