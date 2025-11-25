import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter, ArrowLeft, FileCode, FileSpreadsheet } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { createNewPdf, createTitle, savePdf, safeText } from '../../utils/pdfTemplate';
import { generateIncomeXml, downloadXml } from '../../utils/xmlExport';
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

const COLORS = ['#3EA6FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const ReportsIncome = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tourTypes, setTourTypes] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [cariAccounts, setCariAccounts] = useState([]);
  const [filters, setFilters] = useState({
    date_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    date_to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    tour_type_id: '',
    currency: '',
    income_category_id: '',
    user_id: '',
    cari_id: ''
  });

  useEffect(() => {
    fetchTourTypes();
    fetchIncomeCategories();
    fetchUsers();
    fetchCariAccounts();
    fetchReport();
  }, []);

  const fetchTourTypes = async () => {
    try {
      const response = await axios.get(`${API}/tour-types`);
      setTourTypes(response.data);
    } catch (error) {
      console.error('Tur tipleri yüklenemedi');
    }
  };

  const fetchIncomeCategories = async () => {
    try {
      const response = await axios.get(`${API}/income-categories`);
      setIncomeCategories(response.data || []);
    } catch (error) {
      console.error('Gelir kategorileri yüklenemedi');
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

  const fetchCariAccounts = async () => {
    try {
      const response = await axios.get(`${API}/cari-accounts`);
      setCariAccounts(response.data || []);
    } catch (error) {
      console.error('Cari hesaplar yüklenemedi');
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const response = await axios.get(`${API}/reports/income`, {
        params
      });
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
      let yPos = createTitle(doc, 'GELIR RAPORU', {
        date_from: filters.date_from,
        date_to: filters.date_to
      });
      
      // Döviz Bazlı Gelir
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Doviz Bazli Gelir', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`EUR: ${(reportData.total_revenue?.EUR || 0).toFixed(2)} EUR`, 20, yPos);
      yPos += 6;
      doc.text(`USD: ${(reportData.total_revenue?.USD || 0).toFixed(2)} USD`, 20, yPos);
      yPos += 6;
      doc.text(`TRY: ${(reportData.total_revenue?.TRY || 0).toFixed(2)} TRY`, 20, yPos);
      yPos += 12;
      
      // Tur Tipine Göre Dağılım
      if (reportData.tour_type_stats && reportData.tour_type_stats.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Tur Tipine Gore Gelir Dagilimi', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        reportData.tour_type_stats.slice(0, 10).forEach(stat => {
          const total = (stat.revenue?.EUR || 0) + (stat.revenue?.USD || 0) + (stat.revenue?.TRY || 0);
          doc.text(`${safeText(stat.tour_type_name || '-')}: ${total.toFixed(2)}`, 20, yPos);
          yPos += 6;
        });
        yPos += 6;
      }
      
      const filename = `gelir-raporu-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'Gelir Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const exportToCSV = () => {
    if (!reportData || !reportData.income_transactions || reportData.income_transactions.length === 0) {
      toast.error('Export edilecek veri bulunamadı');
      return;
    }

    try {
      const headers = ['Tarih', 'Kategori', 'Cari Hesap', 'Kullanıcı', 'Tutar', 'Döviz', 'Açıklama'];
      const rows = reportData.income_transactions.map(trans => {
        const date = trans.date ? format(parseISO(trans.date), 'dd.MM.yyyy') : '-';
        return [
          date,
          trans.income_category_name || '-',
          trans.cari_name || '-',
          trans.user_name || '-',
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
      link.setAttribute('download', `gelir-raporu-${filters.date_from}-${filters.date_to}.csv`);
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
  const currencyChartData = reportData?.total_revenue ? [
    { name: 'EUR', value: reportData.total_revenue.EUR || 0 },
    { name: 'USD', value: reportData.total_revenue.USD || 0 },
    { name: 'TRY', value: reportData.total_revenue.TRY || 0 }
  ] : [];

  const tourTypeChartData = reportData?.tour_type_stats ? reportData.tour_type_stats.map(stat => ({
    name: stat.tour_type_name || '-',
    value: (stat.revenue?.EUR || 0) + (stat.revenue?.USD || 0) + (stat.revenue?.TRY || 0)
  })) : [];

  const currencyBarData = reportData?.total_revenue ? [
    {
      name: 'Döviz',
      EUR: reportData.total_revenue.EUR || 0,
      USD: reportData.total_revenue.USD || 0,
      TRY: reportData.total_revenue.TRY || 0
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
    <div className="space-y-6" data-testid="reports-income-page">
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
            <h1 className="text-3xl font-bold text-white mb-2">Gelir Raporu</h1>
            <p className="text-[#A5A5A5]">Tur tiplerine ve döviz tiplerine göre gelir analizi</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={generatePDF} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="PDF İndir">
            <Download size={18} />
          </Button>
          <Button 
            onClick={() => {
              if (!reportData) return;
              const xml = generateIncomeXml(reportData, filters);
              const filename = `gelir-raporu-${filters.date_from}-${filters.date_to}.xml`;
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
            <label className="block text-sm font-medium mb-2 text-white">Başlangıç Tarihi</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Bitiş Tarihi</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Tur Tipi</label>
            <select
              value={filters.tour_type_id}
              onChange={(e) => setFilters({ ...filters, tour_type_id: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            >
              <option value="">Tümü</option>
              {tourTypes.map(tourType => (
                <option key={tourType.id} value={tourType.id}>{tourType.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Döviz</label>
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
            <label className="block text-sm font-medium mb-2 text-white">Gelir Kategorisi</label>
            <select
              value={filters.income_category_id}
              onChange={(e) => setFilters({ ...filters, income_category_id: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            >
              <option value="">Tümü</option>
              {incomeCategories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Kullanıcı</label>
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
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Cari Hesap</label>
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
          {/* Özet Kartlar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Gelir EUR</div>
              <div className="text-3xl font-bold text-white">{(reportData.total_revenue?.EUR || 0).toFixed(2)}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Gelir USD</div>
              <div className="text-3xl font-bold text-white">{(reportData.total_revenue?.USD || 0).toFixed(2)}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Gelir TRY</div>
              <div className="text-3xl font-bold text-white">{(reportData.total_revenue?.TRY || 0).toFixed(2)}</div>
            </div>
          </div>

          {/* Grafikler */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Döviz Bazlı Gelir Pasta Grafiği */}
            {currencyChartData.length > 0 && (
              <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Döviz Bazlı Gelir Dağılımı</h2>
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
                        border: '1px solid #3EA6FF',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => value.toFixed(2)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tur Tipine Göre Gelir Bar Grafiği */}
            {tourTypeChartData.length > 0 && (
              <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Tur Tipine Göre Gelir</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tourTypeChartData.slice(0, 10)}>
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
                        border: '1px solid #3EA6FF',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => value.toFixed(2)}
                    />
                    <Bar dataKey="value" fill="#3EA6FF" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Günlük Trend Grafiği */}
          {trendData.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Günlük Gelir Trendi</h2>
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
                      border: '1px solid #3EA6FF',
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
                    stroke="#3EA6FF" 
                    strokeWidth={2}
                    dot={{ fill: '#3EA6FF', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="USD" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981', r: 4 }}
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

          {/* Tur Tipine Göre Detaylı Listesi */}
          {reportData.tour_type_stats && reportData.tour_type_stats.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">Tur Tipine Göre Gelir Detayları</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tur Tipi</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Rezervasyon Sayısı</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Gelir EUR</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Gelir USD</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Gelir TRY</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Toplam Gelir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.tour_type_stats.map((stat, idx) => {
                      const total = (stat.revenue?.EUR || 0) + (stat.revenue?.USD || 0) + (stat.revenue?.TRY || 0);
                      return (
                        <tr key={idx} className="hover:bg-[#2D2F33]">
                          <td className="px-6 py-4 text-white text-sm">{stat.tour_type_name || '-'}</td>
                          <td className="px-6 py-4 text-white text-sm text-right">{stat.reservation_count || 0}</td>
                          <td className="px-6 py-4 text-white text-sm text-right">{(stat.revenue?.EUR || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-white text-sm text-right">{(stat.revenue?.USD || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-white text-sm text-right">{(stat.revenue?.TRY || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-[#3EA6FF] text-sm font-semibold text-right">{total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Kategori Bazlı Gelir Tablosu */}
          {reportData.category_stats && reportData.category_stats.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">Kategori Bazlı Gelir</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Kategori</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Gelir Sayısı</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">EUR</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">USD</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">TRY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.category_stats.map((stat, idx) => (
                      <tr key={idx} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm">{stat.category_name}</td>
                        <td className="px-6 py-4 text-[#A5A5A5] text-sm text-right">{stat.income_count}</td>
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

          {/* Detaylı Gelir Listesi */}
          {reportData.income_transactions && reportData.income_transactions.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">Detaylı Gelir Listesi</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Kategori</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Cari Hesap</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Kullanıcı</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Tutar</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Döviz</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Açıklama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.income_transactions.slice(0, 100).map((trans, idx) => {
                      const date = trans.date ? format(parseISO(trans.date), 'dd.MM.yyyy') : '-';
                      return (
                        <tr key={idx} className="hover:bg-[#2D2F33]">
                          <td className="px-6 py-4 text-white text-sm">{date}</td>
                          <td className="px-6 py-4 text-white text-sm">{trans.income_category_name || '-'}</td>
                          <td className="px-6 py-4 text-white text-sm">{trans.cari_name || '-'}</td>
                          <td className="px-6 py-4 text-[#A5A5A5] text-sm">{trans.user_name || '-'}</td>
                          <td className="px-6 py-4 text-green-400 text-sm text-right">{(trans.amount || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-white text-sm">{trans.currency || 'TRY'}</td>
                          <td className="px-6 py-4 text-[#A5A5A5] text-sm">{trans.description || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {reportData.income_transactions.length > 100 && (
                  <div className="p-4 text-center text-[#A5A5A5] text-sm">
                    Toplam {reportData.income_transactions.length} kayıt bulundu. İlk 100 kayıt gösteriliyor.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsIncome;
