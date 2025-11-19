import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter, ArrowLeft, FileCode, FileSpreadsheet } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { createNewPdf, createTitle, savePdf, safeText } from '../../utils/pdfTemplate';
import { generateGenericXml, downloadXml } from '../../utils/xmlExport';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#3EA6FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const ReportsCustomerAnalysis = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    date_to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    currency: '',
    min_sales: ''
  });

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      if (params.min_sales) {
        params.min_sales = parseInt(params.min_sales);
      }
      const response = await axios.get(`${API}/reports/customer-analysis`, { params });
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
      let yPos = createTitle(doc, 'MÜŞTERİ ANALİZİ RAPORU', {
        date_from: filters.date_from,
        date_to: filters.date_to
      });
      
      // Özet
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Özet', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Toplam Müşteri: ${reportData.total_customers}`, 20, yPos);
      yPos += 6;
      doc.text(`Tekrar Eden Müşteri: ${reportData.returning_customers}`, 20, yPos);
      yPos += 6;
      doc.text(`Yeni Müşteri: ${reportData.new_customers}`, 20, yPos);
      yPos += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text('Toplam Gelir', 20, yPos);
      yPos += 6;
      doc.setFont(undefined, 'normal');
      doc.text(`EUR: ${(reportData.total_revenue?.EUR || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`USD: ${(reportData.total_revenue?.USD || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`TRY: ${(reportData.total_revenue?.TRY || 0).toFixed(2)}`, 20, yPos);
      
      const filename = `musteri-analizi-raporu-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'Müşteri Analizi Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const exportToCSV = () => {
    if (!reportData || !reportData.customers || reportData.customers.length === 0) {
      toast.error('Export edilecek veri bulunamadı');
      return;
    }

    try {
      const headers = ['Müşteri Adı', 'İletişim', 'Toplam Satış', 'Toplam Gelir EUR', 'Toplam Gelir USD', 'Toplam Gelir TRY', 'İlk Satış', 'Son Satış', 'Tekrar Eden'];
      const rows = reportData.customers.map(customer => {
        const firstSale = customer.first_sale_date ? format(parseISO(customer.first_sale_date), 'dd.MM.yyyy') : '-';
        const lastSale = customer.last_sale_date ? format(parseISO(customer.last_sale_date), 'dd.MM.yyyy') : '-';
        return [
          customer.customer_name || '-',
          customer.customer_contact || '-',
          customer.total_sales || 0,
          (customer.total_revenue?.EUR || 0).toFixed(2),
          (customer.total_revenue?.USD || 0).toFixed(2),
          (customer.total_revenue?.TRY || 0).toFixed(2),
          firstSale,
          lastSale,
          customer.is_returning ? 'Evet' : 'Hayır'
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
      link.setAttribute('download', `musteri-analizi-raporu-${filters.date_from}-${filters.date_to}.csv`);
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
  const topCustomersData = reportData?.customers ? reportData.customers.slice(0, 10).map(customer => {
    const total = (customer.total_revenue?.EUR || 0) + (customer.total_revenue?.USD || 0) + (customer.total_revenue?.TRY || 0);
    return {
      name: customer.customer_name.length > 20 ? customer.customer_name.substring(0, 20) + '...' : customer.customer_name,
      revenue: total,
      sales: customer.total_sales
    };
  }) : [];

  const customerTypeData = reportData ? [
    { name: 'Yeni Müşteri', value: reportData.new_customers || 0 },
    { name: 'Tekrar Eden', value: reportData.returning_customers || 0 }
  ].filter(item => item.value > 0) : [];

  const revenueByCurrency = reportData?.total_revenue ? [
    { name: 'EUR', value: reportData.total_revenue.EUR || 0 },
    { name: 'USD', value: reportData.total_revenue.USD || 0 },
    { name: 'TRY', value: reportData.total_revenue.TRY || 0 }
  ].filter(item => item.value > 0) : [];

  return (
    <div className="space-y-6" data-testid="reports-customer-analysis-page">
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
            <h1 className="text-3xl font-bold text-white mb-2">Müşteri Analizi Raporu</h1>
            <p className="text-[#A5A5A5]">Müşteri bazlı satış, gelir ve tekrar ziyaret analizi</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={generatePDF} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="PDF İndir">
            <Download size={18} />
          </Button>
          <Button 
            onClick={() => {
              if (!reportData) return;
              const xml = generateGenericXml('Müşteri Analizi Raporu', reportData, filters);
              const filename = `musteri-analizi-raporu-${filters.date_from}-${filters.date_to}.xml`;
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium mb-2 text-white">Min Satış Sayısı</label>
            <input
              type="number"
              min="1"
              value={filters.min_sales}
              onChange={(e) => setFilters({ ...filters, min_sales: e.target.value })}
              placeholder="Örn: 2"
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            />
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Müşteri</div>
              <div className="text-3xl font-bold text-white">{reportData.total_customers || 0}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Tekrar Eden Müşteri</div>
              <div className="text-3xl font-bold text-green-400">{reportData.returning_customers || 0}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Yeni Müşteri</div>
              <div className="text-3xl font-bold text-blue-400">{reportData.new_customers || 0}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Gelir</div>
              <div className="text-lg font-bold text-green-400">
                EUR: {(reportData.total_revenue?.EUR || 0).toFixed(2)}<br />
                USD: {(reportData.total_revenue?.USD || 0).toFixed(2)}<br />
                TRY: {(reportData.total_revenue?.TRY || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Grafikler */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Müşteri Tipi Dağılımı */}
            {customerTypeData.length > 0 && (
              <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Müşteri Tipi Dağılımı</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={customerTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {customerTypeData.map((entry, index) => (
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
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Döviz Bazlı Gelir */}
            {revenueByCurrency.length > 0 && (
              <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Döviz Bazlı Toplam Gelir</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueByCurrency}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {revenueByCurrency.map((entry, index) => (
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
          </div>

          {/* Top 10 Müşteri */}
          {topCustomersData.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">En Çok Gelir Getiren Müşteriler (Top 10)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCustomersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D2F33" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#A5A5A5"
                    angle={-45}
                    textAnchor="end"
                    height={100}
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
                  <Bar dataKey="revenue" fill="#3EA6FF" radius={[8, 8, 0, 0]} name="Toplam Gelir" />
                  <Bar dataKey="sales" fill="#10B981" radius={[8, 8, 0, 0]} name="Satış Sayısı" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detaylı Müşteri Listesi */}
          {reportData.customers && reportData.customers.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">Detaylı Müşteri Listesi</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Müşteri Adı</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">İletişim</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Toplam Satış</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">EUR</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">USD</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">TRY</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">İlk Satış</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Son Satış</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-white">Tekrar Eden</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.customers.slice(0, 100).map((customer, idx) => {
                      const firstSale = customer.first_sale_date ? format(parseISO(customer.first_sale_date), 'dd.MM.yyyy') : '-';
                      const lastSale = customer.last_sale_date ? format(parseISO(customer.last_sale_date), 'dd.MM.yyyy') : '-';
                      return (
                        <tr key={idx} className="hover:bg-[#2D2F33]">
                          <td className="px-6 py-4 text-white text-sm font-medium">{customer.customer_name || '-'}</td>
                          <td className="px-6 py-4 text-[#A5A5A5] text-sm">{customer.customer_contact || '-'}</td>
                          <td className="px-6 py-4 text-white text-sm text-right">{customer.total_sales || 0}</td>
                          <td className="px-6 py-4 text-green-400 text-sm text-right">{(customer.total_revenue?.EUR || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-green-400 text-sm text-right">{(customer.total_revenue?.USD || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-green-400 text-sm text-right">{(customer.total_revenue?.TRY || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-[#A5A5A5] text-sm">{firstSale}</td>
                          <td className="px-6 py-4 text-[#A5A5A5] text-sm">{lastSale}</td>
                          <td className="px-6 py-4 text-center">
                            {customer.is_returning ? (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">Evet</span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">Hayır</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {reportData.customers.length > 100 && (
                  <div className="p-4 text-center text-[#A5A5A5] text-sm">
                    Toplam {reportData.customers.length} müşteri bulundu. İlk 100 müşteri gösteriliyor.
                  </div>
                )}
              </div>
            </div>
          )}

          {(!reportData.customers || reportData.customers.length === 0) && (
            <div className="text-center py-12">
              <p className="text-[#A5A5A5]">Müşteri verisi bulunamadı</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsCustomerAnalysis;



