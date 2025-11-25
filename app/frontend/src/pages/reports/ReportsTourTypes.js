import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import { Button } from '@/components/ui/button';

const ReportsTourTypes = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    date_to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/reports/tour-types`, {
        params: filters
      });
      setReportData(response.data);
    } catch (error) {
      toast.error('Rapor yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!reportData) return;

    try {
      toast.info('PDF hazırlanıyor...');
      
      const doc = createNewPdf();
      let yPos = createTitle(doc, 'TUR TIPI ANALIZ RAPORU', {
        date_from: filters.date_from,
        date_to: filters.date_to
      });
      
      // Tablo verilerini hazırla
      const tableData = reportData.tour_type_stats.map(tt => {
        const revenue = tt.revenue || {};
        const revenueStr = Object.entries(revenue)
          .filter(([_, v]) => v > 0)
          .map(([curr, val]) => `${(val || 0).toFixed(2)} ${curr}`)
          .join(' / ') || '0.00 EUR';
        return {
          tur_tipi: safeText(tt.tour_type_name || '-'),
          rezervasyon: (tt.reservation_count || 0).toString(),
          gelir: revenueStr,
          atv: (tt.atv_count || 0).toString()
        };
      });
      
      const columns = [
        { header: 'Tur Tipi', key: 'tur_tipi', width: 50, maxLength: 25 },
        { header: 'Rezervasyon', key: 'rezervasyon', width: 35, align: 'center' },
        { header: 'Toplam Gelir', key: 'gelir', width: 45, align: 'right' },
        { header: 'ATV Sayısı', key: 'atv', width: 30, align: 'center' }
      ];
      
      yPos = createTable(doc, tableData, columns, yPos);
      
      const filename = `tur-tipi-analiz-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'Tur Tipi Analiz Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const COLORS = ['#3EA6FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const chartData = reportData?.tour_type_stats.map(tt => {
    const totalRevenue = tt.revenue ? (tt.revenue.EUR || 0) + (tt.revenue.USD || 0) + (tt.revenue.TRY || 0) : 0;
    return {
      name: tt.tour_type_name || '-',
      rezervasyon: tt.reservation_count || 0,
      gelir: totalRevenue
    };
  }) || [];

  return (
    <div className="space-y-6" data-testid="reports-tour-types-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tur Tipi Analiz Raporu</h1>
        </div>
        <Button onClick={generatePDF} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="PDF İndir">
          <Download size={18} />
        </Button>
      </div>

      {/* Filtreler */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Filtreler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
        <div className="mt-4">
          <Button onClick={fetchReport} className="btn-primary" title="Filtrele">
            <Filter size={18} />
          </Button>
        </div>
      </div>

      {reportData && (
        <>
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Rezervasyon Dağılımı</h2>
                <div className="space-y-2">
                  {chartData.map((entry, index) => {
                    const total = chartData.reduce((sum, e) => sum + e.rezervasyon, 0);
                    const percent = total > 0 ? ((entry.rezervasyon / total) * 100).toFixed(0) : 0;
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-[#2D2F33] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-white">{entry.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-semibold">{entry.rezervasyon}</div>
                          <div className="text-[#A5A5A5] text-sm">{percent}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Gelir Dağılımı</h2>
                <div className="space-y-2">
                  {chartData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-[#2D2F33] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-white">{entry.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[#3EA6FF] font-semibold">{(entry.gelir || 0).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tur Tipi</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Rezervasyon</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Toplam Gelir</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">ATV Sayısı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2F33]">
                  {reportData.tour_type_stats.map((tt, idx) => (
                    <tr key={idx} className="hover:bg-[#2D2F33]">
                      <td className="px-6 py-4 text-white text-sm font-semibold">{tt.tour_type_name}</td>
                      <td className="px-6 py-4 text-[#3EA6FF] text-sm font-semibold">{tt.reservation_count}</td>
                      <td className="px-6 py-4 text-white text-sm">
                        {tt.revenue ? Object.entries(tt.revenue)
                          .filter(([_, v]) => v > 0)
                          .map(([curr, val]) => `${(val || 0).toFixed(2)} ${curr}`)
                          .join(' / ') : '0.00 EUR'}
                      </td>
                      <td className="px-6 py-4 text-[#A5A5A5] text-sm">{tt.atv_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsTourTypes;

