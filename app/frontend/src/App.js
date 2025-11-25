import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from './contexts/ThemeContext';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Layout
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import Calendar from './pages/Calendar';
import Customers from './pages/Customers';
import MunferitCustomers from './pages/customers/MunferitCustomers';
import CariCustomers from './pages/customers/CariCustomers';
import ExtraSales from './pages/ExtraSales';
import CariAccounts from './pages/CariAccounts';
import CariDetail from './pages/CariDetail';
import SeasonalPrices from './pages/SeasonalPrices';
import ServicePurchases from './pages/ServicePurchases';
import Reports from './pages/Reports';
import ReportsDaily from './pages/reports/ReportsDaily';
import ReportsReservations from './pages/reports/ReportsReservations';
import ReportsCustomers from './pages/reports/ReportsCustomers';
import ReportsIncome from './pages/reports/ReportsIncome';
import ReportsAtvUsage from './pages/reports/ReportsAtvUsage';
import ReportsTourTypes from './pages/reports/ReportsTourTypes';
import ReportsPickupPerformance from './pages/reports/ReportsPickupPerformance';
import ReportsSeasonalPricingImpact from './pages/reports/ReportsSeasonalPricingImpact';
import ReportsExpenses from './pages/reports/ReportsExpenses';
import ReportsCollections from './pages/reports/ReportsCollections';
import ReportsLogs from './pages/reports/ReportsLogs';
import ReportsProfit from './pages/reports/ReportsProfit';
import ReportsCashFlow from './pages/reports/ReportsCashFlow';
import ReportsCustomerAnalysis from './pages/reports/ReportsCustomerAnalysis';
import ReportsDashboard from './pages/reports/ReportsDashboard';
import ReportsCariAccounts from './pages/reports/ReportsCariAccounts';
import ReportsCashStatus from './pages/reports/ReportsCashStatus';
import ReportsExtraSales from './pages/reports/ReportsExtraSales';
import ReportsPerformance from './pages/reports/ReportsPerformance';
import ReportsBalancedAccounts from './pages/reports/ReportsBalancedAccounts';
import ReportsCreditors from './pages/reports/ReportsCreditors';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import TourTypes from './pages/TourTypes';
import PaymentTypes from './pages/PaymentTypes';
import StaffManagement from './pages/StaffManagement';
import Cash from './pages/Cash';
import CashIncome from './pages/cash/CashIncome';
import CashExpense from './pages/cash/CashExpense';
import CashDetail from './pages/cash/CashDetail';
import Definitions from './pages/Definitions';
import Notifications from './pages/Notifications';
import Security from './pages/Security';
import Integrations from './pages/Integrations';
import Preferences from './pages/Preferences';
import SettingsCurrencyRates from './pages/settings/SettingsCurrencyRates';
import PublicLayout from './components/PublicLayout';
import PublicBooking from './pages/PublicBooking';
import PortalLogin from './pages/portal/PortalLogin';
import PortalDashboard from './pages/portal/PortalDashboard';

// Admin Pages
import AdminCustomers from './pages/AdminCustomers';
import AdminNewCustomer from './pages/AdminNewCustomer';
import AdminEditCustomer from './pages/AdminEditCustomer';
import AdminDemoRequests from './pages/AdminDemoRequests';
import AdminRoute from './components/AdminRoute';

// Cari Pages
import CariLogin from './pages/cari/CariLogin';
import CariDashboard from './pages/cari/CariDashboard';
import CariCreateReservation from './pages/cari/CariCreateReservation';
import CariTransactions from './pages/cari/CariTransactions';
import CariRequirePasswordChange from './pages/cari/CariRequirePasswordChange';

// Company Profile
import CompanyProfile from './pages/CompanyProfile';


const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
export const API = `${BACKEND_URL}/api`;

// Backend bağlantı kontrolü (console'da görmek için)
console.log('🔗 Backend URL:', BACKEND_URL);
console.log('🔗 API URL:', API);

// Axios default baseURL ayarla
axios.defaults.baseURL = BACKEND_URL;

// Axios interceptor for auth
axios.interceptors.request.use(
  (config) => {
    // URL'i düzelt (eğer relative ise)
    if (config.url && !config.url.startsWith('http')) {
      if (config.url.startsWith('/api')) {
        config.url = `${BACKEND_URL}${config.url}`;
      } else if (config.url.startsWith('/')) {
        config.url = `${BACKEND_URL}/api${config.url}`;
      }
    }
    
    // Portal ve Cari routes için cari_token kullan (portal login'den sonra cari_token kullanılıyor)
    if (config.url?.includes('/portal/') || config.url?.includes('/api/portal/') || 
        config.url?.includes('/cari/') || config.url?.includes('/api/cari/') ||
        config.url?.includes('/auth/b2b-login')) {
      // Önce cari_token'ı kontrol et (portal login'den sonra bu kullanılıyor)
      const cariToken = localStorage.getItem('cari_token');
      if (cariToken) {
        config.headers.Authorization = `Bearer ${cariToken}`;
      } else {
        // Fallback: portal_token varsa onu kullan
        const portalToken = localStorage.getItem('portal_token');
        if (portalToken) {
          config.headers.Authorization = `Bearer ${portalToken}`;
        }
      }
    } else {
      // Normal routes için token kullan
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 hatası = Unauthenticated (token geçersiz/süresi dolmuş) → login'e yönlendir
    // 403 hatası = Unauthorized (yetki yok) → component'in handle etmesine izin ver
    if (error.response?.status === 401) {
      // /auth/me endpoint'i için özel işlem yapma (App.js'deki useEffect zaten hallediyor)
      if (error.config?.url?.includes('/auth/me')) {
        return Promise.reject(error);
      }
      
      // Cari routes için özel işlem
      const isCariRoute = window.location.pathname.startsWith('/cari/') || window.location.pathname.startsWith('/r/');
      if (isCariRoute) {
        // Cari token hatası - cari login'e yönlendir
        if (error.config?.url?.includes('/cari/')) {
          localStorage.removeItem('cari_token');
          localStorage.removeItem('cari');
          localStorage.removeItem('cari_company');
          // Cari login sayfasına yönlendir
          if (window.location.pathname !== '/cari/login' && !window.location.pathname.startsWith('/r/')) {
            window.location.href = '/cari/login';
          }
        }
        return Promise.reject(error);
      }
      
      // Portal routes için özel işlem
      const isPortalRoute = window.location.pathname.startsWith('/portal/');
      if (isPortalRoute) {
        // Portal token hatası - portal login'e yönlendir
        if (error.config?.url?.includes('/portal/') || error.config?.url?.includes('/auth/b2b-login')) {
          const pathParts = window.location.pathname.split('/');
          const agencySlug = pathParts[2]; // /portal/:agencySlug/...
          localStorage.removeItem('portal_token');
          localStorage.removeItem('portal_corporate');
          localStorage.removeItem('portal_agency');
          // Portal login sayfasına yönlendir
          if (!window.location.pathname.includes('/login')) {
            window.location.href = `/portal/${agencySlug}/login`;
          }
        }
        return Promise.reject(error);
      }
      
      // Normal admin routes için (cari ve portal route'ları hariç)
      // Sadece login/register sayfalarında değilsek ve cari/portal route'da değilsek yönlendir
      const isAdminRoute = !window.location.pathname.startsWith('/cari/') && 
                          !window.location.pathname.startsWith('/r/') && 
                          !window.location.pathname.startsWith('/portal/') &&
                          !window.location.pathname.startsWith('/booking/');
      if (isAdminRoute && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('company');
        localStorage.removeItem('is_admin_view');
        window.location.href = '/login';
      }
    }
    // 403 hatası için component'in handle etmesine izin ver (yetki kontrolü)
    // Component'ler bu hatayı yakalayıp uygun şekilde yönlendirebilir
    console.error("Axios error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Cari, Portal ve Public routes için auth kontrolü yapma
      const isCariRoute = window.location.pathname.startsWith('/cari/') || window.location.pathname.startsWith('/r/');
      const isPortalRoute = window.location.pathname.startsWith('/portal/');
      const isPublicRoute = window.location.pathname.startsWith('/booking/');
      const isCompanySlugRoute = window.location.pathname.match(/^\/[^\/]+$/); // Sadece /:slug formatı
      
      if (isCariRoute || isPortalRoute || isPublicRoute || isCompanySlugRoute) {
        setLoading(false);
        setIsAuthenticated(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        setIsAuthenticated(false);
        return;
      }

      try {
        // Token'ı doğrula
        const response = await axios.get(`${API}/auth/me`);
        if (response.data && response.data.user && response.data.company) {
          // User ve company bilgilerini güncelle
          localStorage.setItem('user', JSON.stringify(response.data.user));
          localStorage.setItem('company', JSON.stringify(response.data.company));
          setIsAuthenticated(true);
        } else {
          // Geçersiz token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('company');
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Token geçersiz veya süresi dolmuş
        // Axios interceptor'ın yönlendirmesini engellemek için sadece localStorage'ı temizle
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('company');
          localStorage.removeItem('is_admin_view');
          setIsAuthenticated(false);
        } else {
          // Diğer hatalar için de temizle
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('company');
          localStorage.removeItem('is_admin_view');
          setIsAuthenticated(false);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login component'inden setAuth çağrıldığında token'ı kontrol et
  const handleAuthChange = async (authState) => {
    if (authState) {
      // Login başarılı, token'ı doğrula
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`);
          if (response.data && response.data.user && response.data.company) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
            localStorage.setItem('company', JSON.stringify(response.data.company));
            setIsAuthenticated(true);
            
            // If we're on the root path, redirect to user's preferred start page
            if (window.location.pathname === '/') {
              const startPage = response.data.user?.preferences?.startPage || '/dashboard';
              window.location.href = startPage;
            }
          }
        } catch (error) {
          console.error('Auth check failed after login:', error);
          setIsAuthenticated(false);
        }
      }
    } else {
      setIsAuthenticated(false);
    }
  };

  // Cari, Portal ve Public routes için loading kontrolü - bu route'larda loading gösterme
  // /:companySlug route'u da cari route olarak kabul edilir (login sayfası)
  const pathname = window.location.pathname;
  const isCariRoute = pathname.startsWith('/cari/') || pathname.startsWith('/r/');
  const isPortalRoute = pathname.startsWith('/portal/');
  const isPublicRoute = pathname.startsWith('/booking/');
  const isCompanySlugRoute = pathname !== '/' && 
                             pathname !== '/login' && 
                             pathname !== '/register' && 
                             !pathname.startsWith('/reports') && 
                             !pathname.startsWith('/portal/') &&
                             !pathname.startsWith('/booking/') &&
                             !pathname.startsWith('/cari/') &&
                             !isAuthenticated &&
                             pathname.match(/^\/[^\/]+$/); // Sadece /:slug formatı
  
  if (loading && !isCariRoute && !isPortalRoute && !isPublicRoute && !isCompanySlugRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#0a0e1a] to-[#0f1419]">
        <div className="text-center">
          <div className="loader" style={{ width: '3.5em', height: '3.5em', margin: '0 auto' }}>
            <div className="outer"></div>
            <div className="middle"></div>
            <div className="inner"></div>
          </div>
          <p className="mt-4 text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="App">
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login setAuth={handleAuthChange} /> : <Navigate to="/" />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
          
          {/* Cari Routes - Özel route'lar önce */}
          <Route path="/cari/login" element={<CariLogin />} />
          <Route path="/cari/change-password" element={<CariRequirePasswordChange />} />
          <Route path="/cari/dashboard" element={<CariDashboard />} />
          <Route path="/cari/create-reservation" element={<CariCreateReservation />} />
          <Route path="/cari/transactions" element={<CariTransactions />} />
          
          {/* Eski /r/:cariCode route'u için redirect (backward compatibility) */}
          <Route path="/r/:cariCode" element={<Navigate to="/cari/login" replace />} />
          
          {/* Admin Routes */}
          <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="reservations" element={<Reservations />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/munferit" element={<MunferitCustomers />} />
            <Route path="customers/cari" element={<CariCustomers />} />
            <Route path="extra-sales" element={<ExtraSales />} />
            <Route path="cari-accounts" element={<CariAccounts />} />
            <Route path="cari-accounts/:id" element={<CariDetail />} />
            <Route path="seasonal-prices" element={<SeasonalPrices />} />
            <Route path="service-purchases" element={<ServicePurchases />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/daily" element={<ReportsDaily />} />
            <Route path="reports/reservations" element={<ReportsReservations />} />
            <Route path="reports/customers" element={<ReportsCustomers />} />
            <Route path="reports/income" element={<ReportsIncome />} />
            <Route path="reports/atv-usage" element={<ReportsAtvUsage />} />
            <Route path="reports/tour-types" element={<ReportsTourTypes />} />
            <Route path="reports/pickup-performance" element={<ReportsPickupPerformance />} />
            <Route path="reports/seasonal-pricing-impact" element={<ReportsSeasonalPricingImpact />} />
            <Route path="reports/expenses" element={<ReportsExpenses />} />
            <Route path="reports/collections" element={<ReportsCollections />} />
            <Route path="reports/logs" element={<ReportsLogs />} />
            <Route path="reports/profit" element={<ReportsProfit />} />
            <Route path="reports/cash-flow" element={<ReportsCashFlow />} />
            <Route path="reports/customer-analysis" element={<ReportsCustomerAnalysis />} />
            <Route path="reports/dashboard" element={<ReportsDashboard />} />
            <Route path="reports/cari-accounts" element={<ReportsCariAccounts />} />
            <Route path="reports/cash-status" element={<ReportsCashStatus />} />
            <Route path="reports/extra-sales" element={<ReportsExtraSales />} />
            <Route path="reports/performance" element={<ReportsPerformance />} />
            <Route path="reports/balanced-accounts" element={<ReportsBalancedAccounts />} />
            <Route path="reports/creditors" element={<ReportsCreditors />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="cash" element={<Cash />} />
            <Route path="cash/income" element={<CashIncome />} />
            <Route path="cash/expense" element={<CashExpense />} />
            <Route path="cash/detail" element={<CashDetail />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/definitions" element={<Definitions />} />
            <Route path="settings/tour-types" element={<TourTypes />} />
            <Route path="settings/payment-types" element={<PaymentTypes />} />
            <Route path="settings/staff" element={<StaffManagement />} />
            <Route path="settings/notifications" element={<Notifications />} />
            <Route path="settings/security" element={<Security />} />
            <Route path="settings/integrations" element={<Integrations />} />
            <Route path="settings/preferences" element={<Preferences />} />
            <Route path="settings/currency-rates" element={<SettingsCurrencyRates />} />
            <Route path="company-profile" element={<CompanyProfile />} />
            
            {/* Admin Routes */}
            <Route path="admin/customers" element={<AdminRoute><AdminCustomers /></AdminRoute>} />
            <Route path="admin/customers/new" element={<AdminRoute><AdminNewCustomer /></AdminRoute>} />
            <Route path="admin/customers/:company_id" element={<AdminRoute><AdminEditCustomer /></AdminRoute>} />
            <Route path="admin/demo-requests" element={<AdminRoute><AdminDemoRequests /></AdminRoute>} />
            
          </Route>
          
          {/* Public Routes (No Auth Required) */}
          <Route element={<PublicLayout />}>
            <Route path="booking/:agencySlug" element={<PublicBooking />} />
          </Route>
          
          {/* B2B Portal Routes (Corporate Customer) */}
          <Route path="portal/:agencySlug/login" element={<PortalLogin />} />
          <Route path="portal/:agencySlug/dashboard" element={<PortalDashboard />} />
          
          {/* Cari Routes (Legacy - using /cari/* paths) */}
          <Route path="cari/login" element={<CariLogin />} />
          <Route path="cari/dashboard" element={<CariDashboard />} />
          <Route path="cari/reservations/new" element={<CariCreateReservation />} />
          <Route path="cari/transactions" element={<CariTransactions />} />
          <Route path="cari/change-password" element={<CariRequirePasswordChange />} />
          
          {/* Legacy Route: /:companySlug -> CariLogin (Backward Compatibility) */}
          {/* Bu route EN SONDA olmalı, aksi halde diğer route'ları yakalar */}
          {/* Bilinen route'ları exclude et: login, register, dashboard, vb. */}
          <Route 
            path="/:companySlug" 
            element={<CariLogin />}
            // Sadece gerçekten company slug olan route'ları yakala
            // Bilinen route'ları exclude et
          />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </ThemeProvider>
  );
}

export default App;
