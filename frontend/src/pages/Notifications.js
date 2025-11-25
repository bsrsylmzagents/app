import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, Bell, Mail, Smartphone, DollarSign, Shield, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const Notifications = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  
  // Notification preferences state
  const [notifications, setNotifications] = useState({
    newBooking: { email: true, inApp: true },
    bookingCancellation: { email: true, inApp: true },
    paymentReceived: { email: false, inApp: true },
    dailyFinanceReport: { email: true },
    loginAlert: { email: true, inApp: false },
    marketingEmails: { email: true }
  });

  useEffect(() => {
    // Load user notification preferences
    const loadNotificationPreferences = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const prefs = user?.notificationPreferences || {};
          
          // Set defaults for missing preferences
          setNotifications({
            newBooking: prefs.newBooking || { email: true, inApp: true },
            bookingCancellation: prefs.bookingCancellation || { email: true, inApp: true },
            paymentReceived: prefs.paymentReceived || { email: false, inApp: true },
            dailyFinanceReport: prefs.dailyFinanceReport || { email: true },
            loginAlert: prefs.loginAlert || { email: true, inApp: false },
            marketingEmails: prefs.marketingEmails || { email: true }
          });
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    };

    loadNotificationPreferences();
  }, []);

  const handleToggle = (notificationType, channel) => {
    setNotifications(prev => {
      const updated = { ...prev };
      if (!updated[notificationType]) {
        updated[notificationType] = {};
      }
      updated[notificationType] = {
        ...updated[notificationType],
        [channel]: !updated[notificationType][channel]
      };
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${API}/users/me/notifications`, notifications);

      if (response.data && response.data.user) {
        // Update localStorage with new user data
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success('Bildirim tercihleri başarıyla kaydedildi!');
        
        // Optionally refresh the page to ensure all components use new settings
        // window.location.reload();
      }
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error(error.response?.data?.detail || 'Bildirim tercihleri kaydedilirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  // Notification categories
  const notificationCategories = [
    {
      title: 'Rezervasyonlar',
      icon: Calendar,
      notifications: [
        {
          key: 'newBooking',
          label: 'Yeni Rezervasyon',
          description: 'Yeni rezervasyon oluşturulduğunda bildirim al',
          hasEmail: true,
          hasInApp: true
        },
        {
          key: 'bookingCancellation',
          label: 'Rezervasyon İptali',
          description: 'Rezervasyon iptal edildiğinde bildirim al',
          hasEmail: true,
          hasInApp: true
        }
      ]
    },
    {
      title: 'Finans',
      icon: DollarSign,
      notifications: [
        {
          key: 'paymentReceived',
          label: 'Ödeme Alındı',
          description: 'Ödeme alındığında bildirim al',
          hasEmail: true,
          hasInApp: true
        },
        {
          key: 'dailyFinanceReport',
          label: 'Günlük Finans Raporu',
          description: 'Her gün finans raporu e-posta olarak gönderilsin',
          hasEmail: true,
          hasInApp: false
        }
      ]
    },
    {
      title: 'Güvenlik ve Sistem',
      icon: Shield,
      notifications: [
        {
          key: 'loginAlert',
          label: 'Giriş Uyarısı',
          description: 'Hesabınıza giriş yapıldığında bildirim al',
          hasEmail: true,
          hasInApp: false
        }
      ]
    },
    {
      title: 'Diğer',
      icon: TrendingUp,
      notifications: [
        {
          key: 'marketingEmails',
          label: 'Pazarlama E-postaları',
          description: 'Yeni özellikler ve güncellemeler hakkında e-posta al',
          hasEmail: true,
          hasInApp: false
        }
      ]
    }
  ];

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          className="text-white hover:bg-[#2D2F33]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Bildirimler</h1>
          <p className="text-[#A5A5A5]">Bildirim tercihleri ve ayarları - Matris stili kontrol</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Matrix Table Header */}
        <div className="bg-white dark:bg-[#25272A] rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-none overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-[#2D2F33] bg-slate-50 dark:bg-[#1E1F22]">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-5">
                <Label className="text-sm font-semibold text-slate-900 dark:text-white">Etkinlik Türü</Label>
              </div>
              <div className="col-span-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Mail className="h-4 w-4 text-slate-600 dark:text-[#A5A5A5]" />
                  <Label className="text-sm font-semibold text-slate-900 dark:text-white">E-posta</Label>
                </div>
              </div>
              <div className="col-span-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Smartphone className="h-4 w-4 text-slate-600 dark:text-[#A5A5A5]" />
                  <Label className="text-sm font-semibold text-slate-900 dark:text-white">Uygulama İçi</Label>
                </div>
              </div>
              <div className="col-span-1"></div>
            </div>
          </div>

          {/* Matrix Table Body */}
          <div className="divide-y divide-slate-200 dark:divide-[#2D2F33]">
            {notificationCategories.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                {/* Category Header */}
                <div className="px-6 py-3 bg-slate-100 dark:bg-[#1E1F22] border-b border-slate-200 dark:border-[#2D2F33]">
                  <div className="flex items-center gap-2">
                    <category.icon className="h-4 w-4 text-indigo-600 dark:text-[#3EA6FF]" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{category.title}</h3>
                  </div>
                </div>

                {/* Category Notifications */}
                {category.notifications.map((notification, notificationIndex) => {
                  const notificationData = notifications[notification.key] || {};
                  return (
                    <div
                      key={notification.key}
                      className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-[#2D2F33] transition-colors"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Event Type Column */}
                        <div className="col-span-5">
                          <div>
                            <Label className="text-sm font-medium text-slate-900 dark:text-white">
                              {notification.label}
                            </Label>
                            <p className="text-xs text-slate-500 dark:text-[#A5A5A5] mt-1">
                              {notification.description}
                            </p>
                          </div>
                        </div>

                        {/* Email Notification Column */}
                        <div className="col-span-3 flex justify-center">
                          {notification.hasEmail ? (
                            <Switch
                              checked={notificationData.email || false}
                              onCheckedChange={() => handleToggle(notification.key, 'email')}
                            />
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-[#A5A5A5]">-</span>
                          )}
                        </div>

                        {/* In-App Notification Column */}
                        <div className="col-span-3 flex justify-center">
                          {notification.hasInApp ? (
                            <Switch
                              checked={notificationData.inApp || false}
                              onCheckedChange={() => handleToggle(notification.key, 'inApp')}
                            />
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-[#A5A5A5]">-</span>
                          )}
                        </div>

                        {/* Empty column for alignment */}
                        <div className="col-span-1"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => navigate('/settings')}
            className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
          >
            İptal
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Kaydet
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
