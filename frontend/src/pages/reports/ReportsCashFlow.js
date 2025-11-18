import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter, ArrowLeft, FileCode, TrendingUp, TrendingDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, startOfWeek, endOfWeek } from 'date-fns';
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
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';

const ReportsCashFlow = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    date_to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    currency: '',
    period: 'daily'  // daily, weekly, monthly
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
      const response = await axios.get(`${API}/reports/cash-flow`, {
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
      let yPos = createTitle(doc, 'NAKİT AKIŞ RAPORU', {
        date_from: filters.date_from,
        date_to: filters.date_to,
        period: filters.period
      });
      
      // Özet
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Özet', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Toplam Giriş EUR: ${(reportData.total_inflow?.EUR || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`Toplam Giriş USD: ${(reportData.total_inflow?.USD || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`Toplam Giriş TRY: ${(reportData.total_inflow?.TRY || 0).toFixed(2)}`, 20, yPos);
      yPos += 8;
      
      doc.text(`Toplam Çıkış EUR: ${(reportData.total_outflow?.EUR || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`Toplam Çıkış USD: ${(reportData.total_outflow?.USD || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`Toplam Çıkış TRY: ${(reportData.total_outflow?.TRY || 0).toFixed(2)}`, 20, yPos);
      yPos += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text(`Net Akış EUR: ${(reportData.total_net_flow?.EUR || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`Net Akış USD: ${(reportData.total_net_flow?.USD || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`Net Akış TRY: ${(reportData.total_net_flow?.TRY || 0).toFixed(2)}`, 20, yPos);
      
      const filename = `nakit-akis-raporu-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'Nakit Akış Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  // Grafik verilerini hazırla
  const chartData = reportData?.cash_flow ? reportData.cash_flow.map(item => {
    const dateObj = parseISO(item.date);
    let dateLabel = '';
    if (filters.period === 'weekly') {
      dateLabel = format(dateObj, 'dd.MM') + ' (Hafta)';
    } else if (filters.period === 'monthly') {
      dateLabel = format(dateObj, 'MMM yyyy');
    } else {
      dateLabel = format(dateObj, 'dd.MM');
    }
    
    return {
      date: dateLabel,
      inflow_EUR: item.inflow?.EUR || 0,
      inflow_USD: item.inflow?.USD || 0,
      inflow_TRY: item.inflow?.TRY || 0,
      outflow_EUR: item.outflow?.EUR || 0,
      outflow_USD: item.outflow?.USD || 0,
      outflow_TRY: item.outflow?.TRY || 0,
      net_EUR: item.net_flow?.EUR || 0,
      net_USD: item.net_flow?.USD || 0,
      net_TRY: item.net_flow?.TRY || 0,
      balance_EUR: item.balance?.EUR || 0,
      balance_USD: item.balance?.USD || 0,
      balance_TRY: item.balance?.TRY || 0
    };
  }) : [];

  return (
    <div className="space-y-6" data-testid="reports-cash-flow-page">
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
            <h1 className="text-3xl font-bold text-white mb-2">Nakit Akış Raporu</h1>
            <p className="text-[#A5A5A5]">Günlük/haftalık/aylık nakit giriş-çıkış analizi</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={generatePDF} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="PDF İndir">
            <Download size={18} />
          </Button>
          <Button 
            onClick={() => {
              if (!reportData) return;
              const xml = generateGenericXml('Nakit Akış Raporu', reportData, filters);
              const filename = `nakit-akis-raporu-${filters.date_from}-${filters.date_to}.xml`;
              downloadXml(xml, filename);
              toast.success('XML dosyası indirildi');
            }} 
            variant="outline" 
            className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" 
            title="XML İndir"
          >
            <FileCode size={18} />
          </Button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Filtreler</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium mb-2 text-white">Periyot</label>
            <select
              value={filters.period}
              onChange={(e) => setFilters({ ...filters, period: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            >
              <option value="daily">Günlük</option>
              <option value="weekly">Haftalık</option>
              <option value="monthly">Aylık</option>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Giriş</div>
              <div className="text-2xl font-bold text-green-400">
                EUR: {(reportData.total_inflow?.EUR || 0).toFixed(2)}<br />
                USD: {(reportData.total_inflow?.USD || 0).toFixed(2)}<br />
                TRY: {(reportData.total_inflow?.TRY || 0).toFixed(2)}
              </div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Çıkış</div>
              <div className="text-2xl font-bold text-red-400">
                EUR: {(reportData.total_outflow?.EUR || 0).toFixed(2)}<br />
                USD: {(reportData.total_outflow?.USD || 0).toFixed(2)}<br />
                TRY: {(reportData.total_outflow?.TRY || 0).toFixed(2)}
              </div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Net Akış</div>
              <div className="text-2xl font-bold" style={{
                color: (reportData.total_net_flow?.EUR || 0) >= 0 ? '#10B981' : '#EF4444'
              }}>
                EUR: {(reportData.total_net_flow?.EUR || 0).toFixed(2)}<br />
                USD: {(reportData.total_net_flow?.USD || 0).toFixed(2)}<br />
                TRY: {(reportData.total_net_flow?.TRY || 0).toFixed(2)}
              </div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Mevcut Bakiye</div>
              <div className="text-2xl font-bold text-blue-400">
                EUR: {(reportData.current_balances?.EUR || 0).toFixed(2)}<br />
                USD: {(reportData.current_balances?.USD || 0).toFixed(2)}<br />
                TRY: {(reportData.current_balances?.TRY || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Grafikler */}
          <div className="grid grid-cols-1 gap-6">
            {/* Giriş/Çıkış Karşılaştırması */}
            {chartData.length > 0 && (
              <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Giriş vs Çıkış</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D2F33" />
                    <XAxis 
                      dataKey="date" 
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
                    <Bar dataKey="inflow_EUR" stackId="inflow" fill="#10B981" name="Giriş EUR" />
                    <Bar dataKey="inflow_USD" stackId="inflow" fill="#3EA6FF" name="Giriş USD" />
                    <Bar dataKey="inflow_TRY" stackId="inflow" fill="#F59E0B" name="Giriş TRY" />
                    <Bar dataKey="outflow_EUR" stackId="outflow" fill="#EF4444" name="Çıkış EUR" />
                    <Bar dataKey="outflow_USD" stackId="outflow" fill="#F97316" name="Çıkış USD" />
                    <Bar dataKey="outflow_TRY" stackId="outflow" fill="#DC2626" name="Çıkış TRY" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Net Akış Trendi */}
            {chartData.length > 0 && (
              <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Net Akış Trendi</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorNetEur" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3EA6FF" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3EA6FF" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNetUsd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNetTry" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D2F33" />
                    <XAxis 
                      dataKey="date" 
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
                      formatter={(value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#A5A5A5' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="net_EUR" 
                      stroke="#3EA6FF" 
                      fillOpacity={1}
                      fill="url(#colorNetEur)"
                      name="Net EUR"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="net_USD" 
                      stroke="#10B981" 
                      fillOpacity={1}
                      fill="url(#colorNetUsd)"
                      name="Net USD"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="net_TRY" 
                      stroke="#F59E0B" 
                      fillOpacity={1}
                      fill="url(#colorNetTry)"
                      name="Net TRY"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bakiye Trendi */}
            {chartData.length > 0 && (
              <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Bakiye Trendi</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D2F33" />
                    <XAxis 
                      dataKey="date" 
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
                    <Line 
                      type="monotone" 
                      dataKey="balance_EUR" 
                      stroke="#3EA6FF" 
                      strokeWidth={2}
                      dot={{ fill: '#3EA6FF', r: 4 }}
                      name="Bakiye EUR"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balance_USD" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={{ fill: '#10B981', r: 4 }}
                      name="Bakiye USD"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balance_TRY" 
                      stroke="#F59E0B" 
                      strokeWidth={2}
                      dot={{ fill: '#F59E0B', r: 4 }}
                      name="Bakiye TRY"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Detaylı Tablo */}
          {reportData.cash_flow && reportData.cash_flow.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">Nakit Akış Detayları</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Giriş EUR</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Giriş USD</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Giriş TRY</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Çıkış EUR</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Çıkış USD</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Çıkış TRY</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Net EUR</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Net USD</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Net TRY</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Bakiye EUR</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Bakiye USD</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Bakiye TRY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.cash_flow.map((item, idx) => {
                      const dateObj = parseISO(item.date);
                      let dateLabel = '';
                      if (filters.period === 'weekly') {
                        dateLabel = format(dateObj, 'dd.MM.yyyy') + ' (Hafta)';
                      } else if (filters.period === 'monthly') {
                        dateLabel = format(dateObj, 'MMMM yyyy');
                      } else {
                        dateLabel = format(dateObj, 'dd.MM.yyyy');
                      }
                      
                      return (
                        <tr key={idx} className="hover:bg-[#2D2F33]">
                          <td className="px-6 py-4 text-white text-sm">{dateLabel}</td>
                          <td className="px-6 py-4 text-green-400 text-sm text-right">{(item.inflow?.EUR || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-green-400 text-sm text-right">{(item.inflow?.USD || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-green-400 text-sm text-right">{(item.inflow?.TRY || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-red-400 text-sm text-right">{(item.outflow?.EUR || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-red-400 text-sm text-right">{(item.outflow?.USD || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-red-400 text-sm text-right">{(item.outflow?.TRY || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm text-right" style={{
                            color: (item.net_flow?.EUR || 0) >= 0 ? '#10B981' : '#EF4444'
                          }}>{(item.net_flow?.EUR || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm text-right" style={{
                            color: (item.net_flow?.USD || 0) >= 0 ? '#10B981' : '#EF4444'
                          }}>{(item.net_flow?.USD || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm text-right" style={{
                            color: (item.net_flow?.TRY || 0) >= 0 ? '#10B981' : '#EF4444'
                          }}>{(item.net_flow?.TRY || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-blue-400 text-sm text-right">{(item.balance?.EUR || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-blue-400 text-sm text-right">{(item.balance?.USD || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-blue-400 text-sm text-right">{(item.balance?.TRY || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsCashFlow;


