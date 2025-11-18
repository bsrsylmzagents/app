import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { 
  Users, Settings as SettingsIcon, Building2, Bell, Shield, 
  Plug, Sliders, Search, Activity, 
  CheckCircle, XCircle, Clock, UserCheck, 
  RefreshCw, LogIn, Monitor, Smartphone, Tablet, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Settings = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statistics, setStatistics] = useState({
    totalStaff: 0,
    activeUsers: 0,
    lastActivity: null,
    systemStatus: { database: true, api: true }
  });
  const [loading, setLoading] = useState(true);
  const [loginActivities, setLoginActivities] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    fetchStatistics();
    fetchLoginActivities();
    fetchActiveSessions();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      // Staff count
      const staffResponse = await axios.get(`${API}/users`);
      const staff = staffResponse.data || [];
      const totalStaff = staff.length;
      const activeUsers = staff.filter(u => u.web_panel_active !== false).length;
      
      // Last activity from activity logs
      try {
        const logsResponse = await axios.get(`${API}/activity-logs?limit=1`);
        const lastActivity = logsResponse.data?.[0]?.created_at || null;
        setStatistics({
          totalStaff,
          activeUsers,
          lastActivity,
          systemStatus: { database: true, api: true }
        });
      } catch {
        setStatistics({
          totalStaff,
          activeUsers,
          lastActivity: null,
          systemStatus: { database: true, api: true }
        });
      }
    } catch (error) {
      console.error('Statistics fetch error:', error);
      setStatistics({
        totalStaff: 0,
        activeUsers: 0,
        lastActivity: null,
        systemStatus: { database: false, api: false }
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginActivities = async () => {
    try {
      // Login aktivitelerini activity logs'dan çek (action: 'login' veya entity_type: 'auth')
      const response = await axios.get(`${API}/activity-logs?action=login&limit=10`);
      setLoginActivities(response.data || []);
    } catch (error) {
      console.error('Login activities fetch error:', error);
      // Fallback: tüm activity logs'dan son 10 kaydı al
      try {
        const fallbackResponse = await axios.get(`${API}/activity-logs?limit=10`);
        setLoginActivities(fallbackResponse.data || []);
      } catch {
        setLoginActivities([]);
      }
    }
  };

  const fetchActiveSessions = async () => {
    try {
      // Aktif kullanıcıları çek (web_panel_active === true)
      const response = await axios.get(`${API}/users`);
      const users = response.data || [];
      const activeUsers = users.filter(u => u.web_panel_active !== false);
      
      // Her aktif kullanıcı için son giriş zamanını activity logs'dan bul
      const sessions = await Promise.all(
        activeUsers.map(async (user) => {
          try {
            const logResponse = await axios.get(`${API}/activity-logs?user_id=${user.id}&action=login&limit=1`);
            const lastLogin = logResponse.data?.[0]?.created_at || null;
            return {
              user_id: user.id,
              username: user.username,
              full_name: user.full_name,
              last_login: lastLogin,
              device: 'Web Browser', // Şimdilik varsayılan
              ip_address: '-', // Backend'de IP tracking yoksa
              is_current: localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).id === user.id
            };
          } catch {
            return {
              user_id: user.id,
              username: user.username,
              full_name: user.full_name,
              last_login: null,
              device: 'Web Browser',
              ip_address: '-',
              is_current: localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).id === user.id
            };
          }
        })
      );
      setActiveSessions(sessions);
    } catch (error) {
      console.error('Active sessions fetch error:', error);
      setActiveSessions([]);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const settingsCards = [
    {
      to: '/company-profile',
      icon: Building2,
      title: 'Firma Profili',
      description: 'Firma bilgileri, logo, sosyal medya ve banka bilgileri',
      color: 'text-blue-400'
    },
    {
      to: '/settings/staff',
      icon: Users,
      title: 'Personel Yönetimi',
      description: 'Kullanıcı ve personel yönetimi, yetkilendirme',
      color: 'text-green-400'
    },
    {
      to: '/settings/definitions',
      icon: SettingsIcon,
      title: 'Tanımlamalar',
      description: 'Tur tipleri, ödeme yöntemleri, para birimi, gider kalemleri',
      color: 'text-purple-400'
    },
    {
      to: '/settings/notifications',
      icon: Bell,
      title: 'Bildirimler',
      description: 'Bildirim tercihleri ve ayarları',
      color: 'text-yellow-400'
    },
    {
      to: '/settings/security',
      icon: Shield,
      title: 'Güvenlik',
      description: 'Şifre değiştirme, oturum yönetimi, 2FA',
      color: 'text-red-400'
    },
    {
      to: '/settings/integrations',
      icon: Plug,
      title: 'Entegrasyonlar',
      description: 'API key\'leri, webhook\'lar, üçüncü parti entegrasyonlar',
      color: 'text-orange-400'
    },
    {
      to: '/settings/preferences',
      icon: Sliders,
      title: 'Tercihler',
      description: 'Tema, dil, saat dilimi, tarih formatı',
      color: 'text-pink-400'
    },
    {
      to: '/settings/currency-rates',
      icon: DollarSign,
      title: 'Döviz Kurları',
      description: 'Merkez Bankası entegrasyonu, kur sabitleme ve manuel kur girişi',
      color: 'text-green-400'
    }
  ].filter(card => 
    !searchQuery || 
    card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Ayarlar</h1>
        <Button
          onClick={fetchStatistics}
          variant="outline"
          size="sm"
          className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
        >
          <RefreshCw size={16} className="mr-2" />
          Yenile
        </Button>
      </div>

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A5A5A5] size-5" />
        <Input
          type="text"
          placeholder="Ayarlarda ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[#2D2F33] border-[#2D2F33] text-white placeholder:text-[#A5A5A5]"
        />
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[#A5A5A5]">Toplam Personel</p>
            <Users size={20} className="text-[#3EA6FF]" />
          </div>
          <p className="text-2xl font-bold text-white">{statistics.totalStaff}</p>
        </div>
        <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[#A5A5A5]">Aktif Kullanıcı</p>
            <UserCheck size={20} className="text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{statistics.activeUsers}</p>
        </div>
        <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[#A5A5A5]">Son Aktivite</p>
            <Clock size={20} className="text-yellow-400" />
          </div>
          <p className="text-sm font-semibold text-white">
            {statistics.lastActivity ? formatDate(statistics.lastActivity) : '-'}
          </p>
        </div>
        <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[#A5A5A5]">Sistem Durumu</p>
            {statistics.systemStatus.database && statistics.systemStatus.api ? (
              <CheckCircle size={20} className="text-green-400" />
            ) : (
              <XCircle size={20} className="text-red-400" />
            )}
          </div>
          <p className="text-sm font-semibold text-white">
            {statistics.systemStatus.database && statistics.systemStatus.api ? 'Aktif' : 'Hata'}
          </p>
        </div>
      </div>

      {/* Ayarlar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {settingsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Link
              key={index}
              to={card.to}
              className="card-hover bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6 cursor-pointer hover:border-[#3EA6FF]/50 transition-colors block"
            >
              <Icon size={40} className={`${card.color} mb-4`} />
              <h3 className="text-xl font-semibold text-white mb-2">{card.title}</h3>
              <p className="text-sm text-[#A5A5A5]">{card.description}</p>
            </Link>
          );
        })}
      </div>

      {/* Giriş Aktiviteleri */}
      <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
          <LogIn size={20} className="mr-2 text-[#3EA6FF]" />
          Giriş Aktiviteleri
        </h2>
        
        {/* Açık Cihazlar ve Oturumlar */}
        {activeSessions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Monitor size={18} className="mr-2 text-green-400" />
              Açık Cihazlar ve Oturumlar
            </h3>
            <div className="space-y-2">
              {activeSessions.map((session, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#2D2F33] rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    {session.device.includes('Mobile') ? (
                      <Smartphone size={20} className="text-blue-400" />
                    ) : session.device.includes('Tablet') ? (
                      <Tablet size={20} className="text-purple-400" />
                    ) : (
                      <Monitor size={20} className="text-green-400" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{session.full_name || session.username}</p>
                        {session.is_current && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                            Mevcut Oturum
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#A5A5A5] mt-1">
                        {session.device} • {session.ip_address}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#A5A5A5]">Son Giriş</p>
                    <p className="text-sm text-white font-medium">
                      {session.last_login ? formatDate(session.last_login) : '-'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Son Giriş Zamanları */}
        {loginActivities.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Clock size={18} className="mr-2 text-yellow-400" />
              Son Giriş Zamanları
            </h3>
            <div className="space-y-2">
              {loginActivities.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#2D2F33] rounded-lg">
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {activity.full_name || activity.username || 'Bilinmeyen Kullanıcı'}
                    </p>
                    <p className="text-xs text-[#A5A5A5] mt-1">
                      {activity.description || 'Giriş yapıldı'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white font-medium">
                      {formatDate(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSessions.length === 0 && loginActivities.length === 0 && (
          <p className="text-[#A5A5A5] text-center py-4">Henüz giriş aktivitesi bulunmuyor.</p>
        )}
      </div>
    </div>
  );
};

export default Settings;