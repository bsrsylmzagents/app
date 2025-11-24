import React, { useState, useEffect } from 'react';
import { Bell, CheckSquare, Square, Trash2, AlertTriangle, Info, CheckCircle, XCircle, Clock } from 'lucide-react';
import axios from 'axios';
import { API } from '../App';
import { format } from 'date-fns';
import { toast } from 'sonner';

const NotificationCenter = ({ onClose, onNotificationUpdate }) => {
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' or 'warnings'
  const [notifications, setNotifications] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    // Her 30 saniyede bir güncelle
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Tüm bildirimleri getir (include_archived: false ile arşivlenmemiş olanlar)
      const allResponse = await axios.get(`${API}/notifications`, {
        params: {
          include_archived: false
        }
      });

      const allItems = allResponse.data?.notifications || [];
      
      // Info ve success bildirimleri (Notifications tab)
      const allNotifications = allItems.filter(n => 
        n.type === 'info' || n.type === 'success' || !n.type // Backward compatibility
      );

      // Warning ve error bildirimleri (Warnings tab)
      const allWarnings = allItems.filter(n => 
        n.type === 'warning' || n.type === 'error'
      );

      setNotifications(allNotifications);
      setWarnings(allWarnings);
      
      const totalUnread = allResponse.data?.unread_count || 0;
      setUnreadCount(totalUnread);

      if (onNotificationUpdate) {
        onNotificationUpdate(totalUnread);
      }
    } catch (error) {
      console.error('Bildirimler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    const currentItems = activeTab === 'notifications' ? notifications : warnings;
    const unreadItems = currentItems.filter(item => !item.is_read);
    
    if (selectedIds.length === unreadItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unreadItems.map(item => item.id));
    }
  };

  const handleSelectItem = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('Lütfen silmek için bildirim seçin');
      return;
    }

    try {
      await axios.delete(`${API}/notifications/batch`, {
        data: { notification_ids: selectedIds }
      });
      
      toast.success(`${selectedIds.length} bildirim silindi`);
      setSelectedIds([]);
      fetchNotifications();
    } catch (error) {
      console.error('Bildirimler silinemedi:', error);
      toast.error('Bildirimler silinirken hata oluştu');
    }
  };

  const handleMarkAsRead = async (ids) => {
    try {
      await axios.post(`${API}/notifications/mark-read`, {
        notification_ids: ids
      });
      setSelectedIds([]);
      fetchNotifications();
    } catch (error) {
      console.error('Bildirimler okundu olarak işaretlenemedi:', error);
      toast.error('Bildirimler güncellenirken hata oluştu');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="text-green-600 dark:text-green-400" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400" />;
      case 'error':
        return <XCircle size={16} className="text-red-600 dark:text-red-400" />;
      default:
        return <Info size={16} className="text-blue-600 dark:text-blue-400" />;
    }
  };

  const currentItems = activeTab === 'notifications' ? notifications : warnings;
  const hasUnread = currentItems.some(item => !item.is_read);
  const allUnreadSelected = hasUnread && currentItems.filter(item => !item.is_read).every(item => selectedIds.includes(item.id));

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-[#1E1E1E] border border-slate-100 dark:border-[#2D2F33] rounded-lg shadow-md dark:shadow-2xl z-[10002] max-h-[600px] flex flex-col">
      {/* Header with Tabs */}
      <div className="p-4 border-b border-slate-100 dark:border-[#2D2F33]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Bildirimler</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-blue-600 dark:text-[#3EA6FF] bg-blue-50 dark:bg-[#3EA6FF]/20 px-2 py-1 rounded">
              {unreadCount} yeni
            </span>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('notifications');
              setSelectedIds([]);
            }}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'bg-blue-50 dark:bg-[#3EA6FF]/20 text-blue-600 dark:text-[#3EA6FF]'
                : 'text-slate-500 dark:text-[#A5A5A5] hover:bg-slate-50 dark:hover:bg-[#2D2F33]'
            }`}
          >
            Bildirimler ({notifications.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('warnings');
              setSelectedIds([]);
            }}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'warnings'
                ? 'bg-yellow-50 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                : 'text-slate-500 dark:text-[#A5A5A5] hover:bg-slate-50 dark:hover:bg-[#2D2F33]'
            }`}
          >
            Uyarılar ({warnings.length})
          </button>
        </div>
      </div>

      {/* Actions Bar (Only for Notifications tab) */}
      {activeTab === 'notifications' && currentItems.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-100 dark:border-[#2D2F33] bg-slate-50 dark:bg-[#2D2F33] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-[#A5A5A5] hover:text-slate-900 dark:hover:text-white"
            >
              {allUnreadSelected ? (
                <CheckSquare size={16} className="text-blue-600 dark:text-[#3EA6FF]" />
              ) : (
                <Square size={16} />
              )}
              <span>Tümünü Seç</span>
            </button>
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/30 transition-colors text-sm"
            >
              <Trash2 size={14} />
              <span>Seçilenleri Sil ({selectedIds.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500 dark:text-[#A5A5A5]">Yükleniyor...</p>
          </div>
        ) : currentItems.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-[#2D2F33]">
            {currentItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const isWarningTab = activeTab === 'warnings';
              const bgColor = isWarningTab 
                ? (item.type === 'error' 
                    ? 'bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 dark:border-red-400'
                    : 'bg-yellow-50 dark:bg-yellow-500/10 border-l-4 border-yellow-500 dark:border-yellow-400')
                : (!item.is_read ? 'bg-blue-50 dark:bg-[#3EA6FF]/5' : '');

              return (
                <div
                  key={item.id}
                  className={`p-4 hover:bg-slate-50 dark:hover:bg-[#2D2F33] transition-colors ${bgColor}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox (Only for Notifications tab) */}
                    {activeTab === 'notifications' && (
                      <button
                        onClick={() => handleSelectItem(item.id)}
                        className="mt-1 flex-shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare size={18} className="text-blue-600 dark:text-[#3EA6FF]" />
                        ) : (
                          <Square size={18} className="text-slate-400 dark:text-[#A5A5A5]" />
                        )}
                      </button>
                    )}

                    {/* Icon */}
                    <div className="mt-1 flex-shrink-0">
                      {getNotificationIcon(item.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm font-semibold ${
                          isWarningTab 
                            ? 'text-slate-900 dark:text-white' 
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          {item.title || 'Bildirim'}
                        </p>
                        {!item.is_read && (
                          <span className="w-2 h-2 bg-blue-600 dark:bg-[#3EA6FF] rounded-full"></span>
                        )}
                      </div>
                      <p className={`text-sm mb-2 ${
                        isWarningTab 
                          ? 'text-slate-700 dark:text-[#A5A5A5]' 
                          : 'text-slate-500 dark:text-[#A5A5A5]'
                      }`}>
                        {item.message || item.body || ''}
                      </p>
                      {item.created_at && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-[#7B7B7B]">
                          <Clock size={12} />
                          <span>
                            {format(new Date(item.created_at), 'dd.MM.yyyy HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Bell size={32} className="text-slate-500 dark:text-[#A5A5A5] mx-auto mb-2 opacity-50" />
            <p className="text-sm text-slate-500 dark:text-[#A5A5A5]">
              {activeTab === 'notifications' ? 'Yeni bildirim yok' : 'Yeni uyarı yok'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;

