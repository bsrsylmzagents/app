import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import { Button } from '@/components/ui/button';

const ReportsSeasonalPricingImpact = () => {
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
      const response = await axios.get(`${API}/reports/seasonal-pricing-impact`, {
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
      let yPos = createTitle(doc, 'DONEMSEL FIYATLAMA ETKI ANALIZI', {
        date_from: filters.date_from,
        date_to: filters.date_to
      });
      
      // Özet bilgi
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Toplam Donemsel Fiyat: ${reportData.total_seasonal_prices}`, 20, yPos);
      yPos += 12;
      
      // Tablo verilerini hazırla
      if (reportData.seasonal_price_impact.length > 0) {
        const tableData = reportData.seasonal_price_impact.map(sp => ({
          donem: `${sp.start_date} - ${sp.end_date}`,
          doviz: sp.currency || '-',
          rezervasyon: sp.reservation_count.toString(),
          gelir: sp.revenue.toFixed(2)
        }));
        
        const columns = [
          { header: 'Donem', key: 'donem', width: 60 },
          { header: 'Doviz', key: 'doviz', width: 30, align: 'center' },
          { header: 'Rezervasyon', key: 'rezervasyon', width: 40, align: 'center' },
          { header: 'Gelir', key: 'gelir', width: 40, align: 'right' }
        ];
        
        yPos = createTable(doc, tableData, columns, yPos);
      }
      
      const filename = `donemsel-fiyat-etki-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'Dönemsel Fiyatlama Etki Analizi');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const monthlyChartData = reportData ? Object.entries(reportData.monthly_revenue || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({
      ay: format(new Date(month + '-01'), 'MMM yyyy'),
      EUR: revenue.EUR || 0,
      USD: revenue.USD || 0,
      TRY: revenue.TRY || 0
    })) : [];

  return (
    <div className="space-y-6" data-testid="reports-seasonal-pricing-impact-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dönemsel Fiyatlama Etki Analizi</h1>
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
          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Toplam Dönemsel Fiyat</h2>
            <div className="text-4xl font-bold text-[#3EA6FF]">{reportData.total_seasonal_prices}</div>
          </div>

          {monthlyChartData.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Aylık Gelir Değişimi</h2>
              <div className="space-y-3">
                {monthlyChartData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-[#2D2F33] rounded-lg">
                    <div className="text-white font-semibold">{item.ay}</div>
                    <div className="flex gap-4 text-sm">
                      {item.EUR > 0 && <span className="text-[#3EA6FF]">EUR: {item.EUR.toFixed(2)}</span>}
                      {item.USD > 0 && <span className="text-[#10B981]">USD: {item.USD.toFixed(2)}</span>}
                      {item.TRY > 0 && <span className="text-[#F59E0B]">TRY: {item.TRY.toFixed(2)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Dönem</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Döviz</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Rezervasyon</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Gelir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2F33]">
                  {reportData.seasonal_price_impact.map((sp, idx) => (
                    <tr key={idx} className="hover:bg-[#2D2F33]">
                      <td className="px-6 py-4 text-white text-sm">
                        {format(new Date(sp.start_date), 'dd.MM.yyyy')} - {format(new Date(sp.end_date), 'dd.MM.yyyy')}
                      </td>
                      <td className="px-6 py-4 text-[#A5A5A5] text-sm">{sp.currency}</td>
                      <td className="px-6 py-4 text-[#3EA6FF] text-sm font-semibold">{sp.reservation_count}</td>
                      <td className="px-6 py-4 text-white text-sm font-semibold">{sp.revenue.toFixed(2)} {sp.currency}</td>
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

export default ReportsSeasonalPricingImpact;

