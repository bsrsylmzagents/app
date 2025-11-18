import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter, ArrowLeft, FileCode, TrendingUp, TrendingDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { createNewPdf, createTitle, savePdf, safeText } from '../../utils/pdfTemplate';
import { generateGenericXml, downloadXml } from '../../utils/xmlExport';
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
  Line,
  AreaChart,
  Area
} from 'recharts';

const COLORS = ['#10B981', '#EF4444', '#3EA6FF', '#F59E0B', '#8B5CF6', '#EC4899'];

const ReportsProfit = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    date_to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    currency: ''
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
      const response = await axios.get(`${API}/reports/profit`, {
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
      let yPos = createTitle(doc, 'KAZANÇ (KAR/ZARAR) RAPORU', {
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
      doc.text(`Toplam Gelir EUR: ${(reportData.total_income?.EUR || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`Toplam Gelir USD: ${(reportData.total_income?.USD || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`Toplam Gelir TRY: ${(reportData.total_income?.TRY || 0).toFixed(2)}`, 20, yPos);
      yPos += 8;
      
      doc.text(`Toplam Gider EUR: ${(reportData.total_expenses?.EUR || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`Toplam Gider USD: ${(reportData.total_expenses?.USD || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`Toplam Gider TRY: ${(reportData.total_expenses?.TRY || 0).toFixed(2)}`, 20, yPos);
      yPos += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text(`Kar/Zarar EUR: ${(reportData.profit?.EUR || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`Kar/Zarar USD: ${(reportData.profit?.USD || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`Kar/Zarar TRY: ${(reportData.profit?.TRY || 0).toFixed(2)}`, 20, yPos);
      yPos += 8;
      
      doc.text(`Kar Oranı EUR: %${(reportData.profit_percentage?.EUR || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`Kar Oranı USD: %${(reportData.profit_percentage?.USD || 0).toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(`Kar Oranı TRY: %${(reportData.profit_percentage?.TRY || 0).toFixed(2)}`, 20, yPos);
      
      const filename = `kazanc-raporu-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'Kazanç Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  // Grafik verilerini hazırla
  const profitChartData = reportData?.profit ? [
    { name: 'EUR', value: reportData.profit.EUR || 0 },
    { name: 'USD', value: reportData.profit.USD || 0 },
    { name: 'TRY', value: reportData.profit.TRY || 0 }
  ].filter(item => item.value !== 0) : [];

  const comparisonData = reportData ? [
    {
      name: 'Gelir',
      EUR: reportData.total_income?.EUR || 0,
      USD: reportData.total_income?.USD || 0,
      TRY: reportData.total_income?.TRY || 0
    },
    {
      name: 'Gider',
      EUR: reportData.total_expenses?.EUR || 0,
      USD: reportData.total_expenses?.USD || 0,
      TRY: reportData.total_expenses?.TRY || 0
    },
    {
      name: 'Kar/Zarar',
      EUR: reportData.profit?.EUR || 0,
      USD: reportData.profit?.USD || 0,
      TRY: reportData.profit?.TRY || 0
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
    <div className="space-y-6" data-testid="reports-profit-page">
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
            <h1 className="text-3xl font-bold text-white mb-2">Kazanç (Kar/Zarar) Raporu</h1>
            <p className="text-[#A5A5A5]">Gelir ve gider analizi ile kar/zarar hesaplaması</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={generatePDF} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="PDF İndir">
            <Download size={18} />
          </Button>
          <Button 
            onClick={() => {
              if (!reportData) return;
              const xml = generateGenericXml('Kazanç (Kar/Zarar) Raporu', reportData, filters);
              const filename = `kazanc-raporu-${filters.date_from}-${filters.date_to}.xml`;
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Gelir</div>
              <div className="text-3xl font-bold text-green-400">
                EUR: {(reportData.total_income?.EUR || 0).toFixed(2)}<br />
                USD: {(reportData.total_income?.USD || 0).toFixed(2)}<br />
                TRY: {(reportData.total_income?.TRY || 0).toFixed(2)}
              </div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Gider</div>
              <div className="text-3xl font-bold text-red-400">
                EUR: {(reportData.total_expenses?.EUR || 0).toFixed(2)}<br />
                USD: {(reportData.total_expenses?.USD || 0).toFixed(2)}<br />
                TRY: {(reportData.total_expenses?.TRY || 0).toFixed(2)}
              </div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Kar/Zarar</div>
              <div className="text-3xl font-bold" style={{
                color: (reportData.profit?.EUR || 0) >= 0 ? '#10B981' : '#EF4444'
              }}>
                EUR: {(reportData.profit?.EUR || 0).toFixed(2)}<br />
                USD: {(reportData.profit?.USD || 0).toFixed(2)}<br />
                TRY: {(reportData.profit?.TRY || 0).toFixed(2)}
              </div>
              <div className="mt-2 text-sm">
                {reportData.profit_percentage && (
                  <>
                    <div className={reportData.profit_percentage.EUR >= 0 ? 'text-green-400' : 'text-red-400'}>
                      Kar Oranı EUR: %{reportData.profit_percentage.EUR?.toFixed(2) || '0.00'}
                    </div>
                    <div className={reportData.profit_percentage.USD >= 0 ? 'text-green-400' : 'text-red-400'}>
                      Kar Oranı USD: %{reportData.profit_percentage.USD?.toFixed(2) || '0.00'}
                    </div>
                    <div className={reportData.profit_percentage.TRY >= 0 ? 'text-green-400' : 'text-red-400'}>
                      Kar Oranı TRY: %{reportData.profit_percentage.TRY?.toFixed(2) || '0.00'}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Grafikler */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kar/Zarar Pasta Grafiği */}
            {profitChartData.length > 0 && (
              <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Kar/Zarar Dağılımı</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={profitChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value >= 0 ? '+' : ''}${value.toFixed(2)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {profitChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.value >= 0 ? '#10B981' : '#EF4444'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#2D2F33', 
                        border: '1px solid #3EA6FF',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Gelir/Gider/Kar Karşılaştırması */}
            {comparisonData.length > 0 && (
              <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Gelir vs Gider vs Kar</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D2F33" />
                    <XAxis 
                      dataKey="name" 
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
                    <Bar dataKey="EUR" fill="#3EA6FF" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="USD" fill="#10B981" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="TRY" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Günlük Kar/Zarar Trendi */}
          {trendData.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Günlük Kar/Zarar Trendi</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorEur" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3EA6FF" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3EA6FF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorUsd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTry" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
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
                    formatter={(value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#A5A5A5' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="EUR" 
                    stroke="#3EA6FF" 
                    fillOpacity={1}
                    fill="url(#colorEur)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="USD" 
                    stroke="#10B981" 
                    fillOpacity={1}
                    fill="url(#colorUsd)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="TRY" 
                    stroke="#F59E0B" 
                    fillOpacity={1}
                    fill="url(#colorTry)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsProfit;


