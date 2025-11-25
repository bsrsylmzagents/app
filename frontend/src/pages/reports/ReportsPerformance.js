import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import { Button } from '@/components/ui/button';

const ReportsPerformance = () => {
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
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const response = await axios.get(`${API}/reports/performance`, { params });
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
      let yPos = createTitle(doc, 'PERFORMANS RAPORU', {
        date_from: filters.date_from,
        date_to: filters.date_to
      });
      
      // Performans Metrikleri
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Performans Metrikleri', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Toplam Rezervasyon: ${reportData.total_reservations}`, 20, yPos);
      yPos += 6;
      doc.text(`Tamamlanan: ${reportData.completed}`, 20, yPos);
      yPos += 6;
      doc.text(`İptal Edilen: ${reportData.cancelled}`, 20, yPos);
      yPos += 6;
      doc.text(`Tamamlanma Orani: ${reportData.completion_rate?.toFixed(2) || '0.00'}%`, 20, yPos);
      yPos += 6;
      doc.text(`Iptal Orani: ${reportData.cancellation_rate?.toFixed(2) || '0.00'}%`, 20, yPos);
      yPos += 6;
      doc.text(`Ortalama Rezervasyon Degeri: ${reportData.avg_reservation_value?.EUR?.toFixed(2) || '0.00'} EUR`, 20, yPos);
      yPos += 12;
      
      // En Verimli Günler
      if (reportData.busiest_days && reportData.busiest_days.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('En Verimli Gunler', 20, yPos);
        yPos += 8;
        
        const dayData = reportData.busiest_days.slice(0, 10).map(d => ({
          tarih: d.date || '-',
          rezervasyon: (d.reservations || 0).toString(),
          gelir: (d.revenue || 0).toFixed(2)
        }));
        
        const columns = [
          { header: 'Tarih', key: 'tarih', width: 50 },
          { header: 'Rezervasyon', key: 'rezervasyon', width: 40, align: 'center' },
          { header: 'Gelir (EUR)', key: 'gelir', width: 40, align: 'right' }
        ];
        
        yPos = createTable(doc, dayData, columns, yPos);
      }
      
      const filename = `performans-raporu-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'Performans Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  return (
    <div className="space-y-6" data-testid="reports-performance-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Performans Raporu</h1>
        </div>
        <Button onClick={generatePDF} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="PDF İndir">
          <Download size={18} />
        </Button>
      </div>

      {/* Filtreler */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
          <div className="flex items-end">
            <Button onClick={fetchReport} className="w-full btn-primary" title="Raporu Getir">
              <Filter size={18} />
            </Button>
          </div>
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
          {/* Performans Metrikleri */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Rezervasyon</div>
              <div className="text-3xl font-bold text-white">{reportData.total_reservations || 0}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Tamamlanma Oranı</div>
              <div className="text-3xl font-bold text-green-400">{reportData.completion_rate?.toFixed(1) || '0.0'}%</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">İptal Oranı</div>
              <div className="text-3xl font-bold text-red-400">{reportData.cancellation_rate?.toFixed(1) || '0.0'}%</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Ortalama Rezervasyon Değeri</div>
              <div className="text-2xl font-bold text-[#3EA6FF]">
                {reportData.avg_reservation_value?.EUR?.toFixed(2) || '0.00'} EUR
              </div>
            </div>
          </div>

          {/* Durum Dağılımı */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Tamamlanan</div>
              <div className="text-2xl font-bold text-green-400">{reportData.completed || 0}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">İptal Edilen</div>
              <div className="text-2xl font-bold text-red-400">{reportData.cancelled || 0}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Onaylanan</div>
              <div className="text-2xl font-bold text-yellow-400">{reportData.confirmed || 0}</div>
            </div>
          </div>

          {/* En Verimli Günler */}
          {reportData.busiest_days && reportData.busiest_days.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">En Verimli Günler</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Rezervasyon</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Gelir (EUR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.busiest_days.map((day, idx) => (
                      <tr key={idx} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm">{day.date}</td>
                        <td className="px-6 py-4 text-[#3EA6FF] text-sm text-right">{day.reservations || 0}</td>
                        <td className="px-6 py-4 text-green-400 text-sm text-right">{(day.revenue || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* En Verimli Saatler */}
          {reportData.busiest_hours && reportData.busiest_hours.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">En Verimli Saatler</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Saat</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Rezervasyon</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Gelir (EUR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.busiest_hours.map((hour, idx) => (
                      <tr key={idx} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm">{hour.hour}:00</td>
                        <td className="px-6 py-4 text-[#3EA6FF] text-sm text-right">{hour.reservations || 0}</td>
                        <td className="px-6 py-4 text-green-400 text-sm text-right">{(hour.revenue || 0).toFixed(2)}</td>
                      </tr>
                    ))}
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

export default ReportsPerformance;
