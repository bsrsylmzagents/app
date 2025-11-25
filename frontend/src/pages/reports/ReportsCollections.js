import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter, ArrowLeft, FileCode, FileSpreadsheet } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import { generateCollectionsXml, downloadXml } from '../../utils/xmlExport';
import { Button } from '@/components/ui/button';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

const COLORS = ['#10B981', '#3EA6FF', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'];

const ReportsCollections = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    date_to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    payment_type_id: '',
    currency: '',
    cari_id: '',
    user_id: ''
  });
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [cariAccounts, setCariAccounts] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchPaymentTypes();
    fetchCariAccounts();
    fetchUsers();
    fetchReport();
  }, []);

  const fetchPaymentTypes = async () => {
    try {
      const response = await axios.get(`${API}/payment-types`);
      setPaymentTypes(response.data);
    } catch (error) {
      console.error('Ödeme tipleri yüklenemedi');
    }
  };

  const fetchCariAccounts = async () => {
    try {
      const response = await axios.get(`${API}/cari-accounts`);
      setCariAccounts(response.data || []);
    } catch (error) {
      console.error('Cari hesaplar yüklenemedi');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data || []);
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi');
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const response = await axios.get(`${API}/reports/collections`, { params });
      setReportData(response.data);
    } catch (error) {
      toast.error('Rapor yüklenemedi');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!reportData) return;

    try {
      toast.info('PDF hazırlanıyor...');
      
      const doc = createNewPdf();
      let yPos = createTitle(doc, 'TAHSILAT RAPORU', {
        date_from: filters.date_from,
        date_to: filters.date_to
      });
      
      // Toplam Tahsilatlar
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Toplam Tahsilatlar', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`EUR: ${(reportData.collections?.EUR || 0).toFixed(2)} EUR`, 20, yPos);
      yPos += 6;
      doc.text(`USD: ${(reportData.collections?.USD || 0).toFixed(2)} USD`, 20, yPos);
      yPos += 6;
      doc.text(`TRY: ${(reportData.collections?.TRY || 0).toFixed(2)} TRY`, 20, yPos);
      yPos += 12;
      
      // Ödeme tipine göre toplam
      if (reportData.payment_type_stats && reportData.payment_type_stats.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Odeme Tiplerine Gore Toplam', 20, yPos);
        yPos += 8;
        
        const paymentData = reportData.payment_type_stats.slice(0, 20).map(p => ({
          tip: safeText(p.payment_type_name || '-'),
          toplam: Object.entries(p.totals || {})
            .filter(([_, v]) => v > 0)
            .map(([curr, val]) => `${(val || 0).toFixed(2)} ${curr}`)
            .join(' / ') || '0.00'
        }));
        
        const columns = [
          { header: 'Ödeme Tipi', key: 'tip', width: 70 },
          { header: 'Toplam', key: 'toplam', width: 80, align: 'right' }
        ];
        
        yPos = createTable(doc, paymentData, columns, yPos);
      }
      
      const filename = `tahsilat-raporu-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'Tahsilat Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const exportToCSV = () => {
    if (!reportData || !reportData.transactions || reportData.transactions.length === 0) {
      toast.error('Export edilecek veri bulunamadı');
      return;
    }

    try {
      const headers = ['Tarih', 'Saat', 'Cari Hesap', 'Kullanıcı', 'Ödeme Tipi', 'Tutar', 'Döviz', 'Açıklama'];
      const rows = reportData.transactions.map(trans => {
        const date = trans.date ? format(parseISO(trans.date), 'dd.MM.yyyy') : '-';
        const time = trans.time || '-';
        return [
          date,
          time,
          trans.cari_name || '-',
          trans.user_name || '-',
          trans.payment_type_name || '-',
          (trans.amount || 0).toFixed(2),
          trans.currency || 'TRY',
          trans.description || ''
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
      link.setAttribute('download', `tahsilat-raporu-${filters.date_from}-${filters.date_to}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV dosyası indirildi');
    } catch (error) {
      console.error('CSV export hatası:', error);
      toast.error('CSV export edilirken hata oluştu');
    }
  };

  // Grafik verilerini hazırla
  const currencyChartData = reportData?.collections ? [
    { name: 'EUR', value: reportData.collections.EUR || 0 },
    { name: 'USD', value: reportData.collections.USD || 0 },
    { name: 'TRY', value: reportData.collections.TRY || 0 }
  ].filter(item => item.value > 0) : [];

  const paymentTypeChartData = reportData?.payment_type_stats ? reportData.payment_type_stats.map(p => {
    const total = (p.totals?.EUR || 0) + (p.totals?.USD || 0) + (p.totals?.TRY || 0);
    return {
      name: p.payment_type_name || '-',
      value: total
    };
  }).filter(item => item.value > 0) : [];

  const currencyBarData = reportData?.collections ? [
    {
      name: 'Döviz',
      EUR: reportData.collections.EUR || 0,
      USD: reportData.collections.USD || 0,
      TRY: reportData.collections.TRY || 0
    }
  ] : [];

  const trendData = reportData?.daily_trend ? Object.entries(reportData.daily_trend)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([date, amounts]) => ({
      date: format(parseISO(date), 'dd.MM'),
      EUR: amounts.EUR || 0,
      USD: amounts.USD || 0,
      TRY: amounts.TRY || 0
    })) : [];

  return (
    <div className="space-y-6" data-testid="reports-collections-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Tahsilat Raporu</h1>
            <p className="text-[#A5A5A5]">Ödeme tiplerine ve döviz tiplerine göre tahsilat analizi</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={generatePDF} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="PDF İndir">
            <Download size={18} />
          </Button>
          <Button 
            onClick={() => {
              if (!reportData) return;
              const xml = generateCollectionsXml(reportData, filters);
              const filename = `tahsilat-raporu-${filters.date_from}-${filters.date_to}.xml`;
              downloadXml(xml, filename);
              toast.success('XML dosyası indirildi');
            }} 
            variant="outline" 
            className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" 
            title="XML İndir"
          >
            <FileCode size={18} />
          </Button>
          <Button 
            onClick={exportToCSV} 
            variant="outline" 
            className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" 
            title="CSV İndir"
          >
            <FileSpreadsheet size={18} />
          </Button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Filtreler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#A5A5A5] mb-2">Başlangıç Tarihi</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#A5A5A5] mb-2">Bitiş Tarihi</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#A5A5A5] mb-2">Ödeme Tipi</label>
            <select
              value={filters.payment_type_id}
              onChange={(e) => setFilters({ ...filters, payment_type_id: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            >
              <option value="">Tümü</option>
              {paymentTypes.map(paymentType => (
                <option key={paymentType.id} value={paymentType.id}>{paymentType.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#A5A5A5] mb-2">Döviz</label>
            <select
              value={filters.currency}
              onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            >
              <option value="">Tümü</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="TRY">TRY</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#A5A5A5] mb-2">Cari Hesap</label>
            <select
              value={filters.cari_id}
              onChange={(e) => setFilters({ ...filters, cari_id: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            >
              <option value="">Tümü</option>
              {cariAccounts.map(cari => (
                <option key={cari.id} value={cari.id}>{cari.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#A5A5A5] mb-2">Kullanıcı</label>
            <select
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            >
              <option value="">Tümü</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.full_name || user.username}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={fetchReport} className="btn-primary" title="Filtrele">
            <Filter size={18} className="mr-2" />
            Filtrele
          </Button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3EA6FF] mx-auto"></div>
          <p className="text-[#A5A5A5] mt-4">Rapor yükleniyor...</p>
        </div>
      )}

      {!loading && reportData && (
        <>
          {/* Toplam Tahsilatlar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Tahsilat EUR</div>
              <div className="text-3xl font-bold text-green-400">{(reportData.collections?.EUR || 0).toFixed(2)}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Tahsilat USD</div>
              <div className="text-3xl font-bold text-green-400">{(reportData.collections?.USD || 0).toFixed(2)}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Tahsilat TRY</div>
              <div className="text-3xl font-bold text-green-400">{(reportData.collections?.TRY || 0).toFixed(2)}</div>
            </div>
          </div>

          {/* Grafikler */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Döviz Bazlı Tahsilat Pasta Grafiği */}
            {currencyChartData.length > 0 && (
              <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Döviz Bazlı Tahsilat Dağılımı</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={currencyChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {currencyChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#2D2F33', 
                        border: '1px solid #10B981',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => value.toFixed(2)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Ödeme Tipine Göre Bar Grafiği */}
            {paymentTypeChartData.length > 0 && (
              <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Ödeme Tipine Göre Tahsilat</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={paymentTypeChartData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D2F33" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#A5A5A5"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: '#A5A5A5', fontSize: 12 }}
                    />
                    <YAxis stroke="#A5A5A5" tick={{ fill: '#A5A5A5' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#2D2F33', 
                        border: '1px solid #10B981',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => value.toFixed(2)}
                    />
                    <Bar dataKey="value" fill="#10B981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Günlük Trend Grafiği */}
          {trendData.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Günlük Tahsilat Trendi</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D2F33" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#A5A5A5"
                    tick={{ fill: '#A5A5A5', fontSize: 12 }}
                  />
                  <YAxis stroke="#A5A5A5" tick={{ fill: '#A5A5A5' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#2D2F33', 
                      border: '1px solid #10B981',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value) => value.toFixed(2)}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#A5A5A5' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="EUR" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="USD" 
                    stroke="#3EA6FF" 
                    strokeWidth={2}
                    dot={{ fill: '#3EA6FF', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="TRY" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Ödeme Tipine Göre Detaylı Listesi */}
          {reportData.payment_type_stats && reportData.payment_type_stats.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">Ödeme Tipine Göre Tahsilat Detayları</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Ödeme Tipi</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">İşlem Sayısı</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Tahsilat EUR</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Tahsilat USD</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Tahsilat TRY</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Toplam Tahsilat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.payment_type_stats.map((stat, idx) => {
                      const total = (stat.totals?.EUR || 0) + (stat.totals?.USD || 0) + (stat.totals?.TRY || 0);
                      return (
                        <tr key={idx} className="hover:bg-[#2D2F33]">
                          <td className="px-6 py-4 text-white text-sm">{stat.payment_type_name || '-'}</td>
                          <td className="px-6 py-4 text-white text-sm text-right">{stat.transaction_count || 0}</td>
                          <td className="px-6 py-4 text-green-400 text-sm text-right">{(stat.totals?.EUR || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-green-400 text-sm text-right">{(stat.totals?.USD || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-green-400 text-sm text-right">{(stat.totals?.TRY || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-green-400 text-sm font-semibold text-right">{total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cari Hesaba Göre Tablo */}
          {reportData.cari_stats && reportData.cari_stats.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">Cari Hesaba Göre Tahsilatlar</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Cari Hesap</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">İşlem Sayısı</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">EUR</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">USD</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">TRY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.cari_stats.map((stat, idx) => (
                      <tr key={idx} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm">{stat.cari_name}</td>
                        <td className="px-6 py-4 text-[#A5A5A5] text-sm text-right">{stat.transaction_count}</td>
                        <td className="px-6 py-4 text-green-400 text-sm text-right">{(stat.totals?.EUR || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-green-400 text-sm text-right">{(stat.totals?.USD || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-green-400 text-sm text-right">{(stat.totals?.TRY || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detaylı Tahsilat Listesi */}
          {reportData.transactions && reportData.transactions.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">Detaylı Tahsilat Listesi</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Saat</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Cari Hesap</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Kullanıcı</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Ödeme Tipi</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Tutar</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Döviz</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Açıklama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.transactions.slice(0, 100).map((transaction, idx) => {
                      const date = transaction.date ? format(parseISO(transaction.date), 'dd.MM.yyyy') : '-';
                      const time = transaction.time || '-';
                      return (
                        <tr key={idx} className="hover:bg-[#2D2F33]">
                          <td className="px-6 py-4 text-white text-sm">{date}</td>
                          <td className="px-6 py-4 text-[#A5A5A5] text-sm">{time}</td>
                          <td className="px-6 py-4 text-white text-sm">{transaction.cari_name || '-'}</td>
                          <td className="px-6 py-4 text-[#A5A5A5] text-sm">{transaction.user_name || '-'}</td>
                          <td className="px-6 py-4 text-white text-sm">{transaction.payment_type_name || '-'}</td>
                          <td className="px-6 py-4 text-green-400 text-sm text-right">{(transaction.amount || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-white text-sm">{transaction.currency || 'TRY'}</td>
                          <td className="px-6 py-4 text-[#A5A5A5] text-sm">{transaction.description || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {reportData.transactions.length > 100 && (
                  <div className="p-4 text-center text-[#A5A5A5] text-sm">
                    Toplam {reportData.transactions.length} kayıt bulundu. İlk 100 kayıt gösteriliyor.
                  </div>
                )}
              </div>
            </div>
          )}

          {(!reportData.transactions || reportData.transactions.length === 0) && (
            <div className="text-center py-12">
              <p className="text-[#A5A5A5]">Rapor verisi bulunamadı</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsCollections;

