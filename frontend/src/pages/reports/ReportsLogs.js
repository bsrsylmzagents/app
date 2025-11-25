import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { format, parseISO } from 'date-fns';
import { Download, Filter, Search, Calendar, User, FileText, ArrowLeft, FileCode, ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createHeader, createTitle, createTable, createFooter, safeText } from '../../utils/pdfTemplate';
import { generateLogsXml, downloadXml } from '../../utils/xmlExport';
import { toast } from 'sonner';

const ReportsLogs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    date_from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    user_id: '',
    action: '',
    ip_address: ''
  });
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    // Sayfa yüklendiğinde otomatik logları getir
    fetchLogs();
  }, []);

  // Filtreler değiştiğinde otomatik güncelle (opsiyonel - kullanıcı "Raporu Getir" butonuna basabilir)
  // useEffect(() => {
  //   fetchLogs();
  // }, [filters]);

  useEffect(() => {
    // Loglardan unique kullanıcıları çıkar
    const uniqueUsers = {};
    logs.forEach(log => {
      if (log.user_id && !uniqueUsers[log.user_id]) {
        uniqueUsers[log.user_id] = {
          id: log.user_id,
          full_name: log.full_name,
          username: log.username
        };
      }
    });
    setUsers(Object.values(uniqueUsers));
  }, [logs]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.action) params.append('action', filters.action);
      if (filters.ip_address) params.append('ip_address', filters.ip_address);

      const response = await axios.get(`${API}/activity-logs?${params.toString()}`);
      console.log('Loglar yüklendi:', response.data.length, 'kayıt');
      setLogs(response.data || []);
    } catch (error) {
      console.error('Loglar yüklenemedi:', error);
      console.error('Error details:', error.response?.data);
      setError(error.response?.data?.detail || 'Loglar yüklenirken bir hata oluştu');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleGetReport = () => {
    fetchLogs();
  };

  const getActionLabel = (action) => {
    const labels = {
      'create': 'Oluşturuldu',
      'update': 'Güncellendi',
      'delete': 'Silindi',
      'payment': 'Ödeme',
      'cancel': 'İptal Edildi',
      'complete': 'Tamamlandı'
    };
    return labels[action] || action;
  };

  const getEntityTypeLabel = (entityType) => {
    const labels = {
      'reservation': 'Rezervasyon',
      'extra_sale': 'Açık Satış',
      'transaction': 'Tahsilat',
      'cari_account': 'Cari Hesap',
      'service_purchase': 'Hizmet Al',
      'income': 'Gelir',
      'expense': 'Gider',
      'tour_type': 'Tur Tipi',
      'payment_type': 'Ödeme Yöntemi'
    };
    return labels[entityType] || entityType;
  };

  const getActionColor = (action) => {
    const colors = {
      'create': '#16A34A', // success green
      'update': '#3EA6FF', // accent blue
      'delete': '#DC2626', // danger red
      'payment': '#F59E0B', // warning yellow
      'cancel': '#F97316', // orange
      'complete': '#9333EA' // purple
    };
    return colors[action] || 'var(--text-primary)';
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.username?.toLowerCase().includes(query) ||
      log.full_name?.toLowerCase().includes(query) ||
      log.entity_name?.toLowerCase().includes(query) ||
      log.description?.toLowerCase().includes(query) ||
      log.ip_address?.toLowerCase().includes(query) ||
      getActionLabel(log.action).toLowerCase().includes(query) ||
      getEntityTypeLabel(log.entity_type).toLowerCase().includes(query)
    );
  });

  // Sayfalama
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Özet istatistikler
  const stats = {
    total: filteredLogs.length,
    byAction: {},
    byEntityType: {},
    byUser: {}
  };
  filteredLogs.forEach(log => {
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    stats.byEntityType[log.entity_type] = (stats.byEntityType[log.entity_type] || 0) + 1;
    const userName = log.full_name || log.username || 'Bilinmeyen';
    stats.byUser[userName] = (stats.byUser[userName] || 0) + 1;
  });

  const toggleLogExpansion = (logId) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const formatChanges = (changes) => {
    if (!changes || typeof changes !== 'object') return null;
    return Object.entries(changes).map(([key, value]) => {
      let displayValue = value;
      if (typeof value === 'object' && value !== null) {
        displayValue = JSON.stringify(value, null, 2);
      }
      return { key, value: displayValue };
    });
  };

  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('Export edilecek log bulunamadı');
      return;
    }

    const headers = ['Tarih/Saat', 'Kullanıcı', 'IP Adresi', 'İşlem', 'Tip', 'Varlık', 'Açıklama'];
    const rows = filteredLogs.map(log => {
      let dateStr = '-';
      try {
        if (log.created_at) {
          const date = typeof log.created_at === 'string' ? new Date(log.created_at) : log.created_at;
          if (!isNaN(date.getTime())) {
            dateStr = format(date, 'dd/MM/yyyy HH:mm');
          }
        }
      } catch (e) {
        // Skip
      }
      return [
        dateStr,
        log.full_name || log.username || '',
        log.ip_address || '',
        getActionLabel(log.action),
        getEntityTypeLabel(log.entity_type),
        log.entity_name || '',
        log.description || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sistem-loglari-${filters.date_from || 'all'}-${filters.date_to || 'all'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV dosyası indirildi');
  };

  const generatePDF = () => {
    const { jsPDF } = require('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header
    createHeader(doc, { filters });
    yPos = 40;

    // Title
    createTitle(doc, 'Sistem Logları', yPos);
    yPos += 15;

    // Filters
    if (filters.date_from || filters.date_to) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      let filterText = 'Filtreler: ';
      if (filters.date_from) filterText += `Başlangıç: ${filters.date_from} `;
      if (filters.date_to) filterText += `Bitiş: ${filters.date_to}`;
      doc.text(safeText(filterText), 20, yPos);
      yPos += 7;
    }

    // Table
    const columns = [
      { header: 'Tarih/Saat', width: 35 },
      { header: 'Kullanıcı', width: 30 },
      { header: 'IP Adresi', width: 25 },
      { header: 'İşlem', width: 20 },
      { header: 'Tip', width: 25 },
      { header: 'Açıklama', width: 55 }
    ];

    const tableData = filteredLogs.map(log => {
      let dateStr = '-';
      try {
        if (log.created_at) {
          const date = typeof log.created_at === 'string' 
            ? new Date(log.created_at) 
            : log.created_at;
          if (!isNaN(date.getTime())) {
            dateStr = format(date, 'dd.MM.yyyy HH:mm');
          }
        }
      } catch (e) {
        dateStr = '-';
      }
      return [
        dateStr,
        safeText(log.full_name || log.username || ''),
        safeText(log.ip_address || '-'),
        safeText(getActionLabel(log.action)),
        safeText(getEntityTypeLabel(log.entity_type)),
        safeText(log.description || '')
      ];
    });

    yPos = createTable(doc, columns, tableData, yPos, pageHeight);

    // Footer
    createFooter(doc, pageHeight);

    doc.save(`sistem-loglari-${filters.date_from || 'all'}-${filters.date_to || 'all'}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/reports')}
          className="text-white hover:bg-[#2D2F33]"
        >
          <ArrowLeft size={16} className="mr-2" />
          Geri
        </Button>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Sistem Logları</h1>
      </div>

      {/* Filters */}
      <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} style={{ color: 'var(--accent)' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Filtreler</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Başlangıç Tarihi</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none transition-colors"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent)';
                e.target.style.boxShadow = '0 0 0 3px var(--input-focus)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--input-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Bitiş Tarihi</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none transition-colors"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent)';
                e.target.style.boxShadow = '0 0 0 3px var(--input-focus)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--input-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Kullanıcı</label>
            <select
              value={filters.user_id}
              onChange={(e) => handleFilterChange('user_id', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none transition-colors"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent)';
                e.target.style.boxShadow = '0 0 0 3px var(--input-focus)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--input-border)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="">Tümü</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>İşlem Tipi</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none transition-colors"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent)';
                e.target.style.boxShadow = '0 0 0 3px var(--input-focus)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--input-border)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="">Tümü</option>
              <option value="create">Oluşturuldu</option>
              <option value="update">Güncellendi</option>
              <option value="delete">Silindi</option>
              <option value="payment">Ödeme</option>
              <option value="cancel">İptal Edildi</option>
              <option value="complete">Tamamlandı</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>IP Adresi</label>
            <input
              type="text"
              placeholder="IP adresi ara..."
              value={filters.ip_address}
              onChange={(e) => handleFilterChange('ip_address', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none transition-colors"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent)';
                e.target.style.boxShadow = '0 0 0 3px var(--input-focus)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--input-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleGetReport}
            className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            style={{
              background: 'var(--accent)',
              color: 'var(--text-primary)'
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--accent-hover)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--accent)'}
            title="Raporu Getir"
          >
            <FileText size={16} />
          </button>

          <button
            onClick={generatePDF}
            className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            style={{
              background: 'var(--chip-bg)',
              border: '1px solid var(--accent)',
              color: 'var(--accent)'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(0, 120, 255, 0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--chip-bg)'}
            title="PDF İndir"
          >
            <Download size={16} />
          </button>
          <button
            onClick={() => {
              if (filteredLogs.length === 0) {
                toast.error('Export edilecek log bulunamadı');
                return;
              }
              const xml = generateLogsXml(filteredLogs, filters);
              const filename = `sistem-loglari-${filters.date_from || 'all'}-${filters.date_to || 'all'}.xml`;
              downloadXml(xml, filename);
              toast.success('XML dosyası indirildi');
            }}
            className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            style={{
              background: 'var(--chip-bg)',
              border: '1px solid var(--accent)',
              color: 'var(--accent)'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(0, 120, 255, 0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--chip-bg)'}
            title="XML İndir"
          >
            <FileCode size={16} />
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            style={{
              background: 'var(--chip-bg)',
              border: '1px solid var(--accent)',
              color: 'var(--accent)'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(0, 120, 255, 0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--chip-bg)'}
            title="CSV İndir"
          >
            <FileSpreadsheet size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Ara (kullanıcı, açıklama, işlem tipi, IP adresi...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none transition-colors"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent)';
              e.target.style.boxShadow = '0 0 0 3px var(--input-focus)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--input-border)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* Özet İstatistikler */}
      {filteredLogs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Toplam Log</div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{stats.total}</div>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aksiyon Türleri</div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{Object.keys(stats.byAction).length}</div>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Varlık Türleri</div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{Object.keys(stats.byEntityType).length}</div>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Kullanıcı Sayısı</div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{Object.keys(stats.byUser).length}</div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--accent)' }}></div>
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Yükleniyor...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg p-4" style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', color: 'var(--danger)' }}>
          {error}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-lg p-12 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
          <FileText size={48} className="mx-auto mb-4 opacity-50" style={{ color: 'var(--text-secondary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Log kaydı bulunamadı</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'var(--table-header)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Tarih/Saat</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Kullanıcı</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>IP Adresi</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>İşlem</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Tip</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Varlık</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Açıklama</th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid var(--divider)' }}>
                {paginatedLogs.map((log) => {
                  let dateStr = '-';
                  try {
                    if (log.created_at) {
                      const date = typeof log.created_at === 'string' 
                        ? new Date(log.created_at) 
                        : log.created_at;
                      if (!isNaN(date.getTime())) {
                        dateStr = format(date, 'dd/MM/yyyy HH:mm');
                      }
                    }
                  } catch (e) {
                    console.error('Tarih formatı hatası:', e, log.created_at);
                  }
                  const isExpanded = expandedLogs.has(log.id);
                  const changes = formatChanges(log.changes);
                  
                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        className="transition-colors cursor-pointer"
                        style={{ borderBottom: '1px solid var(--divider)' }}
                        onMouseEnter={(e) => e.target.style.background = 'var(--hover-surface)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        onClick={() => toggleLogExpansion(log.id)}
                      >
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {dateStr}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                          <div className="flex items-center gap-2">
                            <User size={14} style={{ color: 'var(--text-secondary)' }} />
                            {log.full_name || log.username}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {log.ip_address || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="font-medium" style={{ color: getActionColor(log.action) }}>
                            {getActionLabel(log.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {getEntityTypeLabel(log.entity_type)}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                          {log.entity_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <div className="flex items-center justify-between">
                            <span className="truncate max-w-md">{log.description}</span>
                            {changes && changes.length > 0 && (
                              <span className="ml-2">
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && changes && changes.length > 0 && (
                        <tr>
                          <td colSpan="7" className="px-4 py-3" style={{ background: 'var(--hover-surface)' }}>
                            <div className="space-y-2">
                              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                Değişiklik Detayları:
                              </div>
                              <div className="space-y-1">
                                {changes.map((change, idx) => (
                                  <div key={idx} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                      {change.key}:
                                    </span>{' '}
                                    <span style={{ fontFamily: 'monospace' }}>
                                      {typeof change.value === 'string' && change.value.length > 100
                                        ? `${change.value.substring(0, 100)}...`
                                        : String(change.value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Sayfalama */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Sayfa başına:
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded text-sm"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} / {filteredLogs.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
                    style={{
                      background: currentPage === 1 ? 'var(--input-bg)' : 'var(--accent)',
                      color: currentPage === 1 ? 'var(--text-secondary)' : 'white',
                      border: '1px solid var(--input-border)'
                    }}
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
                    style={{
                      background: currentPage === totalPages ? 'var(--input-bg)' : 'var(--accent)',
                      color: currentPage === totalPages ? 'var(--text-secondary)' : 'white',
                      border: '1px solid var(--input-border)'
                    }}
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {filteredLogs.length > 0 && (
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Toplam <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{filteredLogs.length}</span> log kaydı gösteriliyor
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportsLogs;

